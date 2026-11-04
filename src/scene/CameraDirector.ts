import * as THREE from 'three';

export type CameraMode = 'AUTO_CINEMA' | 'OVERVIEW_LOCKED' | 'CLOSE_FOLLOW';

export class CameraDirector {
  public readonly camera: THREE.PerspectiveCamera;
  private mode: CameraMode = 'AUTO_CINEMA';
  private currentLookAt = new THREE.Vector3(0, 0.4, 0);
  private targetLookAt = new THREE.Vector3(0, 0.4, 0);
  private desiredPos = new THREE.Vector3(0, 14.5, 16.2);

  // Orbit user offset (drag to rotate around island)
  private orbitYaw = 0;
  private orbitZoom = 1.0;
  private isDragging = false;
  private prevMouseX = 0;

  private isTrackingStep = false;
  private isActionFocus = false;
  private trackedTarget = new THREE.Vector3();

  constructor(aspect: number, domElement: HTMLElement) {
    this.camera = new THREE.PerspectiveCamera(44, aspect, 0.1, 200);
    this.camera.position.copy(this.desiredPos);
    this.camera.lookAt(this.currentLookAt);

    this.attachPointerControls(domElement);
  }

  private attachPointerControls(el: HTMLElement): void {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.prevMouseX = e.clientX;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouseX;
      this.prevMouseX = e.clientX;
      this.orbitYaw -= dx * 0.0065;
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.orbitZoom = THREE.MathUtils.clamp(this.orbitZoom + e.deltaY * 0.0008, 0.65, 1.45);
      },
      { passive: false }
    );
  }

  public cycleMode(): CameraMode {
    if (this.mode === 'AUTO_CINEMA') {
      this.mode = 'OVERVIEW_LOCKED';
    } else if (this.mode === 'OVERVIEW_LOCKED') {
      this.mode = 'CLOSE_FOLLOW';
    } else {
      this.mode = 'AUTO_CINEMA';
    }
    return this.mode;
  }

  public getMode(): CameraMode {
    return this.mode;
  }

  public focusDiceRoll(): void {
    this.isTrackingStep = false;
    this.isActionFocus = false;
    this.targetLookAt.set(0, 0.6, 0);
  }

  public followCharacterStep(worldPos: THREE.Vector3): void {
    this.isTrackingStep = true;
    this.isActionFocus = false;
    this.trackedTarget.copy(worldPos);
  }

  public focusTileAction(worldPos: THREE.Vector3): void {
    this.isTrackingStep = false;
    this.isActionFocus = true;
    this.trackedTarget.copy(worldPos);
  }

  public returnToOverview(): void {
    this.isTrackingStep = false;
    this.isActionFocus = false;
    this.targetLookAt.set(0, 0.35, 0);
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  public update(dt: number): void {
    const smooth = Math.min(1, dt * 4.8);

    if (this.mode === 'OVERVIEW_LOCKED' || (!this.isTrackingStep && !this.isActionFocus && this.mode === 'AUTO_CINEMA')) {
      const radius = 16.5 * this.orbitZoom;
      const height = 14.2 * this.orbitZoom;
      this.desiredPos.set(
        Math.sin(this.orbitYaw) * radius,
        height,
        Math.cos(this.orbitYaw) * radius
      );
      this.targetLookAt.set(0, 0.35, 0);
    } else if (this.mode === 'CLOSE_FOLLOW' || this.isTrackingStep) {
      // Dynamic Camera: Smoothly glides along with the jumping character!
      const outDir = new THREE.Vector3(this.trackedTarget.x, 0, this.trackedTarget.z);
      if (outDir.lengthSq() < 0.01) outDir.set(0, 0, 1);
      outDir.normalize();

      this.desiredPos.set(
        this.trackedTarget.x * 0.65 + Math.sin(this.orbitYaw) * 9.5 + outDir.x * 3.8,
        8.6 * this.orbitZoom,
        this.trackedTarget.z * 0.65 + Math.cos(this.orbitYaw) * 9.5 + outDir.z * 3.8
      );
      this.targetLookAt.set(
        this.trackedTarget.x * 0.72,
        0.55,
        this.trackedTarget.z * 0.72
      );
    } else if (this.isActionFocus) {
      // Cinema Action Focus when Floating Choice Card appears
      this.desiredPos.set(
        this.trackedTarget.x * 0.55 + Math.sin(this.orbitYaw) * 10.5,
        9.4 * this.orbitZoom,
        this.trackedTarget.z * 0.55 + Math.cos(this.orbitYaw) * 10.5
      );
      this.targetLookAt.set(
        this.trackedTarget.x * 0.65,
        0.5,
        this.trackedTarget.z * 0.65
      );
    }

    this.camera.position.lerp(this.desiredPos, smooth);
    this.currentLookAt.lerp(this.targetLookAt, smooth * 1.2);
    this.camera.lookAt(this.currentLookAt);
  }
}
