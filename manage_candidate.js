import {
    apiGetCandidatesWithVotes,
    apiDeleteCandidateAdmin,
    apiUpdateCandidateAdmin,
    apiAdminLogin
} from "./api.js";

const table = document.getElementById("candidatesTableBody");

let pendingAction = null;

async function displayCandidates() {
    if (!table) return;

    table.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;">Loading...</td></tr>`;

    try {
        const result = await apiGetCandidatesWithVotes();

        if (!result.success || !result.candidates) {
            table.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#dc2626;">Error loading candidates.</td></tr>`;
            return;
        }

        if (result.candidates.length === 0) {
            table.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#64748b;">No registered candidates.</td></tr>`;
            return;
        }

        table.innerHTML = "";

        result.candidates.forEach((candidate) => {
            table.innerHTML += `
                <tr>
                    <td>${candidate.full_name || ""}</td>
                    <td>${candidate.age || ""}</td>
                    <td>${candidate.gender || ""}</td>
                    <td>${candidate.party || ""}</td>
                    <td>${candidate.position || ""}</td>
                    <td>${candidate.email || ""}</td>
                    <td>${candidate.votes || 0}</td>
                    <td>${candidate.photo ? `<img src="${candidate.photo}" width="60" style="border-radius:50%;border:2px solid #2563eb;">` : "No photo"}</td>
                    <td>
                        <button class="btn-edit-action" onclick="requestAction('edit', '${candidate.id}')">
                            ✏️ Edit
                        </button>
                        <button class="btn-delete-action" onclick="requestAction('delete', '${candidate.id}')">
                            🗑️ Delete
                        </button>
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.error(error);
        table.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#dc2626;">Backend is not running.</td></tr>`;
    }
}

async function requestAction(type, id) {
    
    console.log("Requesting admin login for:", type);

    
    localStorage.removeItem("adminToken");

    pendingAction = { type, id };

    const label = document.getElementById("adminActionLabel");
    if (label) label.textContent = type === "edit" ? "edit" : "delete";

    openAdminModal();
}

window.requestAction = requestAction;

async function executeAction(type, id, token) {
    try {
        if (type === "delete") {
            if (!confirm("⚠️ Are you sure you want to DELETE this candidate?\n\nThis action is permanent.")) {
                pendingAction = null;
                localStorage.removeItem("adminToken");
                return;
            }

            const result = await apiDeleteCandidateAdmin(id, token);

            if (!result.success) {
                if (result.message.toLowerCase().includes("admin") || result.message.toLowerCase().includes("token")) {
                    localStorage.removeItem("adminToken");
                    alert("Admin session expired. Please login again.");
                    pendingAction = { type, id };
                    openAdminModal();
                    return;
                }
                alert("Error: " + result.message);
                return;
            }

            alert("✅ Candidate deleted!");
            displayCandidates();

        } else if (type === "edit") {
            const newName = prompt("New full name:", "");
            if (!newName) { pendingAction = null; localStorage.removeItem("adminToken"); return; }

            const newAge = prompt("New age:", "");
            if (!newAge) { pendingAction = null; localStorage.removeItem("adminToken"); return; }

            const newParty = prompt("New party:", "");
            if (!newParty) { pendingAction = null; localStorage.removeItem("adminToken"); return; }

            const newPosition = prompt("New position:", "");
            if (!newPosition) { pendingAction = null; localStorage.removeItem("adminToken"); return; }

            const result = await apiUpdateCandidateAdmin(id, {
                full_name: newName,
                age: Number(newAge),
                party: newParty,
                position: newPosition
            }, token);

            if (!result.success) {
                if (result.message.toLowerCase().includes("admin") || result.message.toLowerCase().includes("token")) {
                    localStorage.removeItem("adminToken");
                    alert("Admin session expired. Please login again.");
                    pendingAction = { type, id };
                    openAdminModal();
                    return;
                }
                alert("Error: " + result.message);
                return;
            }

            alert("✅ Candidate updated!");
            displayCandidates();
        }

        pendingAction = null;

        // Apagar o token depois de usar (força login na próxima vez)
        localStorage.removeItem("adminToken");
        console.log("Token removed after action.");

    } catch (e) {
        console.error(e);
        alert("Error connecting to server.");
        localStorage.removeItem("adminToken");
    }
}

function openAdminModal() {
    const modal = document.getElementById("adminModal");
    if (!modal) return;

    modal.classList.add("active");

    document.getElementById("adminModalEmail").value = "";
    document.getElementById("adminModalPassword").value = "";
    document.getElementById("adminModalError").classList.remove("show");

    setTimeout(() => {
        document.getElementById("adminModalEmail").focus();
    }, 200);
}

function closeAdminModal() {
    const modal = document.getElementById("adminModal");
    if (modal) modal.classList.remove("active");
    pendingAction = null;
}

window.closeAdminModal = closeAdminModal;

const adminForm = document.getElementById("adminLoginForm");

if (adminForm) {
    adminForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("adminModalEmail").value.trim();
        const password = document.getElementById("adminModalPassword").value;
        const errorEl = document.getElementById("adminModalError");
        const loginBtn = document.getElementById("adminModalLoginBtn");

        errorEl.classList.remove("show");
        loginBtn.disabled = true;
        loginBtn.textContent = "Verifying...";

        try {
            const result = await apiAdminLogin(email, password);
            console.log("Admin login:", result);

            if (!result.success) {
                errorEl.textContent = result.message || "Invalid admin credentials.";
                errorEl.classList.add("show");
                loginBtn.disabled = false;
                loginBtn.textContent = "Login as Admin";
                return;
            }

            localStorage.setItem("adminToken", result.token);
            console.log("Admin token saved.");

            closeAdminModal();

            if (pendingAction) {
                const { type, id } = pendingAction;
                pendingAction = null;
                await executeAction(type, id, result.token);
            }

        } catch (e) {
            console.error(e);
            errorEl.textContent = "Error connecting to server.";
            errorEl.classList.add("show");
            loginBtn.disabled = false;
            loginBtn.textContent = "Login as Admin";
        }
    });
}

const searchInput = document.getElementById("searchInput");
if (searchInput && table) {
    searchInput.addEventListener("keyup", function () {
        const term = this.value.toLowerCase();
        const rows = table.getElementsByTagName("tr");

        Array.from(rows).forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(term) ? "" : "none";
        });
    });
}

displayCandidates();