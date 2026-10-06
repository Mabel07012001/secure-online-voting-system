import { apiGetCandidatesWithVotes } from "./api.js";

const table = document.getElementById("candidatesTableBody");


async function displayCandidates() {
    if (!table) return;

    table.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;">Loading...</td></tr>`;

    try {
        const result = await apiGetCandidatesWithVotes();

        if (!result.success || !result.candidates) {
            table.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#dc2626;">Error loading candidates.</td></tr>`;
            return;
        }

        if (result.candidates.length === 0) {
            table.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#64748b;">No registered candidates.</td></tr>`;
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
                    <td>
                        ${candidate.photo 
                            ? `<img src="${candidate.photo}" alt="Photo" width="60" style="border-radius:50%;border:2px solid #2563eb;">` 
                            : "No photo"}
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.error("Error loading candidates:", error);
        table.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#dc2626;">Backend is not running.</td></tr>`;
    }
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
