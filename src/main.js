import "./style.css";
import { GameManager } from "./game/GameManager.js";
import { GAME_STATE } from "./game/constants.js";

const canvas = document.getElementById("game-canvas");
const screenMenu = document.getElementById("screen-menu");
const screenGameOver = document.getElementById("screen-gameover");
const screenShop = document.getElementById("screen-shop");
const btnPlay = document.getElementById("btn-play");
const btnRetry = document.getElementById("btn-retry");
const btnMenu = document.getElementById("btn-menu");
const btnShop = document.getElementById("btn-shop");
const btnShopClose = document.getElementById("btn-shop-close");

const SCREENS_BY_STATE = {
  [GAME_STATE.MENU]: screenMenu,
  [GAME_STATE.GAME_OVER]: screenGameOver,
  [GAME_STATE.SHOP]: screenShop,
  [GAME_STATE.PLAYING]: null,
};

function showScreenForState(state) {
  for (const screen of [screenMenu, screenGameOver, screenShop]) {
    screen.classList.add("hidden");
  }
  const active = SCREENS_BY_STATE[state];
  if (active) active.classList.remove("hidden");
}

const game = new GameManager(canvas, {
  onStateChange: showScreenForState,
});

btnPlay.addEventListener("click", () => game.start());
btnRetry.addEventListener("click", () => game.start());
btnMenu.addEventListener("click", () => game.returnToMenu());
btnShop.addEventListener("click", () => game.openShop());
btnShopClose.addEventListener("click", () => game.returnToMenu());

showScreenForState(GAME_STATE.MENU);

function loop() {
  game.update();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
