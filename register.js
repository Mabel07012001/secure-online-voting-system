import { apiRegister, apiSendOTP } from "./api.js";

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const birthdate = document.getElementById("birthdate").value;
        const registerButton = document.getElementById("registerButton");

        if (!username || !email || !password || !confirmPassword || !birthdate) {
            alert("Please fill in all fields.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        const birthDate = new Date(birthdate);
        const today = new Date();

        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (age < 18) {
            alert("❌ You must be at least 18 years old to register.");
            return;
        }

        if (age > 120) {
            alert("❌ Invalid date of birth.");
            return;
        }

        registerButton.disabled = true;
        registerButton.textContent = "Registering...";

        try {
            const result = await apiRegister(username, email, password);

            if (!result.success) {
                alert("Registration failed: " + result.message);
                registerButton.disabled = false;
                registerButton.textContent = "Register";
                return;
            }

            const otpResult = await apiSendOTP(email);

            if (!otpResult.success) {
                alert("Account created, but OTP was not sent: " + otpResult.message);
                registerButton.disabled = false;
                registerButton.textContent = "Register";
                return;
            }

            sessionStorage.setItem("pendingEmail", email);
            sessionStorage.setItem("pendingUsername", username);

            alert("✅ Registration successful! Check your email for the OTP code.");
            window.location.href = "OTP.html";

        } catch (error) {
            console.error("Registration error:", error);
            alert("Could not connect to server. Is the backend running?");
            registerButton.disabled = false;
            registerButton.textContent = "Register";
        }
    });
}