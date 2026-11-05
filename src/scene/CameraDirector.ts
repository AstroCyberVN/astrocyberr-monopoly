import * as THREE from 'three';
import gsap from 'gsap';
import { TileConfig } from '../core/boardData';
import { TILE_SPACING } from './IslandBoard3D';

export type CameraStyle = 'NORMAL' | 'LIVE';

export type LiveDirectorStage = 'FOLLOW_PLAYER' | 'DICE_OVER_SHOULDER' | 'EVENT_CLOSEUP';

/**
 * Dual-Mode 3D Camera Director for AstroCyberr Monopoly:
 * 1. NORMAL Mode (Free Spherical 3D Orbit — Unlocked Pitch & 360° Yaw):
 *    - Free 360° horizontal rotation (Yaw) AND free vertical tilt (Pitch from 10° low street-view to 84° top-down)
 *      by dragging the mouse in any direction, plus smooth wheel zoom.
 *    - Clicking any tile smoothly flies the camera (`0.65s` GSAP ease) to face that tile.
 *    - Pressing `R` / clicking `Toàn Cảnh` returns to full-island overview.
 * 2. LIVE Mode (3-Stage Automatic Director Cuts):
 *    - Stage 1 (Over-the-Shoulder Dice Action Shot): Lowers behind the active character's shoulder looking toward
 *      the center courtyard dice arena during power charge & dice roll.
 *    - Stage 2 (3rd-Person Chase Cam + Smooth Corner Banking): Automatically tracks the active turn character
 *      around the 40-tile island, including high-altitude card flight & End Portal -> Sky Jail drop cutscenes.
 *    - Stage 3 (Event & Transaction Close-Up): Zooms in cinematically on the tile/building during property purchase,
 *      upgrade, or 3D parabolic '$' rent transfer.
 */
export class CameraDirector {
  public readonly camera: THREE.PerspectiveCamera;
  private style: CameraStyle = 'NORMAL';
  private liveStage: LiveDirectorStage = 'FOLLOW_PLAYER';

  private readonly islandCenter = new THREE.Vector3(0, 0.35, 0);
  private currentLookAt = new THREE.Vector3(0, 0.35, 0);
  private desiredPos = new THREE.Vector3(0, 24.5, 24.5);
  private desiredLookAt = new THREE.Vector3(0, 0.35, 0);

  // Spherical Orbit Angles (Unlocked Pitch + 360° Yaw)
  private orbitYaw = 0;
  private targetOrbitYaw = 0;
  private orbitPitch = Math.PI / 4; // Starts at 45°, freely unlocked between 10° (0.18) and 84° (1.46)
  private targetOrbitPitch = Math.PI / 4;
  private orbitZoom = 1.0;

  private isInspectingTile = false;
  private isTweening = false;
  private isDragging = false;
  private dragMoved = false;
  private prevMouseX = 0;
  private prevMouseY = 0;

  private liveFollowPos = new THREE.Vector3(0, 0.59, 11.1);
  private liveOutwardYaw = 0;
  private liveSmoothedYaw = 0;
  private liveUserYawOffset = 0;
  private liveUserPitchOffset = 0;

  // PixelFX Game Juice Camera Shake state
  private shakeTimer = 0;
  private shakeDuration = 0.25;
  private shakeIntensity = 0;

  constructor(aspect: number, domElement: HTMLElement) {
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
      this.liveStage = 'FOLLOW_PLAYER';
      this.liveUserYawOffset = 0;
      this.liveUserPitchOffset = 0;
      this.updateLiveCameraTargets(this.liveFollowPos, this.liveOutwardYaw);
    }
  }

  /**
   * Triggers a crisp damped camera shake for high-impact PixelFX moments
   * (dice doubles slam, level 4 castle upgrade, End Portal -> Jail drop).
   */
  public triggerCameraShake(intensity = 0.32, durationSec = 0.26): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(0.08, durationSec);
    this.shakeTimer = this.shakeDuration;
  }

  private attachPointerControls(el: HTMLElement): void {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.button !== 2) return;
      this.isDragging = true;
      this.dragMoved = false;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouseX;
      const dy = e.clientY - this.prevMouseY;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        this.dragMoved = true;
        if (this.style === 'NORMAL' && this.isInspectingTile) {
          this.isInspectingTile = false;
          this.isTweening = false;
          gsap.killTweensOf(this.desiredPos);
          gsap.killTweensOf(this.desiredLookAt);
        }
      }

      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;

      // Full 360° Yaw + Unlocked Vertical Pitch!
      this.targetOrbitYaw -= dx * 0.0075;
      this.targetOrbitPitch = THREE.MathUtils.clamp(
        this.targetOrbitPitch + dy * 0.0065,
        0.18, // ~10 degrees (low street-level view)
        1.46  // ~84 degrees (high top-down overview)
      );

      if (this.style === 'LIVE') {
        this.liveUserYawOffset -= dx * 0.0065;
        this.liveUserPitchOffset = THREE.MathUtils.clamp(
          this.liveUserPitchOffset + dy * 0.04,
          -3.5,
          6.5
        );
      }
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (e.key === 'ArrowLeft' || e.key === 'q' || e.key === 'Q') {
        this.isInspectingTile = false;
        this.targetOrbitYaw += 0.22;
      } else if (e.key === 'ArrowRight' || e.key === 'e' || e.key === 'E') {
        this.isInspectingTile = false;
        this.targetOrbitYaw -= 0.22;
      } else if (e.key === 'ArrowUp') {
        this.isInspectingTile = false;
        this.targetOrbitPitch = THREE.MathUtils.clamp(this.targetOrbitPitch + 0.1, 0.18, 1.46);
      } else if (e.key === 'ArrowDown') {
        this.isInspectingTile = false;
        this.targetOrbitPitch = THREE.MathUtils.clamp(this.targetOrbitPitch - 0.1, 0.18, 1.46);
      } else if (e.key === 'r' || e.key === 'R') {
        this.resetToPanoramic();
      }
    });

    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.orbitZoom = THREE.MathUtils.clamp(this.orbitZoom + e.deltaY * 0.00075, 0.38, 1.55);
      },
      { passive: false }
    );
  }

  public wasDragging(): boolean {
    return this.dragMoved;
  }

  /**
   * Smoothly flies the camera to inspect a clicked tile on the board (`0.65s` GSAP transition).
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

      const outX = Math.sin(ry);
      const outZ = Math.cos(ry);

      const targetLook = new THREE.Vector3(tileWorldX, 0.65, tileWorldZ);
      const targetCamPos = new THREE.Vector3(
        tileWorldX + outX * 8.6,
        7.8,
        tileWorldZ + outZ * 8.6
      );

      this.targetOrbitYaw = Math.atan2(targetCamPos.x - targetLook.x, targetCamPos.z - targetLook.z);
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
   * Smoothly glides the camera back to the panoramic island overview using current unlocked Yaw & Pitch.
   */
  public resetToPanoramic(speedMultiplier = 1): Promise<void> {
    return new Promise((resolve) => {
      this.isInspectingTile = false;
      this.isTweening = true;

      gsap.killTweensOf(this.desiredPos);
      gsap.killTweensOf(this.desiredLookAt);

      if (this.orbitZoom < 0.75) {
        this.orbitZoom = 1.0;
      }

      const radius = 34.5 * this.orbitZoom;
      const horizDist = Math.cos(this.targetOrbitPitch) * radius;
      const vertDist = Math.sin(this.targetOrbitPitch) * radius;

      const targetCamPos = new THREE.Vector3(
        Math.sin(this.targetOrbitYaw) * horizDist,
        Math.max(3.0, vertDist),
        Math.cos(this.targetOrbitYaw) * horizDist
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
   * LIVE Mode — Stage 2: Smooth 3rd-Person Chase Focus on Active Player
   */
  public focusActivePlayerLive(
    worldPos: THREE.Vector3,
    outwardRotationY: number,
    speedMultiplier = 1
  ): Promise<void> {
    this.liveFollowPos.copy(worldPos);
    this.liveOutwardYaw = outwardRotationY;
    this.liveStage = 'FOLLOW_PLAYER';

    if (this.style !== 'LIVE') {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.isInspectingTile = false;
      this.isTweening = true;
      gsap.killTweensOf(this.desiredPos);
      gsap.killTweensOf(this.desiredLookAt);

      // Smoothly unwrap yaw for corner banking
      const angleDiff = Math.atan2(
        Math.sin(outwardRotationY - this.liveSmoothedYaw),
        Math.cos(outwardRotationY - this.liveSmoothedYaw)
      );
      this.liveSmoothedYaw += angleDiff;

      const chaseAngle = this.liveSmoothedYaw - 0.42 + this.liveUserYawOffset;
      const outX = Math.sin(chaseAngle);
      const outZ = Math.cos(chaseAngle);

      const targetCamPos = new THREE.Vector3(
        worldPos.x + outX * (8.8 * this.orbitZoom),
        Math.max(2.4, (6.8 + this.liveUserPitchOffset) * this.orbitZoom),
        worldPos.z + outZ * (8.8 * this.orbitZoom)
      );

      const dur = 0.48 / Math.max(1, speedMultiplier);

      gsap.to(this.desiredLookAt, {
        x: worldPos.x,
        y: worldPos.y + 0.65,
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
    const angleDiff = Math.atan2(
      Math.sin(outwardRotationY - this.liveSmoothedYaw),
      Math.cos(outwardRotationY - this.liveSmoothedYaw)
    );
    this.liveSmoothedYaw += angleDiff * 0.35;

    const chaseAngle = this.liveSmoothedYaw - 0.42 + this.liveUserYawOffset;
    const outX = Math.sin(chaseAngle);
    const outZ = Math.cos(chaseAngle);

    this.desiredLookAt.set(worldPos.x, worldPos.y + 0.65, worldPos.z);
    this.desiredPos.set(
      worldPos.x + outX * (8.8 * this.orbitZoom),
      Math.max(2.4, (6.8 + this.liveUserPitchOffset) * this.orbitZoom),
      worldPos.z + outZ * (8.8 * this.orbitZoom)
    );
  }

  /**
   * LIVE Mode — Stage 1: Over-the-Shoulder Dice Action Shot!
   * Lowers behind the active character's shoulder looking toward the center 3D Dice Arena.
   */
  public focusDiceRoll(characterWorldPos?: THREE.Vector3, outwardRotationY?: number): void {
    if (characterWorldPos) {
      this.liveFollowPos.copy(characterWorldPos);
    }
    if (typeof outwardRotationY === 'number') {
      this.liveOutwardYaw = outwardRotationY;
    }

    if (this.style === 'LIVE') {
      this.liveStage = 'DICE_OVER_SHOULDER';
      this.isInspectingTile = false;
      this.isTweening = true;
      gsap.killTweensOf(this.desiredPos);
      gsap.killTweensOf(this.desiredLookAt);

      // Vector from center (0,0,0) toward the active character
      const p = this.liveFollowPos;
      const dist = Math.hypot(p.x, p.z) || 1;
      const dirX = p.x / dist;
      const dirZ = p.z / dist;
      // Right-hand side offset for a true over-the-shoulder framing
      const sideX = -dirZ * 1.65;
      const sideZ = dirX * 1.65;

      gsap.to(this.desiredLookAt, {
        x: 0,
        y: 1.25,
        z: 0,
        duration: 0.45,
        ease: 'power2.out'
      });

      gsap.to(this.desiredPos, {
        x: p.x + dirX * 4.2 + sideX,
        y: p.y + 3.8,
        z: p.z + dirZ * 4.2 + sideZ,
        duration: 0.45,
        ease: 'power2.out',
        onComplete: () => {
          this.isTweening = false;
        }
      });
    }
  }

  /**
   * LIVE Mode — Stage 3: Event & Transaction Close-Up!
   * Zooms in cinematically on the landed tile / building during property buy, upgrade, or parabolic '$' rent transfer.
   */
  public focusTileEventCloseUp(
    tileWorldPos: THREE.Vector3,
    outwardRotationY: number,
    speedMultiplier = 1
  ): Promise<void> {
    if (this.style !== 'LIVE') {
      return Promise.resolve();
    }

    this.liveStage = 'EVENT_CLOSEUP';
    return new Promise((resolve) => {
      this.isInspectingTile = false;
      this.isTweening = true;
      gsap.killTweensOf(this.desiredPos);
      gsap.killTweensOf(this.desiredLookAt);

      const angle = outwardRotationY + 0.28;
      const outX = Math.sin(angle);
      const outZ = Math.cos(angle);

      const dur = 0.45 / Math.max(1, speedMultiplier);

      gsap.to(this.desiredLookAt, {
        x: tileWorldPos.x,
        y: tileWorldPos.y + 0.72,
        z: tileWorldPos.z,
        duration: dur,
        ease: 'power2.out'
      });

      gsap.to(this.desiredPos, {
        x: tileWorldPos.x + outX * 6.4,
        y: tileWorldPos.y + 4.5,
        z: tileWorldPos.z + outZ * 6.4,
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
   * Cinematic camera framing for the End Portal -> Sky Jail Portal Drop Cutscene at Tile #10!
   * Transitions the camera to Tile #10 (Nhà Tù Chí Hòa) looking at mid-height (Y = 2.4) so both
   * the Overhead Sky End Portal (Y = 4.6) and the prison floor (Y = 0.59) are clearly in frame.
   */
  public focusJailSkyPortalCutscene(jailTile: TileConfig, speedMultiplier = 1): Promise<void> {
    return new Promise((resolve) => {
      this.isInspectingTile = true;
      this.isTweening = true;
      if (this.style === 'LIVE') {
        this.liveStage = 'EVENT_CLOSEUP';
      }

      gsap.killTweensOf(this.desiredPos);
      gsap.killTweensOf(this.desiredLookAt);

      const tileWorldX = jailTile.gridX * TILE_SPACING;
      const tileWorldZ = jailTile.gridZ * TILE_SPACING;
      const ry = jailTile.outwardRotationY - 0.32;
      const outX = Math.sin(ry);
      const outZ = Math.cos(ry);

      const targetLook = new THREE.Vector3(tileWorldX, 2.25, tileWorldZ);
      const targetCamPos = new THREE.Vector3(
        tileWorldX + outX * 10.8,
        6.8,
        tileWorldZ + outZ * 10.8
      );

      this.targetOrbitYaw = Math.atan2(targetCamPos.x - targetLook.x, targetCamPos.z - targetLook.z);
      this.orbitYaw = this.targetOrbitYaw;

      const dur = 0.56 / Math.max(1, speedMultiplier);

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

  public followCharacterStep(worldPos: THREE.Vector3, outwardRotationY = 0): void {
    this.liveFollowPos.copy(worldPos);
    this.liveOutwardYaw = outwardRotationY;

    if (this.style === 'LIVE') {
      this.liveStage = 'FOLLOW_PLAYER';
      this.isInspectingTile = false;
      this.isTweening = false;
      this.updateLiveCameraTargets(worldPos, outwardRotationY);
    }
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  public update(dt: number, activeCharacterWorldPos?: THREE.Vector3): void {
    const smooth = Math.min(1, dt * 9.0);
    this.orbitYaw = THREE.MathUtils.lerp(this.orbitYaw, this.targetOrbitYaw, smooth);
    this.orbitPitch = THREE.MathUtils.lerp(this.orbitPitch, this.targetOrbitPitch, smooth);

    if (this.style === 'NORMAL' && !this.isInspectingTile && !this.isTweening) {
      // Full-Island Free Spherical Orbit (Unlocked Pitch + 360° Yaw)
      const radius = 34.5 * this.orbitZoom;
      const horizDist = Math.cos(this.orbitPitch) * radius;
      const vertDist = Math.sin(this.orbitPitch) * radius;

      this.desiredPos.set(
        Math.sin(this.orbitYaw) * horizDist,
        Math.max(2.2, vertDist),
        Math.cos(this.orbitYaw) * horizDist
      );
      this.desiredLookAt.copy(this.islandCenter);
    } else if (
      this.style === 'LIVE' &&
      this.liveStage === 'FOLLOW_PLAYER' &&
      !this.isTweening &&
      activeCharacterWorldPos
    ) {
      this.liveFollowPos.copy(activeCharacterWorldPos);
      this.updateLiveCameraTargets(this.liveFollowPos, this.liveOutwardYaw);
    }

    this.camera.position.lerp(this.desiredPos, smooth);
    this.currentLookAt.lerp(this.desiredLookAt, smooth);

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      const decay = this.shakeTimer / Math.max(0.01, this.shakeDuration);
      const amp = this.shakeIntensity * decay * decay;
      this.camera.position.x += (Math.random() - 0.5) * 2 * amp;
      this.camera.position.y += (Math.random() - 0.5) * 2 * amp;
      this.camera.position.z += (Math.random() - 0.5) * 2 * amp;
    }

    this.camera.lookAt(this.currentLookAt);
  }
}
