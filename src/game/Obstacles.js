import * as THREE from "three";
import { OBSTACLES, WORLD } from "./constants.js";

// Obstáculos = "portais" com um vão: pilar de baixo + pilar de cima por
// obstáculo. Nunca cria/destrói mesh em runtime — um único InstancedMesh
// (2 instâncias por obstáculo) é reposicionado quando o pássaro passa
// (object pooling, spec §9.1).
const PILLAR_WIDTH = 3.6;
const PILLAR_DEPTH = 0.7;
const COLLISION_HALF_THICKNESS = PILLAR_DEPTH / 2;
const SPAWN_START_Z = -14;
const MIN_PILLAR_HEIGHT = 0.05;

function buildPillarGeometry() {
  const geometry = new THREE.BoxGeometry(PILLAR_WIDTH, 1, PILLAR_DEPTH);
  geometry.translate(0, 0.5, 0); // pivô na base — facilita escalar a altura
  return geometry;
}

export class Obstacles {
  constructor(scene, poolSize = OBSTACLES.POOL_SIZE) {
    this.poolSize = poolSize;

    const geometry = buildPillarGeometry();
    const material = new THREE.MeshStandardMaterial({ color: 0xd9704a, flatShading: true });
    this.mesh = new THREE.InstancedMesh(geometry, material, poolSize * 2);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);

    this._dummy = new THREE.Object3D();
    this.items = Array.from({ length: poolSize }, (_, i) => ({
      z: SPAWN_START_Z - i * OBSTACLES.SPAWN_INTERVAL,
      gapY: 0,
      gapHeight: OBSTACLES.GAP_HEIGHT_START,
      scored: false,
    }));

    this.reset();
  }

  /** Reposiciona todo o pool pro início de uma nova partida. */
  reset() {
    this.items.forEach((item, i) => {
      item.z = SPAWN_START_Z - i * OBSTACLES.SPAWN_INTERVAL;
      this._randomizeGap(item, 0);
      this._writeInstance(i, item);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  _randomizeGap(item, difficultyT) {
    item.gapHeight = THREE.MathUtils.lerp(
      OBSTACLES.GAP_HEIGHT_START,
      OBSTACLES.GAP_HEIGHT_MIN,
      difficultyT,
    );
    item.gapY = THREE.MathUtils.lerp(OBSTACLES.GAP_Y_MIN, OBSTACLES.GAP_Y_MAX, Math.random());
    item.scored = false;
  }

  _writeInstance(index, item) {
    const gapBottom = item.gapY - item.gapHeight / 2;
    const gapTop = item.gapY + item.gapHeight / 2;

    this._dummy.position.set(0, WORLD.GROUND_Y, item.z);
    this._dummy.scale.set(1, Math.max(gapBottom - WORLD.GROUND_Y, MIN_PILLAR_HEIGHT), 1);
    this._dummy.updateMatrix();
    this.mesh.setMatrixAt(index * 2, this._dummy.matrix);

    this._dummy.position.set(0, gapTop, item.z);
    this._dummy.scale.set(1, Math.max(WORLD.CEILING_Y - gapTop, MIN_PILLAR_HEIGHT), 1);
    this._dummy.updateMatrix();
    this.mesh.setMatrixAt(index * 2 + 1, this._dummy.matrix);
  }

  /**
   * @param {number} birdZ
   * @param {number} difficultyT - 0..1, progresso da dificuldade
   * @param {() => void} [onScore] - chamado a cada obstáculo que o pássaro passa
   */
  update(birdZ, difficultyT, onScore) {
    const spacing = THREE.MathUtils.lerp(
      OBSTACLES.SPAWN_INTERVAL,
      OBSTACLES.MIN_SPAWN_INTERVAL,
      difficultyT,
    );

    // Loop indexado sem alocação (nada de spread/map/indexOf por frame) —
    // roda 60x/seg, então qualquer lixo de heap aqui vira pressão de GC
    // desnecessária (spec §9.1: object pooling é sobre nunca alocar no loop).
    let frontmostZ = this.items[0].z;
    for (let i = 1; i < this.items.length; i += 1) {
      if (this.items[i].z < frontmostZ) frontmostZ = this.items[i].z;
    }

    let changed = false;
    for (let i = 0; i < this.items.length; i += 1) {
      const item = this.items[i];

      if (!item.scored && birdZ < item.z) {
        item.scored = true;
        onScore?.();
      }

      if (item.z > birdZ + OBSTACLES.DESPAWN_DISTANCE_BEHIND) {
        item.z = frontmostZ - spacing;
        frontmostZ = item.z;
        this._randomizeGap(item, difficultyT);
        this._writeInstance(i, item);
        changed = true;
      }
    }

    if (changed) this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** @param {THREE.Vector3} birdPosition @param {number} birdRadius */
  checkCollision(birdPosition, birdRadius) {
    for (const item of this.items) {
      const zDistance = Math.abs(birdPosition.z - item.z);
      if (zDistance > COLLISION_HALF_THICKNESS + birdRadius) continue;

      const gapTop = item.gapY + item.gapHeight / 2;
      const gapBottom = item.gapY - item.gapHeight / 2;
      const clearOfPillars =
        birdPosition.y - birdRadius > gapBottom && birdPosition.y + birdRadius < gapTop;
      if (!clearOfPillars) return true;
    }
    return false;
  }
}
