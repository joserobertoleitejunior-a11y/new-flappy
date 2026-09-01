import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { BIRD } from "./constants.js";

// Geometria low-poly do pássaro: corpo + bico + duas asas, tudo mesclado num
// único BufferGeometry (1 draw call) pra ficar bem abaixo do orçamento de
// 5k triângulos definido em BIRD.MAX_TRIANGLES (spec §9.1).
function buildBirdGeometry() {
  const body = new THREE.IcosahedronGeometry(0.32, 1);

  const beak = new THREE.ConeGeometry(0.09, 0.28, 6);
  beak.rotateX(Math.PI / 2);
  beak.translate(0, 0.02, 0.36);

  const wingShape = new THREE.BoxGeometry(0.34, 0.03, 0.22);
  const wingLeft = wingShape.clone();
  wingLeft.rotateZ(0.25);
  wingLeft.translate(-0.34, 0.02, 0);
  const wingRight = wingShape.clone();
  wingRight.rotateZ(-0.25);
  wingRight.translate(0.34, 0.02, 0);

  // mergeGeometries exige atributos idênticos e todas indexadas (ou nenhuma)
  // entre as peças — normaliza pra não-indexada antes de mesclar.
  const parts = [body, beak, wingLeft, wingRight].map((geo) => {
    const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
    return new THREE.BufferGeometry().setAttribute("position", nonIndexed.getAttribute("position"));
  });

  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

let sharedGeometry = null;
function getSharedGeometry() {
  if (!sharedGeometry) sharedGeometry = buildBirdGeometry();
  return sharedGeometry;
}

export class Bird {
  /**
   * @param {{ color?: number }} [skin] - cor/skin aplicada ao material do pássaro.
   */
  constructor(skin = {}) {
    const geometry = getSharedGeometry();
    const material = new THREE.MeshStandardMaterial({
      color: skin.color ?? 0xffd166,
      flatShading: true,
      roughness: 0.6,
      metalness: 0.05,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;

    this.velocityY = 0;
    this._flapTimer = 0;
    this._diveTimer = 0;
    this._diveBlend = 0;

    this.reset();
  }

  reset() {
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, Math.PI, 0);
    this.mesh.scale.set(1, 1, 1);
    this.velocityY = 0;
    this._flapTimer = 0;
    this._diveTimer = 0;
    this._diveBlend = 0;
  }

  /** Bate as asas — impulso pra cima. Cancela um mergulho em andamento. */
  flap() {
    this.velocityY = BIRD.FLAP_IMPULSE;
    this._flapTimer = 0.18;
    this._diveTimer = 0;
  }

  /** Mergulha — fecha as asas e cai bem mais rápido por um tempo curto. */
  dive() {
    this.velocityY = BIRD.DIVE_IMPULSE;
    this._diveTimer = BIRD.DIVE_DURATION;
    this._flapTimer = 0;
  }

  /** @param {number} dt - delta de tempo em segundos */
  update(dt) {
    this._updatePhysics(dt);
    this._updatePose(dt);
  }

  _updatePhysics(dt) {
    const fallClamp = this._diveTimer > 0 ? BIRD.DIVE_MAX_FALL_SPEED : BIRD.MAX_FALL_SPEED;
    this.velocityY += BIRD.GRAVITY * dt;
    this.velocityY = THREE.MathUtils.clamp(this.velocityY, fallClamp, BIRD.MAX_RISE_SPEED);
    this.mesh.position.y += this.velocityY * dt;

    if (this._diveTimer > 0) this._diveTimer = Math.max(0, this._diveTimer - dt);
    if (this._flapTimer > 0) this._flapTimer -= dt;
  }

  _updatePose(dt) {
    const diving = this._diveTimer > 0;
    this._diveBlend = THREE.MathUtils.lerp(this._diveBlend, diving ? 1 : 0, 10 * dt);

    const normalTiltZ = THREE.MathUtils.clamp(this.velocityY / BIRD.MAX_RISE_SPEED, -1, 1) * 0.5;
    this.mesh.rotation.z = THREE.MathUtils.lerp(
      this.mesh.rotation.z,
      normalTiltZ * (1 - this._diveBlend),
      8 * dt,
    );

    if (this._diveBlend > 0.02) {
      // bico pra baixo, misturando suavemente com a inclinação normal
      this.mesh.rotation.x = THREE.MathUtils.lerp(
        this.mesh.rotation.x,
        BIRD.DIVE_PITCH * this._diveBlend,
        10 * dt,
      );
    } else if (this._flapTimer > 0) {
      this.mesh.rotation.x = Math.sin((0.18 - this._flapTimer) * 40) * 0.3;
    } else {
      this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, 0, 8 * dt);
    }

    // "Fecha as asas": silhueta mais fina e alongada durante o mergulho.
    const scaleX = THREE.MathUtils.lerp(1, BIRD.DIVE_SCALE_X, this._diveBlend);
    const scaleY = THREE.MathUtils.lerp(1, BIRD.DIVE_SCALE_Y, this._diveBlend);
    this.mesh.scale.set(scaleX, scaleY, 1);
  }

  /**
   * Reinicia velocidade e pose (flap/mergulho/rotação/escala) mantendo X/Z —
   * usado ao continuar a partida depois de um anúncio recompensado.
   */
  resetPose(y = 0) {
    this.mesh.position.y = y;
    this.mesh.rotation.set(0, Math.PI, 0);
    this.mesh.scale.set(1, 1, 1);
    this.velocityY = 0;
    this._flapTimer = 0;
    this._diveTimer = 0;
    this._diveBlend = 0;
  }

  /** Retorna a esfera de colisão atual do pássaro em coordenadas de mundo. */
  getCollisionSphere() {
    return new THREE.Sphere(this.mesh.position, BIRD.RADIUS);
  }

  /** Troca a cor do pássaro sem recriar geometria/material (troca de skin). */
  setColor(hexColor) {
    this.mesh.material.color.set(hexColor);
  }

  get position() {
    return this.mesh.position;
  }
}
