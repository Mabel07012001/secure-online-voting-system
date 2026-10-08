import { apiGetAllVoters } from "./api.js";

// ============================================================
// VERIFICAR AUTENTICAÇÃO DE ADMIN
// ============================================================
const token = localStorage.getItem("adminToken");

if (!token) {
    alert("Admin login required.");
    window.location.href = "admin_login.html";
    throw new Error("Not authenticated");
}

// ============================================================
// ESTADO
// ============================================================
let allVoters = [];
let currentFilter = "all";
let searchQuery = "";

// ============================================================
// ELEMENTOS
// ============================================================
const tbody = document.getElementById("votersTableBody");
const searchInput = document.getElementById("searchInput");
const countTotal = document.getElementById("countTotal");
const countVoted = document.getElementById("countVoted");
const countNotVoted = document.getElementById("countNotVoted");
const countFaceOk = document.getElementById("countFaceOk");

// ============================================================
// CARREGAR VOTANTES
// ============================================================
async function loadVoters() {
    try {
        const result = await apiGetAllVoters(token);

        if (!result.success) {
            if (result.message && result.message.includes("Admin")) {
                alert("Admin session expired. Please login again.");
                localStorage.removeItem("adminToken");
                window.location.href = "admin_login.html";
                return;
            }
            tbody.innerHTML = `<tr><td colspan="6" class="empty-message">${result.message}</td></tr>`;
            return;
        }

        allVoters = result.voters || [];
        updateCounters();
        renderTable();

    } catch (err) {
        console.error("Error loading voters:", err);
        tbody.innerHTML = `<tr><td colspan="6" class="empty-message">Backend not running.</td></tr>`;
    }
}

// ============================================================
// ATUALIZAR CONTADORES
// ============================================================
function updateCounters() {
    countTotal.textContent = allVoters.length;
    countVoted.textContent = allVoters.filter(v => v.has_voted).length;
    countNotVoted.textContent = allVoters.filter(v => !v.has_voted).length;
    countFaceOk.textContent = allVoters.filter(v => v.face_registered).length;
}

// ============================================================
// FILTRAR
// ============================================================
function getFilteredVoters() {
    return allVoters.filter(v => {
        // Filtro por tab
        if (currentFilter === "voted" && !v.has_voted) return false;
        if (currentFilter === "not_voted" && v.has_voted) return false;
        if (currentFilter === "face_ok" && !v.face_registered) return false;
        if (currentFilter === "face_missing" && v.face_registered) return false;

        // Pesquisa por nome/email
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const name = (v.full_name || "").toLowerCase();
            const email = (v.email || "").toLowerCase();
            if (!name.includes(q) && !email.includes(q)) return false;
        }

        return true;
    });
}

// ============================================================
// RENDERIZAR TABELA
// ============================================================
function renderTable() {
    const filtered = getFilteredVoters();

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-message">No voters match this filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((v, i) => {
        const date = v.created_at
            ? new Date(v.created_at).toLocaleDateString("en-GB", {
                day: "2-digit", month: "short", year: "numeric"
            })
            : "—";

        const faceBadge = v.face_registered
            ? `<span class="badge badge-yes">✓ Registered</span>`
            : `<span class="badge badge-warning">Missing</span>`;

        const votedBadge = v.has_voted
            ? `<span class="badge badge-yes">✓ Voted</span>`
            : `<span class="badge badge-no">Not yet</span>`;

        return `
            <tr>
                <td style="color:#94a3b8;font-weight:600;">${i + 1}</td>
                <td style="font-weight:600;color:#0f172a;">${escapeHtml(v.full_name || "—")}</td>
                <td style="color:#475569;">${escapeHtml(v.email || "—")}</td>
                <td style="color:#64748b;">${date}</td>
                <td>${faceBadge}</td>
                <td>${votedBadge}</td>
            </tr>
        `;
    }).join("");
}

// ============================================================
// HELPERS
// ============================================================
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ============================================================
// EVENTOS
// ============================================================

// Pesquisa
searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderTable();
});

// Tabs de filtro
document.querySelectorAll(".filter-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentFilter = tab.dataset.filter;
        renderTable();
    });
});

// ============================================================
// ARRANCA
// ============================================================
loadVoters();