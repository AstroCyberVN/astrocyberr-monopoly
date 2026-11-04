import * as THREE from 'three';
import gsap from 'gsap';
import { TileConfig } from '../core/boardData';
import { TILE_SPACING } from './IslandBoard3D';

export type CameraStyle = 'NORMAL' | 'LIVE';

/**
 * Dual-Mode 3D Camera Director for AstroCyberr Monopoly (v3.0):
 * 1. NORMAL Mode:
 *    - Default 45° overhead panoramic tilt looking at the island with 360° smooth orbit rotation.
 *    - Clicking any tile smoothly flies the camera (`0.65s` GSAP ease) to face that tile,
 *      and resolves a Promise on arrival so the UI can then reveal the Tile Info Popup!
 *    - Pressing `R` / clicking `Toàn Cảnh` / dragging orbits smoothly back to panoramic view.
 * 2. LIVE Mode:
 *    - Automatically glides to follow whichever player's turn is active, tracking their
 *      character step-by-step around all 4 sides of the 40-tile island.
 */
export class CameraDirector {
  public readonly camera: THREE.PerspectiveCamera;
  private style: CameraStyle = 'NORMAL';

  private readonly islandCenter = new THREE.Vector3(0, 0.35, 0);
  private currentLookAt = new THREE.Vector3(0, 0.35, 0);
  private desiredPos = new THREE.Vector3(0, 24.5, 24.5);
  private desiredLookAt = new THREE.Vector3(0, 0.35, 0);

  private orbitYaw = 0;
  private targetOrbitYaw = 0;
  private orbitZoom = 1.0;

  private isInspectingTile = false;
  private isTweening = false;
  private isDragging = false;
  private dragMoved = false;
  private prevMouseX = 0;

  private liveFollowPos = new THREE.Vector3(0, 0.56, 11.1);
  private liveOutwardYaw = 0;

  constructor(aspect: number, domElement: HTMLElement) {
    // Extended far plane (600) so the massive 260x260 ocean & 4 surrounding perimeter walls never clip
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 600);
    this.camera.position.copy(this.desiredPos);
    this.camera.lookAt(this.currentLookAt);

    this.attachPointerControls(domElement);
  }

  public getCameraStyle(): CameraStyle {
    return this.style;
  }

  public setCameraStyle(newStyle: CameraStyle): void {
    this.style = newStyle;
    this.isInspectingTile = false;
    gsap.killTweensOf(this.desiredPos);
    gsap.killTweensOf(this.desiredLookAt);
    this.isTweening = false;

    if (newStyle === 'NORMAL') {
      this.resetToPanoramic();
    } else {
      this.updateLiveCameraTargets(this.liveFollowPos, this.liveOutwardYaw);
    }
  }

  private attachPointerControls(el: HTMLElement): void {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.button !== 2) return;
      this.isDragging = true;
      this.dragMoved = false;
      this.prevMouseX = e.clientX;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouseX;
      if (Math.abs(dx) > 2) {
        this.dragMoved = true;
        // If user manually drags while inspecting a tile in NORMAL mode, smoothly release tile lock
        if (this.style === 'NORMAL' && this.isInspectingTile) {
          this.isInspectingTile = false;
          this.isTweening = false;
          gsap.killTweensOf(this.desiredPos);
          gsap.killTweensOf(this.desiredLookAt);
        }
      }
      this.prevMouseX = e.clientX;
      this.targetOrbitYaw -= dx * 0.007;
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    window.addEventListener('keydown', (e) => {
      // Ignore if typing in an input
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (e.key === 'ArrowLeft' || e.key === 'q' || e.key === 'Q') {
        this.isInspectingTile = false;
        this.targetOrbitYaw += 0.2;
      } else if (e.key === 'ArrowRight' || e.key === 'e' || e.key === 'E') {
        this.isInspectingTile = false;
        this.targetOrbitYaw -= 0.2;
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'Escape') {
        this.resetToPanoramic();
      }
    });

    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.orbitZoom = THREE.MathUtils.clamp(this.orbitZoom + e.deltaY * 0.0007, 0.58, 1.38);
      },
      { passive: false }
    );
  }

  public wasDragging(): boolean {
    return this.dragMoved;
  }

  /**
   * Smoothly flies the camera to inspect a clicked tile on the board (`0.65s` GSAP transition).
   * Resolves its Promise AFTER arriving at the tile so the UI can then display the Tile Info Popup!
   */
  public flyToTile(tile: TileConfig, speedMultiplier = 1): Promise<void> {
    return new Promise((resolve) => {
      this.isInspectingTile = true;
      this.isTweening = true;

      gsap.killTweensOf(this.desiredPos);
      gsap.killTweensOf(this.desiredLookAt);

      const tileWorldX = tile.gridX * TILE_SPACING;
      const tileWorldZ = tile.gridZ * TILE_SPACING;
      const ry = tile.outwardRotationY;

      // Outward normal vector of the tile's row
      const outX = Math.sin(ry);
      const outZ = Math.cos(ry);

      const targetLook = new THREE.Vector3(tileWorldX, 0.58, tileWorldZ);
      const targetCamPos = new THREE.Vector3(
        tileWorldX + outX * 8.6,
        7.8,
        tileWorldZ + outZ * 8.6
      );

      // Sync orbitYaw so returning to panoramic doesn't spin unexpectedly
      this.targetOrbitYaw = Math.atan2(targetCamPos.x, targetCamPos.z);
      this.orbitYaw = this.targetOrbitYaw;

      const dur = 0.65 / Math.max(1, speedMultiplier);

      gsap.to(this.desiredLookAt, {
        x: targetLook.x,
        y: targetLook.y,
        z: targetLook.z,
        duration: dur,
        ease: 'power2.inOut'
      });

      gsap.to(this.desiredPos, {
        x: targetCamPos.x,
        y: targetCamPos.y,
        z: targetCamPos.z,
        duration: dur,
        ease: 'power2.inOut',
        onComplete: () => {
          this.isTweening = false;
          resolve();
        }
      });
    });
  }

  /**
   * Smoothly glides the camera back to the 45-degree panoramic island overview.
   */
  public resetToPanoramic(speedMultiplier = 1): Promise<void> {
    return new Promise((resolve) => {
      this.isInspectingTile = false;
      this.isTweening = true;

      gsap.killTweensOf(this.desiredPos);
      gsap.killTweensOf(this.desiredLookAt);

      const baseDist = 24.5 * this.orbitZoom;
      const targetCamPos = new THREE.Vector3(
        Math.sin(this.targetOrbitYaw) * baseDist,
        baseDist,
        Math.cos(this.targetOrbitYaw) * baseDist
      );

      const dur = 0.55 / Math.max(1, speedMultiplier);

      gsap.to(this.desiredLookAt, {
        x: this.islandCenter.x,
        y: this.islandCenter.y,
        z: this.islandCenter.z,
        duration: dur,
        ease: 'power2.out'
      });

      gsap.to(this.desiredPos, {
        x: targetCamPos.x,
        y: targetCamPos.y,
        z: targetCamPos.z,
        duration: dur,
        ease: 'power2.out',
        onComplete: () => {
          this.isTweening = false;
          resolve();
        }
      });
    });
  }

  /**
   * Called at the start of a player's turn or during movement in LIVE mode.
   */
  public focusActivePlayerLive(
    worldPos: THREE.Vector3,
    outwardRotationY: number,
    speedMultiplier = 1
  ): Promise<void> {
    this.liveFollowPos.copy(worldPos);
    this.liveOutwardYaw = outwardRotationY;

    if (this.style !== 'LIVE') {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.isInspectingTile = false;
      this.isTweening = true;
      gsap.killTweensOf(this.desiredPos);
      gsap.killTweensOf(this.desiredLookAt);

      const outX = Math.sin(outwardRotationY);
      const outZ = Math.cos(outwardRotationY);

      const targetCamPos = new THREE.Vector3(
        worldPos.x + outX * 10.2,
        9.4 * this.orbitZoom,
        worldPos.z + outZ * 10.2
      );

      const dur = 0.52 / Math.max(1, speedMultiplier);

      gsap.to(this.desiredLookAt, {
        x: worldPos.x,
        y: worldPos.y + 0.45,
        z: worldPos.z,
        duration: dur,
        ease: 'power2.out'
      });

      gsap.to(this.desiredPos, {
        x: targetCamPos.x,
        y: targetCamPos.y,
        z: targetCamPos.z,
        duration: dur,
        ease: 'power2.out',
        onComplete: () => {
          this.isTweening = false;
          resolve();
        }
      });
    });
  }

  private updateLiveCameraTargets(worldPos: THREE.Vector3, outwardRotationY: number): void {
    const outX = Math.sin(outwardRotationY);
    const outZ = Math.cos(outwardRotationY);

    this.desiredLookAt.set(worldPos.x, worldPos.y + 0.45, worldPos.z);
    this.desiredPos.set(
      worldPos.x + outX * 10.2 + Math.sin(this.targetOrbitYaw) * 1.5,
      9.4 * this.orbitZoom,
      worldPos.z + outZ * 10.2 + Math.cos(this.targetOrbitYaw) * 1.5
    );
  }

  public focusDiceRoll(): void {
    if (this.style === 'LIVE') {
      this.isInspectingTile = false;
      gsap.killTweensOf(this.desiredPos);
      gsap.killTweensOf(this.desiredLookAt);
      gsap.to(this.desiredLookAt, {
        x: 0,
        y: 1.4,
        z: 0,
        duration: 0.45,
        ease: 'power2.out'
      });
      gsap.to(this.desiredPos, {
        x: this.liveFollowPos.x * 0.55,
        y: 14.5,
        z: Math.max(14.5, this.liveFollowPos.z * 0.75),
        duration: 0.45,
        ease: 'power2.out'
      });
    }
  }

  public followCharacterStep(worldPos: THREE.Vector3, outwardRotationY = 0): void {
    this.liveFollowPos.copy(worldPos);
    this.liveOutwardYaw = outwardRotationY;

    if (this.style === 'LIVE') {
      this.isInspectingTile = false;
      this.isTweening = false;
      this.updateLiveCameraTargets(worldPos, outwardRotationY);
    }
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  public update(dt: number): void {
    const smooth = Math.min(1, dt * 8.5);
    this.orbitYaw = THREE.MathUtils.lerp(this.orbitYaw, this.targetOrbitYaw, smooth);

    if (this.style === 'NORMAL' && !this.isInspectingTile && !this.isTweening) {
      // Standard 45-degree panoramic orbit: height Y == horizontal radius R
      const baseDist = 24.5 * this.orbitZoom;
      this.desiredPos.set(
        Math.sin(this.orbitYaw) * baseDist,
        baseDist,
        Math.cos(this.orbitYaw) * baseDist
      );
      this.desiredLookAt.copy(this.islandCenter);
    }

    this.camera.position.lerp(this.desiredPos, smooth);
    this.currentLookAt.lerp(this.desiredLookAt, smooth);
    this.camera.lookAt(this.currentLookAt);
  }
}
