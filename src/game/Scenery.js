import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

// Decoração usando o asset Kenney (assets/models/nature). Carregado sob
// demanda (não bloqueia o primeiro frame) e desenhado com InstancedMesh —
// nunca um Mesh novo por árvore (spec §9.1: instancing obrigatório).
const TREE_MODEL_URL = "/models/nature/OBJ format/tree_pineDefaultA.obj";
const TREE_COUNT = 60;
const TREE_COLOR = 0x2f7d3c;

let cachedGeometry = null;

async function loadTreeGeometry() {
  if (cachedGeometry) return cachedGeometry;

  const loader = new OBJLoader();
  const object = await loader.loadAsync(TREE_MODEL_URL);

  let geometry = null;
  object.traverse((child) => {
    if (!geometry && child.isMesh) geometry = child.geometry;
  });

  if (!geometry) throw new Error("Modelo de árvore sem geometria utilizável.");
  geometry.computeVertexNormals();
  geometry.scale(0.55, 0.55, 0.55);
  cachedGeometry = geometry;
  return geometry;
}

/** Gera um InstancedMesh com árvores espalhadas nas laterais do percurso. */
export async function scatterTrees(count = TREE_COUNT) {
  const geometry = await loadTreeGeometry();
  const material = new THREE.MeshStandardMaterial({ color: TREE_COLOR, flatShading: true });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    const side = i % 2 === 0 ? 1 : -1;
    const lateral = side * (6.5 + Math.random() * 6);
    const forward = -(i / count) * 3800 - Math.random() * 30;
    const scale = 0.8 + Math.random() * 0.6;

    dummy.position.set(lateral, -1.6, forward);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
