import {
    apiGetCandidates,
    apiRequestVoteOTP,
    apiVerifyVoteOTP,
    apiVerifyVoteFace,
    apiConfirmVote
} from "./api.js";

import {
    loadFaceModels,
    startCamera,
    stopCamera,
    detectFaceDescriptor,
    startFacePreview
} from "./face-verification.js";

import { requireLogin } from "./auth-guard.js";

const candidatesContainer = document.getElementById("candidatesContainer");
const voteMessage = document.getElementById("voteMessage");

let selectedCandidateId = null;
let selectedCandidateData = null;
let currentUser = null;

// Estado da votação
let pendingVoteOTP = null;
let faceDescriptor = null;
let stopPreviewLoop = null;
let modelsReady = false;
let faceCameraStarted = false;

// Elementos do modal de face
const faceModal        = document.getElementById("faceModal");
const faceCameraWrap   = document.getElementById("faceCameraWrap");
const faceVideo        = document.getElementById("faceVideo");
const faceCanvas       = document.getElementById("faceCanvas");
const faceStartBtn     = document.getElementById("faceStartBtn");
const faceCaptureBtn   = document.getElementById("faceCaptureBtn");
const faceStatus       = document.getElementById("faceStatus");
const faceContinueBtn  = document.getElementById("faceContinueBtn");
const faceHint         = document.getElementById("faceHint");


// ============================================================
// HELPERS DE UI DO MODAL DE FACE
// ============================================================
function setFaceStatus(msg, type = "info") {
    faceStatus.textContent = msg;
    faceStatus.className = "face-modal-status show " + type;
}

function clearFaceStatus() {
    faceStatus.className = "face-modal-status";
    faceStatus.textContent = "";
}


// ============================================================
// CARREGAR USER (atualizado — usa auth-guard)
// ============================================================
function loadUser() {
    currentUser = requireLogin();
    if (!currentUser) return;

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

    // Pré-carrega os modelos de face em background
    (async () => {
        try {
            await loadFaceModels();
            modelsReady = true;
            console.log("Face models loaded and ready.");
        } catch (err) {
            console.error("Failed to load face models:", err);
        }
    })();
}


// ============================================================
// CARREGAR CANDIDATOS
// ============================================================
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


// ============================================================
// SELECIONAR CANDIDATO
// ============================================================
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


// ============================================================
// PROCEED TO OTP
// ============================================================
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


// ============================================================
// SUBMIT OTP — SÓ VALIDA (não vota)
// ============================================================
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
        const result = await apiVerifyVoteOTP(currentUser.id, otp);

        if (!result.success) {
            errorEl.textContent = result.message || "Invalid OTP.";
            errorEl.classList.add("show");
            submitBtn.disabled = false;
            submitBtn.textContent = "Confirm Vote";
            return;
        }

        pendingVoteOTP = otp;

        successEl.textContent = "✅ Code correct! Proceeding to face verification...";
        successEl.classList.add("show");

        setTimeout(() => {
            closeOTPModal();
            openFaceModal();
        }, 700);

        submitBtn.disabled = false;
        submitBtn.textContent = "Confirm Vote";

    } catch (error) {
        console.error("Error:", error);
        errorEl.textContent = "Error connecting to server.";
        errorEl.classList.add("show");
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirm Vote";
    }
}

window.submitOTP = submitOTP;


// ============================================================
// RESEND OTP
// ============================================================
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


// ============================================================
// FACE VERIFICATION — MODAL
// ============================================================
async function openFaceModal() {
    faceDescriptor = null;
    faceCameraStarted = false;
    faceContinueBtn.disabled = true;
    faceCaptureBtn.disabled = true;
    faceStartBtn.disabled = false;
    faceStartBtn.textContent = "Start Camera";
    faceCameraWrap.classList.remove("active");
    clearFaceStatus();

    faceModal.classList.add("active");

    if (!modelsReady) {
        setFaceStatus("Loading face detection models...", "info");
        try {
            await loadFaceModels();
            modelsReady = true;
            setFaceStatus("Models ready. Click 'Start Camera'.", "info");
        } catch (err) {
            setFaceStatus("Could not load face models. Check your connection.", "error");
        }
    } else {
        setFaceStatus("Click 'Start Camera' to begin face verification.", "info");
    }
}

function closeFaceModal() {
    if (stopPreviewLoop) { stopPreviewLoop(); stopPreviewLoop = null; }
    stopCamera();
    faceCameraWrap.classList.remove("active");
    faceModal.classList.remove("active");
    clearFaceStatus();
}

window.closeFaceModal = closeFaceModal;

faceStartBtn.addEventListener("click", async () => {
    if (!modelsReady) {
        setFaceStatus("Models still loading. Please wait...", "error");
        return;
    }

    faceStartBtn.disabled = true;
    setFaceStatus("Requesting camera permission...", "info");

    try {
        await startCamera(faceVideo);
        faceCameraWrap.classList.add("active");
        stopPreviewLoop = startFacePreview(faceVideo, faceCanvas);
        faceCameraStarted = true;

        faceCaptureBtn.disabled = false;
        faceStartBtn.textContent = "Camera On";
        setFaceStatus("Camera active. Position your face inside the frame.", "info");
    } catch (err) {
        console.error("Camera error:", err);
        faceStartBtn.disabled = false;
        setFaceStatus("Camera permission is required.", "error");
    }
});

faceCaptureBtn.addEventListener("click", async () => {
    faceCaptureBtn.disabled = true;
    setFaceStatus("Analyzing your face...", "info");

    try {
        const result = await detectFaceDescriptor(faceVideo);

        if (!result.success) {
            setFaceStatus(result.message, "error");
            faceCaptureBtn.disabled = false;
            return;
        }

        const descriptor = result.descriptor;

        setFaceStatus("Comparing with the registered face...", "info");

        const verify = await apiVerifyVoteFace(currentUser.id, descriptor);

        if (!verify.success) {
            setFaceStatus(
                "❌ Face verification failed. Please try again." +
                (verify.distance ? ` (distance: ${verify.distance})` : ""),
                "error"
            );
            faceCaptureBtn.disabled = false;
            return;
        }

        faceDescriptor = descriptor;
        setFaceStatus("✅ Face verification successful. You can confirm your vote.", "success");

        faceCaptureBtn.disabled = true;
        faceStartBtn.disabled = true;
        faceContinueBtn.disabled = false;

        if (stopPreviewLoop) { stopPreviewLoop(); stopPreviewLoop = null; }
        stopCamera();
        faceCameraWrap.classList.remove("active");

        faceHint.textContent = "✅ Verification complete. Click 'Confirm Vote'.";

    } catch (err) {
        console.error("Face capture error:", err);
        setFaceStatus("Could not process the image. Try again.", "error");
        faceCaptureBtn.disabled = false;
    }
});

async function confirmVoteAfterFace() {
    if (!pendingVoteOTP) {
        setFaceStatus("Error: missing OTP. Please restart the process.", "error");
        return;
    }

    if (!faceDescriptor) {
        setFaceStatus("Error: face not verified. Capture your face first.", "error");
        return;
    }

    faceContinueBtn.disabled = true;
    faceContinueBtn.textContent = "Recording vote...";
    setFaceStatus("Recording your vote on the server...", "info");

    try {
        const result = await apiConfirmVote(
            currentUser.id,
            selectedCandidateId,
            pendingVoteOTP
        );

        if (!result.success) {
            setFaceStatus("Error recording vote: " + result.message, "error");
            faceContinueBtn.disabled = false;
            faceContinueBtn.textContent = "Confirm Vote →";
            return;
        }

        setFaceStatus("✅ Vote recorded successfully!", "success");

        sessionStorage.setItem("voteConfirmation", JSON.stringify({
            confirmation_id: result.confirmation_id,
            candidate: result.candidate,
            voted_at: result.voted_at
        }));

        currentUser.has_voted = true;
        localStorage.setItem("loggedInVoter", JSON.stringify(currentUser));

        setTimeout(() => {
            window.location.href = "vote_confirmation.html";
        }, 900);

    } catch (err) {
        console.error("Confirm vote error:", err);
        setFaceStatus("Error connecting to server.", "error");
        faceContinueBtn.disabled = false;
        faceContinueBtn.textContent = "Confirm Vote →";
    }
}

window.confirmVoteAfterFace = confirmVoteAfterFace;


// ============================================================
// ARRANCA
// ============================================================
loadUser();