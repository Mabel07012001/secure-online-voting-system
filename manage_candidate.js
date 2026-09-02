function displayCandidate() {

    let candidates =
        JSON.parse(localStorage.getItem("candidates")) || [];

    let table = document.getElementById("candidatesTableBody");

    table.innerHTML = "";

    candidates.forEach((candidate, index) => {

        table.innerHTML += `
        <tr>
            <td>${candidate.name}</td>
            <td>${candidate.age}</td>
            <td>${candidate.gender}</td>
            <td>${candidate.party}</td>
            <td>${candidate.position}</td>
            <td>${candidate.email}</td>
            <td>${candidate.votes}</td>
            <td>
                <img src="${candidate.photo}" alt="Candidate Photo" width="100">
            </td>
            <td>
                <button onclick="editCandidate(${index})">
                    Edit
                </button>

                <button onclick="deleteCandidate(${index})">
                    Delete
                </button>
            </td>
        </tr>
        `;
    });
}

displayCandidate();

function deleteCandidate(index) {

    let candidates =
        JSON.parse(localStorage.getItem("candidates")) || [];

    candidates.splice(index, 1);

    localStorage.setItem(
        "candidates",
        JSON.stringify(candidates)
    );

    displayCandidate();
}

function editCandidate(index) {
    let candidates = JSON.parse(localStorage.getItem("candidates")) || [];

    let newName = prompt("Enter new name:", candidates[index].name);
    let newAge = prompt("Enter new age:", candidates[index].age);
    let newGender = prompt("Enter new gender:", candidates[index].gender);
    let newParty = prompt("Enter new party:", candidates[index].party);
    let newPosition = prompt("Enter new position:", candidates[index].position);
    let newEmail = prompt("Enter new email:", candidates[index].email);

    if(newName&& newAge && newGender && newParty && newPosition && newEmail) {
        candidates[index].name = newName;
        candidates[index].age = newAge;
        candidates[index].gender = newGender;
        candidates[index].party = newParty;
        candidates[index].position = newPosition;
        candidates[index].email = newEmail;

        localStorage.setItem("candidates", JSON.stringify(candidates));
        displayCandidate();
    }

}
document.getElementById("searchInput")
.addEventListener("keyup", function () {

    let searchTerm = this.value.toLowerCase();

    let rows = document
        .getElementById("candidatesTableBody")
        .getElementsByTagName("tr");

    Array.from(rows).forEach(function (row) {

        let text = row.innerText.toLowerCase();

        row.style.display =
            text.includes(searchTerm)
            ? ""
            : "none";
    });

});