let votedCandidate =
    JSON.parse(
        localStorage.getItem("votedCandidate")
    );


let voteDate =
    localStorage.getItem("voteDate");


if (!votedCandidate) {

    window.location.href =
        "dashboard.html";

}


document.getElementById("candidateName").textContent =
    votedCandidate.name;


document.getElementById("voteDate").textContent =
    voteDate;