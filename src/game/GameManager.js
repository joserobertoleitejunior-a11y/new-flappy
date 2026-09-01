import * as THREE from "three";
import { Bird } from "./Bird.js";
import { CameraRig } from "./CameraRig.js";
import { InputController } from "./InputController.js";
import { World } from "./World.js";
import { GAME_STATE, WORLD } from "./constants.js";

// Orquestra estado do jogo (menu/jogando/game over), física do pássaro e
// câmera. Obstáculos, colisão, placar, som e ads entram em fases seguintes
// sem precisar reescrever esta base.
export class GameManager {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ onStateChange?: (state: string) => void }} [callbacks]
   */
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.state = GAME_STATE.MENU;

    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.world = new World(this.scene);
    this.bird = new Bird();
    this.scene.add(this.bird.mesh);

    this.cameraRig = new CameraRig(window.innerWidth / window.innerHeight);

    this.input = new InputController(canvas, () => this._handleFlap());

    this._resize = this._resize.bind(this);
    window.addEventListener("resize", this._resize);
    this._resize();

    this._distanceTraveled = 0;
  }

  _handleFlap() {
    if (this.state !== GAME_STATE.PLAYING) return;
    this.bird.flap();
  }

  start() {
    this.bird.reset();
    this._distanceTraveled = 0;
    this._setState(GAME_STATE.PLAYING);
  }

  returnToMenu() {
    this.bird.reset();
    this._setState(GAME_STATE.MENU);
  }

  openShop() {
    this._setState(GAME_STATE.SHOP);
  }

  _setState(state) {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  _currentForwardSpeed() {
    const t = THREE.MathUtils.clamp(this._distanceTraveled / WORLD.DIFFICULTY_RAMP_DISTANCE, 0, 1);
    return THREE.MathUtils.lerp(WORLD.FORWARD_SPEED_MIN, WORLD.FORWARD_SPEED_MAX, t);
  }

  _resize() {
    const { innerWidth, innerHeight } = window;
    this.renderer.setSize(innerWidth, innerHeight);
    this.cameraRig.setAspect(innerWidth / innerHeight);
  }

  update() {
    const dt = Math.min(this.clock.getDelta(), 1 / 30);

    if (this.state === GAME_STATE.PLAYING) {
      this.bird.update(dt);

      const speed = this._currentForwardSpeed();
      this.bird.mesh.position.z -= speed * dt;
      this._distanceTraveled += speed * dt;
    }

    this.cameraRig.follow(this.bird.position, dt);
    this.renderer.render(this.scene, this.cameraRig.camera);
  }

  dispose() {
    window.removeEventListener("resize", this._resize);
    this.input.dispose();
  }
}
