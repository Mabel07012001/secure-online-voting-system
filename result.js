import { apiGetResults } from "./api.js";

const resultsBody = document.getElementById("resultsBody");
const totalCandidatesElement = document.getElementById("totalCandidates");
const totalVotesElement = document.getElementById("totalVotes");
const leadingCandidateElement = document.getElementById("leadingCandidate");

async function loadResults() {
    try {
        const data = await apiGetResults();

        if (!data.success) {
            resultsBody.innerHTML = `<tr><td colspan="5">Error loading results.</td></tr>`;
            return;
        }

        totalCandidatesElement.textContent = data.totalCandidates;
        totalVotesElement.textContent = data.totalVotes;

        if (data.leadingCandidate && data.leadingCandidate.votes > 0) {
            leadingCandidateElement.textContent = data.leadingCandidate.name;
        } else {
            leadingCandidateElement.textContent = "No votes yet";
        }

        resultsBody.innerHTML = "";

        data.results.forEach((candidate, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${candidate.name}</td>
                <td>${candidate.party || "N/A"}</td>
                <td>${candidate.votes}</td>
                <td>${candidate.percentage}</td>
            `;
            resultsBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error:", error);
        resultsBody.innerHTML = `<tr><td colspan="5">Backend is not running.</td></tr>`;
    }
}

if (resultsBody) {
    loadResults();
}