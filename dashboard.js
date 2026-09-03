// Get logged-in voter

let loggedInVoter =
    JSON.parse(
        localStorage.getItem("loggedInVoter")
    );


// If no voter is logged in

if (!loggedInVoter) {

    alert("Please login first.");

    window.location.href = "login.html";

}


// Display logged-in voter name

document.getElementById("voterName").textContent =
    loggedInVoter.name;


// Get all voters

let voters =
    JSON.parse(
        localStorage.getItem("voters")
    ) || [];


// Display total voters

document.getElementById("totalVoters").textContent =
    voters.length;


// Get all candidates

let candidates =
    JSON.parse(
        localStorage.getItem("candidates")
    ) || [];


// Display total candidates

document.getElementById("totalCandidates").textContent =
    candidates.length;


// Display voting status

document.getElementById("votingStatus").textContent =
    loggedInVoter.hasVoted
        ? "Voted"
        : "Not Voted";


// Logout

function logout() {

    localStorage.removeItem("loggedInVoter");

    alert("You have logged out.");

    window.location.href = "login.html";

}