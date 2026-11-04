import * as THREE from 'three';

/**
 * Fixed 45-degree overhead tilt panoramic camera with smooth 360-degree orbit rotation.
 * At a 45° tilt angle looking at the island center (0, 0.4, 0), height Y equals horizontal radius R.
 */
export class CameraDirector {
  public readonly camera: THREE.PerspectiveCamera;
  private readonly centerLookAt = new THREE.Vector3(0, 0.35, 0);
  private desiredPos = new THREE.Vector3(0, 24.5, 24.5);

  private orbitYaw = 0;
  private targetOrbitYaw = 0;
  private orbitZoom = 1.0;
  private isDragging = false;
  private dragMoved = false;
  private prevMouseX = 0;

  constructor(aspect: number, domElement: HTMLElement) {
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 300);
    this.camera.position.copy(this.desiredPos);
    this.camera.lookAt(this.centerLookAt);

    this.attachPointerControls(domElement);
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
      }
      this.prevMouseX = e.clientX;
      this.targetOrbitYaw -= dx * 0.007;
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    // Keyboard rotation support (Q/E or Left/Right Arrow)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'q' || e.key === 'Q') {
        this.targetOrbitYaw += 0.18;
      } else if (e.key === 'ArrowRight' || e.key === 'e' || e.key === 'E') {
        this.targetOrbitYaw -= 0.18;
      }
    });

    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.orbitZoom = THREE.MathUtils.clamp(this.orbitZoom + e.deltaY * 0.0007, 0.62, 1.32);
      },
      { passive: false }
    );
  }

  public wasDragging(): boolean {
    return this.dragMoved;
  }

  public focusDiceRoll(): void {
    // Camera remains fixed at 45-degree panoramic overview per user requirement #2 & #10
  }

  public followCharacterStep(_worldPos: THREE.Vector3): void {
    // Camera remains fixed at 45-degree panoramic overview per user requirement #2 & #10
  }

  public focusTileAction(_worldPos: THREE.Vector3): void {
    // Camera remains fixed at 45-degree panoramic overview per user requirement #2 & #10
  }

  public returnToOverview(): void {
    // Already in 45-degree panoramic overview
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  public update(dt: number): void {
    const smooth = Math.min(1, dt * 8.0);
    this.orbitYaw = THREE.MathUtils.lerp(this.orbitYaw, this.targetOrbitYaw, smooth);

    // True 45-degree elevation angle: Vertical height Y == Horizontal distance R
    const baseDist = 24.5 * this.orbitZoom;
    this.desiredPos.set(
      Math.sin(this.orbitYaw) * baseDist,
      baseDist, // 45° angle: Y == R
      Math.cos(this.orbitYaw) * baseDist
    );

    this.camera.position.lerp(this.desiredPos, smooth);
    this.camera.lookAt(this.centerLookAt);
  }
}
