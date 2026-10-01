import { apiVerifyOTP, apiSendOTP } from "./api.js";

const otpForm = document.getElementById("otpForm");
const otpInput = document.getElementById("otp");
const verifyButton = document.getElementById("verifyButton");
const resendOtp = document.getElementById("resendOtp");
const otpMessage = document.getElementById("otpMessage");

const email = sessionStorage.getItem("pendingEmail");
const username = sessionStorage.getItem("pendingUsername");

if (!email) {
    alert("Registration session expired. Please register again.");
    window.location.href = "Register.html";
}

function showMessage(text, type = "error") {
    if (!otpMessage) return;
    otpMessage.textContent = text;
    otpMessage.className = "otp-message " + type;
}

if (otpForm) {
    otpForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const token = otpInput.value.trim();

        if (!token) {
            showMessage("Enter the OTP code.");
            return;
        }

        if (!/^\d{6}$/.test(token)) {
            showMessage("OTP must contain exactly 6 digits.");
            return;
        }

        verifyButton.disabled = true;
        verifyButton.textContent = "Verifying...";

        try {
            const result = await apiVerifyOTP(email, token);

            if (!result.success) {
                showMessage(result.message || "Invalid or expired OTP.");
                verifyButton.disabled = false;
                verifyButton.textContent = "Verify OTP";
                return;
            }

            showMessage("✅ Email verified! Redirecting...", "success");

            sessionStorage.removeItem("pendingEmail");
            sessionStorage.removeItem("pendingUsername");

            setTimeout(() => {
                alert("Registration complete! Please login.");
                window.location.href = "login.html";
            }, 800);

        } catch (error) {
            console.error("OTP error:", error);
            showMessage("Error connecting to server.");
            verifyButton.disabled = false;
            verifyButton.textContent = "Verify OTP";
        }
    });
}

if (resendOtp) {
    resendOtp.addEventListener("click", async function (event) {
        event.preventDefault();

        if (!email) {
            showMessage("Session expired. Please register again.");
            return;
        }

        try {
            const result = await apiSendOTP(email);

            if (!result.success) {
                showMessage("Error: " + result.message);
                return;
            }

            showMessage("📩 New code sent to your email!", "success");

        } catch (error) {
            console.error("Resend error:", error);
            showMessage("Error connecting to server.");
        }
    });
}