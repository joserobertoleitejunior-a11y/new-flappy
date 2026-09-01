import "./style.css";
import { GameManager } from "./game/GameManager.js";
import { getBestScore, getSelectedSkin, saveScoreIfBest } from "./game/Storage.js";
import { GAME_STATE } from "./game/constants.js";
import { DEFAULT_SKIN_ID, SKINS } from "./game/skins.js";
import { HUD } from "./ui/HUD.js";
import { Shop } from "./ui/Shop.js";

const canvas = document.getElementById("game-canvas");
const hud = new HUD();

const game = new GameManager(canvas, {
  onStateChange: (state) => {
    hud.showScreenForState(state);
    if (state === GAME_STATE.SHOP) shop.render();
  },
  onScoreChange: (score) => hud.setScore(score),
  onGameOver: (score) => {
    const { best } = saveScoreIfBest(score);
    hud.showGameOverSummary(score, best);
    hud.setBest(best);
    hud.setContinueAvailable(!game.continueUsedThisRun);
  },
});

const shop = new Shop({
  ads: game.ads,
  onSkinChange: (skin) => game.bird.setColor(skin.color),
});

const initialSkin = SKINS.find((skin) => skin.id === getSelectedSkin());
game.bird.setColor((initialSkin ?? SKINS.find((skin) => skin.id === DEFAULT_SKIN_ID)).color);

hud.setScore(0);
hud.setBest(getBestScore());
hud.setMuted(game.audio.isMuted());
hud.showScreenForState(GAME_STATE.MENU);

document.getElementById("btn-play").addEventListener("click", () => game.start());
document.getElementById("btn-retry").addEventListener("click", () => game.start());
document.getElementById("btn-menu").addEventListener("click", () => game.returnToMenu());
document.getElementById("btn-shop").addEventListener("click", () => game.openShop());
document.getElementById("btn-shop-close").addEventListener("click", () => game.returnToMenu());
document.getElementById("btn-mute").addEventListener("click", () => {
  game.audio.unlock();
  hud.setMuted(game.audio.toggleMuted());
});
document.getElementById("btn-continue").addEventListener("click", async () => {
  const resumed = await game.continueWithAd();
  hud.setContinueAvailable(!resumed && !game.continueUsedThisRun);
});

// Controle alternativo por câmera (opt-in, nunca substitui o toque/teclado)
// — abrir a boca bate as asas (sobe), levantar a sobrancelha mergulha
// (fecha as asas, desce rápido). Import dinâmico: o wrapper JS do
// MediaPipe (~140KB) só entra no bundle se o jogador realmente clicar
// aqui — sem isso, ele iria pro chunk principal e pesaria no primeiro
// load de todo mundo (spec §9.1: lazy loading vale pro código, não só
// pra assets 3D/áudio).
const btnCameraControl = document.getElementById("btn-camera-control");
const cameraStatusEl = document.getElementById("camera-status");
const cameraPreviewEl = document.getElementById("camera-preview");
let cameraInput = null;

function setCameraStatus(text, isError = false) {
  cameraStatusEl.textContent = text;
  cameraStatusEl.classList.toggle("hidden", !text);
  cameraStatusEl.classList.toggle("camera-status-error", isError);
}

btnCameraControl.addEventListener("click", async () => {
  if (cameraInput?.running) {
    cameraInput.stop();
    cameraPreviewEl.classList.add("hidden");
    btnCameraControl.setAttribute("aria-pressed", "false");
    setCameraStatus("");
    return;
  }

  setCameraStatus("Carregando controle por câmera...");
  if (!cameraInput) {
    const { CameraInput } = await import("./game/CameraInput.js");
    cameraInput = new CameraInput({
      onFlap: () => game.flap(),
      onDive: () => game.dive(),
      videoElement: cameraPreviewEl,
    });
  }

  setCameraStatus("Ligando câmera...");
  const started = await cameraInput.start();
  if (started) {
    cameraPreviewEl.classList.remove("hidden");
    btnCameraControl.setAttribute("aria-pressed", "true");
    setCameraStatus(
      "Câmera ativa — abra a boca pra bater asas, levante a sobrancelha pra mergulhar.",
    );
  } else {
    setCameraStatus(
      "Não foi possível ligar a câmera — o toque na tela continua funcionando.",
      true,
    );
  }
});

function loop() {
  game.update();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
