let candidates =
    JSON.parse(
        localStorage.getItem("candidates")
    ) || [];


let resultsBody =
    document.getElementById("resultsBody");


// Total candidates

document.getElementById(
    "totalCandidates"
).textContent = candidates.length;


// Calculate total votes

let totalVotes = candidates.reduce(
    function(total, candidate) {

        return total + candidate.votes;

    },
    0
);


document.getElementById(
    "totalVotes"
).textContent = totalVotes;


// Sort candidates by votes

candidates.sort(function(a, b) {

    return b.votes - a.votes;

});


// Leading candidate

if (candidates.length > 0 &&
    totalVotes > 0) {

    document.getElementById(
        "leadingCandidate"
    ).textContent =

        candidates[0].name;

}


// Display results

candidates.forEach(function(candidate) {

    let percentage = 0;


    if (totalVotes > 0) {

        percentage =

            (
                candidate.votes /
                totalVotes
            ) * 100;

    }


    resultsBody.innerHTML += `

        <tr>

            <td>
                ${candidate.position}
            </td>


            <td>
                ${candidate.name}
            </td>


            <td>
                ${candidate.party}
            </td>


            <td>
                ${candidate.votes}
            </td>


            <td>
                ${percentage.toFixed(2)}%
            </td>

        </tr>

    `;

});