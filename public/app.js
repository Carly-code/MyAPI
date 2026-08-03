const API = "";

let token = localStorage.getItem("token");
let currentNotes = [];
let editingNoteId = null;


// =========================
// ELEMENTS
// =========================

const authPage = document.getElementById("authPage");
const dashboardPage = document.getElementById("dashboardPage");

const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");

const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");

const registerUsername = document.getElementById("registerUsername");
const registerPassword = document.getElementById("registerPassword");

const loginMessage = document.getElementById("loginMessage");
const registerMessage = document.getElementById("registerMessage");

const usernameDisplay = document.getElementById("usernameDisplay");

const noteTitle = document.getElementById("noteTitle");
const noteContent = document.getElementById("noteContent");

const notesContainer = document.getElementById("notesContainer");
const noteCount = document.getElementById("noteCount");

const editModal = document.getElementById("editModal");
const editTitle = document.getElementById("editTitle");
const editContent = document.getElementById("editContent");


// =========================
// SHOW LOGIN
// =========================

document.getElementById("showLogin").addEventListener("click", () => {

    registerBox.classList.add("hidden");
    loginBox.classList.remove("hidden");

    registerMessage.textContent = "";
});


// =========================
// SHOW REGISTER
// =========================

document.getElementById("showRegister").addEventListener("click", () => {

    loginBox.classList.add("hidden");
    registerBox.classList.remove("hidden");

    loginMessage.textContent = "";
});


// =========================
// REGISTER
// =========================

document.getElementById("registerButton").addEventListener("click", async () => {

    const username = registerUsername.value.trim();
    const password = registerPassword.value;

    if (!username || !password) {
        registerMessage.textContent =
            "Enter a username and password.";
        return;
    }

    try {

        const response = await fetch(`${API}/register`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                username,
                password
            })

        });

        const data = await response.json();

        registerMessage.textContent = data.message;

        if (response.ok) {

            registerUsername.value = "";
            registerPassword.value = "";

            setTimeout(() => {

                registerBox.classList.add("hidden");
                loginBox.classList.remove("hidden");

                loginUsername.value = username;

            }, 800);

        }

    } catch (error) {

        registerMessage.textContent =
            "Could not connect to server.";

    }

});


// =========================
// LOGIN
// =========================

document.getElementById("loginButton").addEventListener("click", async () => {

    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    if (!username || !password) {

        loginMessage.textContent =
            "Enter your username and password.";

        return;
    }

    try {

        const response = await fetch(`${API}/login`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                username,
                password
            })

        });

        const data = await response.json();

        if (!response.ok) {

            loginMessage.textContent =
                data.message || "Login failed.";

            return;
        }

        token = data.token;

        localStorage.setItem("token", token);

        usernameDisplay.textContent = username;

        loginUsername.value = "";
        loginPassword.value = "";

        authPage.classList.add("hidden");
        dashboardPage.classList.remove("hidden");

        await loadNotes();

    } catch (error) {

        loginMessage.textContent =
            "Could not connect to server.";

    }

});


// =========================
// LOAD NOTES
// =========================

async function loadNotes() {

    try {

        const response = await fetch(`${API}/notes`, {

            headers: {
                "Authorization": `Bearer ${token}`
            }

        });

        if (response.status === 401 || response.status === 403) {

            logout();

            return;
        }

        const notes = await response.json();

        currentNotes = notes;

        renderNotes();

    } catch (error) {

        notesContainer.innerHTML =
            "<p>Could not load notes.</p>";

    }

}


// =========================
// DISPLAY NOTES
// =========================

function renderNotes() {

    notesContainer.innerHTML = "";

    noteCount.textContent =
        `${currentNotes.length} ${currentNotes.length === 1 ? "note" : "notes"
        }`;

    if (currentNotes.length === 0) {

        notesContainer.innerHTML = `
            <div class="note-card">
                <h3>No notes yet</h3>
                <p>Create your first note above.</p>
            </div>
        `;

        return;
    }

    currentNotes.forEach(note => {

        const card = document.createElement("div");

        card.className = "note-card";

        const title = document.createElement("h3");
        title.textContent = note.title;

        const content = document.createElement("p");
        content.textContent = note.content;

        const actions = document.createElement("div");
        actions.className = "note-actions";

        const editButton = document.createElement("button");

        editButton.className = "edit-button";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            openEditModal(note);
        });

        const deleteButton = document.createElement("button");

        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteNote(note.id);
        });

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        card.appendChild(title);
        card.appendChild(content);
        card.appendChild(actions);

        notesContainer.appendChild(card);

    });

}


// =========================
// CREATE NOTE
// =========================

document.getElementById("createNoteButton").addEventListener("click", async () => {

    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();

    if (!title || !content) {

        document.getElementById("noteMessage").textContent =
            "Enter a title and content.";

        return;
    }

    try {

        const response = await fetch(`${API}/notes`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },

            body: JSON.stringify({
                title,
                content
            })

        });

        const data = await response.json();

        if (!response.ok) {

            document.getElementById("noteMessage").textContent =
                data.message || "Could not create note.";

            return;
        }

        noteTitle.value = "";
        noteContent.value = "";

        document.getElementById("noteMessage").textContent =
            "Note created successfully.";

        await loadNotes();

    } catch (error) {

        document.getElementById("noteMessage").textContent =
            "Could not connect to server.";

    }

});


// =========================
// OPEN EDIT MODAL
// =========================

function openEditModal(note) {

    editingNoteId = note.id;

    editTitle.value = note.title;
    editContent.value = note.content;

    editModal.classList.remove("hidden");

}


// =========================
// CLOSE EDIT MODAL
// =========================

function closeEditModal() {

    editingNoteId = null;

    editModal.classList.add("hidden");

    editTitle.value = "";
    editContent.value = "";

}

document.getElementById("closeModal")
    .addEventListener("click", closeEditModal);

document.getElementById("cancelEdit")
    .addEventListener("click", closeEditModal);


// =========================
// SAVE EDIT
// =========================

document.getElementById("saveEdit").addEventListener("click", async () => {

    const title = editTitle.value.trim();
    const content = editContent.value.trim();

    if (!title || !content) {

        alert("Enter a title and content.");

        return;
    }

    try {

        const response = await fetch(
            `${API}/notes/${editingNoteId}`,
            {

                method: "PUT",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },

                body: JSON.stringify({
                    title,
                    content
                })

            }
        );

        const data = await response.json();

        if (!response.ok) {

            alert(data.message || "Could not update note.");

            return;
        }

        closeEditModal();

        await loadNotes();

    } catch (error) {

        alert("Could not connect to server.");

    }

});


// =========================
// DELETE NOTE
// =========================

async function deleteNote(id) {

    const confirmed =
        confirm("Are you sure you want to delete this note?");

    if (!confirmed) {
        return;
    }

    try {

        const response = await fetch(
            `${API}/notes/${id}`,
            {

                method: "DELETE",

                headers: {
                    "Authorization": `Bearer ${token}`
                }

            }
        );

        const data = await response.json();

        if (!response.ok) {

            alert(data.message || "Could not delete note.");

            return;
        }

        await loadNotes();

    } catch (error) {

        alert("Could not connect to server.");

    }

}


// =========================
// LOGOUT
// =========================

document.getElementById("logoutButton")
    .addEventListener("click", logout);

function logout() {

    localStorage.removeItem("token");

    token = null;

    currentNotes = [];

    dashboardPage.classList.add("hidden");
    authPage.classList.remove("hidden");

    loginBox.classList.remove("hidden");
    registerBox.classList.add("hidden");

    notesContainer.innerHTML = "";

}


// =========================
// AUTO LOGIN
// =========================

async function checkExistingLogin() {

    if (!token) {
        return;
    }

    try {

        const response = await fetch(`${API}/profile`, {

            headers: {
                "Authorization": `Bearer ${token}`
            }

        });

        if (!response.ok) {

            logout();

            return;
        }

        const user = await response.json();

        usernameDisplay.textContent = user.username;

        authPage.classList.add("hidden");
        dashboardPage.classList.remove("hidden");

        await loadNotes();

    } catch (error) {

        logout();

    }

}

checkExistingLogin();