import * as THREE from 'three';
import gsap from 'gsap';
import { soundManager } from '../audio/SoundManager';

function createDieFaceTexture(pipCount: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fffbeb';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, 238, 238);

  const pipColor = pipCount === 1 || pipCount === 4 ? '#ef4444' : '#0f172a';
  ctx.fillStyle = pipColor;

  const drawPip = (cx: number, cy: number, r = 24) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const c = 128;
  const lo = 64;
  const hi = 192;

  if (pipCount === 1) {
    drawPip(c, c, 34);
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
    drawPip(lo, 58);
    drawPip(hi, 58);
    drawPip(lo, c);
    drawPip(hi, c);
    drawPip(lo, 198);
    drawPip(hi, 198);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Returns local 2D offsets (x, z) on the top face of a die for each pip of `pipCount`
 */
function getTopPipOffsets(pipCount: number): Array<[number, number]> {
  const s = 0.25;
  switch (pipCount) {
    case 1:
      return [[0, 0]];
    case 2:
      return [
        [-s, -s],
        [s, s]
      ];
    case 3:
      return [
        [-s, -s],
        [0, 0],
        [s, s]
      ];
    case 4:
      return [
        [-s, -s],
        [s, -s],
        [-s, s],
        [s, s]
      ];
    case 5:
      return [
        [-s, -s],
        [s, -s],
        [0, 0],
        [-s, s],
        [s, s]
      ];
    case 6:
    default:
      return [
        [-s, -s],
        [s, -s],
        [-s, 0],
        [s, 0],
        [-s, s],
        [s, s]
      ];
  }
}

function getTargetEulerForValue(val: number): THREE.Euler {
  switch (val) {
    case 1:
      return new THREE.Euler(0, 0, Math.PI / 2);
    case 6:
      return new THREE.Euler(0, 0, -Math.PI / 2);
    case 2:
      return new THREE.Euler(0, 0, 0);
    case 5:
      return new THREE.Euler(Math.PI, 0, 0);
    case 3:
      return new THREE.Euler(-Math.PI / 2, 0, 0);
    case 4:
    default:
      return new THREE.Euler(Math.PI / 2, 0, 0);
  }
}

/**
 * Creates a glowing 3D Sprite displaying a number or fused total
 */
function createGlowingNumberSprite(
  text: string,
  bgColor: string,
  borderColor: string,
  scaleSize = 1.9
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 30, 128, 128, 120);
  grad.addColorStop(0, bgColor);
  grad.addColorStop(0.72, borderColor);
  grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(128, 128, 78, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 92px "Be Vietnam Pro", "Chakra Petch", "Nunito", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 134);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scaleSize, scaleSize, 1);
  sprite.renderOrder = 999;
  return sprite;
}

export class Dice3D {
  private group = new THREE.Group();
  private fxGroup = new THREE.Group();
  private die1: THREE.Mesh;
  private die2: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.group.name = 'Dice3DGroup';
    this.fxGroup.name = 'DicePipFusionFXGroup';
    scene.add(this.group);
    scene.add(this.fxGroup);

    const faceOrder = [1, 6, 2, 5, 3, 4];
    const materials = faceOrder.map(
      (num) =>
        new THREE.MeshStandardMaterial({
          map: createDieFaceTexture(num),
          roughness: 0.3,
          metalness: 0.05
        })
    );

    const geo = new THREE.BoxGeometry(1.05, 1.05, 1.05);
    this.die1 = new THREE.Mesh(geo, materials);
    this.die2 = new THREE.Mesh(geo, materials);

    this.die1.castShadow = true;
    this.die1.receiveShadow = true;
    this.die2.castShadow = true;
    this.die2.receiveShadow = true;

    this.die1.position.set(-1.05, 1.15, 0.2);
    this.die2.position.set(1.05, 1.15, -0.2);

    this.group.add(this.die1, this.die2);
  }

  public clearFusionFX(): void {
    while (this.fxGroup.children.length > 0) {
      const child = this.fxGroup.children[0];
      this.fxGroup.remove(child);
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      } else if (child instanceof THREE.Sprite) {
        const mat = child.material as THREE.SpriteMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
    }
  }

  /**
   * 1. Throws 2 3D voxel dice onto the center platform (scaled by `throwPower` from Spacebar hold!)
   * 2. Lights up the pips on the top faces of both dice
   * 3. Lifts the glowing pips into the air to form the 2 numbers (d1 & d2)
   * 4. Fuses the 2 numbers together into the Total (d1 + d2)!
   */
  public async animateRollAndFuseTotal(
    d1: number,
    d2: number,
    throwPower = 1.0,
    speedMultiplier = 1.0
  ): Promise<void> {
    this.clearFusionFX();
    await this.animatePhysicalBounce(d1, d2, throwPower, speedMultiplier);
    await this.animateGlowingPipsAndFusion(d1, d2, speedMultiplier);
  }

  private animatePhysicalBounce(
    d1: number,
    d2: number,
    throwPower: number,
    speedMultiplier: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const e1 = getTargetEulerForValue(d1);
      const e2 = getTargetEulerForValue(d2);

      // Higher throwPower (from holding Spacebar) launches dice higher and spins faster!
      const pwr = THREE.MathUtils.clamp(throwPower, 1.0, 2.2);
      const startHeight = 5.4 * pwr;

      this.die1.position.set(-2.0 * pwr, startHeight, -1.3 * pwr);
      this.die2.position.set(2.0 * pwr, startHeight + 0.4, 1.3 * pwr);

      const state = { t: 0 };
      let b1 = false;
      let b2 = false;
      let b3 = false;

      const spinMult = Math.round(3 * pwr) * 2;
      const spin1X = e1.x + Math.PI * spinMult;
      const spin1Y = e1.y + Math.PI * 4;
      const spin1Z = e1.z + Math.PI * spinMult;

      const spin2X = e2.x - Math.PI * spinMult;
      const spin2Y = e2.y + Math.PI * 6;
      const spin2Z = e2.z - Math.PI * 4;

      gsap.to(state, {
        t: 1,
        duration: 0.9 / Math.max(1, speedMultiplier),
        ease: 'none',
        onUpdate: () => {
          const t = state.t;
          this.die1.position.x = THREE.MathUtils.lerp(-2.0 * pwr, -1.05, t);
          this.die1.position.z = THREE.MathUtils.lerp(-1.3 * pwr, 0.2, t);
          this.die2.position.x = THREE.MathUtils.lerp(2.0 * pwr, 1.05, t);
          this.die2.position.z = THREE.MathUtils.lerp(1.3 * pwr, -0.2, t);

          let h = 0;
          if (t < 0.45) {
            const u = t / 0.45;
            h = 4.4 * pwr * (1 - u * u);
          } else if (t < 0.75) {
            if (!b1) {
              b1 = true;
              soundManager.playDiceBounce(1.0);
            }
            const u = (t - 0.45) / 0.3;
            h = Math.sin(u * Math.PI) * 1.55 * pwr;
          } else if (t < 0.92) {
            if (!b2) {
              b2 = true;
              soundManager.playDiceBounce(0.65);
            }
            const u = (t - 0.75) / 0.17;
            h = Math.sin(u * Math.PI) * 0.58 * pwr;
          } else {
            if (!b3) {
              b3 = true;
              soundManager.playDiceBounce(0.35);
            }
            const u = (t - 0.92) / 0.08;
            h = Math.sin(u * Math.PI) * 0.18 * pwr;
          }

          this.die1.position.y = 1.15 + h;
          this.die2.position.y = 1.15 + h * 1.04;

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
          this.die1.position.set(-1.05, 1.15, 0.2);
          this.die2.position.set(1.05, 1.15, -0.2);
          resolve();
        }
      });
    });
  }

  /**
   * Lights up the pips on the top faces -> lifts them up into floating numbers d1 & d2 -> fuses into Total!
   */
  private animateGlowingPipsAndFusion(
    d1: number,
    d2: number,
    speedMultiplier: number
  ): Promise<void> {
    return new Promise((resolve) => {
      soundManager.playDicePipGlowAndFuse();

      const pipGeo = new THREE.SphereGeometry(0.13, 12, 12);
      const pipMat1 = new THREE.MeshBasicMaterial({ color: '#34d399' });
      const pipMat2 = new THREE.MeshBasicMaterial({ color: '#fde047' });

      const pips1: THREE.Mesh[] = [];
      const pips2: THREE.Mesh[] = [];

      const topY = this.die1.position.y + 0.56;

      for (const [ox, oz] of getTopPipOffsets(d1)) {
        const orb = new THREE.Mesh(pipGeo, pipMat1);
        orb.position.set(this.die1.position.x + ox, topY, this.die1.position.z + oz);
        orb.scale.setScalar(0.01);
        this.fxGroup.add(orb);
        pips1.push(orb);
      }

      for (const [ox, oz] of getTopPipOffsets(d2)) {
        const orb = new THREE.Mesh(pipGeo, pipMat2);
        orb.position.set(this.die2.position.x + ox, topY, this.die2.position.z + oz);
        orb.scale.setScalar(0.01);
        this.fxGroup.add(orb);
        pips2.push(orb);
      }

      const numSprite1 = createGlowingNumberSprite(`${d1}`, '#10b981', '#34d399', 1.85);
      const numSprite2 = createGlowingNumberSprite(`${d2}`, '#f59e0b', '#fde047', 1.85);
      const totalSprite = createGlowingNumberSprite(
        `${d1 + d2}`,
        '#10b981',
        '#fde047',
        2.75
      );

      numSprite1.position.set(this.die1.position.x, 3.3, this.die1.position.z);
      numSprite2.position.set(this.die2.position.x, 3.3, this.die2.position.z);
      totalSprite.position.set(0, 3.8, 0);

      numSprite1.scale.setScalar(0.01);
      numSprite2.scale.setScalar(0.01);
      totalSprite.scale.setScalar(0.01);

      this.fxGroup.add(numSprite1, numSprite2, totalSprite);

      const tl = gsap.timeline({
        onComplete: () => resolve()
      });
      tl.timeScale(Math.max(1, speedMultiplier));

      pips1.concat(pips2).forEach((orb) => {
        tl.to(
          orb.scale,
          {
            x: 1.45,
            y: 1.45,
            z: 1.45,
            duration: 0.25,
            ease: 'back.out(3)'
          },
          0
        );
      });

      pips1.forEach((orb) => {
        tl.to(
          orb.position,
          {
            x: numSprite1.position.x,
            y: numSprite1.position.y,
            z: numSprite1.position.z,
            duration: 0.32,
            ease: 'power2.inOut'
          },
          0.25
        );
        tl.to(orb.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.12 }, 0.5);
      });

      pips2.forEach((orb) => {
        tl.to(
          orb.position,
          {
            x: numSprite2.position.x,
            y: numSprite2.position.y,
            z: numSprite2.position.z,
            duration: 0.32,
            ease: 'power2.inOut'
          },
          0.25
        );
        tl.to(orb.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.12 }, 0.5);
      });

      tl.to(
        numSprite1.scale,
        { x: 1.85, y: 1.85, z: 1, duration: 0.26, ease: 'back.out(2.5)' },
        0.46
      );
      tl.to(
        numSprite2.scale,
        { x: 1.85, y: 1.85, z: 1, duration: 0.26, ease: 'back.out(2.5)' },
        0.46
      );

      tl.to(
        numSprite1.position,
        { x: 0, y: 3.8, z: 0, duration: 0.26, ease: 'power3.in' },
        0.86
      );
      tl.to(
        numSprite2.position,
        { x: 0, y: 3.8, z: 0, duration: 0.26, ease: 'power3.in' },
        0.86
      );
      tl.to(numSprite1.scale, { x: 0.01, y: 0.01, z: 1, duration: 0.1 }, 1.06);
      tl.to(numSprite2.scale, { x: 0.01, y: 0.01, z: 1, duration: 0.1 }, 1.06);

      tl.to(
        totalSprite.scale,
        {
          x: 2.85,
          y: 2.85,
          z: 1,
          duration: 0.35,
          ease: 'elastic.out(1.2, 0.45)'
        },
        1.08
      );
    });
  }
}
