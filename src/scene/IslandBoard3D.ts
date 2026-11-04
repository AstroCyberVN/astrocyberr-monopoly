import * as THREE from 'three';
import gsap from 'gsap';
import { BOARD_TILES, TileConfig } from '../core/boardData';
import { ParticleSystem3D } from './ParticleSystem3D';
import { soundManager } from '../audio/SoundManager';

export const TILE_SPACING = 1.65;

/**
 * Generates crisp top texture for each of the 28 board tiles
 */
function createTileTopTexture(tile: TileConfig, festivalMultiplier = 1): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base cream/stone voxel card surface
  ctx.fillStyle = tile.type === 'END_PORTAL' ? '#1e1b4b' : '#f8fafc';
  ctx.fillRect(0, 0, 256, 256);

  // Outer pixel border
  ctx.strokeStyle = tile.colorHex;
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 242, 242);

  // Top biome color header bar
  ctx.fillStyle = tile.colorHex;
  ctx.fillRect(14, 14, 228, 56);

  // Tile Index Badge
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.fillRect(20, 22, 54, 38);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`#${tile.index}`, 47, 49);

  // Festival x2 Badge if active
  if (festivalMultiplier > 1) {
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(172, 22, 64, 38);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px Nunito, sans-serif';
    ctx.fillText(`x${festivalMultiplier}`, 204, 49);
  }

  // Center Emoji Icon
  ctx.font = '64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(tile.icon, 128, 138);

  // Tile Short Name
  ctx.fillStyle = tile.type === 'END_PORTAL' ? '#f3e8ff' : '#0f172a';
  ctx.font = '800 22px Nunito, sans-serif';
  const words = tile.name.split(' ');
  const line1 = words.slice(0, 2).join(' ');
  const line2 = words.slice(2).join(' ');
  ctx.fillText(line1, 128, 178);
  if (line2) {
    ctx.fillText(line2, 128, 204);
  }

  // Price or Special Tag at bottom
  ctx.fillStyle = tile.type === 'END_PORTAL' ? '#d8b4fe' : '#b45309';
  ctx.font = '900 24px Nunito, sans-serif';
  if (tile.price) {
    ctx.fillText(`💰 ${tile.price}G`, 128, 236);
  } else if (tile.type === 'START') {
    ctx.fillStyle = '#15803d';
    ctx.fillText(`+200 VÀNG`, 128, 236);
  } else if (tile.type === 'ROYAL_TAX') {
    ctx.fillStyle = '#dc2626';
    ctx.fillText(`-120 VÀNG`, 128, 236);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export class IslandBoard3D {
  public readonly root = new THREE.Group();
  private tileMeshes: THREE.Mesh[] = [];
  private buildingGroups = new Map<number, THREE.Group>();
  private crownMeshes: THREE.Mesh[] = [];
  private cloudsGroup = new THREE.Group();
  private waterMesh!: THREE.Mesh;
  private endPortalSurface?: THREE.Mesh;
  private particles: ParticleSystem3D;

  constructor(scene: THREE.Scene, particles: ParticleSystem3D) {
    this.particles = particles;
    this.root.name = 'FloatingVoxelIsland';
    scene.add(this.root);

    this.buildPastelOcean();
    this.buildFloatingVoxelIslandBase();
    this.buildMinecraftTreesAndCourtyard();
    this.build28PerimeterTiles();
    this.buildFloatingClouds();
  }

  private buildPastelOcean(): void {
    // Pastel blue water surface
    const waterGeo = new THREE.BoxGeometry(46, 1.4, 46, 16, 1, 16);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#67e8f9',
      roughness: 0.25,
      metalness: 0.08,
      transparent: true,
      opacity: 0.88
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.set(0, -1.15, 0);
    this.waterMesh.receiveShadow = true;
    this.root.add(this.waterMesh);

    // Deeper ocean floor for pastel depth
    const deepGeo = new THREE.BoxGeometry(46, 0.8, 46);
    const deepMat = new THREE.MeshBasicMaterial({ color: '#0284c7' });
    const deepMesh = new THREE.Mesh(deepGeo, deepMat);
    deepMesh.position.set(0, -2.2, 0);
    this.root.add(deepMesh);

    // Cute white voxel water foam rings around the island
    const foamMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.75
    });
    for (let i = -7; i <= 7; i += 2) {
      const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.35), foamMat);
      f1.position.set(i * 1.15, -0.42, 8.7);
      const f2 = f1.clone();
      f2.position.set(i * 1.15, -0.42, -8.7);
      this.root.add(f1, f2);
    }
  }

  private buildFloatingVoxelIslandBase(): void {
    // 1. Grass Top Platform inside the 28-tile ring
    const grassGeo = new THREE.BoxGeometry(9.6, 0.7, 9.6);
    const grassMat = new THREE.MeshStandardMaterial({
      color: '#4ade80',
      roughness: 0.75
    });
    const grassPlatform = new THREE.Mesh(grassGeo, grassMat);
    grassPlatform.position.set(0, 0.05, 0);
    grassPlatform.receiveShadow = true;
    this.root.add(grassPlatform);

    // 2. Stepped Voxel Dirt & Stone Cliff Layers underneath (Floating Island aesthetic!)
    const dirtLayers = [
      { size: 15.6, height: 1.0, y: -0.65, color: '#854d0e' },
      { size: 13.4, height: 1.1, y: -1.6, color: '#713f12' },
      { size: 10.2, height: 1.2, y: -2.6, color: '#57534e' },
      { size: 6.4, height: 1.2, y: -3.6, color: '#44403c' }
    ];

    for (const layer of dirtLayers) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(layer.size, layer.height, layer.size),
        new THREE.MeshStandardMaterial({ color: layer.color, roughness: 0.9 })
      );
      mesh.position.set(0, layer.y, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.root.add(mesh);
    }

    // 3. Center Dice Courtyard (Cobblestone & Gold Trim)
    const courtGeo = new THREE.BoxGeometry(4.2, 0.14, 4.2);
    const courtMat = new THREE.MeshStandardMaterial({
      color: '#fef3c7',
      roughness: 0.6
    });
    const court = new THREE.Mesh(courtGeo, courtMat);
    court.position.set(0, 0.42, 0);
    court.receiveShadow = true;
    this.root.add(court);
  }

  private buildMinecraftTreesAndCourtyard(): void {
    // Place 4 cute Minecraft Voxel Trees in the 4 inner corners of the island courtyard
    const treePositions = [
      { x: -3.1, z: -3.1, leafColor: '#22c55e', trunkColor: '#78350f' }, // Oak
      { x: 3.1, z: -3.1, leafColor: '#f472b6', trunkColor: '#57534e' }, // Cherry Blossom
      { x: -3.1, z: 3.1, leafColor: '#f472b6', trunkColor: '#57534e' }, // Cherry Blossom
      { x: 3.1, z: 3.1, leafColor: '#16a34a', trunkColor: '#78350f' } // Spruce/Oak
    ];

    for (const tp of treePositions) {
      const tree = this.createVoxelTree(tp.leafColor, tp.trunkColor);
      tree.position.set(tp.x, 0.4, tp.z);
      this.root.add(tree);
    }

    // Voxel Flowers & Bushes around the courtyard
    const flowerColors = ['#ef4444', '#fde047', '#ec4899', '#38bdf8'];
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const r = 2.6 + (i % 2) * 0.55;
      const flower = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.24, 0.18),
        new THREE.MeshStandardMaterial({ color: flowerColors[i % flowerColors.length] })
      );
      flower.position.set(Math.cos(angle) * r, 0.52, Math.sin(angle) * r);
      flower.castShadow = true;
      this.root.add(flower);
    }
  }

  private createVoxelTree(leafHex: string, trunkHex: string): THREE.Group {
    const g = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: trunkHex, roughness: 0.85 });
    const leafMat = new THREE.MeshStandardMaterial({ color: leafHex, roughness: 0.65 });

    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.25, 0.42), trunkMat);
    trunk.position.y = 0.62;
    trunk.castShadow = true;
    g.add(trunk);

    const canopy1 = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.65, 1.45), leafMat);
    canopy1.position.y = 1.45;
    canopy1.castShadow = true;
    g.add(canopy1);

    const canopy2 = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.55, 1.05), leafMat);
    canopy2.position.y = 1.98;
    canopy2.castShadow = true;
    g.add(canopy2);

    const canopyTop = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.4, 0.58), leafMat);
    canopyTop.position.y = 2.4;
    canopyTop.castShadow = true;
    g.add(canopyTop);

    return g;
  }

  private build28PerimeterTiles(): void {
    const tileGeo = new THREE.BoxGeometry(1.52, 0.48, 1.52);

    for (const tile of BOARD_TILES) {
      const topTex = createTileTopTexture(tile, 1);
      const sideMat = new THREE.MeshStandardMaterial({
        color: tile.colorHex,
        roughness: 0.65
      });
      const topMat = new THREE.MeshStandardMaterial({
        map: topTex,
        roughness: 0.45
      });

      const materials = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
      const mesh = new THREE.Mesh(tileGeo, materials);
      const worldX = tile.gridX * TILE_SPACING;
      const worldZ = tile.gridZ * TILE_SPACING;

      mesh.position.set(worldX, 0.24, worldZ);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      mesh.userData = { tileIndex: tile.index };

      this.root.add(mesh);
      this.tileMeshes[tile.index] = mesh;

      // Add Special 3D Landmarks for Chests, The End Portal, Deserted Island, etc.
      if (tile.type === 'CHEST') {
        const chest = this.createMinecraftChest3D();
        chest.position.set(worldX * 1.17, 0.48, worldZ * 1.17);
        chest.lookAt(0, 0.48, 0);
        this.root.add(chest);
      } else if (tile.type === 'END_PORTAL') {
        const portal = this.createEndPortalLandmark3D();
        portal.position.set(worldX * 1.18, 0.48, worldZ * 1.18);
        this.root.add(portal);
      } else if (tile.type === 'DESERTED_ISLAND') {
        const palm = this.createVoxelTree('#84cc16', '#a16207');
        palm.scale.setScalar(0.65);
        palm.position.set(worldX * 1.18, 0.48, worldZ * 1.18);
        this.root.add(palm);
      }
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

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.36, 0.46), woodMat);
    base.position.y = 0.18;
    base.castShadow = true;
    g.add(base);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.06, 0.48), trimMat);
    rim.position.y = 0.24;
    g.add(rim);

    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.06), latchMat);
    latch.position.set(0, 0.24, 0.24);
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

    // 4 frame edges around glowing purple portal
    const fGeo = new THREE.BoxGeometry(0.95, 0.22, 0.95);
    const frame = new THREE.Mesh(fGeo, frameMat);
    frame.position.y = 0.11;
    g.add(frame);

    // 4 Ender Eyes on corners
    const corners = [
      [-0.3, 0.25, -0.3],
      [0.3, 0.25, -0.3],
      [-0.3, 0.25, 0.3],
      [0.3, 0.25, 0.3]
    ];
    for (const [cx, cy, cz] of corners) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.16), eyeMat);
      eye.position.set(cx, cy, cz);
      g.add(eye);
    }

    // Glowing The End Portal Surface
    const portalMat = new THREE.MeshBasicMaterial({
      color: '#a855f7'
    });
    const portalMesh = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.25, 0.68), portalMat);
    portalMesh.position.y = 0.14;
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
      { x: -9, y: 7.5, z: -8, sx: 2.8, sz: 1.4 },
      { x: 10, y: 8.2, z: -6, sx: 3.2, sz: 1.6 },
      { x: -11, y: 7.8, z: 7, sx: 2.5, sz: 1.5 },
      { x: 9, y: 8.5, z: 9, sx: 3.0, sz: 1.4 }
    ];

    for (const c of cloudCoords) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(c.sx, 0.45, c.sz), cloudMat);
      mesh.position.set(c.x, c.y, c.z);
      this.cloudsGroup.add(mesh);
    }
    this.root.add(this.cloudsGroup);
  }

  /**
   * Returns world coordinates for a character standing on `tileIndex`
   * (with slight slot offset so up to 4 players on the same tile never overlap)
   */
  public getTileStandPosition(tileIndex: number, playerSlot = 0): THREE.Vector3 {
    const tile = BOARD_TILES[((tileIndex % 28) + 28) % 28];
    const offsets = [
      { dx: -0.24, dz: -0.24 },
      { dx: 0.24, dz: -0.24 },
      { dx: -0.24, dz: 0.24 },
      { dx: 0.24, dz: 0.24 }
    ];
    const off = offsets[playerSlot % 4];
    return new THREE.Vector3(
      tile.gridX * TILE_SPACING + off.dx,
      0.48,
      tile.gridZ * TILE_SPACING + off.dz
    );
  }

  /**
   * Spawns or upgrades the 3D Voxel Building on `tileIndex` with a bouncy pop-up animation:
   * - Level 1: Cọc Rào Gỗ (Wooden Fence)
   * - Level 2: Nhà Gỗ Minecraft (Oak Cottage)
   * - Level 3: Biệt Thự 2 Tầng (Two-Story Villa)
   * - Level 4: Lâu Đài Vương Miện (Crown Castle)
   */
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
      topMat.map = createTileTopTexture(tile, festivalMultiplier);
      topMat.needsUpdate = true;
    }

    // Remove previous building if any
    const prev = this.buildingGroups.get(tileIndex);
    if (prev) {
      this.root.remove(prev);
      this.buildingGroups.delete(tileIndex);
    }

    if (level <= 0) return;

    const bGroup = this.createBuildingMeshForLevel(level, ownerColorHex, tile.colorHex);
    // Position on outer rim of the tile so characters have room to stand
    const outX = tile.gridX * TILE_SPACING * 1.19;
    const outZ = tile.gridZ * TILE_SPACING * 1.19;
    bGroup.position.set(outX, 0.42, outZ);
    bGroup.lookAt(0, 0.42, 0);

    this.root.add(bGroup);
    this.buildingGroups.set(tileIndex, bGroup);

    // Bouncy Pop-Up Effect ("mọc hiệu ứng nảy lùn phùn")
    soundManager.playBuildPop(level);
    this.particles.spawnBuildingPopSparkles(new THREE.Vector3(outX, 0.6, outZ), ownerColorHex);

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
  }

  private createBuildingMeshForLevel(
    level: number,
    ownerColorHex: string,
    biomeHex: string
  ): THREE.Group {
    const g = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.8 });
    const plankMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.7 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.65 });
    const ownerMat = new THREE.MeshStandardMaterial({ color: ownerColorHex, roughness: 0.45 });
    const roofMat = new THREE.MeshStandardMaterial({ color: biomeHex, roughness: 0.5 });
    const windowMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });

    // Owner Flagpole on all levels
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.06), woodMat);
    pole.position.set(-0.42, 0.42, 0);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.05), ownerMat);
    flag.position.set(-0.28, 0.72, 0);
    g.add(pole, flag);

    if (level === 1) {
      // Level 1: Cọc Rào Gỗ (Wooden Fence Posts & Rails)
      const posts = [-0.32, 0, 0.32];
      for (const px of posts) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.46, 0.12), woodMat);
        post.position.set(px, 0.23, 0);
        post.castShadow = true;
        g.add(post);
      }
      const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.06), plankMat);
      rail1.position.set(0, 0.34, 0);
      const rail2 = rail1.clone();
      rail2.position.set(0, 0.16, 0);
      g.add(rail1, rail2);
    } else if (level === 2) {
      // Level 2: Nhà Gỗ Minecraft (Oak Cottage)
      const walls = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.52, 0.62), plankMat);
      walls.position.y = 0.26;
      walls.castShadow = true;
      g.add(walls);

      const roof1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.74), roofMat);
      roof1.position.y = 0.6;
      roof1.castShadow = true;
      const roof2 = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.18, 0.54), ownerMat);
      roof2.position.y = 0.78;
      g.add(roof1, roof2);

      const win = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.05), windowMat);
      win.position.set(0, 0.3, 0.32);
      g.add(win);
    } else if (level === 3) {
      // Level 3: Biệt Thự 2 Tầng (Two-Story Villa)
      const floor1 = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.48, 0.68), stoneMat);
      floor1.position.y = 0.24;
      floor1.castShadow = true;

      const floor2 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.46, 0.58), plankMat);
      floor2.position.y = 0.7;
      floor2.castShadow = true;

      const roof = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.22, 0.74), ownerMat);
      roof.position.y = 1.02;
      roof.castShadow = true;

      const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.05), windowMat);
      win1.position.set(-0.16, 0.7, 0.3);
      const win2 = win1.clone();
      win2.position.set(0.16, 0.7, 0.3);

      g.add(floor1, floor2, roof, win1, win2);
    } else {
      // Level 4: Lâu Đài Vương Miện (Crown Castle)
      const keep = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.95, 0.82), stoneMat);
      keep.position.y = 0.48;
      keep.castShadow = true;
      g.add(keep);

      // 4 Corner Turrets
      const turretOffsets = [
        [-0.38, -0.38],
        [0.38, -0.38],
        [-0.38, 0.38],
        [0.38, 0.38]
      ];
      for (const [tx, tz] of turretOffsets) {
        const turret = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.22, 0.26), stoneMat);
        turret.position.set(tx, 0.61, tz);
        turret.castShadow = true;
        const spire = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.3), ownerMat);
        spire.position.set(tx, 1.32, tz);
        g.add(turret, spire);
      }

      // Floating Golden Crown on top of the Castle!
      const crownMat = new THREE.MeshStandardMaterial({
        color: '#fde047',
        emissive: '#ca8a04',
        emissiveIntensity: 0.45,
        metalness: 0.7,
        roughness: 0.2
      });
      const crown = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.38), crownMat);
      crown.position.set(0, 1.52, 0);
      g.add(crown);
      this.crownMeshes.push(crown);
    }

    return g;
  }

  public update(elapsedTime: number): void {
    // Gentle pastel ocean wave bobbing
    this.waterMesh.position.y = -1.15 + Math.sin(elapsedTime * 1.8) * 0.06;

    // Clouds drifting slowly in a circle
    this.cloudsGroup.rotation.y = elapsedTime * 0.04;

    // Rotate golden crowns on Level 4 Castles
    for (const crown of this.crownMeshes) {
      crown.rotation.y = elapsedTime * 2.2;
      crown.position.y = 1.52 + Math.sin(elapsedTime * 3.5) * 0.06;
    }

    // Pulse The End Portal surface
    if (this.endPortalSurface) {
      const mat = this.endPortalSurface.material as THREE.MeshBasicMaterial;
      const hue = 0.76 + Math.sin(elapsedTime * 3.0) * 0.04;
      mat.color.setHSL(hue, 0.85, 0.6);
    }
  }
}
