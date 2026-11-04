import * as THREE from 'three';

interface VoxelParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  gravity: number;
  age: number;
  maxAge: number;
  initialScale: number;
  spinSpeed: THREE.Vector3;
}

export class ParticleSystem3D {
  private group = new THREE.Group();
  private particles: VoxelParticle[] = [];
  private unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);

  constructor(parentScene: THREE.Scene) {
    this.group.name = 'VoxelParticleSystem';
    parentScene.add(this.group);
  }

  /**
   * 1. Hạt bụi trắng nhỏ dưới chân mỗi khi Steve hoặc Alex chạm ô cờ
   */
  public spawnFootstepDust(worldPos: THREE.Vector3, accentHex = '#ffffff'): void {
    const colors = ['#ffffff', '#f8fafc', '#e2e8f0', accentHex];
    for (let i = 0; i < 10; i++) {
      const color = colors[i % colors.length];
      const mat = new THREE.MeshLambertMaterial({
        color,
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(this.unitBoxGeo, mat);
      const scale = 0.09 + Math.random() * 0.08;
      mesh.scale.setScalar(scale);

      const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.4;
      const speed = 0.8 + Math.random() * 1.1;
      mesh.position.set(
        worldPos.x + Math.cos(angle) * 0.14,
        worldPos.y + 0.08,
        worldPos.z + Math.sin(angle) * 0.14
      );

      this.group.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          0.9 + Math.random() * 0.9,
          Math.sin(angle) * speed
        ),
        gravity: -4.2,
        age: 0,
        maxAge: 0.38 + Math.random() * 0.18,
        initialScale: scale,
        spinSpeed: new THREE.Vector3(Math.random() * 5, Math.random() * 5, Math.random() * 5)
      });
    }
  }

  /**
   * 2. Hiệu ứng hạt tím không gian (Ender Portal Particles) xung quanh Enderman khi dịch chuyển
   */
  public spawnEndermanPortalParticles(worldPos: THREE.Vector3): void {
    const portalColors = ['#a855f7', '#d8b4fe', '#c084fc', '#7e22ce', '#f0abfc'];
    for (let i = 0; i < 22; i++) {
      const color = portalColors[i % portalColors.length];
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95
      });
      const mesh = new THREE.Mesh(this.unitBoxGeo, mat);
      const scale = 0.08 + Math.random() * 0.11;
      mesh.scale.setScalar(scale);

      const radius = 0.15 + Math.random() * 0.45;
      const theta = Math.random() * Math.PI * 2;
      mesh.position.set(
        worldPos.x + Math.cos(theta) * radius,
        worldPos.y + 0.2 + Math.random() * 1.0,
        worldPos.z + Math.sin(theta) * radius
      );

      this.group.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 1.6,
          1.4 + Math.random() * 1.8,
          (Math.random() - 0.5) * 1.6
        ),
        gravity: 0.6, // Floats upward like Minecraft Enderman particles!
        age: 0,
        maxAge: 0.52 + Math.random() * 0.25,
        initialScale: scale,
        spinSpeed: new THREE.Vector3(6, 8, 6)
      });
    }
  }

  /**
   * 3. Hiệu ứng phát nổ như TNT (Lửa cam/đỏ/vàng + Khói trắng/xám) khi Creeper di chuyển
   */
  public spawnCreeperTntExplosion(worldPos: THREE.Vector3): void {
    const tntColors = ['#ffffff', '#fde047', '#f97316', '#ef4444', '#52525b', '#e4e4e7'];
    for (let i = 0; i < 28; i++) {
      const color = tntColors[i % tntColors.length];
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.98
      });
      const mesh = new THREE.Mesh(this.unitBoxGeo, mat);
      const scale = 0.13 + Math.random() * 0.16;
      mesh.scale.setScalar(scale);

      mesh.position.set(
        worldPos.x + (Math.random() - 0.5) * 0.3,
        worldPos.y + 0.35 + (Math.random() - 0.5) * 0.3,
        worldPos.z + (Math.random() - 0.5) * 0.3
      );

      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        0.4 + Math.random() * 0.9,
        Math.random() - 0.5
      ).normalize();
      const speed = 2.2 + Math.random() * 3.0;

      this.group.add(mesh);
      this.particles.push({
        mesh,
        velocity: dir.multiplyScalar(speed),
        gravity: -6.5,
        age: 0,
        maxAge: 0.45 + Math.random() * 0.25,
        initialScale: scale,
        spinSpeed: new THREE.Vector3(10, 10, 10)
      });
    }
  }

  /**
   * 4. Hiệu ứng hạt lấp lánh khi công trình mọc nảy lùn phùn từ mặt đất
   */
  public spawnBuildingPopSparkles(worldPos: THREE.Vector3, tileColorHex = '#fde047'): void {
    const colors = [tileColorHex, '#fde047', '#ffffff', '#86efac'];
    for (let i = 0; i < 18; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.95
      });
      const mesh = new THREE.Mesh(this.unitBoxGeo, mat);
      const scale = 0.1 + Math.random() * 0.1;
      mesh.scale.setScalar(scale);

      const angle = (Math.PI * 2 * i) / 18;
      mesh.position.set(
        worldPos.x + Math.cos(angle) * 0.35,
        worldPos.y + 0.15,
        worldPos.z + Math.sin(angle) * 0.35
      );

      this.group.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * (1.2 + Math.random() * 1.1),
          2.0 + Math.random() * 1.8,
          Math.sin(angle) * (1.2 + Math.random() * 1.1)
        ),
        gravity: -5.0,
        age: 0,
        maxAge: 0.55 + Math.random() * 0.2,
        initialScale: scale,
        spinSpeed: new THREE.Vector3(7, 7, 7)
      });
    }
  }

  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.maxAge) {
        this.group.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y += p.gravity * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.rotation.x += p.spinSpeed.x * dt;
      p.mesh.rotation.y += p.spinSpeed.y * dt;
      p.mesh.rotation.z += p.spinSpeed.z * dt;

      const lifeRatio = 1 - p.age / p.maxAge;
      p.mesh.scale.setScalar(Math.max(0.01, p.initialScale * lifeRatio));
      const mat = p.mesh.material as THREE.MeshBasicMaterial | THREE.MeshLambertMaterial;
      mat.opacity = lifeRatio;
    }
  }
}
