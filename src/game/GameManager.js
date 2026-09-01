import * as THREE from "three";
import { AdManager } from "../ads/AdManager.js";
import { AudioManager } from "./AudioManager.js";
import { Bird } from "./Bird.js";
import { CameraRig } from "./CameraRig.js";
import { InputController } from "./InputController.js";
import { Obstacles } from "./Obstacles.js";
import { incrementGameOverCount } from "./Storage.js";
import { World } from "./World.js";
import { BIRD, GAME_STATE, WORLD } from "./constants.js";

const CONTINUE_INVULNERABILITY_SECONDS = 1.5;

// Orquestra estado do jogo (menu/jogando/game over), física do pássaro,
// obstáculos/colisão, câmera, som e anúncios. Loja de skins entra na fase
// seguinte sem precisar reescrever esta base.
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
    this.ads = new AdManager();

    this.input = new InputController(canvas, () => this._handleFlap());

    this._resize = this._resize.bind(this);
    window.addEventListener("resize", this._resize);
    this._resize();

    this._distanceTraveled = 0;
    this.score = 0;
    this._lastGameOverCount = 0;
    this._invulnerableSeconds = 0;
    this.continueUsedThisRun = false;
  }

  _handleFlap() {
    this.audio.unlock();
    if (this.state !== GAME_STATE.PLAYING) return;
    this.bird.flap();
    this.audio.playFlap();
  }

  async start() {
    await this._maybeShowInterstitial();
    this.audio.unlock();
    this.bird.reset();
    this.obstacles.reset();
    this._distanceTraveled = 0;
    this.score = 0;
    this._invulnerableSeconds = 0;
    this.continueUsedThisRun = false;
    this.callbacks.onScoreChange?.(this.score);
    this._setState(GAME_STATE.PLAYING);
  }

  async returnToMenu() {
    await this._maybeShowInterstitial();
    this.bird.reset();
    this._setState(GAME_STATE.MENU);
  }

  openShop() {
    this._setState(GAME_STATE.SHOP);
  }

  /**
   * Continua a partida atual depois de um anúncio recompensado (spec §5) —
   * só disponível uma vez por partida. Retorna se conseguiu continuar.
   * @returns {Promise<boolean>}
   */
  async continueWithAd() {
    if (this.continueUsedThisRun || this.state !== GAME_STATE.GAME_OVER) return false;
    this.continueUsedThisRun = true;

    const rewarded = await this.ads.showRewarded();
    if (!rewarded) return false;

    this.bird.velocityY = 0;
    this.bird.mesh.position.y = 0.5;
    this._invulnerableSeconds = CONTINUE_INVULNERABILITY_SECONDS;
    this._setState(GAME_STATE.PLAYING);
    return true;
  }

  _setState(state) {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  _gameOver() {
    this.audio.playCollision();
    this._lastGameOverCount = incrementGameOverCount();
    this._setState(GAME_STATE.GAME_OVER);
    this.callbacks.onGameOver?.(this.score);
  }

  async _maybeShowInterstitial() {
    if (this.state !== GAME_STATE.GAME_OVER) return;
    if (this.ads.shouldShowInterstitial(this._lastGameOverCount)) {
      await this.ads.showInterstitial();
    }
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

      if (this._invulnerableSeconds > 0) {
        this._invulnerableSeconds = Math.max(0, this._invulnerableSeconds - dt);
      } else if (this._checkCollisions()) {
        this._gameOver();
      }
    }

    this.cameraRig.follow(this.bird.position, dt);
    this.renderer.render(this.scene, this.cameraRig.camera);
  }

  dispose() {
    window.removeEventListener("resize", this._resize);
    this.input.dispose();
  }
}
