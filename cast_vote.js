import { apiGetCandidates, apiRequestVoteOTP, apiConfirmVote } from "./api.js";

const candidatesContainer = document.getElementById("candidatesContainer");
const voteMessage = document.getElementById("voteMessage");

let selectedCandidateId = null;
let selectedCandidateData = null;
let currentUser = null;

function loadUser() {
    const voterData = localStorage.getItem("loggedInVoter");

    if (!voterData) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    let voter;
    try {
        voter = JSON.parse(voterData);
    } catch (e) {
        console.error("Error reading localStorage:", e);
        localStorage.removeItem("loggedInVoter");
        alert("Invalid session. Please login again.");
        window.location.href = "login.html";
        return;
    }

    if (!voter || !voter.id) {
        localStorage.removeItem("loggedInVoter");
        alert("Invalid session. Please login again.");
        window.location.href = "login.html";
        return;
    }

    currentUser = voter;
    console.log("Logged voter:", currentUser);

    if (currentUser.has_voted) {
        candidatesContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <h3 style="color: #16a34a;">You have already voted!</h3>
                <p>Voting more than once is not allowed.</p>
                <a href="result.html" class="btn" style="margin-top: 20px; display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 10px; font-weight: 600;">
                    View Results
                </a>
            </div>
        `;
        return;
    }

    loadCandidates();
}

async function loadCandidates() {
    try {
        const result = await apiGetCandidates();

        if (!result.success || !result.candidates || result.candidates.length === 0) {
            candidatesContainer.innerHTML = "<p>No candidates available.</p>";
            return;
        }

        candidatesContainer.innerHTML = "";

        result.candidates.forEach(candidate => {
            const card = document.createElement("div");
            card.className = "candidate-card";

            card.innerHTML = `
                ${candidate.photo
                    ? `<img src="${candidate.photo}" class="candidate-photo" alt="${candidate.full_name}">`
                    : `<div style="width:120px;height:120px;border-radius:50%;background:#e2e8f0;margin:0 auto 15px;display:flex;align-items:center;justify-content:center;font-size:40px;">👤</div>`}
                <h3>${candidate.full_name}</h3>
                <p><strong>Party:</strong> ${candidate.party || "N/A"}</p>
                <p><strong>Position:</strong> ${candidate.position || "N/A"}</p>
                <p style="font-size:13px;color:#64748b;margin-top:10px;">${candidate.project || ""}</p>
                <div class="candidate-radio">
                    <input type="radio" name="candidate" value="${candidate.id}">
                    Select Candidate
                </div>
            `;

            card.addEventListener("click", () => selectCandidate(candidate, card));
            candidatesContainer.appendChild(card);
        });

    } catch (error) {
        console.error("Error:", error);
        candidatesContainer.innerHTML = "<p>Backend is not running.</p>";
    }
}

function selectCandidate(candidate, selectedCard) {
    selectedCandidateId = candidate.id;
    selectedCandidateData = candidate;

    document.querySelectorAll(".candidate-card").forEach(card => {
        card.classList.remove("selected");
    });

    selectedCard.classList.add("selected");
    selectedCard.querySelector("input[type='radio']").checked = true;

    openConfirmModal(candidate);
}

function openConfirmModal(candidate) {
    const info = document.getElementById("confirmCandidateInfo");
    info.innerHTML = `
        <h3>${candidate.full_name}</h3>
        <p><strong>Party:</strong> ${candidate.party || "N/A"}</p>
        <p><strong>Position:</strong> ${candidate.position || "N/A"}</p>
    `;
    document.getElementById("confirmModal").classList.add("active");
}

function closeConfirmModal() {
    document.getElementById("confirmModal").classList.remove("active");
    document.querySelectorAll(".candidate-card").forEach(card => {
        card.classList.remove("selected");
    });
}

window.closeConfirmModal = closeConfirmModal;

async function proceedToOTP() {
    const confirmBtn = document.getElementById("confirmBtn");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Sending code...";

    try {
        const result = await apiRequestVoteOTP(currentUser.id, selectedCandidateId);

        if (!result.success) {
            alert("Error: " + result.message);
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirm Vote →";
            return;
        }

        console.log("OTP requested:", result);

        closeConfirmModal();
        document.getElementById("otpModal").classList.add("active");
        document.getElementById("voteOtpInput").value = "";
        document.getElementById("voteOtpInput").focus();
        document.getElementById("otpError").classList.remove("show");
        document.getElementById("otpSuccess").classList.remove("show");

    } catch (error) {
        console.error("Error:", error);
        alert("Error connecting to server.");
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirm Vote →";
    }
}

window.proceedToOTP = proceedToOTP;

function closeOTPModal() {
    document.getElementById("otpModal").classList.remove("active");
}

window.closeOTPModal = closeOTPModal;

async function submitOTP() {
    const otp = document.getElementById("voteOtpInput").value.trim();
    const errorEl = document.getElementById("otpError");
    const successEl = document.getElementById("otpSuccess");
    const submitBtn = document.getElementById("otpSubmitBtn");

    errorEl.classList.remove("show");
    successEl.classList.remove("show");

    if (!otp || otp.length !== 6) {
        errorEl.textContent = "Enter the 6-digit code.";
        errorEl.classList.add("show");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Verifying...";

    try {
        const result = await apiConfirmVote(currentUser.id, selectedCandidateId, otp);

        if (!result.success) {
            errorEl.textContent = result.message || "Invalid OTP.";
            errorEl.classList.add("show");
            submitBtn.disabled = false;
            submitBtn.textContent = "Confirm Vote";
            return;
        }

        successEl.textContent = "✅ Vote recorded!";
        successEl.classList.add("show");

        sessionStorage.setItem("voteConfirmation", JSON.stringify({
            confirmation_id: result.confirmation_id,
            candidate: result.candidate,
            voted_at: result.voted_at
        }));

        currentUser.has_voted = true;
        localStorage.setItem("loggedInVoter", JSON.stringify(currentUser));

        setTimeout(() => {
            window.location.href = "vote_confirmation.html";
        }, 800);

    } catch (error) {
        console.error("Error:", error);
        errorEl.textContent = "Error connecting to server.";
        errorEl.classList.add("show");
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirm Vote";
    }
}

window.submitOTP = submitOTP;

async function resendOTP(event) {
    event.preventDefault();

    try {
        const result = await apiRequestVoteOTP(currentUser.id, selectedCandidateId);

        if (result.success) {
            const successEl = document.getElementById("otpSuccess");
            successEl.textContent = "📩 New code sent!";
            successEl.classList.add("show");
            setTimeout(() => successEl.classList.remove("show"), 3000);
        }
    } catch (error) {
        console.error(error);
    }
}

window.resendOTP = resendOTP;

loadUser();