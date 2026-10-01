import { apiCreateCandidate } from "./api.js";

const registrationForm = document.getElementById("registrationForm");

async function registerCandidate(event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const age = document.getElementById("age").value;
    const gender = document.getElementById("gender").value;
    const party = document.getElementById("party").value;
    const position = document.getElementById("position").value;
    const project = document.getElementById("project").value.trim();
    const manifesto = document.getElementById("manifesto").value.trim();
    const email = document.getElementById("email").value.trim();
    const photoInput = document.getElementById("photo");
    const photo = photoInput.files[0];

    if (!photo) {
        alert("Please select a candidate photo.");
        return;
    }

    const reader = new FileReader();

    reader.onload = async function () {
        const photoBase64 = reader.result;

        try {
            const result = await apiCreateCandidate({
                full_name: name,
                age: Number(age),
                gender: gender,
                party: party,
                position: position,
                project: project,
                manifesto: manifesto,
                email: email,
                photo: photoBase64
            });

            if (!result.success) {
                alert("Error: " + result.message);
                return;
            }

            alert("Candidate registered successfully!");
            window.location.href = "manage_candidate.html";

        } catch (error) {
            console.error("Error:", error);
            alert("Could not connect to the server.");
        }
    };

    reader.readAsDataURL(photo);
}

if (registrationForm) {
    registrationForm.addEventListener("submit", registerCandidate);
}

const photoInput = document.getElementById("photo");

if (photoInput) {
    photoInput.addEventListener("change", function () {
        const photo = this.files[0];
        const preview = document.getElementById("photoPreview");

        if (!photo) {
            preview.style.display = "none";
            preview.removeAttribute("src");
            return;
        }

        const reader = new FileReader();
        reader.onload = function () {
            preview.src = reader.result;
            preview.style.display = "block";
        };
        reader.readAsDataURL(photo);
    });
}