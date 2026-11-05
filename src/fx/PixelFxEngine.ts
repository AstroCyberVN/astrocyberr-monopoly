import * as THREE from 'three';

/**
 * PixelFX Engine for AstroCyberr Monopoly
 * Implements the authentic two-buffer pixel art VFX architecture from `pixelfx` (SKILL.md):
 * - Two buffers per frame: `color` (RGBA pixels with 4x4 Bayer dithering) + `light` (additive RGB glow)
 * - Crisp `NearestFilter` pixel-art rendering in both 3D (`THREE.Sprite` billboards & ground rings)
 *   and 2D HUD overlays (`image-rendering: pixelated`)
 * - Palette Ramps (`PAL`): gold, arcane, fire, ice, holy, volt, shadow, emerald, crimson, cyber
 * - Hit-stop & damped pixel-snapped screen shake for peak game juice
 */

export type PixelPaletteName =
  | 'gold'
  | 'arcane'
  | 'fire'
  | 'ice'
  | 'holy'
  | 'volt'
  | 'shadow'
  | 'emerald'
  | 'crimson'
  | 'cyber';

export const PAL: Record<PixelPaletteName, [string, string, string, string, string]> = {
  gold: ['#422006', '#a16207', '#eab308', '#fde047', '#ffffff'],
  arcane: ['#1e1b4b', '#581c87', '#9333ea', '#d8b4fe', '#ffffff'],
  fire: ['#450a0a', '#b91c1c', '#f97316', '#fde047', '#ffffff'],
  ice: ['#082f49', '#0284c7', '#38bdf8', '#a5f3fc', '#ffffff'],
  holy: ['#422006', '#ca8a04', '#facc15', '#fef08a', '#ffffff'],
  volt: ['#172554', '#1d4ed8', '#38bdf8', '#fef08a', '#ffffff'],
  shadow: ['#09090b', '#27272a', '#581c87', '#a855f7', '#f0abfc'],
  emerald: ['#022c22', '#047857', '#10b981', '#6ee7b7', '#ffffff'],
  crimson: ['#450a0a', '#991b1b', '#ef4444', '#fca5a5', '#ffffff'],
  cyber: ['#0f172a', '#0369a1', '#06b6d4', '#67e8f9', '#ffffff']
};

// 4x4 Bayer Ordered Dithering Matrix (0..15 normalized to 0..1)
const BAYER_4X4 = [
  [0 / 16, 8 / 16, 2 / 16, 10 / 16],
  [12 / 16, 4 / 16, 14 / 16, 6 / 16],
  [3 / 16, 11 / 16, 1 / 16, 9 / 16],
  [15 / 16, 7 / 16, 13 / 16, 5 / 16]
];

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Two-buffer frame (`color` + `light`) following the pixelfx specification
 */
export class PixelFxFrame {
  public readonly width: number;
  public readonly height: number;
  public readonly color: Uint8ClampedArray;
  public readonly light: Float32Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.color = new Uint8ClampedArray(width * height * 4);
    this.light = new Float32Array(width * height * 3);
  }

  public clear(): void {
    this.color.fill(0);
    this.light.fill(0);
  }

  public setPixel(x: number, y: number, rgb: RgbColor, alpha = 1, dither = false): void {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return;

    if (dither) {
      const threshold = BAYER_4X4[iy & 3][ix & 3];
      if (alpha <= threshold) return;
      alpha = 1;
    }

    const idx = (iy * this.width + ix) * 4;
    this.color[idx] = rgb.r;
    this.color[idx + 1] = rgb.g;
    this.color[idx + 2] = rgb.b;
    this.color[idx + 3] = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  }

  public addGlow(x: number, y: number, radius: number, rgb: RgbColor, strength = 0.45): void {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    const r = Math.ceil(radius);
    const rSq = radius * radius;

    for (let dy = -r; dy <= r; dy++) {
      const py = cy + dy;
      if (py < 0 || py >= this.height) continue;
      for (let dx = -r; dx <= r; dx++) {
        const px = cx + dx;
        if (px < 0 || px >= this.width) continue;
        const dSq = dx * dx + dy * dy;
        if (dSq > rSq) continue;
        const falloff = (1 - dSq / rSq) * strength;
        const lIdx = (py * this.width + px) * 3;
        this.light[lIdx] += rgb.r * falloff;
        this.light[lIdx + 1] += rgb.g * falloff;
        this.light[lIdx + 2] += rgb.b * falloff;
      }
    }
  }

  public drawDisc(
    cx: number,
    cy: number,
    radius: number,
    rgb: RgbColor,
    alpha = 1,
    dither = true
  ): void {
    const r = Math.ceil(radius);
    const rSq = radius * radius;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dSq = dx * dx + dy * dy;
        if (dSq <= rSq) {
          this.setPixel(cx + dx, cy + dy, rgb, alpha, dither);
        }
      }
    }
  }

  public drawRing(
    cx: number,
    cy: number,
    innerR: number,
    outerR: number,
    rgb: RgbColor,
    alpha = 1,
    dither = true
  ): void {
    const r = Math.ceil(outerR);
    const inSq = innerR * innerR;
    const outSq = outerR * outerR;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dSq = dx * dx + dy * dy;
        if (dSq >= inSq && dSq <= outSq) {
          this.setPixel(cx + dx, cy + dy, rgb, alpha, dither);
        }
      }
    }
  }

  public compositeToImageData(imgData: ImageData): void {
    const out = imgData.data;
    const total = this.width * this.height;
    for (let i = 0; i < total; i++) {
      const cIdx = i * 4;
      const lIdx = i * 3;
      const baseA = this.color[cIdx + 3];
      const lr = this.light[lIdx];
      const lg = this.light[lIdx + 1];
      const lb = this.light[lIdx + 2];
      const glowA = Math.min(255, Math.max(lr, lg, lb));

      out[cIdx] = Math.min(255, this.color[cIdx] + lr);
      out[cIdx + 1] = Math.min(255, this.color[cIdx + 1] + lg);
      out[cIdx + 2] = Math.min(255, this.color[cIdx + 2] + lb);
      out[cIdx + 3] = Math.max(baseA, Math.round(glowA * 0.85));
    }
  }
}

interface Active3DPixelFx {
  frame: PixelFxFrame;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  imgData: ImageData;
  texture: THREE.CanvasTexture;
  mesh: THREE.Sprite | THREE.Mesh;
  age: number;
  duration: number;
  palette: RgbColor[];
  seed: number;
  drawFn: (
    frame: PixelFxFrame,
    tNorm: number,
    pal: RgbColor[],
    seed: number,
    mesh: THREE.Sprite | THREE.Mesh
  ) => void;
}

export class PixelFxEngine {
  private group = new THREE.Group();
  private activeFx: Active3DPixelFx[] = [];
  private hitStopRemaining = 0;

  constructor(scene: THREE.Scene) {
    this.group.name = 'PixelFx2BufferSpritesGroup';
    scene.add(this.group);
  }

  public triggerHitStop(durationSec = 0.065): void {
    this.hitStopRemaining = Math.max(this.hitStopRemaining, durationSec);
  }

  public isHitStopped(): boolean {
    return this.hitStopRemaining > 0;
  }

  private spawnBillboardFx(options: {
    worldPos: THREE.Vector3;
    size3D: number;
    pixelSize?: number;
    duration: number;
    paletteName: PixelPaletteName;
    groundAligned?: boolean;
    drawFn: (
      frame: PixelFxFrame,
      tNorm: number,
      pal: RgbColor[],
      seed: number,
      mesh: THREE.Sprite | THREE.Mesh
    ) => void;
  }): void {
    const px = options.pixelSize ?? 64;
    const frame = new PixelFxFrame(px, px);
    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(px, px);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;

    const palette = PAL[options.paletteName].map(hexToRgb);
    let mesh: THREE.Sprite | THREE.Mesh;

    if (options.groundAligned) {
      const geo = new THREE.PlaneGeometry(options.size3D, options.size3D);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(options.worldPos);
      mesh.position.y += 0.06;
      mesh.renderOrder = 910;
    } else {
      const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false
      });
      mesh = new THREE.Sprite(mat);
      mesh.scale.set(options.size3D, options.size3D, 1);
      mesh.position.copy(options.worldPos);
      mesh.renderOrder = 920;
    }

    this.group.add(mesh);
    this.activeFx.push({
      frame,
      canvas,
      ctx,
      imgData,
      texture,
      mesh,
      age: 0,
      duration: options.duration,
      palette,
      seed: Math.random() * 100,
      drawFn: options.drawFn
    });
  }

  /**
   * 1. PixelFX Dice Impact Shockwave + Double Roll Volt Lightning Nova
   */
  public spawnDiceImpactBurst(worldPos: THREE.Vector3, isDoubles: boolean): void {
    const pal: PixelPaletteName = isDoubles ? 'volt' : 'cyber';

    // Ground pixel ring shockwave
    this.spawnBillboardFx({
      worldPos: new THREE.Vector3(worldPos.x, 0.45, worldPos.z),
      size3D: isDoubles ? 4.4 : 3.2,
      pixelSize: 64,
      duration: isDoubles ? 0.65 : 0.48,
      paletteName: pal,
      groundAligned: true,
      drawFn: (f, t, p) => {
        const cx = 32;
        const cy = 32;
        const easeOut = 1 - Math.pow(1 - t, 3);
        const outerR = 4 + easeOut * 26;
        const innerR = Math.max(0, outerR - (1 - t) * 7);

        // White hero flash on contact frame (t < 0.12)
        if (t < 0.12) {
          f.drawDisc(cx, cy, 14, p[4], 1, false);
        }
        f.drawRing(cx, cy, innerR, outerR, t < 0.25 ? p[4] : p[3], 1 - t * 0.6, true);
        f.drawRing(cx, cy, Math.max(0, innerR - 3), innerR, p[2], 1 - t, true);
        f.addGlow(cx, cy, outerR * 0.9, p[2], (1 - t) * 0.55);

        // Radial pixel sparks
        for (let i = 0; i < 12; i++) {
          const ang = (Math.PI * 2 * i) / 12 + t * 1.2;
          const dist = easeOut * (18 + (i % 3) * 4);
          const sx = cx + Math.cos(ang) * dist;
          const sy = cy + Math.sin(ang) * dist;
          f.drawDisc(sx, sy, 1.6, p[4], 1 - t, false);
        }
      }
    });

    if (isDoubles) {
      this.triggerHitStop(0.055);
      // Vertical Volt Lightning Pillar for Doubles!
      this.spawnBillboardFx({
        worldPos: new THREE.Vector3(worldPos.x, 2.2, worldPos.z),
        size3D: 3.8,
        pixelSize: 64,
        duration: 0.62,
        paletteName: 'volt',
        drawFn: (f, t, p, seed) => {
          const cx = 32;
          const fade = 1 - t;
          // Jagged pixel lightning bolt down the center
          for (let y = 4; y < 60; y++) {
            const jag = Math.sin(y * 0.45 + seed + t * 25) * 4.5 * fade;
            const bx = cx + jag;
            const thickness = Math.max(1, (1 - t * 0.8) * 3.2);
            f.drawDisc(bx, y, thickness, p[4], 1, false);
            f.drawDisc(bx + 2, y, thickness, p[2], 0.85, true);
            if (y % 4 === 0) {
              f.addGlow(bx, y, 7, p[3], 0.45 * fade);
            }
          }
        }
      });
    }
  }

  /**
   * 2. PixelFX Holy/Gold Level-Up Pillar & Anvil Sparks when buying or upgrading properties
   */
  public spawnLevelUpPillar(worldPos: THREE.Vector3, level: number): void {
    const pal: PixelPaletteName = level >= 4 ? 'holy' : level >= 2 ? 'gold' : 'emerald';
    if (level >= 4) {
      this.triggerHitStop(0.065);
    }

    // Ground rune ring
    this.spawnBillboardFx({
      worldPos: new THREE.Vector3(worldPos.x, 0.6, worldPos.z),
      size3D: 2.8 + level * 0.35,
      pixelSize: 64,
      duration: 0.65,
      paletteName: pal,
      groundAligned: true,
      drawFn: (f, t, p) => {
        const ease = 1 - Math.pow(1 - t, 3);
        const r = 6 + ease * 22;
        f.drawRing(32, 32, Math.max(0, r - 4), r, p[3], 1 - t * 0.5, true);
        f.addGlow(32, 32, r, p[2], (1 - t) * 0.5);
      }
    });

    // Rising Pixel Pillar + Sparkles
    this.spawnBillboardFx({
      worldPos: new THREE.Vector3(worldPos.x, 1.65, worldPos.z),
      size3D: 2.9 + level * 0.25,
      pixelSize: 64,
      duration: 0.68,
      paletteName: pal,
      drawFn: (f, t, p, seed) => {
        const cx = 32;
        const width = Math.max(1, (1 - t) * (10 + level * 2));
        const topY = Math.floor(56 - Math.min(1, t * 1.6) * 48);

        for (let y = topY; y < 58; y++) {
          for (let dx = -width; dx <= width; dx++) {
            const normX = Math.abs(dx) / Math.max(1, width);
            const col = normX < 0.35 ? p[4] : normX < 0.7 ? p[3] : p[2];
            f.setPixel(cx + dx, y, col, (1 - normX * 0.5) * (1 - t), true);
          }
        }
        f.addGlow(cx, 36, 16, p[3], (1 - t) * 0.55);

        // Rising pixel cross stars
        for (let i = 0; i < 10; i++) {
          const sx = cx + Math.sin(seed + i * 2.1) * (8 + i * 1.6);
          const sy = 56 - ((t * 52 + i * 7) % 50);
          f.setPixel(sx, sy, p[4], 1 - t, false);
          f.setPixel(sx - 1, sy, p[3], 1 - t, false);
          f.setPixel(sx + 1, sy, p[3], 1 - t, false);
          f.setPixel(sx, sy - 1, p[3], 1 - t, false);
          f.setPixel(sx, sy + 1, p[3], 1 - t, false);
        }
      }
    });
  }

  /**
   * 3. PixelFX Khí Vận / Cơ Hội Card Burst
   */
  public spawnChestCardBurst(worldPos: THREE.Vector3, deck: 'KHI_VAN' | 'CO_HOI'): void {
    const pal: PixelPaletteName = deck === 'KHI_VAN' ? 'gold' : 'fire';
    this.spawnBillboardFx({
      worldPos: new THREE.Vector3(worldPos.x, 1.5, worldPos.z),
      size3D: 3.1,
      pixelSize: 64,
      duration: 0.65,
      paletteName: pal,
      drawFn: (f, t, p) => {
        const cx = 32;
        const cy = 32;
        const ease = 1 - Math.pow(1 - t, 4);
        if (t < 0.14) {
          f.drawDisc(cx, cy, 12, p[4], 1, false);
        }
        for (let i = 0; i < 16; i++) {
          const a = (Math.PI * 2 * i) / 16 + t * 0.8;
          const r = ease * (14 + (i % 3) * 5);
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          f.drawDisc(px, py, 2.2 * (1 - t * 0.6), i % 2 === 0 ? p[4] : p[3], 1 - t, true);
          f.addGlow(px, py, 5, p[2], (1 - t) * 0.35);
        }
      }
    });
  }

  /**
   * 4. PixelFX Starlight Trail spawned along the character's perimeter flight path
   */
  public spawnFlightTrailSparkle(
    worldPos: THREE.Vector3,
    paletteName: PixelPaletteName = 'arcane'
  ): void {
    this.spawnBillboardFx({
      worldPos: worldPos.clone(),
      size3D: 1.55,
      pixelSize: 32,
      duration: 0.42,
      paletteName,
      drawFn: (f, t, p, seed) => {
        const cx = 16;
        const cy = 16;
        const r = Math.max(1, (1 - t) * 6);
        f.drawDisc(cx, cy, r, t < 0.25 ? p[4] : p[3], 1 - t, true);
        f.addGlow(cx, cy, r * 1.8, p[2], (1 - t) * 0.5);
        for (let i = 0; i < 4; i++) {
          const ang = seed + i * 1.57 + t * 3;
          const sx = cx + Math.cos(ang) * (t * 9);
          const sy = cy + Math.sin(ang) * (t * 9);
          f.setPixel(sx, sy, p[4], 1 - t, false);
        }
      }
    });
  }

  /**
   * 5. PixelFX End Portal Swirling Vortex Suck (when a player steps into #30 or is sucked into the End Portal)
   */
  public spawnEndPortalVortexSuck(worldPos: THREE.Vector3): void {
    this.spawnBillboardFx({
      worldPos: new THREE.Vector3(worldPos.x, 0.72, worldPos.z),
      size3D: 3.6,
      pixelSize: 64,
      duration: 0.78,
      paletteName: 'arcane',
      groundAligned: true,
      drawFn: (f, t, p) => {
        const cx = 32;
        const cy = 32;
        // Inward-spiraling vortex arms sucking toward the center
        for (let arm = 0; arm < 5; arm++) {
          for (let s = 0; s < 24; s++) {
            const u = s / 24;
            const radius = (1 - t * 0.75) * u * 28;
            const angle = (Math.PI * 2 * arm) / 5 + u * 4.5 + t * 12;
            const px = cx + Math.cos(angle) * radius;
            const py = cy + Math.sin(angle) * radius;
            const col = u < 0.3 ? p[4] : u < 0.65 ? p[3] : p[2];
            f.drawDisc(px, py, 1.8, col, 1 - u * 0.5, true);
          }
        }
        f.drawDisc(cx, cy, 5 * (1 - t * 0.4), p[0], 1, false);
        f.addGlow(cx, cy, 18, p[2], 0.65 * (1 - t * 0.5));
      }
    });
  }

  /**
   * 6. PixelFX Ground Slam + Shadow Chains when slamming down into #10 Nhà Tù Chí Hòa from the Sky End Portal!
   */
  public spawnJailChainsSlam(worldPos: THREE.Vector3): void {
    this.triggerHitStop(0.08);

    // Ground impact ring
    this.spawnBillboardFx({
      worldPos: new THREE.Vector3(worldPos.x, 0.62, worldPos.z),
      size3D: 4.2,
      pixelSize: 64,
      duration: 0.72,
      paletteName: 'shadow',
      groundAligned: true,
      drawFn: (f, t, p) => {
        const ease = 1 - Math.pow(1 - t, 4);
        const outerR = 5 + ease * 25;
        const innerR = Math.max(0, outerR - (1 - t) * 8);
        if (t < 0.15) {
          f.drawDisc(32, 32, 16, p[4], 1, false);
        }
        f.drawRing(32, 32, innerR, outerR, p[3], 1 - t * 0.5, true);
        f.addGlow(32, 32, outerR, p[2], (1 - t) * 0.6);
      }
    });

    // Vertical Pixel Iron Bars / Arcane Prison Cage Slam
    this.spawnBillboardFx({
      worldPos: new THREE.Vector3(worldPos.x, 1.45, worldPos.z),
      size3D: 2.8,
      pixelSize: 64,
      duration: 0.85,
      paletteName: 'cyber',
      drawFn: (f, t, p) => {
        const dropY = Math.min(1, t * 4.5);
        const maxBarY = Math.floor(dropY * 56);
        const fade = t > 0.7 ? (1 - t) / 0.3 : 1;

        // 5 vertical pixel prison bars + 2 horizontal crossbars
        const barXs = [14, 23, 32, 41, 50];
        for (const bx of barXs) {
          for (let y = 6; y <= maxBarY; y++) {
            f.setPixel(bx - 1, y, p[1], fade, false);
            f.setPixel(bx, y, p[4], fade, false);
            f.setPixel(bx + 1, y, p[2], fade, false);
          }
        }
        for (const hy of [16, 44]) {
          if (maxBarY >= hy) {
            for (let x = 12; x <= 52; x++) {
              f.setPixel(x, hy, p[3], fade, false);
              f.setPixel(x, hy + 1, p[1], fade, false);
            }
          }
        }
        f.addGlow(32, 32, 20, p[2], 0.4 * fade);
      }
    });
  }

  /**
   * 7. 2D HUD PixelFX Overlay on Player Cards (Coin Sparkle, Slash, Arcane Card Pop)
   */
  public triggerHudCardPixelFx(
    playerId: string,
    effectType: 'GAIN' | 'LOSS' | 'CARD' | 'JAIL'
  ): void {
    const cardEl = document.querySelector<HTMLElement>(`[data-player-card-id="${playerId}"]`);
    if (!cardEl) return;

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 36;
    canvas.className = 'pixelfx-hud-canvas';
    cardEl.appendChild(canvas);

    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(64, 36);
    const frame = new PixelFxFrame(64, 36);

    const palName: PixelPaletteName =
      effectType === 'GAIN'
        ? 'emerald'
        : effectType === 'LOSS'
          ? 'crimson'
          : effectType === 'JAIL'
            ? 'shadow'
            : 'gold';
    const pal = PAL[palName].map(hexToRgb);

    const start = performance.now();
    const durationMs = 560;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      frame.clear();

      if (effectType === 'LOSS') {
        // Diagonal crimson pixel slash across the card
        const progress = Math.min(1, t * 2.2);
        const maxLen = Math.floor(progress * 54);
        for (let i = 0; i < maxLen; i++) {
          const sx = 6 + i;
          const sy = Math.floor(4 + (i / 54) * 28);
          frame.drawDisc(sx, sy, (1 - t) * 2.6, t < 0.2 ? pal[4] : pal[2], 1 - t, true);
        }
        frame.addGlow(32, 18, 18, pal[2], (1 - t) * 0.55);
      } else {
        // Expanding pixel sparkles across the HUD card
        for (let i = 0; i < 12; i++) {
          const a = (Math.PI * 2 * i) / 12 + t * 1.5;
          const rx = 32 + Math.cos(a) * (t * 28);
          const ry = 18 + Math.sin(a) * (t * 15);
          frame.drawDisc(rx, ry, 1.8 * (1 - t * 0.5), i % 2 === 0 ? pal[4] : pal[3], 1 - t, true);
        }
        frame.addGlow(32, 18, 16, pal[2], (1 - t) * 0.5);
      }

      frame.compositeToImageData(imgData);
      ctx.putImageData(imgData, 0, 0);

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        canvas.remove();
      }
    };

    requestAnimationFrame(step);
  }

  public update(dt: number): void {
    if (this.hitStopRemaining > 0) {
      this.hitStopRemaining = Math.max(0, this.hitStopRemaining - dt);
      return;
    }

    for (let i = this.activeFx.length - 1; i >= 0; i--) {
      const fx = this.activeFx[i];
      fx.age += dt;
      if (fx.age >= fx.duration) {
        this.group.remove(fx.mesh);
        if (fx.mesh instanceof THREE.Mesh) {
          fx.mesh.geometry.dispose();
          (fx.mesh.material as THREE.Material).dispose();
        } else {
          (fx.mesh.material as THREE.Material).dispose();
        }
        fx.texture.dispose();
        this.activeFx.splice(i, 1);
        continue;
      }

      const tNorm = Math.min(1, fx.age / fx.duration);
      fx.frame.clear();
      fx.drawFn(fx.frame, tNorm, fx.palette, fx.seed, fx.mesh);
      fx.frame.compositeToImageData(fx.imgData);
      fx.ctx.putImageData(fx.imgData, 0, 0);
      fx.texture.needsUpdate = true;
    }
  }
}
