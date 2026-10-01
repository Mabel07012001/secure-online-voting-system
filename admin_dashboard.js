import {
    apiGetStats,
    apiGetElectionStatus,
    apiToggleElection
} from "./api.js";

import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://ddulggqcycgmfzoqloel.supabase.co";
const supabaseKey = "sb_publishable_2ZpI-GGlANTvfstz4OxceA_MYkwRACs";

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("admin_dashboard.js loaded");

async function checkAdminLogin() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
        console.log("No admin session");
        window.location.href = "admin_login.html";
        return false;
    }

    console.log("Admin:", data.session.user.email);

    localStorage.setItem("adminToken", data.session.access_token);
    return true;
}

async function loadStatistics() {
    try {
        const stats = await apiGetStats();

        if (!stats.success) return;

        const tv = document.getElementById("totalVoters");
        const tc = document.getElementById("totalCandidates");
        const tvt = document.getElementById("totalVotes");
        const pr = document.getElementById("participationRate");

        if (tv) tv.textContent = stats.totalVoters || 0;
        if (tc) tc.textContent = stats.totalCandidates || 0;
        if (tvt) tvt.textContent = stats.totalVotes || 0;
        if (pr) pr.textContent = stats.participationRate || "0%";

    } catch (e) {
        console.error("Stats error:", e);
    }
}

async function loadElectionStatus() {
    try {
        const election = await apiGetElectionStatus();
        console.log("Election:", election);

        const statusEl = document.getElementById("adminElectionStatus");
        const closeBtn = document.getElementById("closeElectionBtn");
        const datesDisplay = document.getElementById("electionDatesDisplay");
        const openBtn = document.getElementById("openElectionBtn");
        const dateForm = document.getElementById("electionDateForm");

        if (!election.success) return;

        if (election.status === "open") {
            statusEl.textContent = "🟢 Open";
            statusEl.style.color = "#16a34a";

            closeBtn.style.display = "inline-flex";
            openBtn.style.display = "none";
            dateForm.style.display = "none";

            const start = election.start_date
                ? new Date(election.start_date).toLocaleString("en-US")
                : "Not defined";
            const end = election.end_date
                ? new Date(election.end_date).toLocaleString("en-US")
                : "Not defined";

            datesDisplay.innerHTML = `
                <p style="margin: 5px 0; color: #334155;"><strong>📅 Start:</strong> ${start}</p>
                <p style="margin: 5px 0; color: #334155;"><strong>📅 End:</strong> ${end}</p>
                <p style="margin: 10px 0 0; color: #16a34a; font-weight: 600; font-size: 14px;">
                    ✅ Election in progress
                </p>
            `;

        } else {
            statusEl.textContent = "🔴 Closed";
            statusEl.style.color = "#dc2626";

            closeBtn.style.display = "none";
            openBtn.style.display = "block";
            dateForm.style.display = "none";

            if (election.start_date && election.end_date) {
                const start = new Date(election.start_date).toLocaleString("en-US");
                const end = new Date(election.end_date).toLocaleString("en-US");

                datesDisplay.innerHTML = `
                    <p style="margin: 5px 0; color: #64748b; font-size: 13px;"><strong>Last election:</strong></p>
                    <p style="margin: 5px 0; color: #334155;">📅 ${start} → ${end}</p>
                    <p style="margin: 10px 0 0; color: #dc2626; font-weight: 600; font-size: 14px;">
                        🔴 Election closed
                    </p>
                `;
            } else {
                datesDisplay.innerHTML = `
                    <p style="margin: 0; color: #64748b;">
                        No election configured yet.
                    </p>
                `;
            }
        }

    } catch (e) {
        console.error("Election error:", e);
    }
}

function showDateForm() {
    document.getElementById("openElectionBtn").style.display = "none";
    document.getElementById("electionDateForm").style.display = "block";

    const now = new Date();
    const week = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const formatDate = (d) => {
        const pad = (n) => n.toString().padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    document.getElementById("startDateInput").value = formatDate(now);
    document.getElementById("endDateInput").value = formatDate(week);

    console.log("Date form opened");
}

window.showDateForm = showDateForm;

function cancelDateEdit() {
    document.getElementById("electionDateForm").style.display = "none";
    document.getElementById("openElectionBtn").style.display = "block";
}

window.cancelDateEdit = cancelDateEdit;

async function saveAndOpenElection() {
    const startDate = document.getElementById("startDateInput").value;
    const endDate = document.getElementById("endDateInput").value;

    if (!startDate || !endDate) {
        alert("⚠️ Please fill in both dates.");
        return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
        alert("⚠️ End date must be after start date.");
        return;
    }

    const token = localStorage.getItem("adminToken");

    if (!token) {
        alert("Admin session expired. Please login again.");
        window.location.href = "admin_login.html";
        return;
    }

    if (!confirm("Confirm opening election with these dates?")) return;

    try {
        const result = await apiToggleElection(token, startDate, endDate);
        console.log("Result:", result);

        if (!result.success) {
            alert("Error: " + result.message);
            return;
        }

        alert("✅ " + result.message);
        await loadElectionStatus();

    } catch (e) {
        console.error(e);
        alert("Error connecting to server.");
    }
}

window.saveAndOpenElection = saveAndOpenElection;

async function closeElection() {
    const token = localStorage.getItem("adminToken");

    if (!token) {
        alert("Admin session expired.");
        window.location.href = "admin_login.html";
        return;
    }

    if (!confirm("Are you sure you want to CLOSE the election?")) return;

    const btn = document.getElementById("closeElectionBtn");
    const originalText = btn ? btn.textContent : "";
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Closing...";
    }

    try {
        const result = await apiToggleElection(token);
        console.log("Close:", result);

        if (!result.success) {
            alert("Error: " + result.message);
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText;
            }
            return;
        }

        alert("✅ " + result.message);
        await loadElectionStatus();

    } catch (e) {
        console.error(e);
        alert("Error connecting to server.");
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

window.closeElection = closeElection;

function openRegistration() {
    window.location.href = "Register.html";
}

function manageCandidates() {
    window.location.href = "manage_candidate.html";
}

function viewResults() {
    window.location.href = "result.html";
}

window.openRegistration = openRegistration;
window.manageCandidates = manageCandidates;
window.viewResults = viewResults;

async function logoutAdmin() {
    await supabase.auth.signOut();
    localStorage.removeItem("adminToken");
    window.location.href = "admin_login.html";
}

window.logoutAdmin = logoutAdmin;

document.addEventListener("DOMContentLoaded", async function () {
    console.log("DOMContentLoaded");

    const loggedIn = await checkAdminLogin();
    if (!loggedIn) return;

    loadStatistics();
    loadElectionStatus();
});