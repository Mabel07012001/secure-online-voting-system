let candidates =
    JSON.parse(localStorage.getItem("candidates")) || [];

let loggedInVoter =
    JSON.parse(localStorage.getItem("loggedInVoter"));


// Check login

if (!loggedInVoter) {

    alert("Please login first!");

    window.location.href = "login.html";

}


// Display candidates

function displayCandidates() {

    let container =
        document.getElementById("candidatesContainer");


    container.innerHTML = "";


    if (candidates.length === 0) {

        container.innerHTML =
            "<h3>No candidates available.</h3>";

        return;

    }


    candidates.forEach(function(candidate, index) {

        container.innerHTML += `

            <div class="candidate-card">

                <img
                    src="${candidate.photo}"
                    alt="${candidate.name}"
                    class="candidate-photo"
                >


                <h2>${candidate.name}</h2>


                <p>
                    <strong>Party:</strong>
                    ${candidate.party}
                </p>


                <p>
                    <strong>Position:</strong>
                    ${candidate.position}
                </p>


                <p>
                    <strong>Age:</strong>
                    ${candidate.age}
                </p>


                <p>
                    <strong>Gender:</strong>
                    ${candidate.gender}
                </p>


                <button
                    onclick="vote(${index})"
                    ${loggedInVoter.hasVoted ? "disabled" : ""}
                >

                    Vote

                </button>

            </div>

        `;

    });

}


// Vote function

function vote(index) {

    // Get latest voters

    let voters =
        JSON.parse(localStorage.getItem("voters")) || [];


    // Check if voter has already voted

    let voterIndex =
        voters.findIndex(function(voter) {

            return voter.email ===
                loggedInVoter.email;

        });


    if (voterIndex === -1) {

        alert("Voter not found.");

        return;

    }


    if (voters[voterIndex].hasVoted) {

        alert(
            "You have already voted. You cannot vote again."
        );

        return;

    }


    // Confirm vote

    let confirmVote = confirm(

        "Are you sure you want to vote for " +
        candidates[index].name +
        "?"

    );


    if (!confirmVote) {

        return;

    }


    // Add vote

    candidates[index].votes += 1;


    // Mark voter as voted

    voters[voterIndex].hasVoted = true;


    // Save candidates

    localStorage.setItem(

        "candidates",
        JSON.stringify(candidates)

    );


    // Save voters

    localStorage.setItem(

        "voters",
        JSON.stringify(voters)

    );


    // Update logged-in voter

    loggedInVoter =
        voters[voterIndex];


    localStorage.setItem(

        "loggedInVoter",
        JSON.stringify(loggedInVoter)

    );


   // Save selected candidate

localStorage.setItem(
    "votedCandidate",
    JSON.stringify(candidates[index])
);


// Save vote date

localStorage.setItem(
    "voteDate",
    new Date().toLocaleString()
);


alert(
    "Your vote has been recorded successfully!"
);


// Go to confirmation page

window.location.href =
    "vote_confirmation.html";


// Display candidates

displayCandidates();