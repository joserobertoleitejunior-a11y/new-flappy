import { GAME_STATE } from "../game/constants.js";

// Camada de UI: placar em tempo real, troca de telas (menu/game over/loja)
// e textos de resumo — mantém DOM fora do GameManager (que só cuida de
// jogo/física/colisão).
export class HUD {
  constructor() {
    this.elScore = document.getElementById("hud-score");
    this.elBest = document.getElementById("hud-best");
    this.elGameOverScore = document.getElementById("gameover-score");
    this.elGameOverBest = document.getElementById("gameover-best");
    this.elMuteButton = document.getElementById("btn-mute");
    this.elContinueButton = document.getElementById("btn-continue");

    this.screens = {
      [GAME_STATE.MENU]: document.getElementById("screen-menu"),
      [GAME_STATE.GAME_OVER]: document.getElementById("screen-gameover"),
      [GAME_STATE.SHOP]: document.getElementById("screen-shop"),
      [GAME_STATE.PLAYING]: null,
    };
  }

  showScreenForState(state) {
    for (const screen of Object.values(this.screens)) {
      screen?.classList.add("hidden");
    }
    this.screens[state]?.classList.remove("hidden");
  }

  setScore(score) {
    this.elScore.textContent = String(score);
  }

  setBest(best) {
    this.elBest.textContent = `Recorde: ${best}`;
  }

  showGameOverSummary(score, best) {
    this.elGameOverScore.textContent = `Pontuação: ${score}`;
    this.elGameOverBest.textContent = `Recorde: ${best}`;
  }

  setMuted(muted) {
    this.elMuteButton.textContent = muted ? "🔇" : "🔊";
    this.elMuteButton.setAttribute(
      "aria-label",
      muted ? "Ativar música e efeitos" : "Silenciar música e efeitos",
    );
  }

  setContinueAvailable(available) {
    this.elContinueButton.classList.toggle("hidden", !available);
  }
}
