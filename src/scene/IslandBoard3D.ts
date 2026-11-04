import * as THREE from 'three';
import gsap from 'gsap';
import { BOARD_SIZE, BOARD_TILES, TileConfig } from '../core/boardData';
import { ParticleSystem3D } from './ParticleSystem3D';
import { soundManager } from '../audio/SoundManager';

export const TILE_SPACING = 2.22;

/**
 * Generates an ultra-crisp 512x512 High-DPI texture for each of the 40 board tiles.
 * Uses 100% Vietnamese-compatible fonts ("Be Vietnam Pro", "Chakra Petch", "Nunito")
 * and rotates outward per row (`tile.outwardRotationY`).
 */
function createHighResTileTexture(
  tile: TileConfig,
  festivalMultiplier = 1,
  ownerColorHex: string | null = null
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const isDarkTile = tile.type === 'END_PORTAL' || tile.type === 'NETHER_PORTAL';
  const isCorner = tile.index % 10 === 0;

  ctx.fillStyle = isDarkTile ? '#1e1b4b' : isCorner ? '#fefce8' : '#ffffff';
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = isDarkTile ? '#2e1065' : isCorner ? '#fef9c3' : '#f8fafc';
  ctx.fillRect(20, 20, 472, 472);

  ctx.strokeStyle = ownerColorHex || tile.colorHex;
  ctx.lineWidth = 24;
  ctx.strokeRect(12, 12, 488, 488);

  ctx.strokeStyle = isDarkTile ? 'rgba(216, 180, 254, 0.35)' : 'rgba(15, 23, 42, 0.12)';
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, 456, 456);

  ctx.fillStyle = tile.colorHex;
  ctx.fillRect(24, 24, 464, 108);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.fillRect(24, 24, 464, 26);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(36, 38, 112, 74);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 40px "Chakra Petch", "Be Vietnam Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`#${tile.index}`, 92, 76);

  if (festivalMultiplier > 1) {
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(358, 38, 118, 74);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 40px "Be Vietnam Pro", sans-serif';
    ctx.fillText(`x${festivalMultiplier}`, 417, 76);
  }

  ctx.font = '108px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tile.icon, 256, 208);

  ctx.fillStyle = isDarkTile ? '#ffffff' : '#0f172a';
  ctx.font = '800 40px "Be Vietnam Pro", "Nunito", sans-serif';

  const words = tile.name.split(' ');
  let line1 = '';
  let line2 = '';
  if (words.length <= 2) {
    line1 = tile.name;
  } else if (words.length === 3) {
    line1 = words.slice(0, 2).join(' ');
    line2 = words[2];
  } else {
    const mid = Math.ceil(words.length / 2);
    line1 = words.slice(0, mid).join(' ');
    line2 = words.slice(mid).join(' ');
  }

  if (line2) {
    ctx.fillText(line1, 256, 322);
    ctx.fillText(line2, 256, 374);
  } else {
    ctx.fillText(line1, 256, 348);
  }

  ctx.fillStyle = isDarkTile ? 'rgba(15, 23, 42, 0.94)' : '#0f172a';
  ctx.fillRect(34, 410, 444, 74);

  ctx.font = '800 42px "Be Vietnam Pro", "Chakra Petch", sans-serif';
  if (tile.price && tile.type !== 'ROYAL_TAX') {
    ctx.fillStyle = '#34d399';
    ctx.fillText(`$${tile.price}`, 256, 449);
  } else if (tile.type === 'START') {
    ctx.fillStyle = '#34d399';
    ctx.fillText(`+$200`, 256, 449);
  } else if (tile.type === 'ROYAL_TAX') {
    ctx.fillStyle = '#f87171';
    ctx.fillText(`-$${tile.price ?? 120}`, 256, 449);
  } else if (tile.type === 'CHEST') {
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`KHO BÁU`, 256, 449);
  } else if (tile.type === 'END_PORTAL') {
    ctx.fillStyle = '#d8b4fe';
    ctx.fillText(`CỔNG THE END`, 256, 449);
  } else if (tile.type === 'NETHER_PORTAL') {
    ctx.fillStyle = '#f0abfc';
    ctx.fillText(`CỔNG NETHER`, 256, 449);
  } else if (tile.type === 'FESTIVAL') {
    ctx.fillStyle = '#f472b6';
    ctx.fillText(`THUÊ x2`, 256, 449);
  } else {
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`NGHỈ 1 LƯỢT`, 256, 449);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Helper to configure crisp 16x16 Minecraft Pixel-Art textures with NearestFilter
 */
function finalizePixelTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

/**
 * 1. Authentic 16x16 Minecraft Iron Block Pixel-Art Texture
 */
function createMinecraftIronBlockTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;

  // Base metallic iron fill
  ctx.fillStyle = '#dcdcdc';
  ctx.fillRect(0, 0, 16, 16);

  // Outer dark iron bevel (bottom & right)
  ctx.fillStyle = '#a0a0a0';
  ctx.fillRect(0, 15, 16, 1);
  ctx.fillRect(15, 0, 1, 16);

  // Outer bright highlight bevel (top & left)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 15, 1);
  ctx.fillRect(0, 0, 1, 15);

  // Inner frame
  ctx.fillStyle = '#c2c2c2';
  ctx.strokeRect(1.5, 1.5, 13, 13);

  // Characteristic horizontal Minecraft Iron Block shading bands & diagonal sheen
  const rows = [
    '#efefef',
    '#e4e4e4',
    '#d2d2d2',
    '#e8e8e8',
    '#efefef',
    '#dcdcdc',
    '#cccccc',
    '#e2e2e2',
    '#ececec',
    '#dadada',
    '#c8c8c8',
    '#dfdfdf'
  ];
  for (let y = 2; y < 14; y++) {
    ctx.fillStyle = rows[y - 2];
    ctx.fillRect(2, y, 12, 1);
  }
  // Subtle pixel highlights inside
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(3, 3, 4, 1);
  ctx.fillRect(5, 7, 5, 1);
  ctx.fillRect(4, 11, 4, 1);

  return finalizePixelTexture(canvas);
}

/**
 * 2. Authentic 16x16 Minecraft Obsidian Pixel-Art Texture (used for Beacon Base & Nether Portal)
 */
function createMinecraftObsidianTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;

  const palette = ['#0f0a18', '#14121e', '#1d162b', '#291e3e', '#3b2754', '#100c1c'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const idx = (x * 7 + y * 13 + ((x ^ y) * 3)) % palette.length;
      ctx.fillStyle = palette[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Characteristic diagonal purple crystalline highlights in Minecraft Obsidian
  ctx.fillStyle = '#4c326e';
  ctx.fillRect(3, 2, 2, 1);
  ctx.fillRect(2, 3, 1, 2);
  ctx.fillRect(10, 5, 2, 1);
  ctx.fillRect(9, 6, 1, 2);
  ctx.fillRect(5, 11, 3, 1);
  ctx.fillRect(12, 12, 2, 2);

  return finalizePixelTexture(canvas);
}

/**
 * 3. Authentic 16x16 Minecraft Beacon Glass Shell Pixel-Art Texture
 */
function createMinecraftBeaconGlassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;

  // Very subtle cyan-tinted transparent glass pane
  ctx.fillStyle = 'rgba(165, 243, 252, 0.14)';
  ctx.fillRect(1, 1, 14, 14);

  // Outer pixel glass frame (1px border)
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(0, 0, 16, 1);
  ctx.fillRect(0, 15, 16, 1);
  ctx.fillRect(0, 0, 1, 16);
  ctx.fillRect(15, 0, 1, 16);

  // Bright white-cyan inner corner pixels & glass streaks
  ctx.fillStyle = '#ecfeff';
  ctx.fillRect(1, 1, 2, 1);
  ctx.fillRect(1, 2, 1, 1);
  ctx.fillRect(13, 1, 2, 1);
  ctx.fillRect(14, 2, 1, 1);

  // Diagonal glass reflection streaks
  ctx.fillRect(3, 3, 1, 1);
  ctx.fillRect(4, 4, 1, 1);
  ctx.fillRect(5, 5, 1, 1);
  ctx.fillRect(11, 10, 1, 1);
  ctx.fillRect(12, 11, 1, 1);

  return finalizePixelTexture(canvas);
}

/**
 * 4. Authentic 16x16 Minecraft Beacon Nether Star Core Pixel-Art Texture
 */
function createMinecraftBeaconCoreTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0891b2';
  ctx.fillRect(0, 0, 16, 16);

  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(1, 1, 14, 14);

  ctx.fillStyle = '#67e8f9';
  ctx.fillRect(2, 2, 12, 12);

  ctx.fillStyle = '#a5f3fc';
  ctx.fillRect(4, 4, 8, 8);

  // Glowing white Nether Star cross in the center
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(6, 2, 4, 12);
  ctx.fillRect(2, 6, 12, 4);
  ctx.fillRect(5, 5, 6, 6);

  return finalizePixelTexture(canvas);
}

/**
 * 5. Authentic Scrolling Minecraft Beacon Light Beam Texture (Pixelated Energy Stripes & Rings)
 */
function createMinecraftBeaconBeamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 32, 64);

  // Vertical glowing core columns
  for (let x = 0; x < 32; x++) {
    const distFromCenter = Math.abs(x - 15.5) / 16;
    const alpha = Math.max(0.18, 0.88 - distFromCenter * 0.65);
    ctx.fillStyle = x % 4 === 0 ? `rgba(255, 255, 255, ${alpha})` : `rgba(103, 232, 249, ${alpha})`;
    ctx.fillRect(x, 0, 1, 64);
  }

  // Horizontal rising energy bands (pixel rings)
  for (let y = 0; y < 64; y += 8) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillRect(2, y, 28, 2);
    ctx.fillStyle = 'rgba(52, 211, 153, 0.75)';
    ctx.fillRect(0, y + 2, 32, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.repeat.set(1, 5);
  return tex;
}

/**
 * 6. Authentic 16x16 End Portal Frame Top & Side Pixel-Art Textures
 */
function createEndPortalFrameTopTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;

  // End Stone cream base
  ctx.fillStyle = '#dfd9a3';
  ctx.fillRect(0, 0, 16, 16);

  // Outer ornamental dark teal-green border
  ctx.fillStyle = '#1b4d3e';
  ctx.fillRect(0, 0, 16, 2);
  ctx.fillRect(0, 14, 16, 2);
  ctx.fillRect(0, 0, 2, 16);
  ctx.fillRect(14, 0, 2, 16);

  // Corner emerald accents
  ctx.fillStyle = '#45937a';
  ctx.fillRect(1, 1, 3, 3);
  ctx.fillRect(12, 1, 3, 3);
  ctx.fillRect(1, 12, 3, 3);
  ctx.fillRect(12, 12, 3, 3);

  // Center socket ring for Eye of Ender
  ctx.fillStyle = '#0f2922';
  ctx.fillRect(4, 4, 8, 8);
  ctx.fillStyle = '#2c6e58';
  ctx.fillRect(5, 5, 6, 6);

  return finalizePixelTexture(canvas);
}

function createEndPortalFrameSideTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;

  // End stone lower body
  ctx.fillStyle = '#d5ce95';
  ctx.fillRect(0, 0, 16, 16);

  // Top dark green cap
  ctx.fillStyle = '#1b4d3e';
  ctx.fillRect(0, 0, 16, 4);

  // Ancient teal rune pillars hanging down the side
  ctx.fillStyle = '#2c6e58';
  for (let x = 2; x <= 12; x += 5) {
    ctx.fillRect(x, 4, 3, 8);
    ctx.fillStyle = '#45937a';
    ctx.fillRect(x + 1, 5, 1, 6);
    ctx.fillStyle = '#2c6e58';
  }

  // Bottom End stone cobble pixels
  ctx.fillStyle = '#b8b078';
  ctx.fillRect(0, 13, 16, 3);

  return finalizePixelTexture(canvas);
}

function createEyeOfEnderTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#15803d';
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(2, 2, 12, 12);
  ctx.fillStyle = '#86efac';
  ctx.fillRect(4, 4, 8, 8);
  // Slit pupil
  ctx.fillStyle = '#052e16';
  ctx.fillRect(7, 3, 2, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(6, 4, 1, 2);

  return finalizePixelTexture(canvas);
}

/**
 * 7. Cosmic Starfield Void Texture for the 3x3 interior of the End Portal
 */
function createEndPortalVoidTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, 64, 64);

  const starColors = ['#38bdf8', '#c084fc', '#ffffff', '#34d399', '#818cf8'];
  for (let i = 0; i < 55; i++) {
    ctx.fillStyle = starColors[i % starColors.length];
    const sx = (i * 19 + 7) % 62;
    const sy = (i * 31 + 11) % 62;
    const size = i % 5 === 0 ? 2 : 1;
    ctx.fillRect(sx, sy, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

/**
 * 8. Authentic 16x16 Swirling Purple Nether Portal Vortex Texture
 */
function createNetherPortalVortexTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  const colors = ['#581c87', '#7e22ce', '#9333ea', '#c084fc', '#f0abfc'];
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const dx = x - 16;
      const dy = y - 16;
      const r = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const swirl = Math.floor(r * 0.65 + angle * 2.5 + 20) % colors.length;
      ctx.fillStyle = colors[Math.abs(swirl)];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

export class IslandBoard3D {
  public readonly root = new THREE.Group();
  private tileContainerGroups: THREE.Group[] = [];
  private tileMeshes: THREE.Mesh[] = [];
  private buildingGroups = new Map<number, THREE.Group>();
  private crownMeshes: THREE.Mesh[] = [];
  private cloudsGroup = new THREE.Group();
  private waterfallDrops: THREE.Mesh[] = [];
  private waterMesh!: THREE.Mesh;
  private beaconBeam?: THREE.Mesh;
  private endPortalVoidTextures: THREE.CanvasTexture[] = [];
  private netherPortalTextures: THREE.CanvasTexture[] = [];
  private particles: ParticleSystem3D;

  // Target Destination Beacon + 9 Floating Iron Blocks + Multi-Layer Animated Beam
  private targetBeaconGroup?: THREE.Group;
  private targetIronBaseGroup?: THREE.Group;
  private targetBeaconStarCore?: THREE.Mesh;
  private targetBeamInner?: THREE.Mesh;
  private targetBeamOuter?: THREE.Mesh;
  private beaconBeamTexture: THREE.CanvasTexture;
  private ironBlockTexture: THREE.CanvasTexture;
  private obsidianTexture: THREE.CanvasTexture;
  private beaconGlassTexture: THREE.CanvasTexture;
  private beaconCoreTexture: THREE.CanvasTexture;

  // Currently elevated & camera-tilted tile index
  private elevatedTileIndex: number | null = null;
  private elevatedGlowBase?: THREE.Mesh;

  // UPG-05: Whimsy Easter Egg clickables (Central Beacon & Courtyard Trees)
  private whimsyClickables: THREE.Object3D[] = [];
  private beaconColorIdx = 0;

  // UX-03: 3D Tile Picker Highlight Rings (for End Portal #30 & Festival #20)
  private pickerHighlightGroup = new THREE.Group();

  constructor(scene: THREE.Scene, particles: ParticleSystem3D) {
    this.particles = particles;
    this.ironBlockTexture = createMinecraftIronBlockTexture();
    this.obsidianTexture = createMinecraftObsidianTexture();
    this.beaconGlassTexture = createMinecraftBeaconGlassTexture();
    this.beaconCoreTexture = createMinecraftBeaconCoreTexture();
    this.beaconBeamTexture = createMinecraftBeaconBeamTexture();

    this.root.name = 'FloatingVoxelIsland40';
    scene.add(this.root);

    this.buildRichPastelOceanAndBoats();
    this.buildFourSurroundingArenaWalls();
    this.buildDeepMultiTieredIslandBase();
    this.buildDetailedInnerCourtyard();
    this.build40OutwardAngledTiles();
    this.buildSatelliteMiniIslands();
    this.buildFloatingClouds();
    this.initTargetBeaconWithAuthenticTextures();
    this.pickerHighlightGroup.name = 'Direct3DTilePickerRings';
    this.root.add(this.pickerHighlightGroup);
  }

  private buildRichPastelOceanAndBoats(): void {
    const waterGeo = new THREE.BoxGeometry(260, 1.8, 260, 32, 1, 32);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      roughness: 0.22,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.set(0, -1.35, 0);
    this.waterMesh.receiveShadow = true;
    this.root.add(this.waterMesh);

    const deepGeo = new THREE.BoxGeometry(260, 1.4, 260);
    const deepMat = new THREE.MeshBasicMaterial({ color: '#0369a1' });
    const deepMesh = new THREE.Mesh(deepGeo, deepMat);
    deepMesh.position.set(0, -2.8, 0);
    this.root.add(deepMesh);

    const foamMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.78
    });
    for (let i = -12; i <= 12; i += 2) {
      const f1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 0.45), foamMat);
      f1.position.set(i * 1.1, -0.5, 14.2);
      const f2 = f1.clone();
      f2.position.set(i * 1.1, -0.5, -14.2);
      const f3 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 1.3), foamMat);
      f3.position.set(14.2, -0.5, i * 1.1);
      const f4 = f3.clone();
      f4.position.set(-14.2, -0.5, i * 1.1);
      this.root.add(f1, f2, f3, f4);
    }

    const boatPositions = [
      { x: -17, z: 15, ry: 0.6 },
      { x: 18, z: -15, ry: -2.2 },
      { x: -18, z: -16, ry: 1.8 },
      { x: 17, z: 16, ry: -0.8 },
      { x: -34, z: 26, ry: 1.1 },
      { x: 36, z: -28, ry: -1.5 },
      { x: -32, z: -30, ry: 2.3 },
      { x: 34, z: 32, ry: -0.4 }
    ];
    for (const bp of boatPositions) {
      const boat = this.createVoxelSailboat();
      boat.position.set(bp.x, -0.45, bp.z);
      boat.rotation.y = bp.ry;
      this.root.add(boat);
    }
  }

  private buildFourSurroundingArenaWalls(): void {
    const wallsGroup = new THREE.Group();
    wallsGroup.name = 'FourSurroundingVoxelWalls';

    const wallDist = 66;
    const wallSpan = 136;

    const deepslateMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.88 });
    const stoneBrickMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.8 });
    const mossyStoneMat = new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.78 });
    const grassTopMat = new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.7 });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      emissive: '#d97706',
      emissiveIntensity: 0.35
    });
    const seaLanternMat = new THREE.MeshBasicMaterial({ color: '#67e8f9' });
    const waterfallMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.82
    });

    const buildWallSide = (rotY: number) => {
      const side = new THREE.Group();
      side.rotation.y = rotY;

      const baseWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallSpan, 9, 8.5),
        deepslateMat
      );
      baseWall.position.set(0, 2.5, -wallDist);
      baseWall.receiveShadow = true;
      baseWall.castShadow = true;
      side.add(baseWall);

      const upperWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallSpan - 4, 7.5, 6.2),
        stoneBrickMat
      );
      upperWall.position.set(0, 10.2, -wallDist - 0.5);
      upperWall.receiveShadow = true;
      upperWall.castShadow = true;
      side.add(upperWall);

      const terrace = new THREE.Mesh(
        new THREE.BoxGeometry(wallSpan - 4, 1.2, 6.6),
        grassTopMat
      );
      terrace.position.set(0, 14.3, -wallDist - 0.5);
      side.add(terrace);

      for (let x = -56; x <= 56; x += 8) {
        const merlon = new THREE.Mesh(
          new THREE.BoxGeometry(3.8, 2.2, 2.2),
          x % 16 === 0 ? mossyStoneMat : stoneBrickMat
        );
        merlon.position.set(x, 15.8, -wallDist + 1.8);
        side.add(merlon);

        if (x % 16 === 0) {
          const lantern = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 1.4, 1.4),
            goldTrimMat
          );
          lantern.position.set(x, 17.5, -wallDist + 1.8);
          side.add(lantern);
        }
      }

      const centerFort = new THREE.Mesh(
        new THREE.BoxGeometry(22, 19, 10),
        stoneBrickMat
      );
      centerFort.position.set(0, 8.0, -wallDist + 0.8);
      side.add(centerFort);

      const archCrest = new THREE.Mesh(
        new THREE.BoxGeometry(24, 2.4, 11),
        goldTrimMat
      );
      archCrest.position.set(0, 18.2, -wallDist + 0.8);
      side.add(archCrest);

      const archPortal = new THREE.Mesh(
        new THREE.BoxGeometry(10, 11, 1.2),
        seaLanternMat
      );
      archPortal.position.set(0, 6.5, -wallDist + 5.6);
      side.add(archPortal);

      for (const wx of [-24, 24]) {
        const wf = new THREE.Mesh(
          new THREE.BoxGeometry(4.2, 15.5, 1.2),
          waterfallMat
        );
        wf.position.set(wx, 6.2, -wallDist + 3.2);
        side.add(wf);
      }

      const wallTreeColors = ['#22c55e', '#f472b6', '#16a34a', '#facc15', '#38bdf8'];
      for (let i = -48; i <= 48; i += 16) {
        if (Math.abs(i) < 12) continue;
        const tree = this.createVoxelTree(
          wallTreeColors[Math.abs(i / 16) % wallTreeColors.length],
          '#78350f'
        );
        tree.scale.setScalar(2.2);
        tree.position.set(i, 14.8, -wallDist - 1.2);
        side.add(tree);
      }

      return side;
    };

    wallsGroup.add(
      buildWallSide(0),
      buildWallSide(Math.PI / 2),
      buildWallSide(Math.PI),
      buildWallSide(-Math.PI / 2)
    );

    const corners = [
      [-wallDist, -wallDist],
      [wallDist, -wallDist],
      [-wallDist, wallDist],
      [wallDist, wallDist]
    ];
    for (const [cx, cz] of corners) {
      const tower = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(16, 22, 16), deepslateMat);
      base.position.y = 9.5;
      const mid = new THREE.Mesh(new THREE.BoxGeometry(13, 10, 13), stoneBrickMat);
      mid.position.y = 24.5;
      const roof1 = new THREE.Mesh(new THREE.BoxGeometry(15, 3, 15), goldTrimMat);
      roof1.position.y = 30.5;
      const crystal = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 5), seaLanternMat);
      crystal.position.y = 35.0;
      tower.add(base, mid, roof1, crystal);
      tower.position.set(cx, 0, cz);
      wallsGroup.add(tower);
    }

    this.root.add(wallsGroup);
  }

  private createVoxelSailboat(): THREE.Group {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.45, 0.95),
      new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.8 })
    );
    hull.castShadow = true;
    const mast = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 1.7, 0.14),
      new THREE.MeshStandardMaterial({ color: '#78350f' })
    );
    mast.position.y = 0.9;
    const sail = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 1.15, 1.1),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 })
    );
    sail.position.set(0.08, 1.05, 0);
    sail.castShadow = true;
    g.add(hull, mast, sail);
    return g;
  }

  private buildDeepMultiTieredIslandBase(): void {
    const grassGeo = new THREE.BoxGeometry(19.6, 0.72, 19.6);
    const grassMat = new THREE.MeshStandardMaterial({
      color: '#4ade80',
      roughness: 0.72
    });
    const grassPlatform = new THREE.Mesh(grassGeo, grassMat);
    grassPlatform.position.set(0, 0.04, 0);
    grassPlatform.receiveShadow = true;
    this.root.add(grassPlatform);

    const cliffLayers = [
      { size: 25.4, height: 1.0, y: -0.68, color: '#854d0e' },
      { size: 22.8, height: 1.2, y: -1.7, color: '#713f12' },
      { size: 19.2, height: 1.3, y: -2.85, color: '#57534e' },
      { size: 15.0, height: 1.4, y: -4.1, color: '#44403c' },
      { size: 10.4, height: 1.5, y: -5.4, color: '#292524' },
      { size: 5.8, height: 1.4, y: -6.7, color: '#1c1917' }
    ];

    for (const layer of cliffLayers) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(layer.size, layer.height, layer.size),
        new THREE.MeshStandardMaterial({ color: layer.color, roughness: 0.88 })
      );
      mesh.position.set(0, layer.y, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.root.add(mesh);
    }

    const oreColors = ['#10b981', '#38bdf8', '#a855f7', '#fbbf24'];
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24;
      const dist = 9.5 + (i % 3) * 1.4;
      const ore = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.65, 0.65),
        new THREE.MeshStandardMaterial({
          color: oreColors[i % oreColors.length],
          emissive: oreColors[i % oreColors.length],
          emissiveIntensity: 0.45
        })
      );
      ore.position.set(Math.cos(angle) * dist, -1.8 - (i % 3) * 0.9, Math.sin(angle) * dist);
      this.root.add(ore);
    }
  }

  private buildDetailedInnerCourtyard(): void {
    const pyramidTiers = [
      { size: 6.4, y: 0.42, color: '#e2e8f0' },
      { size: 5.0, y: 0.58, color: '#10b981' },
      { size: 3.8, y: 0.74, color: '#fef3c7' }
    ];
    for (const pt of pyramidTiers) {
      const tier = new THREE.Mesh(
        new THREE.BoxGeometry(pt.size, 0.18, pt.size),
        new THREE.MeshStandardMaterial({
          map: this.ironBlockTexture,
          color: pt.color,
          roughness: 0.35,
          metalness: 0.35
        })
      );
      tier.position.set(0, pt.y, 0);
      tier.receiveShadow = true;
      tier.castShadow = true;
      this.root.add(tier);
    }

    const centerBeaconBlock = new THREE.Group();
    centerBeaconBlock.position.set(0, 0.83, 0);
    const centerObsidian = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.14, 0.62),
      new THREE.MeshStandardMaterial({ map: this.obsidianTexture, roughness: 0.65 })
    );
    centerObsidian.position.set(0, 0.07, 0);
    const centerStar = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.36, 0.36),
      new THREE.MeshBasicMaterial({ map: this.beaconCoreTexture })
    );
    centerStar.position.set(0, 0.34, 0);
    const centerGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 0.64, 0.64),
      new THREE.MeshStandardMaterial({
        map: this.beaconGlassTexture,
        transparent: true,
        alphaTest: 0.05,
        opacity: 0.9,
        roughness: 0.1,
        depthWrite: false
      })
    );
    centerGlass.position.set(0, 0.32, 0);
    centerBeaconBlock.add(centerObsidian, centerStar, centerGlass);
    centerBeaconBlock.userData = { whimsyType: 'BEACON' };
    centerGlass.userData = { whimsyType: 'BEACON' };
    centerObsidian.userData = { whimsyType: 'BEACON' };
    this.whimsyClickables.push(centerGlass, centerObsidian);
    this.root.add(centerBeaconBlock);

    const beaconMat = new THREE.MeshBasicMaterial({
      map: this.beaconBeamTexture,
      color: '#34d399',
      transparent: true,
      opacity: 0.28,
      depthWrite: false
    });
    const centerBeamGeo = new THREE.BoxGeometry(0.52, 4.8, 0.52);
    // Anchor bottom of the beam strictly at y = 0 so it never overflows below the Beacon block!
    centerBeamGeo.translate(0, 2.4, 0);
    this.beaconBeam = new THREE.Mesh(centerBeamGeo, beaconMat);
    this.beaconBeam.position.set(0, 1.15, 0);
    this.beaconBeam.userData = { whimsyType: 'BEACON' };
    this.whimsyClickables.push(this.beaconBeam);
    this.root.add(this.beaconBeam);

    const railRadius = 6.8;
    const tieMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.85 });
    for (let i = 0; i < 40; i++) {
      const a = (Math.PI * 2 * i) / 40;
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.2), tieMat);
      tie.position.set(Math.cos(a) * railRadius, 0.42, Math.sin(a) * railRadius);
      tie.rotation.y = -a;
      this.root.add(tie);
    }

    const pond = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.12, 3.2),
      new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.2, metalness: 0.1 })
    );
    pond.position.set(5.4, 0.41, 5.2);
    this.root.add(pond);

    const dropMat = new THREE.MeshBasicMaterial({
      color: '#7dd3fc',
      transparent: true,
      opacity: 0.85
    });
    for (let i = 0; i < 8; i++) {
      const drop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.35), dropMat);
      drop.position.set(5.4, 0.2 - i * 0.28, 12.8);
      this.waterfallDrops.push(drop);
      this.root.add(drop);
    }

    // Monumental Nether Portal Shrine on the East inner courtyard facing the Nether biome (#31-#34)!
    const courtyardNetherShrine = this.createNetherPortalLandmark3D();
    courtyardNetherShrine.scale.setScalar(1.35);
    courtyardNetherShrine.position.set(7.6, 0.4, -1.8);
    courtyardNetherShrine.rotation.y = Math.PI / 2;
    this.root.add(courtyardNetherShrine);

    const treeSpecs = [
      { x: -6.8, z: -6.8, leaf: '#22c55e', trunk: '#78350f', scale: 1.25 },
      { x: 6.8, z: -6.8, leaf: '#f472b6', trunk: '#57534e', scale: 1.3 },
      { x: -6.8, z: 6.8, leaf: '#f472b6', trunk: '#57534e', scale: 1.25 },
      { x: 6.8, z: 6.8, leaf: '#16a34a', trunk: '#78350f', scale: 1.2 },
      { x: -7.5, z: 0, leaf: '#84cc16', trunk: '#78350f', scale: 1.05 },
      { x: 0, z: -7.5, leaf: '#38bdf8', trunk: '#475569', scale: 1.1 },
      { x: -4.2, z: -4.2, leaf: '#facc15', trunk: '#78350f', scale: 0.95 }
    ];

    for (const ts of treeSpecs) {
      const tree = this.createVoxelTree(ts.leaf, ts.trunk);
      tree.scale.setScalar(ts.scale);
      tree.position.set(ts.x, 0.4, ts.z);
      this.root.add(tree);
    }

    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 + Math.PI / 8;
      const r = 4.6;
      const lantern = this.createVoxelLanternPost();
      lantern.position.set(Math.cos(a) * r, 0.4, Math.sin(a) * r);
      this.root.add(lantern);
    }
  }

  private createVoxelLanternPost(): THREE.Group {
    const g = new THREE.Group();
    const fenceMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.8 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: '#fde047',
      emissive: '#f59e0b',
      emissiveIntensity: 0.85
    });
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), fenceMat);
    post.position.y = 0.55;
    post.castShadow = true;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.32), glowMat);
    lamp.position.y = 1.2;
    g.add(post, lamp);
    return g;
  }

  private createVoxelTree(leafHex: string, trunkHex: string): THREE.Group {
    const g = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: trunkHex, roughness: 0.85 });
    const leafMat = new THREE.MeshStandardMaterial({ color: leafHex, roughness: 0.6 });

    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.4, 0.46), trunkMat);
    trunk.position.y = 0.7;
    trunk.castShadow = true;
    g.add(trunk);

    const canopy1 = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.7, 1.65), leafMat);
    canopy1.position.y = 1.55;
    canopy1.castShadow = true;
    g.add(canopy1);

    const canopy2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), leafMat);
    canopy2.position.y = 2.15;
    canopy2.castShadow = true;
    g.add(canopy2);

    const canopyTop = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.45, 0.68), leafMat);
    canopyTop.position.y = 2.62;
    canopyTop.castShadow = true;
    g.add(canopyTop);

    // UPG-05: Make courtyard trees clickable for Whimsy leaf-shake & Golden Apple drop
    g.userData = { whimsyType: 'TREE' };
    canopy1.userData = { whimsyType: 'TREE', treeGroup: g };
    canopy2.userData = { whimsyType: 'TREE', treeGroup: g };
    canopyTop.userData = { whimsyType: 'TREE', treeGroup: g };
    this.whimsyClickables.push(canopy1, canopy2, canopyTop);

    return g;
  }

  /**
   * Builds all 40 tiles wrapped in individual `tileContainerGroups[i]` so any clicked tile
   * can smoothly elevate (`y = +0.92`) and tilt diagonally (`26.5°`) toward the camera!
   */
  private build40OutwardAngledTiles(): void {
    const pedestalGeo = new THREE.BoxGeometry(2.16, 0.24, 2.16);
    const tileGeo = new THREE.BoxGeometry(2.08, 0.42, 2.08);
    const rimStripGeo = new THREE.BoxGeometry(2.1, 0.12, 0.08);

    const pedestalDarkMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.7,
      metalness: 0.15
    });
    const pedestalGoldMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      roughness: 0.35,
      metalness: 0.4
    });

    for (const tile of BOARD_TILES) {
      const worldX = tile.gridX * TILE_SPACING;
      const worldZ = tile.gridZ * TILE_SPACING;
      const isCorner = tile.index % 10 === 0;

      const tileContainer = new THREE.Group();
      tileContainer.position.set(worldX, 0, worldZ);
      tileContainer.userData = { tileIndex: tile.index };
      this.tileContainerGroups[tile.index] = tileContainer;
      this.root.add(tileContainer);

      // 1. Lower Beveled Stone/Gold Pedestal Base
      const pedestalMesh = new THREE.Mesh(
        pedestalGeo,
        isCorner ? pedestalGoldMat : pedestalDarkMat
      );
      pedestalMesh.position.set(0, 0.12, 0);
      pedestalMesh.receiveShadow = true;
      pedestalMesh.castShadow = true;
      pedestalMesh.userData = { tileIndex: tile.index };
      tileContainer.add(pedestalMesh);

      // 2. Upper Monolith Tile Block with High-DPI Outward-Facing Texture
      const topTex = createHighResTileTexture(tile, 1, null);
      const sideMat = new THREE.MeshStandardMaterial({
        color: tile.colorHex,
        roughness: 0.52,
        metalness: 0.08
      });
      const topMat = new THREE.MeshStandardMaterial({
        map: topTex,
        roughness: 0.38
      });

      const materials = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
      const mesh = new THREE.Mesh(tileGeo, materials);

      mesh.position.set(0, 0.38, 0);
      mesh.rotation.y = tile.outwardRotationY;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      mesh.userData = { tileIndex: tile.index };

      // 3. Glowing Biome Rim Strip on the outward edge (+Z in local tile space)
      const rimMat = new THREE.MeshStandardMaterial({
        color: tile.colorHex,
        emissive: tile.colorHex,
        emissiveIntensity: 0.45
      });
      const rimStrip = new THREE.Mesh(rimStripGeo, rimMat);
      rimStrip.position.set(0, 0.06, 1.04);
      rimStrip.userData = { tileIndex: tile.index };
      mesh.add(rimStrip);

      tileContainer.add(mesh);
      this.tileMeshes[tile.index] = mesh;

      // 4. Add 3D landmarks inside `tileContainer` so they rise & tilt with the tile!
      const landmarkGroup = new THREE.Group();
      landmarkGroup.position.set(0, 0.59, 0);
      landmarkGroup.rotation.y = tile.outwardRotationY;

      if (tile.type === 'CHEST') {
        const chest = this.createMinecraftChest3D();
        chest.position.set(0, 0, -0.75);
        chest.rotation.x = 0.16;
        landmarkGroup.add(chest);
        tileContainer.add(landmarkGroup);
      } else if (tile.type === 'END_PORTAL') {
        const portal = this.createEndPortalLandmark3D();
        portal.position.set(0, 0, -0.58);
        portal.rotation.x = 0.16;
        landmarkGroup.add(portal);
        tileContainer.add(landmarkGroup);
      } else if (tile.type === 'NETHER_PORTAL') {
        const netherPortal = this.createNetherPortalLandmark3D();
        netherPortal.position.set(0, 0, -0.68);
        netherPortal.rotation.x = 0.12;
        landmarkGroup.add(netherPortal);
        tileContainer.add(landmarkGroup);
      } else if (tile.type === 'DESERTED_ISLAND') {
        const palm = this.createVoxelTree('#84cc16', '#a16207');
        palm.scale.setScalar(0.72);
        palm.position.set(0, 0, -0.68);
        palm.rotation.x = 0.15;
        landmarkGroup.add(palm);
        tileContainer.add(landmarkGroup);
      } else if (tile.type === 'FESTIVAL') {
        const arch = this.createFestivalArch3D();
        arch.position.set(0, 0, -0.65);
        arch.rotation.x = 0.16;
        landmarkGroup.add(arch);
        tileContainer.add(landmarkGroup);
      }
    }

    // Soft glowing shadow/halo underneath whichever tile is currently elevated
    this.elevatedGlowBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.35, 0.08, 2.35),
      new THREE.MeshBasicMaterial({
        color: '#34d399',
        transparent: true,
        opacity: 0.45
      })
    );
    this.elevatedGlowBase.visible = false;
    this.root.add(this.elevatedGlowBase);
  }

  /**
   * Elevates the clicked tile (+0.92 Y) and tilts it diagonally (~26.5°) directly toward the camera!
   * Passing `null` smoothly lowers the previously elevated tile back to ground level.
   */
  public highlightTile(tileIndex: number | null, cameraWorldPos?: THREE.Vector3): void {
    // 1. Lower previously elevated tile if any
    if (this.elevatedTileIndex !== null && this.elevatedTileIndex !== tileIndex) {
      const prevContainer = this.tileContainerGroups[this.elevatedTileIndex];
      if (prevContainer) {
        gsap.killTweensOf(prevContainer.position);
        gsap.killTweensOf(prevContainer.rotation);
        gsap.killTweensOf(prevContainer.scale);
        gsap.to(prevContainer.position, { y: 0, duration: 0.38, ease: 'power2.out' });
        gsap.to(prevContainer.rotation, { x: 0, z: 0, duration: 0.38, ease: 'power2.out' });
        gsap.to(prevContainer.scale, { x: 1, y: 1, z: 1, duration: 0.38, ease: 'power2.out' });
      }
    }

    if (tileIndex === null) {
      this.elevatedTileIndex = null;
      if (this.elevatedGlowBase) {
        this.elevatedGlowBase.visible = false;
      }
      return;
    }

    const idx = ((tileIndex % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
    this.elevatedTileIndex = idx;
    const container = this.tileContainerGroups[idx];
    const tile = BOARD_TILES[idx];
    if (!container) return;

    const worldX = tile.gridX * TILE_SPACING;
    const worldZ = tile.gridZ * TILE_SPACING;

    // Calculate horizontal vector from tile to camera (or outward normal if camera pos not passed)
    let dirX = Math.sin(tile.outwardRotationY);
    let dirZ = Math.cos(tile.outwardRotationY);

    if (cameraWorldPos) {
      const dx = cameraWorldPos.x - worldX;
      const dz = cameraWorldPos.z - worldZ;
      const len = Math.hypot(dx, dz);
      if (len > 0.01) {
        dirX = dx / len;
        dirZ = dz / len;
      }
    }

    // Tilt top face by ~27 degrees (0.47 rad) toward (dirX, dirZ)
    const tiltRad = 0.47;
    const targetRotX = dirZ * tiltRad;
    const targetRotZ = -dirX * tiltRad;

    if (this.elevatedGlowBase) {
      this.elevatedGlowBase.position.set(worldX, 0.08, worldZ);
      this.elevatedGlowBase.visible = true;
    }

    gsap.killTweensOf(container.position);
    gsap.killTweensOf(container.rotation);
    gsap.killTweensOf(container.scale);

    gsap.to(container.position, {
      y: 0.94,
      duration: 0.48,
      ease: 'back.out(1.8)'
    });
    gsap.to(container.rotation, {
      x: targetRotX,
      z: targetRotZ,
      duration: 0.48,
      ease: 'back.out(1.6)'
    });
    gsap.to(container.scale, {
      x: 1.08,
      y: 1.08,
      z: 1.08,
      duration: 0.45,
      ease: 'back.out(1.8)'
    });
  }

  /**
   * Initializes the Authentic Minecraft Target Destination Beacon:
   * - 9 Iron Blocks (3x3 Grid) with 16x16 pixel-art Iron Block texture floating high at y = 3.75
   * - Authentic Minecraft Beacon Block on top (y = 3.93):
   *   + 3-pixel Obsidian Base Pedestal
   *   + Rotating Glowing Nether Star Core inside
   *   + 16x16 Pixel-Art Glass Shell outside
   * - Dual Counter-Rotating Scrolling Energy Light Beam anchored strictly at the Nether Star Core (y = 0.27 inside beaconUnitGroup)
   *   so it shoots 24 units straight up into the sky and NEVER overflows below the Beacon block!
   */
  private initTargetBeaconWithAuthenticTextures(): void {
    this.targetBeaconGroup = new THREE.Group();
    this.targetBeaconGroup.name = 'TargetTileAuthenticMinecraftBeacon';
    this.targetBeaconGroup.visible = false;

    this.targetIronBaseGroup = new THREE.Group();

    // 1. 9 Iron Blocks (3x3 Grid) raised higher to y = 3.75
    const ironGeo = new THREE.BoxGeometry(0.48, 0.36, 0.48);
    const ironMat = new THREE.MeshStandardMaterial({
      map: this.ironBlockTexture,
      roughness: 0.28,
      metalness: 0.55
    });

    const step = 0.5;
    for (let gx = -1; gx <= 1; gx++) {
      for (let gz = -1; gz <= 1; gz++) {
        const ironBlock = new THREE.Mesh(ironGeo, ironMat);
        ironBlock.position.set(gx * step, 3.75, gz * step);
        ironBlock.castShadow = true;
        ironBlock.receiveShadow = true;
        this.targetIronBaseGroup.add(ironBlock);
      }
    }

    // 2. Authentic Minecraft Beacon Block sitting at y = 3.93 atop the center Iron Block
    const beaconUnitGroup = new THREE.Group();
    beaconUnitGroup.position.set(0, 3.93, 0);

    // 2a. Obsidian Base Slab (bottom 3/16 of the Beacon block)
    const obsidianBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.11, 0.46),
      new THREE.MeshStandardMaterial({
        map: this.obsidianTexture,
        roughness: 0.65
      })
    );
    obsidianBase.position.set(0, 0.055, 0);
    beaconUnitGroup.add(obsidianBase);

    // 2b. Glowing Nether Star Crystal Core rotating inside the glass shell
    this.targetBeaconStarCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.28, 0.28),
      new THREE.MeshBasicMaterial({
        map: this.beaconCoreTexture
      })
    );
    this.targetBeaconStarCore.position.set(0, 0.27, 0);
    beaconUnitGroup.add(this.targetBeaconStarCore);

    // 2c. Outer 16x16 Pixel-Art Glass Shell
    const glassShell = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({
        map: this.beaconGlassTexture,
        transparent: true,
        alphaTest: 0.05,
        opacity: 0.92,
        roughness: 0.1,
        depthWrite: false
      })
    );
    glassShell.position.set(0, 0.25, 0);
    beaconUnitGroup.add(glassShell);

    // 3. Multi-Layer Animated Minecraft Light Beam anchored at y = 0 (bottom edge) and placed at y = 0.27 inside beaconUnitGroup
    //    so it shoots strictly UPWARD from the Nether Star core and NEVER overflows below the Beacon!
    const innerBeamGeo = new THREE.BoxGeometry(0.32, 24.0, 0.32);
    innerBeamGeo.translate(0, 12.0, 0);
    const innerBeamMat = new THREE.MeshBasicMaterial({
      map: this.beaconBeamTexture,
      color: '#ecfeff',
      transparent: true,
      opacity: 0.88,
      depthWrite: false
    });
    this.targetBeamInner = new THREE.Mesh(innerBeamGeo, innerBeamMat);
    this.targetBeamInner.position.set(0, 0.27, 0);
    beaconUnitGroup.add(this.targetBeamInner);

    // Outer translucent counter-rotating square aura tube (anchored at bottom edge y = 0)
    const outerBeamGeo = new THREE.BoxGeometry(0.58, 24.0, 0.58);
    outerBeamGeo.translate(0, 12.0, 0);
    const outerBeamMat = new THREE.MeshBasicMaterial({
      map: this.beaconBeamTexture,
      color: '#34d399',
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    });
    this.targetBeamOuter = new THREE.Mesh(outerBeamGeo, outerBeamMat);
    this.targetBeamOuter.position.set(0, 0.27, 0);
    beaconUnitGroup.add(this.targetBeamOuter);

    this.targetIronBaseGroup.add(beaconUnitGroup);
    this.targetBeaconGroup.add(this.targetIronBaseGroup);

    this.root.add(this.targetBeaconGroup);
  }

  public showTargetTileBeacon(tileIndex: number): void {
    if (!this.targetBeaconGroup) return;
    const tile = BOARD_TILES[((tileIndex % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE];
    const worldX = tile.gridX * TILE_SPACING;
    const worldZ = tile.gridZ * TILE_SPACING;

    this.targetBeaconGroup.position.set(worldX, 0, worldZ);
    this.targetBeaconGroup.visible = true;
    this.targetBeaconGroup.scale.set(0.01, 1, 0.01);

    gsap.killTweensOf(this.targetBeaconGroup.scale);
    gsap.to(this.targetBeaconGroup.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.42,
      ease: 'back.out(2)'
    });
  }

  public hideTargetTileBeacon(): void {
    if (!this.targetBeaconGroup || !this.targetBeaconGroup.visible) return;
    gsap.killTweensOf(this.targetBeaconGroup.scale);
    gsap.to(this.targetBeaconGroup.scale, {
      x: 0.01,
      z: 0.01,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        if (this.targetBeaconGroup) {
          this.targetBeaconGroup.visible = false;
        }
      }
    });
  }

  private createFestivalArch3D(): THREE.Group {
    const g = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.5 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#fde047',
      emissive: '#ca8a04',
      emissiveIntensity: 0.4
    });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.0, 0.22), pillarMat);
    p1.position.set(-0.45, 0.5, 0);
    const p2 = p1.clone();
    p2.position.set(0.45, 0.5, 0);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.26, 0.28), goldMat);
    beam.position.set(0, 1.05, 0);
    g.add(p1, p2, beam);
    return g;
  }

  private buildSatelliteMiniIslands(): void {
    const satellites = [
      { x: -18, y: -0.2, z: 0, treeColor: '#f472b6' },
      { x: 18, y: -0.1, z: 0, treeColor: '#22c55e' },
      { x: 0, y: -0.2, z: -18, treeColor: '#38bdf8' }
    ];
    for (const sat of satellites) {
      const g = new THREE.Group();
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.6, 3.2),
        new THREE.MeshStandardMaterial({ color: '#4ade80', roughness: 0.75 })
      );
      const dirt = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.2, 2.4),
        new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 })
      );
      dirt.position.y = -0.8;
      const tree = this.createVoxelTree(sat.treeColor, '#78350f');
      tree.scale.setScalar(0.85);
      tree.position.y = 0.3;
      g.add(top, dirt, tree);
      g.position.set(sat.x, sat.y, sat.z);
      this.root.add(g);
    }
  }

  private createMinecraftChest3D(): THREE.Group {
    const g = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.7 });
    const trimMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5 });
    const latchMat = new THREE.MeshStandardMaterial({
      color: '#fde047',
      metalness: 0.5,
      roughness: 0.3
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.44, 0.52), woodMat);
    base.position.y = 0.22;
    base.castShadow = true;
    g.add(base);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.08, 0.54), trimMat);
    rim.position.y = 0.28;
    g.add(rim);

    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), latchMat);
    latch.position.set(0, 0.28, 0.28);
    g.add(latch);

    return g;
  }

  /**
   * Authentic Minecraft End Portal with 12 End Portal Frame Blocks (3 per side, hollow corners),
   * 12 socketed Eyes of Ender, and a 3x3 Starfield Cosmic Void interior!
   */
  private createEndPortalLandmark3D(): THREE.Group {
    const g = new THREE.Group();

    const frameTopTex = createEndPortalFrameTopTexture();
    const frameSideTex = createEndPortalFrameSideTexture();
    const eyeTex = createEyeOfEnderTexture();
    const voidTex = createEndPortalVoidTexture();
    this.endPortalVoidTextures.push(voidTex);

    const topMat = new THREE.MeshStandardMaterial({ map: frameTopTex, roughness: 0.5 });
    const sideMat = new THREE.MeshStandardMaterial({ map: frameSideTex, roughness: 0.6 });
    const bottomMat = new THREE.MeshStandardMaterial({ color: '#dfd9a3', roughness: 0.7 });
    const frameMaterials = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];

    const eyeMat = new THREE.MeshStandardMaterial({
      map: eyeTex,
      emissive: '#10b981',
      emissiveIntensity: 0.35,
      roughness: 0.25
    });

    // Block unit size s = 0.25 so the 5x5 ring fits handsomely on the tile (5 * 0.25 = 1.25 width)
    const s = 0.24;
    const frameGeo = new THREE.BoxGeometry(s * 0.96, s * 0.82, s * 0.96);
    const eyeGeo = new THREE.BoxGeometry(s * 0.52, s * 0.32, s * 0.52);

    // 12 End Portal Frame coordinates in a 5x5 ring (excluding the 4 corners ±2, ±2):
    const ringCoords: Array<[number, number]> = [
      // North side (3 frames)
      [-1, -2],
      [0, -2],
      [1, -2],
      // South side (3 frames)
      [-1, 2],
      [0, 2],
      [1, 2],
      // West side (3 frames)
      [-2, -1],
      [-2, 0],
      [-2, 1],
      // East side (3 frames)
      [2, -1],
      [2, 0],
      [2, 1]
    ];

    for (const [gx, gz] of ringCoords) {
      const frameBlock = new THREE.Mesh(frameGeo, frameMaterials);
      frameBlock.position.set(gx * s, s * 0.41, gz * s);
      frameBlock.castShadow = true;
      frameBlock.receiveShadow = true;
      g.add(frameBlock);

      // Eye of Ender socketed on top of each of the 12 frames
      const eyeBlock = new THREE.Mesh(eyeGeo, eyeMat);
      eyeBlock.position.set(gx * s, s * 0.95, gz * s);
      g.add(eyeBlock);
    }

    // 3x3 Cosmic Starfield Void inside the 12 frames
    const voidSurface = new THREE.Mesh(
      new THREE.BoxGeometry(s * 3.1, s * 0.45, s * 3.1),
      new THREE.MeshBasicMaterial({ map: voidTex })
    );
    voidSurface.position.set(0, s * 0.38, 0);
    g.add(voidSurface);

    return g;
  }

  /**
   * Authentic Minecraft Nether Portal:
   * - Vertical 4-wide x 5-tall ring of 14 Obsidian Blocks with 16x16 pixel-art Obsidian texture
   * - 2-wide x 3-tall Swirling Purple Nether Portal Vortex membrane inside
   * - Glowing Netherrack & Magma base blocks
   */
  private createNetherPortalLandmark3D(): THREE.Group {
    const g = new THREE.Group();

    const obsidianMat = new THREE.MeshStandardMaterial({
      map: this.obsidianTexture,
      roughness: 0.6,
      metalness: 0.2
    });

    const vortexTex = createNetherPortalVortexTexture();
    this.netherPortalTextures.push(vortexTex);

    const vortexMat = new THREE.MeshBasicMaterial({
      map: vortexTex,
      color: '#e879f9',
      transparent: true,
      opacity: 0.86,
      side: THREE.DoubleSide
    });

    const netherrackMat = new THREE.MeshStandardMaterial({
      color: '#7f1d1d',
      roughness: 0.85
    });
    const magmaMat = new THREE.MeshBasicMaterial({ color: '#f97316' });

    // Base Netherrack & Magma blocks
    const baseSlab = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.12, 0.48), netherrackMat);
    baseSlab.position.set(0, 0.06, 0);
    const magma1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.24), magmaMat);
    magma1.position.set(-0.42, 0.08, 0.18);
    const magma2 = magma1.clone();
    magma2.position.set(0.42, 0.08, 0.18);
    g.add(baseSlab, magma1, magma2);

    // 4 wide x 5 tall ring = 14 individual Obsidian blocks
    const b = 0.24;
    const obsGeo = new THREE.BoxGeometry(b * 0.98, b * 0.98, b * 0.98);
    for (let ix = 0; ix < 4; ix++) {
      for (let iy = 0; iy < 5; iy++) {
        const isEdge = ix === 0 || ix === 3 || iy === 0 || iy === 4;
        if (!isEdge) continue;
        const obs = new THREE.Mesh(obsGeo, obsidianMat);
        obs.position.set((ix - 1.5) * b, 0.12 + (iy + 0.5) * b, 0);
        obs.castShadow = true;
        obs.receiveShadow = true;
        g.add(obs);
      }
    }

    // 2 wide x 3 tall Swirling Purple Nether Portal membrane inside the Obsidian ring
    const portalPane = new THREE.Mesh(
      new THREE.BoxGeometry(b * 2.02, b * 3.02, b * 0.36),
      vortexMat
    );
    portalPane.position.set(0, 0.12 + 2.5 * b, 0);
    g.add(portalPane);

    return g;
  }

  private buildFloatingClouds(): void {
    this.cloudsGroup.name = 'VoxelClouds';
    const cloudMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.82
    });

    const cloudCoords = [
      { x: -15, y: 10.5, z: -14, sx: 3.8, sz: 1.8 },
      { x: 16, y: 11.2, z: -12, sx: 4.2, sz: 2.0 },
      { x: -17, y: 10.8, z: 13, sx: 3.5, sz: 1.9 },
      { x: 15, y: 11.5, z: 15, sx: 4.0, sz: 1.8 }
    ];

    for (const c of cloudCoords) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(c.sx, 0.55, c.sz), cloudMat);
      mesh.position.set(c.x, c.y, c.z);
      this.cloudsGroup.add(mesh);
    }
    this.root.add(this.cloudsGroup);
  }

  public getElevatedTileIndex(): number | null {
    return this.elevatedTileIndex;
  }

  /**
   * Computes the exact live 3D world position, surface tilt (rotX, rotZ), and scale
   * for any character standing on or passing through `tileIndex`.
   * When a tile is elevated (+0.94Y) and tilted diagonally (~27°) toward the camera,
   * characters on that tile smoothly elevate and tilt along with the tile surface!
   */
  public getTileStandTransform(
    tileIndex: number,
    playerSlot = 0
  ): {
    position: THREE.Vector3;
    rotX: number;
    rotZ: number;
    scale: number;
  } {
    const idx = ((tileIndex % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
    const tile = BOARD_TILES[idx];
    const offsets = [
      { dx: -0.34, dz: -0.22 },
      { dx: 0.34, dz: -0.22 },
      { dx: -0.34, dz: 0.34 },
      { dx: 0.34, dz: 0.34 }
    ];
    const off = offsets[playerSlot % 4];
    const container = this.tileContainerGroups[idx];

    if (!container) {
      return {
        position: new THREE.Vector3(
          tile.gridX * TILE_SPACING + off.dx,
          0.59,
          tile.gridZ * TILE_SPACING + off.dz
        ),
        rotX: 0,
        rotZ: 0,
        scale: 1
      };
    }

    const localPt = new THREE.Vector3(off.dx, 0.59, off.dz)
      .multiply(container.scale)
      .applyEuler(container.rotation)
      .add(container.position);

    return {
      position: localPt,
      rotX: container.rotation.x,
      rotZ: container.rotation.z,
      scale: container.scale.x
    };
  }

  public getTileStandPosition(tileIndex: number, playerSlot = 0): THREE.Vector3 {
    return this.getTileStandTransform(tileIndex, playerSlot).position;
  }

  public updateTileBuilding(
    tileIndex: number,
    level: number,
    ownerColorHex: string,
    festivalMultiplier = 1
  ): void {
    const tile = BOARD_TILES[tileIndex];
    const tileMesh = this.tileMeshes[tileIndex];
    const tileContainer = this.tileContainerGroups[tileIndex];
    if (tileMesh && Array.isArray(tileMesh.material)) {
      const topMat = tileMesh.material[2] as THREE.MeshStandardMaterial;
      topMat.map?.dispose();
      topMat.map = createHighResTileTexture(tile, festivalMultiplier, ownerColorHex);
      topMat.needsUpdate = true;
    }

    const prev = this.buildingGroups.get(tileIndex);
    if (prev && tileContainer) {
      tileContainer.remove(prev);
      this.disposeObject3D(prev);
      this.buildingGroups.delete(tileIndex);
    }

    if (level <= 0 || !tileContainer) return;

    const bGroup = this.createBuildingMeshForLevel(level, ownerColorHex, tile.colorHex);
    bGroup.position.set(0, 0.59, 0);
    bGroup.rotation.y = tile.outwardRotationY;

    tileContainer.add(bGroup);
    this.buildingGroups.set(tileIndex, bGroup);

    const worldX = tile.gridX * TILE_SPACING;
    const worldZ = tile.gridZ * TILE_SPACING;
    soundManager.playBuildPop(level);
    this.particles.spawnBuildingPopSparkles(new THREE.Vector3(worldX, 0.8, worldZ), ownerColorHex);

    bGroup.scale.set(0.01, 0.01, 0.01);
    gsap.to(bGroup.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.58,
      ease: 'elastic.out(1.15, 0.45)'
    });
  }

  public clearAllBuildings(): void {
    this.buildingGroups.forEach((grp, idx) => {
      this.tileContainerGroups[idx]?.remove(grp);
      this.disposeObject3D(grp);
    });
    this.buildingGroups.clear();
    this.crownMeshes = [];
    this.hideTargetTileBeacon();
    this.highlightTile(null);
    this.setPickerHighlightTiles([]);

    for (const tile of BOARD_TILES) {
      const tileMesh = this.tileMeshes[tile.index];
      if (tileMesh && Array.isArray(tileMesh.material)) {
        const topMat = tileMesh.material[2] as THREE.MeshStandardMaterial;
        topMat.map?.dispose();
        topMat.map = createHighResTileTexture(tile, 1, null);
        topMat.needsUpdate = true;
      }
    }
  }

  /**
   * FIX-02: Disposes child geometries and materials to prevent WebGL GPU memory leaks
   */
  private disposeObject3D(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
  }

  /**
   * FEAT-05: Refreshes a single tile's 3D texture immediately when edited in the Admin Tile Config Inspector
   */
  public refreshSingleTileVisual(
    tileIndex: number,
    ownerColorHex: string | null = null,
    festivalMultiplier = 1
  ): void {
    const idx = ((tileIndex % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
    const tile = BOARD_TILES[idx];
    const tileMesh = this.tileMeshes[idx];
    if (tileMesh && Array.isArray(tileMesh.material)) {
      const topMat = tileMesh.material[2] as THREE.MeshStandardMaterial;
      topMat.map?.dispose();
      topMat.map = createHighResTileTexture(tile, festivalMultiplier, ownerColorHex);
      topMat.needsUpdate = true;
    }
  }

  /**
   * UX-03: Highlights valid 3D target tiles directly on the board (for End Portal #30 & Festival #20)
   */
  public setPickerHighlightTiles(tileIndices: number[]): void {
    while (this.pickerHighlightGroup.children.length > 0) {
      const child = this.pickerHighlightGroup.children[0];
      this.pickerHighlightGroup.remove(child);
      this.disposeObject3D(child);
    }

    if (tileIndices.length === 0) return;

    const ringGeo = new THREE.BoxGeometry(2.14, 0.14, 2.14);
    for (const rawIdx of tileIndices) {
      const idx = ((rawIdx % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
      const tile = BOARD_TILES[idx];
      const mat = new THREE.MeshBasicMaterial({
        color: '#fde047',
        transparent: true,
        opacity: 0.55,
        wireframe: false
      });
      const marker = new THREE.Mesh(ringGeo.clone(), mat);
      marker.position.set(tile.gridX * TILE_SPACING, 0.63, tile.gridZ * TILE_SPACING);
      this.pickerHighlightGroup.add(marker);
    }
    ringGeo.dispose();
  }

  /**
   * UPG-05: Whimsy Easter Egg clickables getter & interactions
   */
  public getWhimsyClickables(): THREE.Object3D[] {
    return this.whimsyClickables;
  }

  public cycleBeaconBeamColor(): { name: string; hex: string } {
    const palette = [
      { name: 'Ngọc Lục Bảo (Emerald)', hex: '#34d399' },
      { name: 'Kim Cương Xanh (Diamond)', hex: '#38bdf8' },
      { name: 'Hoàng Kim (Gold)', hex: '#fbbf24' },
      { name: 'Thạch Anh Tím (Amethyst)', hex: '#c084fc' },
      { name: 'Đá Đỏ (Redstone)', hex: '#f87171' }
    ];
    this.beaconColorIdx = (this.beaconColorIdx + 1) % palette.length;
    const chosen = palette[this.beaconColorIdx];

    if (this.beaconBeam) {
      (this.beaconBeam.material as THREE.MeshBasicMaterial).color.set(chosen.hex);
    }
    if (this.targetBeamOuter) {
      (this.targetBeamOuter.material as THREE.MeshBasicMaterial).color.set(chosen.hex);
    }
    this.particles.spawnBuildingPopSparkles(new THREE.Vector3(0, 2.2, 0), chosen.hex);
    soundManager.playCoinChime();
    return chosen;
  }

  public triggerTreeWhimsy(treeGroup: THREE.Object3D): void {
    soundManager.playStepBoing(2);
    gsap.fromTo(
      treeGroup.rotation,
      { z: -0.14 },
      {
        z: 0.14,
        duration: 0.09,
        yoyo: true,
        repeat: 5,
        onComplete: () => {
          treeGroup.rotation.z = 0;
        }
      }
    );
    const worldPos = new THREE.Vector3();
    treeGroup.getWorldPosition(worldPos);
    worldPos.y += 1.8;
    this.particles.spawnBuildingPopSparkles(worldPos, '#fbbf24');
  }

  private createBuildingMeshForLevel(
    level: number,
    ownerColorHex: string,
    biomeHex: string
  ): THREE.Group {
    const outerWrapper = new THREE.Group();
    const g = new THREE.Group();
    g.position.set(0, 0, -0.76);
    g.rotation.x = 0.16;
    outerWrapper.add(g);

    const woodMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.8 });
    const plankMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.7 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.65 });
    const ownerMat = new THREE.MeshStandardMaterial({ color: ownerColorHex, roughness: 0.45 });
    const roofMat = new THREE.MeshStandardMaterial({ color: biomeHex, roughness: 0.5 });
    const windowMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });

    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.95, 0.07), woodMat);
    pole.position.set(-0.55, 0.48, 0);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.06), ownerMat);
    flag.position.set(-0.38, 0.82, 0);
    g.add(pole, flag);

    if (level === 1) {
      const posts = [-0.42, 0, 0.42];
      for (const px of posts) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.14), woodMat);
        post.position.set(px, 0.26, 0);
        post.castShadow = true;
        g.add(post);
      }
      const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.09, 0.07), plankMat);
      rail1.position.set(0, 0.38, 0);
      const rail2 = rail1.clone();
      rail2.position.set(0, 0.18, 0);
      g.add(rail1, rail2);
    } else if (level === 2) {
      const walls = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.58, 0.62), plankMat);
      walls.position.y = 0.29;
      walls.castShadow = true;
      g.add(walls);

      const roof1 = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.22, 0.76), roofMat);
      roof1.position.y = 0.68;
      roof1.castShadow = true;
      const roof2 = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.2, 0.56), ownerMat);
      roof2.position.y = 0.88;
      g.add(roof1, roof2);

      const win = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.06), windowMat);
      win.position.set(0, 0.34, 0.32);
      g.add(win);
    } else if (level === 3) {
      const floor1 = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.54, 0.68), stoneMat);
      floor1.position.y = 0.27;
      floor1.castShadow = true;

      const floor2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.58), plankMat);
      floor2.position.y = 0.78;
      floor2.castShadow = true;

      const roof = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.24, 0.74), ownerMat);
      roof.position.y = 1.14;
      roof.castShadow = true;

      const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.06), windowMat);
      win1.position.set(-0.2, 0.78, 0.3);
      const win2 = win1.clone();
      win2.position.set(0.2, 0.78, 0.3);

      g.add(floor1, floor2, roof, win1, win2);
    } else {
      const keep = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.05, 0.82), stoneMat);
      keep.position.y = 0.52;
      keep.castShadow = true;
      g.add(keep);

      const turretOffsets = [
        [-0.44, -0.36],
        [0.44, -0.36],
        [-0.44, 0.36],
        [0.44, 0.36]
      ];
      for (const [tx, tz] of turretOffsets) {
        const turret = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.35, 0.28), stoneMat);
        turret.position.set(tx, 0.68, tz);
        turret.castShadow = true;
        const spire = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.25, 0.34), ownerMat);
        spire.position.set(tx, 1.46, tz);
        g.add(turret, spire);
      }

      const crownMat = new THREE.MeshStandardMaterial({
        color: '#fde047',
        emissive: '#ca8a04',
        emissiveIntensity: 0.45,
        metalness: 0.7,
        roughness: 0.2
      });
      const crown = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.26, 0.44), crownMat);
      crown.position.set(0, 1.72, 0);
      g.add(crown);
      this.crownMeshes.push(crown);
    }

    return outerWrapper;
  }

  public update(elapsedTime: number): void {
    this.waterMesh.position.y = -1.35 + Math.sin(elapsedTime * 1.8) * 0.07;
    this.cloudsGroup.rotation.y = elapsedTime * 0.03;

    // Scroll the Beacon Beam pixel texture upward continuously!
    this.beaconBeamTexture.offset.y = -elapsedTime * 1.4;

    this.waterfallDrops.forEach((drop, idx) => {
      const cycle = ((elapsedTime * 1.8 + idx * 0.25) % 2.0) / 2.0;
      drop.position.y = 0.35 - cycle * 2.1;
    });

    if (this.beaconBeam) {
      this.beaconBeam.rotation.y = elapsedTime * 1.2;
    }

    // Animate the Authentic Target Beacon + 9 Iron Blocks + Counter-rotating Beams!
    if (this.targetBeaconGroup && this.targetBeaconGroup.visible) {
      if (this.targetIronBaseGroup) {
        this.targetIronBaseGroup.position.y = Math.sin(elapsedTime * 3.2) * 0.14;
      }
      if (this.targetBeaconStarCore) {
        this.targetBeaconStarCore.rotation.y = elapsedTime * 3.4;
        this.targetBeaconStarCore.rotation.x = elapsedTime * 2.1;
      }
      if (this.targetBeamInner) {
        this.targetBeamInner.rotation.y = elapsedTime * 2.5;
      }
      if (this.targetBeamOuter) {
        this.targetBeamOuter.rotation.y = -elapsedTime * 1.6;
      }
    }

    // Animate End Portal Starfield Void & Nether Portal Vortex UVs
    for (const voidTex of this.endPortalVoidTextures) {
      voidTex.offset.x = Math.sin(elapsedTime * 0.5) * 0.25;
      voidTex.offset.y = elapsedTime * 0.15;
    }
    for (const vortexTex of this.netherPortalTextures) {
      vortexTex.offset.x = Math.sin(elapsedTime * 2.0) * 0.2;
      vortexTex.offset.y = elapsedTime * 0.45;
    }

    for (const crown of this.crownMeshes) {
      crown.rotation.y = elapsedTime * 2.2;
      crown.position.y = 1.72 + Math.sin(elapsedTime * 3.5) * 0.07;
    }

    if (this.pickerHighlightGroup.children.length > 0) {
      const pulse = 0.35 + Math.sin(elapsedTime * 5.0) * 0.25;
      this.pickerHighlightGroup.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        if (mat) mat.opacity = pulse;
      });
    }
  }
}
