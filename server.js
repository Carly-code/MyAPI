require("dotenv").config();

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(express.json());
app.use(express.static("public"));
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || "mysecretkey";

// =========================
// SQLite Database
// =========================

const db = new sqlite3.Database("database.sqlite", (err) => {
    if (err) {
        console.error("SQLite connection error:", err.message);
    } else {
        console.log("Connected to SQLite");
    }
});

// =========================
// Create Tables
// =========================

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            userId INTEGER NOT NULL,
            FOREIGN KEY (userId) REFERENCES users(id)
        )
    `);

});

// =========================
// JWT Authentication
// =========================

function authenticateToken(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Access denied"
        });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({
            message: "Access denied"
        });
    }

    const token = parts[1];

    jwt.verify(token, SECRET_KEY, (err, user) => {

        if (err) {
            return res.status(403).json({
                message: "Invalid token"
            });
        }

        req.user = user;
        next();

    });
}

// =========================
// Register
// =========================

app.post("/register", async (req, res) => {

    try {

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(
            `INSERT INTO users (username, password)
             VALUES (?, ?)`,
            [username, hashedPassword],
            function (err) {

                if (err) {

                    if (err.message.includes("UNIQUE")) {
                        return res.status(409).json({
                            message: "Username already exists"
                        });
                    }

                    return res.status(500).json({
                        message: "Error creating user"
                    });
                }

                res.status(201).json({
                    message: "User registered successfully",
                    userId: this.lastID
                });

            }
        );

    } catch (err) {

        res.status(500).json({
            message: "Server error"
        });

    }

});

// =========================
// Login
// =========================

app.post("/login", (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            message: "Username and password are required"
        });
    }

    db.get(
        `SELECT * FROM users WHERE username = ?`,
        [username],
        async (err, user) => {

            if (err) {
                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (!user) {
                return res.status(401).json({
                    message: "Invalid username or password"
                });
            }

            const passwordMatch = await bcrypt.compare(
                password,
                user.password
            );

            if (!passwordMatch) {
                return res.status(401).json({
                    message: "Invalid username or password"
                });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    username: user.username,
                    role: user.role
                },
                SECRET_KEY,
                {
                    expiresIn: "1h"
                }
            );

            res.json({
                message: "Login successful",
                token
            });

        }
    );

});

// =========================
// Profile
// =========================

app.get("/profile", authenticateToken, (req, res) => {

    db.get(
        `SELECT id, username, role
         FROM users
         WHERE id = ?`,
        [req.user.id],
        (err, user) => {

            if (err) {
                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            res.json(user);

        }
    );

});

// =========================
// Admin Route
// =========================

app.get("/admin", authenticateToken, (req, res) => {

    if (req.user.role !== "admin") {
        return res.status(403).json({
            message: "Admin access required"
        });
    }

    res.json({
        message: "Welcome Admin",
        user: req.user.username
    });

});

// =========================
// Create Note
// =========================

app.post("/notes", authenticateToken, (req, res) => {

    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({
            message: "Title and content are required"
        });
    }

    db.run(
        `INSERT INTO notes (title, content, userId)
         VALUES (?, ?, ?)`,
        [title, content, req.user.id],
        function (err) {

            if (err) {
                return res.status(500).json({
                    message: "Error creating note"
                });
            }

            res.status(201).json({
                message: "Note created successfully",
                noteId: this.lastID
            });

        }
    );

});

// =========================
// Get Notes
// =========================

app.get("/notes", authenticateToken, (req, res) => {

    db.all(
        `SELECT id, title, content, userId
         FROM notes
         WHERE userId = ?`,
        [req.user.id],
        (err, notes) => {

            if (err) {
                return res.status(500).json({
                    message: "Error getting notes"
                });
            }

            res.json(notes);

        }
    );

});

// =========================
// Update Note
// =========================

app.put("/notes/:id", authenticateToken, (req, res) => {

    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({
            message: "Title and content are required"
        });
    }

    db.run(
        `UPDATE notes
         SET title = ?, content = ?
         WHERE id = ? AND userId = ?`,
        [
            title,
            content,
            req.params.id,
            req.user.id
        ],
        function (err) {

            if (err) {
                return res.status(500).json({
                    message: "Error updating note"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    message: "Note not found"
                });
            }

            res.json({
                message: "Note updated successfully"
            });

        }
    );

});

// =========================
// Delete Note
// =========================

app.delete("/notes/:id", authenticateToken, (req, res) => {

    db.run(
        `DELETE FROM notes
         WHERE id = ? AND userId = ?`,
        [
            req.params.id,
            req.user.id
        ],
        function (err) {

            if (err) {
                return res.status(500).json({
                    message: "Error deleting note"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    message: "Note not found"
                });
            }

            res.json({
                message: "Note deleted successfully"
            });

        }
    );

});

// =========================
// 404
// =========================

app.use((req, res) => {
    res.status(404).json({
        message: "Route not found"
    });
});

// =========================
// Start Server
// =========================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});