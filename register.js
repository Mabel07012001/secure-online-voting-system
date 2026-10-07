import { apiRegister, apiSendOTP, apiRegisterFace } from "./api.js";
import {
    loadFaceModels,
    startCamera,
    stopCamera,
    detectFaceDescriptor,
    startFacePreview
} from "./face-verification.js";

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    // ============================================================
    // ESTADO DA CAPTURA FACIAL
    // ============================================================
    let faceDescriptor = null;         // vetor de 128 números
    let stopPreviewLoop = null;        // função para cancelar o loop
    let modelsReady = false;

    // Elementos da UI
    const startCameraBtn = document.getElementById("startCameraBtn");
    const captureFaceBtn = document.getElementById("captureFaceBtn");
    const faceStatus     = document.getElementById("faceStatus");
    const cameraWrap     = document.getElementById("cameraWrap");
    const faceVideo      = document.getElementById("faceVideo");
    const faceCanvas     = document.getElementById("faceCanvas");

    // ============================================================
    // HELPERS DE UI
    // ============================================================
    function setFaceStatus(message, type = "info") {
        faceStatus.textContent = message;
        faceStatus.className = "face-status show " + type;
    }

    function clearFaceStatus() {
        faceStatus.className = "face-status";
        faceStatus.textContent = "";
    }

    // ============================================================
    // CARREGAR MODELOS AO ABRIR A PÁGINA
    // ============================================================
    (async () => {
        try {
            setFaceStatus("Loading face detection models...", "info");
            await loadFaceModels();
            modelsReady = true;
            setFaceStatus("Face models ready. Click 'Start Camera' to continue.", "info");
        } catch (err) {
            console.error("Model load error:", err);
            setFaceStatus("Could not load face models. Check your internet connection.", "error");
        }
    })();

    // ============================================================
    // START CAMERA
    // ============================================================
    startCameraBtn.addEventListener("click", async () => {
        if (!modelsReady) {
            setFaceStatus("Face models are still loading. Please wait...", "error");
            return;
        }

        startCameraBtn.disabled = true;
        setFaceStatus("Requesting camera permission...", "info");

        try {
            await startCamera(faceVideo);
            cameraWrap.classList.add("active");
            stopPreviewLoop = startFacePreview(faceVideo, faceCanvas);

            captureFaceBtn.disabled = false;
            setFaceStatus("Camera active. Position your face inside the frame.", "info");
        } catch (err) {
            console.error("Camera error:", err);
            startCameraBtn.disabled = false;
            setFaceStatus("Camera permission is required.", "error");
        }
    });

    // ============================================================
    // CAPTURE FACE
    // ============================================================
    captureFaceBtn.addEventListener("click", async () => {
        captureFaceBtn.disabled = true;
        setFaceStatus("Analyzing your face...", "info");

        try {
            const result = await detectFaceDescriptor(faceVideo);

            if (!result.success) {
                setFaceStatus(result.message, "error");
                captureFaceBtn.disabled = false;
                return;
            }

            faceDescriptor = result.descriptor;

            setFaceStatus("✅ Face captured successfully. You can now register.", "success");

            // Desliga a câmera e o loop
            if (stopPreviewLoop) stopPreviewLoop();
            stopCamera();
            cameraWrap.classList.remove("active");

            captureFaceBtn.disabled = true;
            startCameraBtn.disabled = false;
            startCameraBtn.textContent = "Retake Face";

        } catch (err) {
            console.error("Capture error:", err);
            setFaceStatus("Could not process the image. Try again.", "error");
            captureFaceBtn.disabled = false;
        }
    });

    // ============================================================
    // SUBMIT DO FORMULÁRIO
    // ============================================================
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username        = document.getElementById("username").value.trim();
        const email           = document.getElementById("email").value.trim();
        const password        = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const birthdate       = document.getElementById("birthdate").value;
        const registerButton  = document.getElementById("registerButton");

        // ---- Validações existentes (mantidas) ----
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

        // ---- 🆕 Bloqueia se a face ainda não foi capturada ----
        if (!faceDescriptor) {
            alert("⚠️ Please capture your face before registering.");
            setFaceStatus("Face capture is required before registering.", "error");
            // Leva o utilizador até à secção de face
            document.querySelector(".face-section").scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        // ---- Prossegue com o registo ----
        registerButton.disabled = true;
        registerButton.textContent = "Registering...";

        try {
            // 1. Cria a conta
            const result = await apiRegister(username, email, password);

            if (!result.success) {
                alert("Registration failed: " + result.message);
                registerButton.disabled = false;
                registerButton.textContent = "Register";
                return;
            }

            // 2. 🆕 Guarda o descriptor facial (server-side match)
            const voterId = result.userId;
            const faceResult = await apiRegisterFace(voterId, faceDescriptor);

            if (!faceResult.success) {
                alert("Account created, but face registration failed: " + faceResult.message);
                // Não bloqueia o fluxo — o votante pode tentar de novo no login
                console.warn("Face registration failed:", faceResult.message);
            }

            // 3. Envia o OTP por email
            const otpResult = await apiSendOTP(email);

            if (!otpResult.success) {
                alert("Account created, but OTP was not sent: " + otpResult.message);
                registerButton.disabled = false;
                registerButton.textContent = "Register";
                return;
            }

            // 4. Guarda em sessionStorage e redireciona
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