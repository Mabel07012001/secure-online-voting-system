// ============================================================
// face-verification.js
// Módulo compartilhado: carregar modelos, ligar câmera,
// detectar rosto, extrair descriptor (128 números).
// ============================================================

// Modelos servidos pelo backend local (offline)
const MODEL_URL = "http://localhost:1977/face-api/models";

const MIN_DETECTION_SCORE = 0.5;    // confiança mínima da deteção
const INPUT_SIZE = 320;              // 320 = mais rápido | 416 = mais preciso

let modelsLoaded = false;
let currentStream = null;

// ============================================================
// 1. Carregar modelos (uma vez por sessão)
// ============================================================
export async function loadFaceModels() {
    if (modelsLoaded) return;

    if (typeof faceapi === "undefined") {
        throw new Error("face-api.js não foi carregado. Verifica o <script> no HTML.");
    }

    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

    modelsLoaded = true;
}

// ============================================================
// 2. Ligar câmera
// ============================================================
export async function startCamera(videoEl) {
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera permission is required.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false
    });

    videoEl.srcObject = stream;
    await videoEl.play();
    currentStream = stream;
    return stream;
}

// ============================================================
// 3. Desligar câmera
// ============================================================
export function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
}

// ============================================================
// 4. Detetar 1 rosto + extrair descriptor
// ============================================================
export async function detectFaceDescriptor(videoEl) {
    if (!modelsLoaded) {
        throw new Error("Modelos ainda não foram carregados.");
    }

    const allDetections = await faceapi
        .detectAllFaces(videoEl, new faceapi.TinyFaceDetectorOptions({
            inputSize: INPUT_SIZE,
            scoreThreshold: MIN_DETECTION_SCORE
        }))
        .withFaceLandmarks()
        .withFaceDescriptors();

    if (!allDetections || allDetections.length === 0) {
        return { success: false, message: "No face detected. Please look at the camera." };
    }

    if (allDetections.length > 1) {
        return { success: false, message: "Multiple faces detected. Only one person should be in frame." };
    }

    const detection = allDetections[0];

    return {
        success: true,
        descriptor: Array.from(detection.descriptor),
        box: detection.detection.box,
        score: detection.detection.score
    };
}

// ============================================================
// 5. Loop de pré-visualização: desenha o quadrado verde no rosto
// ============================================================
export function startFacePreview(videoEl, canvasEl) {
    const displaySize = { width: videoEl.videoWidth || 640, height: videoEl.videoHeight || 480 };
    faceapi.matchDimensions(canvasEl, displaySize);

    let running = true;

    const loop = async () => {
        if (!running || !videoEl.srcObject) return;

        try {
            const detection = await faceapi
                .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({
                    inputSize: INPUT_SIZE,
                    scoreThreshold: MIN_DETECTION_SCORE
                }))
                .withFaceLandmarks();

            const ctx = canvasEl.getContext("2d");
            ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

            if (detection) {
                const resized = faceapi.resizeResults(detection, displaySize);
                faceapi.draw.drawDetections(canvasEl, [resized]);
                faceapi.draw.drawFaceLandmarks(canvasEl, [resized]);
            }
        } catch (e) {
            // ignora erros do loop
        }

        if (running) setTimeout(loop, 200);
    };

    loop();

    return () => { running = false; };
}