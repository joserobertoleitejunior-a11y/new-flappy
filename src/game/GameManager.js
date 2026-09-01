import * as THREE from "three";
import { AudioManager } from "./AudioManager.js";
import { Bird } from "./Bird.js";
import { CameraRig } from "./CameraRig.js";
import { InputController } from "./InputController.js";
import { Obstacles } from "./Obstacles.js";
import { World } from "./World.js";
import { BIRD, GAME_STATE, WORLD } from "./constants.js";

// Orquestra estado do jogo (menu/jogando/game over), física do pássaro,
// obstáculos/colisão, câmera e som. Ads entram na fase seguinte sem
// precisar reescrever esta base.
export class GameManager {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ onStateChange?: (state: string) => void, onScoreChange?: (score: number) => void, onGameOver?: (score: number) => void }} [callbacks]
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
    this.obstacles = new Obstacles(this.scene);

    this.cameraRig = new CameraRig(window.innerWidth / window.innerHeight);
    this.audio = new AudioManager();

    this.input = new InputController(canvas, () => this._handleFlap());

    this._resize = this._resize.bind(this);
    window.addEventListener("resize", this._resize);
    this._resize();

    this._distanceTraveled = 0;
    this.score = 0;
  }

  _handleFlap() {
    this.audio.unlock();
    if (this.state !== GAME_STATE.PLAYING) return;
    this.bird.flap();
    this.audio.playFlap();
  }

  start() {
    this.audio.unlock();
    this.bird.reset();
    this.obstacles.reset();
    this._distanceTraveled = 0;
    this.score = 0;
    this.callbacks.onScoreChange?.(this.score);
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

  _gameOver() {
    this.audio.playCollision();
    this._setState(GAME_STATE.GAME_OVER);
    this.callbacks.onGameOver?.(this.score);
  }

  _difficultyT() {
    return THREE.MathUtils.clamp(this._distanceTraveled / WORLD.DIFFICULTY_RAMP_DISTANCE, 0, 1);
  }

  _currentForwardSpeed() {
    return THREE.MathUtils.lerp(
      WORLD.FORWARD_SPEED_MIN,
      WORLD.FORWARD_SPEED_MAX,
      this._difficultyT(),
    );
  }

  _checkCollisions() {
    const hitGround = this.bird.position.y - BIRD.RADIUS <= WORLD.GROUND_Y;
    const hitObstacle = this.obstacles.checkCollision(this.bird.position, BIRD.RADIUS);
    return hitGround || hitObstacle;
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

      this.obstacles.update(this.bird.position.z, this._difficultyT(), () => {
        this.score += 1;
        this.audio.playPoint();
        this.callbacks.onScoreChange?.(this.score);
      });

      if (this._checkCollisions()) this._gameOver();
    }

    this.cameraRig.follow(this.bird.position, dt);
    this.renderer.render(this.scene, this.cameraRig.camera);
  }

  dispose() {
    window.removeEventListener("resize", this._resize);
    this.input.dispose();
  }
}
