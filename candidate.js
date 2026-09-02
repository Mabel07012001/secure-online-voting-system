function registerCandidate(event) {

    event.preventDefault();

    let name = document.getElementById("name").value;
    let age = document.getElementById("age").value;
    let gender = document.getElementById("gender").value;
    let party = document.getElementById("party").value;
    let position = document.getElementById("position").value;
    let project = document.getElementById("project").value;
    let manifesto = document.getElementById("manifesto").value;
    let email = document.getElementById("email").value;
    let photo = document.getElementById("photo").files[0];

    let reader = new FileReader();

    reader.onload = function () {

        let candidate = {
            name: name,
            age: age,
            gender: gender,
            party: party,
            position: position,
            project: project,
            manifesto: manifesto,
            email: email,
            photo: reader.result,
            votes: 0
        };

        let candidates =
            JSON.parse(localStorage.getItem("candidates")) || [];

        candidates.push(candidate);

        localStorage.setItem(
            "candidates",
            JSON.stringify(candidates)
        );

        document.getElementById("registrationForm").reset();

        document.getElementById("successMessage").style.display = "block";

        alert("Candidate registered successfully!");

        window.location.href = "manage_candidate.html";
    };

    reader.readAsDataURL(photo);
}

document
    .getElementById("registrationForm")
    .addEventListener("submit", registerCandidate);