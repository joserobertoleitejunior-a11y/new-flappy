import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// Controle alternativo por câmera, dois gestos independentes: abrir a boca
// dispara "flap" (sobe), levantar a sobrancelha dispara "dive" (mergulha).
// NUNCA substitui o toque — é opt-in, o jogador liga explicitamente num
// botão do menu (acessibilidade não é exceção, padrões §5). Roda 100%
// local no navegador via WASM (MediaPipe) — nenhum vídeo/imagem sai do
// aparelho.
//
// Carregado 100% sob demanda: zero WASM/modelo baixado, zero custo de CPU,
// enquanto o jogador não ativa (spec §9.1 — lazy loading).
const WASM_BASE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const DETECTION_INTERVAL_MS = 120; // ~8x/seg — gesto facial é lento, não precisa de 60Hz (poupa CPU)
const GESTURE_ON_THRESHOLD = 0.55;
const GESTURE_OFF_THRESHOLD = 0.35; // histerese — evita disparo repetido enquanto o gesto continua
const FLAP_CATEGORIES = ["jawOpen"]; // boca aberta
const DIVE_CATEGORIES = ["browInnerUp", "browOuterUpLeft", "browOuterUpRight"]; // sobrancelha levantada

export class CameraInput {
  /** @param {{ onFlap: () => void, onDive: () => void, videoElement: HTMLVideoElement }} deps */
  constructor({ onFlap, onDive, videoElement }) {
    this.onFlap = onFlap;
    this.onDive = onDive;
    this.videoEl = videoElement;
    this.stream = null;
    this.landmarker = null;
    this.running = false;
    this._flapActive = false;
    this._diveActive = false;
    this._loopHandle = null;
    this._lastDetectionAt = 0;
  }

  static isSupported() {
    return Boolean(navigator.mediaDevices?.getUserMedia && window.WebAssembly);
  }

  /** @returns {Promise<boolean>} true se a câmera e o modelo ficaram prontos */
  async start() {
    if (this.running) return true;
    if (!CameraInput.isSupported()) return false;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 320, height: 240 },
        audio: false,
      });
    } catch {
      return false; // permissão negada ou sem câmera — jogo segue normal só com toque
    }

    this.videoEl.srcObject = this.stream;
    await this.videoEl.play();

    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
      this.landmarker = await this._createLandmarker(filesetResolver, "GPU");
    } catch {
      this._stopStream();
      return false;
    }

    this.running = true;
    this._loop();
    return true;
  }

  async _createLandmarker(filesetResolver, delegate) {
    try {
      return await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
      });
    } catch (err) {
      if (delegate === "GPU") return this._createLandmarker(filesetResolver, "CPU");
      throw err;
    }
  }

  stop() {
    this.running = false;
    if (this._loopHandle) cancelAnimationFrame(this._loopHandle);
    this._stopStream();
    this.landmarker?.close();
    this.landmarker = null;
  }

  _stopStream() {
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = null;
    this.videoEl.srcObject = null;
  }

  _loop() {
    if (!this.running) return;
    this._loopHandle = requestAnimationFrame(() => this._loop());

    // Pausa a detecção com a aba escondida — poupa bateria/CPU sem soltar a câmera.
    if (document.hidden) return;

    const now = performance.now();
    if (now - this._lastDetectionAt < DETECTION_INTERVAL_MS) return;
    this._lastDetectionAt = now;

    if (this.videoEl.readyState < 2) return;
    this._processResult(this.landmarker.detectForVideo(this.videoEl, now));
  }

  _processResult(result) {
    const categories = result.faceBlendshapes?.[0]?.categories ?? [];
    const flapScore = this._maxScoreFor(categories, FLAP_CATEGORIES);
    const diveScore = this._maxScoreFor(categories, DIVE_CATEGORIES);

    this._flapActive = this._updateGesture(this._flapActive, flapScore, this.onFlap);
    this._diveActive = this._updateGesture(this._diveActive, diveScore, this.onDive);
  }

  _maxScoreFor(categories, names) {
    let maxScore = 0;
    for (const category of categories) {
      if (names.includes(category.categoryName)) maxScore = Math.max(maxScore, category.score);
    }
    return maxScore;
  }

  /** Histerese: dispara na subida do limiar, só reabilita quando o gesto relaxa de verdade. */
  _updateGesture(active, score, callback) {
    if (!active && score > GESTURE_ON_THRESHOLD) {
      callback?.();
      return true;
    }
    if (active && score < GESTURE_OFF_THRESHOLD) return false;
    return active;
  }
}
