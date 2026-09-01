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

function loop() {
  game.update();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
