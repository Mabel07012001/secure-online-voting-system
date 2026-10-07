import {
    apiGetStats,
    apiGetMyVote,
    apiGetResults,
    apiGetElectionStatus
} from "./api.js";

import { requireLogin, logout } from "./auth-guard.js";

// ============================================================
// AUTENTICAÇÃO
// ============================================================
const voter = requireLogin();
if (!voter) {
    // requireLogin já redirecionou para login.html
    throw new Error("Not authenticated");
}

async function loadDashboard() {
    console.log("Voter:", voter);

    const voterName = document.getElementById("voterName");
    if (voterName) voterName.textContent = voter.full_name;

    const votingStatus = document.getElementById("votingStatus");
    if (votingStatus) {
        if (voter.has_voted) {
            votingStatus.textContent = "✅ Voted";
            votingStatus.style.color = "#16a34a";
        } else {
            votingStatus.textContent = "Not voted yet";
            votingStatus.style.color = "#f59e0b";
        }
    }

    if (voter.has_voted) {
        try {
            const myVote = await apiGetMyVote(voter.id);

            if (myVote.success && myVote.has_voted && myVote.vote) {
                const section = document.getElementById("myVoteSection");
                if (section) section.style.display = "block";

                const c = myVote.vote.candidate;
                const date = new Date(myVote.vote.voted_at).toLocaleString("en-US", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit"
                });

                const info = document.getElementById("myVoteInfo");

                if (info) {
                    info.innerHTML = `
                        ${c.photo
                            ? `<img src="${c.photo}" style="width:90px;height:90px;object-fit:cover;border-radius:50%;border:4px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.15);">`
                            : `<div style="width:90px;height:90px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:40px;">👤</div>`}
                        <div style="flex:1; min-width: 200px;">
                            <h3 style="color:#1d4ed8;font-size:20px;margin-bottom:8px;">${c.full_name}</h3>
                            <p style="color:#334155;font-size:14px;margin:3px 0;"><strong>Party:</strong> ${c.party || "N/A"}</p>
                            <p style="color:#334155;font-size:14px;margin:3px 0;"><strong>Position:</strong> ${c.position || "N/A"}</p>
                            <p style="color:#64748b;font-size:12px;margin-top:10px;">
                                <strong>Confirmation ID:</strong>
                                <span style="color:#1d4ed8;font-weight:700;letter-spacing:1px;">
                                    ${myVote.vote.confirmation_id || "N/A"}
                                </span><br>
                                <strong>Date:</strong> ${date}
                            </p>
                        </div>
                    `;
                }
            }
        } catch (e) {
            console.error("Error fetching vote:", e);
        }

        const voteBtn = document.getElementById("voteBtn");
        if (voteBtn) voteBtn.style.display = "none";
    }

    try {
        const results = await apiGetResults();
        const leadingInfo = document.getElementById("leadingInfo");

        if (leadingInfo) {
            if (results.success && results.leadingCandidate && results.leadingCandidate.votes > 0) {
                const v = results.leadingCandidate;

                leadingInfo.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:15px;">
                        <div>
                            <h3 style="color:#15803d;font-size:22px;margin-bottom:6px;">🏆 ${v.name}</h3>
                            <p style="color:#334155;font-size:14px;margin:3px 0;"><strong>Party:</strong> ${v.party || "N/A"}</p>
                            <p style="color:#334155;font-size:14px;margin:3px 0;"><strong>Position:</strong> ${v.position || "N/A"}</p>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:32px;font-weight:800;color:#16a34a;line-height:1;">${v.votes}</div>
                            <div style="font-size:14px;color:#64748b;margin-top:5px;">${v.percentage}</div>
                            <div style="font-size:11px;color:#94a3b8;margin-top:3px;">votes</div>
                        </div>
                    </div>
                    <p style="margin-top:15px;font-size:12px;color:#64748b;font-style:italic;border-top:1px solid #e2e8f0;padding-top:12px;">
                        ⚠️ Partial results. Final result will be announced when the election closes.
                    </p>
                `;
            } else {
                leadingInfo.innerHTML = `
                    <p style="color:#64748b;text-align:center;padding:20px;">
                        No votes recorded yet.
                    </p>
                `;
            }
        }
    } catch (e) {
        console.error("Error fetching results:", e);
    }

    try {
        const stats = await apiGetStats();

        if (stats.success) {
            const tv = document.getElementById("totalVoters");
            const tc = document.getElementById("totalCandidates");

            if (tv) tv.textContent = stats.totalVoters || 0;
            if (tc) tc.textContent = stats.totalCandidates || 0;
        }
    } catch (error) {
        console.error("Error fetching statistics:", error);
    }

    try {
        const election = await apiGetElectionStatus();
        const statusEl = document.getElementById("electionStatus");

        if (election.success && statusEl) {
            if (election.status === "open") {
                statusEl.textContent = "🟢 Open";
                statusEl.style.color = "#16a34a";
            } else {
                statusEl.textContent = "🔴 Closed";
                statusEl.style.color = "#dc2626";

                const voteBtn = document.getElementById("voteBtn");
                if (voteBtn) voteBtn.style.display = "none";
            }
        }
    } catch (e) {
        console.error("Error fetching election status:", e);
    }
}

// ============================================================
// LOGOUT
// ============================================================
const logoutButton = document.getElementById("logoutButton");
if (logoutButton) logoutButton.addEventListener("click", logout);

// ============================================================
// ARRANCA
// ============================================================
loadDashboard();