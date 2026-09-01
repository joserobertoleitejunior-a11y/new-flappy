// Captura de toque/clique/tecla — mapeia entrada em dois eventos:
// "flap" (bater as asas, subir) e "dive" (fechar as asas, mergulhar).
// Toque/clique/espaço/seta-cima = flap, instantâneo (sem atraso — precisão
// é tudo num jogo estilo Flappy Bird). Arrastar pra baixo depois do toque
// (ou seta-baixo/S) = dive, um gesto extra na mesma tocada. Mantém a
// mecânica de uma mão só, tela cheia (spec §3).
const SWIPE_DOWN_MIN_DISTANCE = 40; // px — distância mínima de arraste pra contar como dive

export class InputController {
  /**
   * @param {HTMLElement} target - elemento que recebe o toque (o canvas ou o app inteiro).
   * @param {{ onFlap: () => void, onDive?: () => void }} callbacks
   */
  constructor(target, { onFlap, onDive }) {
    this.target = target;
    this.onFlap = onFlap;
    this.onDive = onDive;
    this.enabled = true;
    this._pointerStartY = null;
    this._diveTriggeredThisGesture = false;

    this._handlePointerDown = this._handlePointerDown.bind(this);
    this._handlePointerMove = this._handlePointerMove.bind(this);
    this._handlePointerUp = this._handlePointerUp.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);

    this.target.addEventListener("pointerdown", this._handlePointerDown, { passive: true });
    this.target.addEventListener("pointermove", this._handlePointerMove, { passive: true });
    this.target.addEventListener("pointerup", this._handlePointerUp, { passive: true });
    window.addEventListener("keydown", this._handleKeyDown);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  _handlePointerDown(event) {
    if (!this.enabled) return;
    this._pointerStartY = event.clientY;
    this._diveTriggeredThisGesture = false;
    this.onFlap();
  }

  _handlePointerMove(event) {
    if (!this.enabled || this._pointerStartY === null || this._diveTriggeredThisGesture) return;
    if (event.clientY - this._pointerStartY > SWIPE_DOWN_MIN_DISTANCE) {
      this._diveTriggeredThisGesture = true;
      this.onDive?.();
    }
  }

  _handlePointerUp() {
    this._pointerStartY = null;
  }

  _handleKeyDown(event) {
    if (!this.enabled) return;
    if (event.code === "Space" || event.code === "ArrowUp") {
      event.preventDefault();
      this.onFlap();
    } else if (event.code === "ArrowDown" || event.code === "KeyS") {
      event.preventDefault();
      this.onDive?.();
    }
  }

  dispose() {
    this.target.removeEventListener("pointerdown", this._handlePointerDown);
    this.target.removeEventListener("pointermove", this._handlePointerMove);
    this.target.removeEventListener("pointerup", this._handlePointerUp);
    window.removeEventListener("keydown", this._handleKeyDown);
  }
}
