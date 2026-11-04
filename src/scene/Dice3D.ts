import * as THREE from 'three';
import gsap from 'gsap';
import { soundManager } from '../audio/SoundManager';

/**
 * Generates crisp 6-face dice pip textures (Faces 1..6)
 */
function createDieFaceTexture(pipCount: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Rounded cream voxel background
  ctx.fillStyle = '#fffbeb';
  ctx.fillRect(0, 0, 128, 128);

  // Subtle voxel bevel border
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 118, 118);

  const pipColor = pipCount === 1 || pipCount === 4 ? '#ef4444' : '#1e293b';
  ctx.fillStyle = pipColor;

  const drawPip = (cx: number, cy: number, r = 13) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const c = 64;
  const lo = 34;
  const hi = 94;

  if (pipCount === 1) {
    drawPip(c, c, 18);
  } else if (pipCount === 2) {
    drawPip(lo, lo);
    drawPip(hi, hi);
  } else if (pipCount === 3) {
    drawPip(lo, lo);
    drawPip(c, c);
    drawPip(hi, hi);
  } else if (pipCount === 4) {
    drawPip(lo, lo);
    drawPip(hi, lo);
    drawPip(lo, hi);
    drawPip(hi, hi);
  } else if (pipCount === 5) {
    drawPip(lo, lo);
    drawPip(hi, lo);
    drawPip(c, c);
    drawPip(lo, hi);
    drawPip(hi, hi);
  } else if (pipCount === 6) {
    drawPip(lo, 30);
    drawPip(hi, 30);
    drawPip(lo, c);
    drawPip(hi, c);
    drawPip(lo, 98);
    drawPip(hi, 98);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Maps die value (1..6) to Euler angles so that face `value` points straight up (+Y)
 * BoxGeometry material order: [0: +X(1), 1: -X(6), 2: +Y(2), 3: -Y(5), 4: +Z(3), 5: -Z(4)]
 */
function getTargetEulerForValue(val: number): THREE.Euler {
  switch (val) {
    case 1: // +X on top -> rotate Z by +90 deg
      return new THREE.Euler(0, 0, Math.PI / 2);
    case 6: // -X on top -> rotate Z by -90 deg
      return new THREE.Euler(0, 0, -Math.PI / 2);
    case 2: // +Y is already on top
      return new THREE.Euler(0, 0, 0);
    case 5: // -Y on top -> rotate X by 180 deg
      return new THREE.Euler(Math.PI, 0, 0);
    case 3: // +Z on top -> rotate X by -90 deg
      return new THREE.Euler(-Math.PI / 2, 0, 0);
    case 4: // -Z on top -> rotate X by +90 deg
    default:
      return new THREE.Euler(Math.PI / 2, 0, 0);
  }
}

export class Dice3D {
  private group = new THREE.Group();
  private die1: THREE.Mesh;
  private die2: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.group.name = 'Dice3DGroup';
    scene.add(this.group);

    // Order of faces on BoxGeometry: +X(1), -X(6), +Y(2), -Y(5), +Z(3), -Z(4)
    const faceOrder = [1, 6, 2, 5, 3, 4];
    const materials = faceOrder.map(
      (num) =>
        new THREE.MeshStandardMaterial({
          map: createDieFaceTexture(num),
          roughness: 0.35,
          metalness: 0.05
        })
    );

    const geo = new THREE.BoxGeometry(0.82, 0.82, 0.82);
    this.die1 = new THREE.Mesh(geo, materials);
    this.die2 = new THREE.Mesh(geo, materials);

    this.die1.castShadow = true;
    this.die1.receiveShadow = true;
    this.die2.castShadow = true;
    this.die2.receiveShadow = true;

    this.die1.position.set(-0.65, 0.85, 0);
    this.die2.position.set(0.65, 0.85, 0);

    this.group.add(this.die1, this.die2);
  }

  /**
   * Throws 2 3D voxel dice up in the air, spins them in 3D, and bounces them onto the center courtyard
   */
  public animateRoll(d1: number, d2: number): Promise<void> {
    return new Promise((resolve) => {
      const e1 = getTargetEulerForValue(d1);
      const e2 = getTargetEulerForValue(d2);

      // Start high in the air with random offset
      this.die1.position.set(-1.3, 4.4, -0.9);
      this.die2.position.set(1.3, 4.7, 0.9);
      this.die1.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      this.die2.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);

      const state = { t: 0 };
      let bounce1Played = false;
      let bounce2Played = false;
      let bounce3Played = false;

      const spin1X = e1.x + Math.PI * 6;
      const spin1Y = e1.y + Math.PI * 4;
      const spin1Z = e1.z + Math.PI * 6;

      const spin2X = e2.x - Math.PI * 6;
      const spin2Y = e2.y + Math.PI * 6;
      const spin2Z = e2.z - Math.PI * 4;

      gsap.to(state, {
        t: 1,
        duration: 0.92,
        ease: 'none',
        onUpdate: () => {
          const t = state.t;

          // Horizontal convergence to courtyard center
          this.die1.position.x = THREE.MathUtils.lerp(-1.3, -0.68, t);
          this.die1.position.z = THREE.MathUtils.lerp(-0.9, 0.15, t);
          this.die2.position.x = THREE.MathUtils.lerp(1.3, 0.68, t);
          this.die2.position.z = THREE.MathUtils.lerp(0.9, -0.15, t);

          // Multi-bounce physics curve on Y
          let h = 0;
          if (t < 0.45) {
            const u = t / 0.45;
            h = 3.8 * (1 - u * u);
          } else if (t < 0.75) {
            if (!bounce1Played) {
              bounce1Played = true;
              soundManager.playDiceBounce(1.0);
            }
            const u = (t - 0.45) / 0.3;
            h = Math.sin(u * Math.PI) * 1.35;
          } else if (t < 0.92) {
            if (!bounce2Played) {
              bounce2Played = true;
              soundManager.playDiceBounce(0.65);
            }
            const u = (t - 0.75) / 0.17;
            h = Math.sin(u * Math.PI) * 0.48;
          } else {
            if (!bounce3Played) {
              bounce3Played = true;
              soundManager.playDiceBounce(0.35);
            }
            const u = (t - 0.92) / 0.08;
            h = Math.sin(u * Math.PI) * 0.14;
          }

          this.die1.position.y = 0.85 + h;
          this.die2.position.y = 0.85 + h * 1.05;

          // Smooth spin deceleration into exact target orientation
          const rotEase = 1 - Math.pow(1 - t, 2.4);
          this.die1.rotation.set(
            THREE.MathUtils.lerp(0, spin1X, rotEase),
            THREE.MathUtils.lerp(0, spin1Y, rotEase),
            THREE.MathUtils.lerp(0, spin1Z, rotEase)
          );
          this.die2.rotation.set(
            THREE.MathUtils.lerp(0, spin2X, rotEase),
            THREE.MathUtils.lerp(0, spin2Y, rotEase),
            THREE.MathUtils.lerp(0, spin2Z, rotEase)
          );
        },
        onComplete: () => {
          this.die1.rotation.copy(e1);
          this.die2.rotation.copy(e2);
          this.die1.position.set(-0.68, 0.85, 0.15);
          this.die2.position.set(0.68, 0.85, -0.15);
          resolve();
        }
      });
    });
  }
}
