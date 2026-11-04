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

  const isDarkTile = tile.type === 'END_PORTAL';
  const isCorner = tile.index % 10 === 0;

  // Outer card background
  ctx.fillStyle = isDarkTile ? '#1e1b4b' : isCorner ? '#fefce8' : '#ffffff';
  ctx.fillRect(0, 0, 512, 512);

  // Inner beveled card surface
  ctx.fillStyle = isDarkTile ? '#2e1065' : isCorner ? '#fef9c3' : '#f8fafc';
  ctx.fillRect(20, 20, 472, 472);

  // Crisp outer border (tinted with owner color if owned, otherwise biome color)
  ctx.strokeStyle = ownerColorHex || tile.colorHex;
  ctx.lineWidth = 24;
  ctx.strokeRect(12, 12, 488, 488);

  // Inner subtle bevel frame
  ctx.strokeStyle = isDarkTile ? 'rgba(216, 180, 254, 0.35)' : 'rgba(15, 23, 42, 0.12)';
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, 456, 456);

  // Top Biome Header Strip (faces inward toward island, while bottom of canvas faces outward)
  ctx.fillStyle = tile.colorHex;
  ctx.fillRect(24, 24, 464, 108);

  // Top header gloss highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.fillRect(24, 24, 464, 26);

  // Tile Number Pill (#0..#39)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(36, 38, 112, 74);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 40px "Chakra Petch", "Be Vietnam Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`#${tile.index}`, 92, 76);

  // Festival Multiplier Badge if x2
  if (festivalMultiplier > 1) {
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(358, 38, 118, 74);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 40px "Be Vietnam Pro", sans-serif';
    ctx.fillText(`x${festivalMultiplier}`, 417, 76);
  }

  // Large Emoji Icon
  ctx.font = '108px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tile.icon, 256, 208);

  // Multi-line Crisp Vietnamese Tile Name (100% diacritic support via Be Vietnam Pro)
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

  // Bottom Emerald Currency Price Bar ($ in Emerald Green!)
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
    ctx.fillText(`DỊCH CHUYỂN`, 256, 449);
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
 * Generates a metallic Minecraft Iron Block texture with characteristic horizontal sheen & rivet border
 * for the 9 floating Iron Blocks under the 3D Target Beacon!
 */
function createMinecraftIronBlockTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 128, 128);
  grad.addColorStop(0, '#f8fafc');
  grad.addColorStop(0.5, '#e2e8f0');
  grad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  // Outer beveled iron border
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 118, 118);

  // Inner bright highlight frame
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, 104, 104);

  // Characteristic horizontal Minecraft Iron Block streaks
  ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
  for (let y = 26; y <= 102; y += 18) {
    ctx.fillRect(18, y, 92, 6);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class IslandBoard3D {
  public readonly root = new THREE.Group();
  private tileMeshes: THREE.Mesh[] = [];
  private buildingGroups = new Map<number, THREE.Group>();
  private crownMeshes: THREE.Mesh[] = [];
  private cloudsGroup = new THREE.Group();
  private waterfallDrops: THREE.Mesh[] = [];
  private waterMesh!: THREE.Mesh;
  private beaconBeam?: THREE.Mesh;
  private endPortalSurface?: THREE.Mesh;
  private particles: ParticleSystem3D;

  // Target Destination Beacon + 9 Floating Iron Blocks (3x3 Grid)
  private targetBeaconGroup?: THREE.Group;
  private targetIronBaseGroup?: THREE.Group;
  private targetLightColumn?: THREE.Mesh;
  private ironBlockTexture: THREE.CanvasTexture;

  // Highlight ring when clicking/inspecting any tile
  private selectedTileFrame?: THREE.Mesh;

  constructor(scene: THREE.Scene, particles: ParticleSystem3D) {
    this.particles = particles;
    this.ironBlockTexture = createMinecraftIronBlockTexture();
    this.root.name = 'FloatingVoxelIsland40';
    scene.add(this.root);

    this.buildRichPastelOceanAndBoats();
    this.buildFourSurroundingArenaWalls();
    this.buildDeepMultiTieredIslandBase();
    this.buildDetailedInnerCourtyard();
    this.build40OutwardAngledTiles();
    this.buildSatelliteMiniIslands();
    this.buildFloatingClouds();
    this.initSelectionAndTargetBeacon();
  }

  /**
   * Expanded 260x260 Voxel Ocean so the camera never sees the edge of the water block!
   */
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

    // White voxel shoreline foam around the 40-tile island
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

    // 8 Cute Voxel Wooden Sailboats floating across the expanded sea
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

  /**
   * Builds 4 Monumental Minecraft Voxel Perimeter Walls & Cliff Bastions surrounding the ocean
   * on the North, South, East, and West horizons so the world feels like a grand enclosed kingdom!
   */
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

      // 1. Lower Deepslate Foundation Wall
      const baseWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallSpan, 9, 8.5),
        deepslateMat
      );
      baseWall.position.set(0, 2.5, -wallDist);
      baseWall.receiveShadow = true;
      baseWall.castShadow = true;
      side.add(baseWall);

      // 2. Upper Stone Brick Rampart Wall
      const upperWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallSpan - 4, 7.5, 6.2),
        stoneBrickMat
      );
      upperWall.position.set(0, 10.2, -wallDist - 0.5);
      upperWall.receiveShadow = true;
      upperWall.castShadow = true;
      side.add(upperWall);

      // 3. Lush Green Moss & Grass Terrace on top of the wall
      const terrace = new THREE.Mesh(
        new THREE.BoxGeometry(wallSpan - 4, 1.2, 6.6),
        grassTopMat
      );
      terrace.position.set(0, 14.3, -wallDist - 0.5);
      side.add(terrace);

      // 4. Crenellated Battlements (Merlons) + Glowing Lanterns along the wall crest
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

      // 5. Center Grand Royal Archway & Twin Waterfall Bastions on each wall
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

      // Twin Waterfalls pouring from the wall into the sea
      for (const wx of [-24, 24]) {
        const wf = new THREE.Mesh(
          new THREE.BoxGeometry(4.2, 15.5, 1.2),
          waterfallMat
        );
        wf.position.set(wx, 6.2, -wallDist + 3.2);
        side.add(wf);
      }

      // Trees perched along the upper wall terrace
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

    // Add North (0), East (-PI/2), South (PI), West (PI/2) Perimeter Walls
    wallsGroup.add(
      buildWallSide(0),
      buildWallSide(Math.PI / 2),
      buildWallSide(Math.PI),
      buildWallSide(-Math.PI / 2)
    );

    // 4 Monumental Corner Citadel Watchtowers at (±66, ±66)
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
        new THREE.MeshStandardMaterial({ color: pt.color, roughness: 0.45, metalness: 0.15 })
      );
      tier.position.set(0, pt.y, 0);
      tier.receiveShadow = true;
      tier.castShadow = true;
      this.root.add(tier);
    }

    const beaconMat = new THREE.MeshBasicMaterial({
      color: '#34d399',
      transparent: true,
      opacity: 0.18
    });
    this.beaconBeam = new THREE.Mesh(new THREE.BoxGeometry(0.75, 4.5, 0.75), beaconMat);
    this.beaconBeam.position.set(0, 2.6, 0);
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

    const treeSpecs = [
      { x: -6.8, z: -6.8, leaf: '#22c55e', trunk: '#78350f', scale: 1.25 },
      { x: 6.8, z: -6.8, leaf: '#f472b6', trunk: '#57534e', scale: 1.3 },
      { x: -6.8, z: 6.8, leaf: '#f472b6', trunk: '#57534e', scale: 1.25 },
      { x: 6.8, z: 6.8, leaf: '#16a34a', trunk: '#78350f', scale: 1.2 },
      { x: -7.5, z: 0, leaf: '#84cc16', trunk: '#78350f', scale: 1.05 },
      { x: 7.5, z: 0, leaf: '#f9a8d4', trunk: '#57534e', scale: 1.05 },
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

    return g;
  }

  /**
   * Redesigned 40 Beveled 3D Monolith Tiles (v3.0):
   * - Removes the secondary vertical signboard that obstructed views when orbiting.
   * - Builds a sleek 2-tier beveled stone + biome monolith pedestal with outward-facing
   *   Vietnamese typography and glowing outer rim strip.
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

      // 1. Lower Beveled Stone/Gold Pedestal Base
      const pedestalMesh = new THREE.Mesh(
        pedestalGeo,
        isCorner ? pedestalGoldMat : pedestalDarkMat
      );
      pedestalMesh.position.set(worldX, 0.12, worldZ);
      pedestalMesh.receiveShadow = true;
      pedestalMesh.castShadow = true;
      pedestalMesh.userData = { tileIndex: tile.index };
      this.root.add(pedestalMesh);

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

      mesh.position.set(worldX, 0.38, worldZ);
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

      this.root.add(mesh);
      this.tileMeshes[tile.index] = mesh;

      // 4. Add 3D tilted landmarks on special tiles (oriented outward with the row!)
      const landmarkGroup = new THREE.Group();
      landmarkGroup.position.set(worldX, 0.59, worldZ);
      landmarkGroup.rotation.y = tile.outwardRotationY;

      if (tile.type === 'CHEST') {
        const chest = this.createMinecraftChest3D();
        chest.position.set(0, 0, -0.75);
        chest.rotation.x = 0.16;
        landmarkGroup.add(chest);
        this.root.add(landmarkGroup);
      } else if (tile.type === 'END_PORTAL') {
        const portal = this.createEndPortalLandmark3D();
        portal.position.set(0, 0, -0.65);
        portal.rotation.x = 0.18;
        landmarkGroup.add(portal);
        this.root.add(landmarkGroup);
      } else if (tile.type === 'DESERTED_ISLAND') {
        const palm = this.createVoxelTree('#84cc16', '#a16207');
        palm.scale.setScalar(0.72);
        palm.position.set(0, 0, -0.68);
        palm.rotation.x = 0.15;
        landmarkGroup.add(palm);
        this.root.add(landmarkGroup);
      } else if (tile.type === 'FESTIVAL') {
        const arch = this.createFestivalArch3D();
        arch.position.set(0, 0, -0.65);
        arch.rotation.x = 0.16;
        landmarkGroup.add(arch);
        this.root.add(landmarkGroup);
      }
    }
  }

  /**
   * Initializes the 3D Selection Frame & the Target Destination Beacon with 9 Floating Iron Blocks!
   */
  private initSelectionAndTargetBeacon(): void {
    // 1. Tile Inspection Highlight Frame
    const frameGeo = new THREE.BoxGeometry(2.26, 0.16, 2.26);
    const frameMat = new THREE.MeshBasicMaterial({
      color: '#fde047',
      transparent: true,
      opacity: 0.85
    });
    this.selectedTileFrame = new THREE.Mesh(frameGeo, frameMat);
    this.selectedTileFrame.visible = false;
    this.root.add(this.selectedTileFrame);

    // 2. Target Destination Beacon + 9 Floating Iron Blocks (3x3 Grid)
    this.targetBeaconGroup = new THREE.Group();
    this.targetBeaconGroup.name = 'TargetTileBeacon9IronBlocks';
    this.targetBeaconGroup.visible = false;

    this.targetIronBaseGroup = new THREE.Group();
    // 9 Iron Blocks arranged in a 3x3 Minecraft Beacon Pyramid base hovering at y = 2.05
    const ironGeo = new THREE.BoxGeometry(0.46, 0.32, 0.46);
    const ironMat = new THREE.MeshStandardMaterial({
      map: this.ironBlockTexture,
      color: '#f8fafc',
      metalness: 0.65,
      roughness: 0.25,
      emissive: '#cbd5e1',
      emissiveIntensity: 0.18
    });

    const step = 0.49;
    for (let gx = -1; gx <= 1; gx++) {
      for (let gz = -1; gz <= 1; gz++) {
        const ironBlock = new THREE.Mesh(ironGeo, ironMat);
        ironBlock.position.set(gx * step, 2.05, gz * step);
        ironBlock.castShadow = true;
        ironBlock.receiveShadow = true;
        this.targetIronBaseGroup.add(ironBlock);
      }
    }

    // Central Minecraft Beacon Block sitting atop the 9 Iron Blocks
    const beaconGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.44, 0.44),
      new THREE.MeshStandardMaterial({
        color: '#67e8f9',
        transparent: true,
        opacity: 0.78,
        roughness: 0.1
      })
    );
    beaconGlass.position.set(0, 2.42, 0);

    const beaconStarCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.26, 0.26),
      new THREE.MeshBasicMaterial({ color: '#ffffff' })
    );
    beaconStarCore.position.set(0, 2.42, 0);
    this.targetIronBaseGroup.add(beaconGlass, beaconStarCore);

    this.targetBeaconGroup.add(this.targetIronBaseGroup);

    // Vertical Sky Beacon Light Column shooting straight through the 9 Iron Blocks onto the target tile!
    const beamGeo = new THREE.BoxGeometry(0.42, 16.0, 0.42);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#34d399',
      transparent: true,
      opacity: 0.46
    });
    this.targetLightColumn = new THREE.Mesh(beamGeo, beamMat);
    this.targetLightColumn.position.set(0, 8.6, 0);
    this.targetBeaconGroup.add(this.targetLightColumn);

    // Lower beam spotlight hitting the tile surface below the 9 Iron Blocks
    const lowerBeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 1.45, 0.65),
      new THREE.MeshBasicMaterial({
        color: '#67e8f9',
        transparent: true,
        opacity: 0.38
      })
    );
    lowerBeam.position.set(0, 1.25, 0);
    this.targetBeaconGroup.add(lowerBeam);

    this.root.add(this.targetBeaconGroup);
  }

  /**
   * Highlights the clicked/inspected tile with a glowing golden ring.
   */
  public highlightTile(tileIndex: number | null): void {
    if (!this.selectedTileFrame) return;
    if (tileIndex === null) {
      this.selectedTileFrame.visible = false;
      return;
    }
    const tile = BOARD_TILES[((tileIndex % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE];
    this.selectedTileFrame.position.set(
      tile.gridX * TILE_SPACING,
      0.55,
      tile.gridZ * TILE_SPACING
    );
    this.selectedTileFrame.visible = true;
  }

  /**
   * Spawns the 3D Beacon Light Column + 9 Floating Iron Blocks (3x3 Grid) above the destination tile!
   */
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

  private createEndPortalLandmark3D(): THREE.Group {
    const g = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: '#0f766e', roughness: 0.5 });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: '#4ade80',
      emissive: '#22c55e',
      emissiveIntensity: 0.6
    });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.26, 1.1), frameMat);
    frame.position.y = 0.13;
    g.add(frame);

    const corners = [
      [-0.36, 0.28, -0.36],
      [0.36, 0.28, -0.36],
      [-0.36, 0.28, 0.36],
      [0.36, 0.28, 0.36]
    ];
    for (const [cx, cy, cz] of corners) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), eyeMat);
      eye.position.set(cx, cy, cz);
      g.add(eye);
    }

    const portalMat = new THREE.MeshBasicMaterial({ color: '#a855f7' });
    const portalMesh = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.28, 0.78), portalMat);
    portalMesh.position.y = 0.16;
    this.endPortalSurface = portalMesh;
    g.add(portalMesh);

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

  public getTileStandPosition(tileIndex: number, playerSlot = 0): THREE.Vector3 {
    const tile = BOARD_TILES[((tileIndex % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE];
    const offsets = [
      { dx: -0.34, dz: -0.22 },
      { dx: 0.34, dz: -0.22 },
      { dx: -0.34, dz: 0.34 },
      { dx: 0.34, dz: 0.34 }
    ];
    const off = offsets[playerSlot % 4];
    return new THREE.Vector3(
      tile.gridX * TILE_SPACING + off.dx,
      0.59,
      tile.gridZ * TILE_SPACING + off.dz
    );
  }

  public updateTileBuilding(
    tileIndex: number,
    level: number,
    ownerColorHex: string,
    festivalMultiplier = 1
  ): void {
    const tile = BOARD_TILES[tileIndex];
    const tileMesh = this.tileMeshes[tileIndex];
    if (tileMesh && Array.isArray(tileMesh.material)) {
      const topMat = tileMesh.material[2] as THREE.MeshStandardMaterial;
      topMat.map?.dispose();
      topMat.map = createHighResTileTexture(tile, festivalMultiplier, ownerColorHex);
      topMat.needsUpdate = true;
    }

    const prev = this.buildingGroups.get(tileIndex);
    if (prev) {
      this.root.remove(prev);
      this.buildingGroups.delete(tileIndex);
    }

    if (level <= 0) return;

    const bGroup = this.createBuildingMeshForLevel(level, ownerColorHex, tile.colorHex);
    const worldX = tile.gridX * TILE_SPACING;
    const worldZ = tile.gridZ * TILE_SPACING;

    bGroup.position.set(worldX, 0.59, worldZ);
    bGroup.rotation.y = tile.outwardRotationY;

    this.root.add(bGroup);
    this.buildingGroups.set(tileIndex, bGroup);

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
    this.buildingGroups.forEach((grp) => this.root.remove(grp));
    this.buildingGroups.clear();
    this.crownMeshes = [];
    this.hideTargetTileBeacon();
    this.highlightTile(null);

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

    this.waterfallDrops.forEach((drop, idx) => {
      const cycle = ((elapsedTime * 1.8 + idx * 0.25) % 2.0) / 2.0;
      drop.position.y = 0.35 - cycle * 2.1;
    });

    if (this.beaconBeam) {
      this.beaconBeam.rotation.y = elapsedTime * 0.8;
    }

    // Animate the 9 Floating Iron Blocks & 3D Target Beacon when visible!
    if (this.targetBeaconGroup && this.targetBeaconGroup.visible) {
      if (this.targetIronBaseGroup) {
        this.targetIronBaseGroup.position.y = Math.sin(elapsedTime * 3.5) * 0.14;
        this.targetIronBaseGroup.rotation.y = Math.sin(elapsedTime * 1.2) * 0.08;
      }
      if (this.targetLightColumn) {
        this.targetLightColumn.rotation.y = elapsedTime * 2.4;
      }
    }

    for (const crown of this.crownMeshes) {
      crown.rotation.y = elapsedTime * 2.2;
      crown.position.y = 1.72 + Math.sin(elapsedTime * 3.5) * 0.07;
    }

    if (this.endPortalSurface) {
      const mat = this.endPortalSurface.material as THREE.MeshBasicMaterial;
      const hue = 0.76 + Math.sin(elapsedTime * 3.0) * 0.04;
      mat.color.setHSL(hue, 0.85, 0.6);
    }
  }
}
