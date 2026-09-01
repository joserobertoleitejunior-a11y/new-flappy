import * as THREE from "three";
import { CAMERA } from "./constants.js";

// Câmera em 3ª pessoa atrás do pássaro, com suavização (spec: câmera atrás
// do personagem, referência "Skypeck").
export class CameraRig {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(CAMERA.FOV, aspect, CAMERA.NEAR, CAMERA.FAR);
    this._targetPosition = new THREE.Vector3();
    this._lookTarget = new THREE.Vector3();
  }

  setAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** @param {THREE.Vector3} birdPosition @param {number} dt */
  follow(birdPosition, dt) {
    this._targetPosition.set(
      birdPosition.x + CAMERA.OFFSET.x,
      birdPosition.y + CAMERA.OFFSET.y,
      birdPosition.z + CAMERA.OFFSET.z,
    );

    const lerpFactor = 1 - Math.exp(-CAMERA.FOLLOW_LERP * dt);
    this.camera.position.lerp(this._targetPosition, lerpFactor);

    this._lookTarget.set(birdPosition.x, birdPosition.y + 0.3, birdPosition.z - CAMERA.LOOK_AHEAD);
    this.camera.lookAt(this._lookTarget);
  }
}
