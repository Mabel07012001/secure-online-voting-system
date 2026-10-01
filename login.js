import { apiLogin } from "./api.js";

async function login(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please enter your email and password.");
        return;
    }

    console.log("Attempting login with:", email);

    try {
        const result = await apiLogin(email, password);
        console.log("Backend response:", result);

        if (!result.success) {
            alert(result.message || "Invalid email or password.");
            return;
        }

        if (!result.voter) {
            console.error("Backend did not return voter.");

            alert(
                "⚠️ Error: Your voter profile does not exist.\n\n" +
                "Contact the administrator or register again."
            );
            return;
        }

        localStorage.setItem("loggedInVoter", JSON.stringify(result.voter));
        localStorage.setItem("authToken", result.token || "");

        console.log("Login OK. Voter saved:", result.voter);

        alert("Login successful!");
        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Login error:", error);
        alert("Could not connect to server. Is the backend running?");
    }
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", login);
}