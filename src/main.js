import "./style.css";
import { GameManager } from "./game/GameManager.js";
import { getBestScore, saveScoreIfBest } from "./game/Storage.js";
import { GAME_STATE } from "./game/constants.js";
import { HUD } from "./ui/HUD.js";

const canvas = document.getElementById("game-canvas");
const hud = new HUD();

const game = new GameManager(canvas, {
  onStateChange: (state) => hud.showScreenForState(state),
  onScoreChange: (score) => hud.setScore(score),
  onGameOver: (score) => {
    const { best } = saveScoreIfBest(score);
    hud.showGameOverSummary(score, best);
    hud.setBest(best);
    hud.setContinueAvailable(!game.continueUsedThisRun);
  },
});

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

function loop() {
  game.update();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
