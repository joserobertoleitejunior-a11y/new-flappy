import * as THREE from "three";
import { scatterTrees } from "./Scenery.js";
import { WORLD } from "./constants.js";

// Cenário low-poly: céu em gradiente, chão único (poucos draw calls) e
// iluminação simples. Decoração (árvores) entra depois via InstancedMesh
// carregado sob demanda (lazy loading, spec §9.1).
export class World {
  constructor(scene) {
    this.scene = scene;

    this._buildSky();
    this._buildLights();
    this._buildGround();

    this.scene.fog = new THREE.Fog(0x9fd8f2, WORLD.FOG_NEAR, WORLD.FOG_FAR);

    this.treesGroup = null;
    this._loadScenery();
  }

  _buildSky() {
    this.scene.background = new THREE.Color(0x7ec8f2);
  }

  _buildLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x4d7a3f, 1.05);
    const sun = new THREE.DirectionalLight(0xfff2d0, 1.1);
    sun.position.set(-6, 10, 4);
    this.scene.add(hemi, sun);
  }

  _buildGround() {
    // Faixa longa única (não segmentada por obstáculo) — um só draw call pro chão.
    const geometry = new THREE.PlaneGeometry(24, 4000, 1, 1);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({ color: 0x6ab150, flatShading: true });
    this.ground = new THREE.Mesh(geometry, material);
    this.ground.position.set(0, -1.6, -1900);
    this.scene.add(this.ground);
  }

  async _loadScenery() {
    this.treesGroup = await scatterTrees();
    this.scene.add(this.treesGroup);
  }

  /** Recicla a decoração conforme o pássaro avança, evitando mundo infinito real. */
  updateAroundZ(_z) {
    // A decoração atual é estática e coberta por fog; reciclagem de árvores
    // fica pronta pra entrar aqui se o percurso for estendido no futuro.
  }
}
