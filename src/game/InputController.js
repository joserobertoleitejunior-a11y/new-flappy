// Captura de toque/clique/tecla — mapeia qualquer entrada em um único evento "flap".
// Mantém a mecânica de uma mão só, tela cheia (spec §3).

export class InputController {
  /**
   * @param {HTMLElement} target - elemento que recebe o toque (o canvas ou o app inteiro).
   * @param {() => void} onFlap - chamado a cada toque/clique/tecla válido.
   */
  constructor(target, onFlap) {
    this.target = target;
    this.onFlap = onFlap;
    this.enabled = true;

    this._handlePointerDown = this._handlePointerDown.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);

    this.target.addEventListener("pointerdown", this._handlePointerDown, { passive: true });
    window.addEventListener("keydown", this._handleKeyDown);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  _handlePointerDown() {
    if (!this.enabled) return;
    this.onFlap();
  }

  _handleKeyDown(event) {
    if (!this.enabled) return;
    if (event.code === "Space" || event.code === "ArrowUp") {
      event.preventDefault();
      this.onFlap();
    }
  }

  dispose() {
    this.target.removeEventListener("pointerdown", this._handlePointerDown);
    window.removeEventListener("keydown", this._handleKeyDown);
  }
}
