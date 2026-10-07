import {
    apiGetCandidates,
    apiRequestVoteOTP,
    apiVerifyVoteOTP,      // 🆕
    apiVerifyVoteFace,     // 🆕
    apiConfirmVote
} from "./api.js";

import {
    loadFaceModels,
    startCamera,
    stopCamera,
    detectFaceDescriptor,
    startFacePreview
} from "./face-verification.js";

const candidatesContainer = document.getElementById("candidatesContainer");
const voteMessage = document.getElementById("voteMessage");

let selectedCandidateId = null;
let selectedCandidateData = null;
let currentUser = null;

// 🆕 Estado da votação
let pendingVoteOTP = null;         
let faceDescriptor = null;         
let stopPreviewLoop = null;        
let modelsReady = false;           
let faceCameraStarted = false;   

// 🆕 Elementos do modal de face
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
// CARREGAR USER (mantido)
// ============================================================
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

    // 🆕 Pré-carrega os modelos de face em background
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
// CARREGAR CANDIDATOS (mantido)
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
// SELECIONAR CANDIDATO (mantido)
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
// PROCEED TO OTP (mantido)
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
// SUBMIT OTP — AGORA SÓ VALIDA (não vota)
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
        // 🆕 Passo 1: validar OTP (NÃO vota ainda)
        const result = await apiVerifyVoteOTP(currentUser.id, otp);

        if (!result.success) {
            errorEl.textContent = result.message || "Invalid OTP.";
            errorEl.classList.add("show");
            submitBtn.disabled = false;
            submitBtn.textContent = "Confirmar Voto";
            return;
        }

        // OTP válido → guarda para usar no passo final
        pendingVoteOTP = otp;

        successEl.textContent = "✅ Código correto! Prosseguindo para verificação facial...";
        successEl.classList.add("show");

        // Fecha o modal de OTP e abre o de face (após pequeno delay para UX)
        setTimeout(() => {
            closeOTPModal();
            openFaceModal();
        }, 700);

        submitBtn.disabled = false;
        submitBtn.textContent = "Confirmar Voto";

    } catch (error) {
        console.error("Error:", error);
        errorEl.textContent = "Error connecting to server.";
        errorEl.classList.add("show");
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirmar Voto";
    }
}

window.submitOTP = submitOTP;


// ============================================================
// RESEND OTP (mantido)
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
// FACE VERIFICATION — MODAL (NOVO)
// ============================================================

// Abrir o modal de face
async function openFaceModal() {
    // Reset estado
    faceDescriptor = null;
    faceCameraStarted = false;
    faceContinueBtn.disabled = true;
    faceCaptureBtn.disabled = true;
    faceStartBtn.disabled = false;
    faceStartBtn.textContent = "Start Camera";
    faceCameraWrap.classList.remove("active");
    clearFaceStatus();

    faceModal.classList.add("active");

    // Se os modelos ainda não carregaram, avisa
    if (!modelsReady) {
        setFaceStatus("A carregar modelos de deteção facial...", "info");
        try {
            await loadFaceModels();
            modelsReady = true;
            setFaceStatus("Modelos prontos. Clique em 'Start Camera'.", "info");
        } catch (err) {
            setFaceStatus("Não foi possível carregar os modelos. Verifique a sua ligação.", "error");
        }
    } else {
        setFaceStatus("Clique em 'Start Camera' para iniciar a verificação facial.", "info");
    }
}

// Fechar o modal
function closeFaceModal() {
    // Desliga tudo
    if (stopPreviewLoop) { stopPreviewLoop(); stopPreviewLoop = null; }
    stopCamera();
    faceCameraWrap.classList.remove("active");
    faceModal.classList.remove("active");
    clearFaceStatus();
}

window.closeFaceModal = closeFaceModal;

// Botão Start Camera
faceStartBtn.addEventListener("click", async () => {
    if (!modelsReady) {
        setFaceStatus("Modelos ainda a carregar. Aguarde um momento...", "error");
        return;
    }

    faceStartBtn.disabled = true;
    setFaceStatus("A solicitar permissão da câmara...", "info");

    try {
        await startCamera(faceVideo);
        faceCameraWrap.classList.add("active");
        stopPreviewLoop = startFacePreview(faceVideo, faceCanvas);
        faceCameraStarted = true;

        faceCaptureBtn.disabled = false;
        faceStartBtn.textContent = "Camera On";
        setFaceStatus("Câmara ativa. Posicione o rosto dentro do enquadramento.", "info");
    } catch (err) {
        console.error("Camera error:", err);
        faceStartBtn.disabled = false;
        setFaceStatus("Camera permission is required.", "error");
    }
});

// Botão Capture Face
faceCaptureBtn.addEventListener("click", async () => {
    faceCaptureBtn.disabled = true;
    setFaceStatus("A analisar o seu rosto...", "info");

    try {
        const result = await detectFaceDescriptor(faceVideo);

        if (!result.success) {
            setFaceStatus(result.message, "error");
            faceCaptureBtn.disabled = false;
            return;
        }

        // Extrair descriptor
        const descriptor = result.descriptor;

        // Enviar ao backend para comparação
        setFaceStatus("A comparar com o rosto registado...", "info");

        const verify = await apiVerifyVoteFace(currentUser.id, descriptor);

        if (!verify.success) {
            // Falhou a verificação facial
            setFaceStatus(
                "❌ Face verification failed. Please try again." +
                (verify.distance ? ` (distância: ${verify.distance})` : ""),
                "error"
            );
            faceCaptureBtn.disabled = false;
            return;
        }

        // ✅ Face verificada
        faceDescriptor = descriptor;
        setFaceStatus("✅ Face verification successful. Pode confirmar o voto.", "success");

        // Atualizar botões
        faceCaptureBtn.disabled = true;
        faceStartBtn.disabled = true;
        faceContinueBtn.disabled = false;

        // Desligar câmera
        if (stopPreviewLoop) { stopPreviewLoop(); stopPreviewLoop = null; }
        stopCamera();
        faceCameraWrap.classList.remove("active");

        faceHint.textContent = "✅ Verificação concluída. Clique em 'Confirmar Voto'.";

    } catch (err) {
        console.error("Face capture error:", err);
        setFaceStatus("Não foi possível processar a imagem. Tente novamente.", "error");
        faceCaptureBtn.disabled = false;
    }
});

// Botão final: Confirmar Voto (após OTP + Face)
async function confirmVoteAfterFace() {
    if (!pendingVoteOTP) {
        setFaceStatus("Erro: OTP em falta. Recomece o processo.", "error");
        return;
    }

    if (!faceDescriptor) {
        setFaceStatus("Erro: face não verificada. Capture o rosto primeiro.", "error");
        return;
    }

    faceContinueBtn.disabled = true;
    faceContinueBtn.textContent = "A registar voto...";
    setFaceStatus("A registar o seu voto no servidor...", "info");

    try {
        const result = await apiConfirmVote(
            currentUser.id,
            selectedCandidateId,
            pendingVoteOTP
        );

        if (!result.success) {
            setFaceStatus("Erro ao registar voto: " + result.message, "error");
            faceContinueBtn.disabled = false;
            faceContinueBtn.textContent = "Confirmar Voto →";
            return;
        }

        // ✅ VOTO REGISTADO
        setFaceStatus("✅ Voto registado com sucesso!", "success");

        // Guarda a confirmação (mesmo padrão do código antigo)
        sessionStorage.setItem("voteConfirmation", JSON.stringify({
            confirmation_id: result.confirmation_id,
            candidate: result.candidate,
            voted_at: result.voted_at
        }));

        // Atualiza o estado do votante
        currentUser.has_voted = true;
        localStorage.setItem("loggedInVoter", JSON.stringify(currentUser));

        // Redireciona
        setTimeout(() => {
            window.location.href = "vote_confirmation.html";
        }, 900);

    } catch (err) {
        console.error("Confirm vote error:", err);
        setFaceStatus("Erro de ligação ao servidor.", "error");
        faceContinueBtn.disabled = false;
        faceContinueBtn.textContent = "Confirmar Voto →";
    }
}

window.confirmVoteAfterFace = confirmVoteAfterFace;


// ============================================================
// ARRANCA
// ============================================================
loadUser();