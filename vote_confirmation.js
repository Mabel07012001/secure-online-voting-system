const data = sessionStorage.getItem("voteConfirmation");

if (!data) {
    window.location.href = "dashboard.html";
} else {
    const vote = JSON.parse(data);

    document.getElementById("confirmationId").textContent = vote.confirmation_id;

    if (vote.candidate) {
        document.getElementById("candidateName").textContent =
            vote.candidate.full_name || "—";
        document.getElementById("candidateParty").textContent =
            vote.candidate.party || "—";
    }

    if (vote.voted_at) {
        const date = new Date(vote.voted_at);
        const formatted = date.toLocaleString("en-US", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
        document.getElementById("voteDate").textContent = formatted;
    }

    sessionStorage.removeItem("voteConfirmation");
}