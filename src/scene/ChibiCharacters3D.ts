import * as THREE from 'three';
import gsap from 'gsap';
import { CharacterId } from '../core/boardData';
import { ParticleSystem3D } from './ParticleSystem3D';
import { soundManager } from '../audio/SoundManager';

export interface ChibiRig {
  id: CharacterId;
  root: THREE.Group;
  visualGroup: THREE.Group;
  head: THREE.Mesh;
  body: THREE.Mesh;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  flashMaterials: THREE.MeshStandardMaterial[];
  basePhase: number;
  isStepping: boolean;
  eliminated: boolean;
}

/**
 * Generates crisp 16x16 Minecraft Pixel-Art face textures using HTML5 Canvas + NearestFilter
 */
function createCharacterFaceTexture(id: CharacterId): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * 8, y * 8, w * 8, h * 8);
  };

  if (id === 'steve') {
    px(0, 0, 8, 8, '#c68662'); // Skin base
    px(0, 0, 8, 2, '#4a2e1b'); // Hair top
    px(0, 2, 1, 1, '#4a2e1b');
    px(7, 2, 1, 1, '#4a2e1b');
    // Eyes
    px(1, 4, 1, 1, '#ffffff');
    px(2, 4, 1, 1, '#3b4cca');
    px(6, 4, 1, 1, '#ffffff');
    px(5, 4, 1, 1, '#3b4cca');
    // Nose & Smile
    px(3, 5, 2, 1, '#a96e4d');
    px(2, 6, 4, 1, '#6b3e26');
  } else if (id === 'alex') {
    px(0, 0, 8, 8, '#f3c6a5'); // Fair skin
    px(0, 0, 8, 2, '#d96b27'); // Orange hair
    px(0, 2, 2, 2, '#d96b27');
    px(6, 2, 2, 3, '#c45919'); // Side braid
    // Green eyes
    px(1, 4, 1, 1, '#ffffff');
    px(2, 4, 1, 1, '#15803d');
    px(6, 4, 1, 1, '#ffffff');
    px(5, 4, 1, 1, '#15803d');
    // Cute blush & mouth
    px(1, 5, 1, 1, '#f472b6');
    px(6, 5, 1, 1, '#f472b6');
    px(3, 6, 2, 1, '#e11d48');
  } else if (id === 'creeper') {
    px(0, 0, 8, 8, '#4ade80');
    // Pixelated green mottling
    px(0, 0, 2, 2, '#22c55e');
    px(5, 1, 2, 2, '#16a34a');
    px(1, 6, 2, 2, '#86efac');
    px(6, 5, 2, 2, '#22c55e');
    // Iconic Creeper Face
    px(1, 2, 2, 2, '#090d16');
    px(5, 2, 2, 2, '#090d16');
    px(3, 4, 2, 3, '#090d16');
    px(2, 5, 1, 2, '#090d16');
    px(5, 5, 1, 2, '#090d16');
  } else {
    // Enderman
    px(0, 0, 8, 8, '#111115');
    px(1, 1, 2, 1, '#1f1f26');
    px(5, 2, 2, 1, '#1f1f26');
    // Glowing purple eyes
    px(0, 4, 3, 1, '#f0abfc');
    px(1, 4, 1, 1, '#a855f7');
    px(5, 4, 3, 1, '#f0abfc');
    px(6, 4, 1, 1, '#a855f7');
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class ChibiCharacters3D {
  private rigs = new Map<CharacterId, ChibiRig>();
  private parentGroup = new THREE.Group();
  private particles: ParticleSystem3D;

  constructor(scene: THREE.Scene, particles: ParticleSystem3D) {
    this.particles = particles;
    this.parentGroup.name = 'ChibiCharactersGroup';
    scene.add(this.parentGroup);

    (['steve', 'alex', 'creeper', 'enderman'] as CharacterId[]).forEach((id, idx) => {
      const rig = this.buildChibiCharacterRig(id, idx);
      this.rigs.set(id, rig);
      this.parentGroup.add(rig.root);
    });
  }

  private buildChibiCharacterRig(id: CharacterId, idx: number): ChibiRig {
    const root = new THREE.Group();
    root.name = `Chibi_${id}`;

    const visualGroup = new THREE.Group();
    root.add(visualGroup);

    const flashMaterials: THREE.MeshStandardMaterial[] = [];
    const registerMat = (mat: THREE.MeshStandardMaterial) => {
      flashMaterials.push(mat);
      return mat;
    };

    const headColor =
      id === 'steve'
        ? '#c68662'
        : id === 'alex'
          ? '#d96b27'
          : id === 'creeper'
            ? '#4ade80'
            : '#111115';
    const bodyColor =
      id === 'steve'
        ? '#06b6d4'
        : id === 'alex'
          ? '#22c55e'
          : id === 'creeper'
            ? '#22c55e'
            : '#18181b';
    const legColor =
      id === 'steve'
        ? '#3b4cca'
        : id === 'alex'
          ? '#78350f'
          : id === 'creeper'
            ? '#15803d'
            : '#09090b';
    const armColor =
      id === 'steve'
        ? '#c68662'
        : id === 'alex'
          ? '#f3c6a5'
          : id === 'creeper'
            ? '#16a34a'
            : '#18181b';

    const faceTex = createCharacterFaceTexture(id);
    const sideHeadMat = registerMat(
      new THREE.MeshStandardMaterial({
        color: headColor,
        roughness: 0.55,
        metalness: 0.05
      })
    );
    const frontHeadMat = registerMat(
      new THREE.MeshStandardMaterial({
        map: faceTex,
        roughness: 0.5,
        metalness: 0.05,
        emissive: id === 'enderman' ? new THREE.Color('#9333ea') : new THREE.Color('#000000'),
        emissiveIntensity: id === 'enderman' ? 0.35 : 0
      })
    );

    // Chibi 1.2x Big Square Head (0.58 x 0.58 x 0.58)
    const headGeo = new THREE.BoxGeometry(0.58, 0.58, 0.58);
    const headMaterials = [
      sideHeadMat,
      sideHeadMat,
      sideHeadMat,
      sideHeadMat,
      frontHeadMat, // +Z front face
      sideHeadMat
    ];
    const head = new THREE.Mesh(headGeo, headMaterials);
    head.castShadow = true;
    head.receiveShadow = true;
    head.position.set(0, 0.92, 0);
    visualGroup.add(head);

    // Compact Chibi Body (0.36 x 0.38 x 0.22)
    const bodyMat = registerMat(
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6 })
    );
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.22), bodyMat);
    body.castShadow = true;
    body.position.set(0, 0.46, 0);
    visualGroup.add(body);

    // Short Arms & Legs with Pivot Joints
    const armMat = registerMat(
      new THREE.MeshStandardMaterial({ color: armColor, roughness: 0.6 })
    );
    const legMat = registerMat(
      new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.65 })
    );

    const leftArmPivot = new THREE.Group();
    const rightArmPivot = new THREE.Group();
    const leftLegPivot = new THREE.Group();
    const rightLegPivot = new THREE.Group();

    if (id === 'creeper') {
      // Creeper has 4 stubby legs at the corners
      leftLegPivot.position.set(-0.12, 0.26, 0.12);
      rightLegPivot.position.set(0.12, 0.26, 0.12);
      leftArmPivot.position.set(-0.12, 0.26, -0.12);
      rightArmPivot.position.set(0.12, 0.26, -0.12);

      const creeperFootGeo = new THREE.BoxGeometry(0.15, 0.26, 0.15);
      [leftLegPivot, rightLegPivot, leftArmPivot, rightArmPivot].forEach((piv) => {
        const foot = new THREE.Mesh(creeperFootGeo, legMat);
        foot.position.set(0, -0.13, 0);
        foot.castShadow = true;
        piv.add(foot);
        visualGroup.add(piv);
      });
    } else {
      // Humanoid Chibi (Steve, Alex, Enderman)
      leftArmPivot.position.set(-0.26, 0.62, 0);
      rightArmPivot.position.set(0.26, 0.62, 0);
      leftLegPivot.position.set(-0.1, 0.27, 0);
      rightLegPivot.position.set(0.1, 0.27, 0);

      const armGeo = new THREE.BoxGeometry(0.14, 0.32, 0.14);
      const legGeo = new THREE.BoxGeometry(0.15, 0.27, 0.15);

      const lArm = new THREE.Mesh(armGeo, armMat);
      lArm.position.set(0, -0.14, 0);
      lArm.castShadow = true;
      leftArmPivot.add(lArm);

      const rArm = new THREE.Mesh(armGeo, armMat);
      rArm.position.set(0, -0.14, 0);
      rArm.castShadow = true;
      rightArmPivot.add(rArm);

      const lLeg = new THREE.Mesh(legGeo, legMat);
      lLeg.position.set(0, -0.13, 0);
      lLeg.castShadow = true;
      leftLegPivot.add(lLeg);

      const rLeg = new THREE.Mesh(legGeo, legMat);
      rLeg.position.set(0, -0.13, 0);
      rLeg.castShadow = true;
      rightLegPivot.add(rLeg);

      visualGroup.add(leftArmPivot, rightArmPivot, leftLegPivot, rightLegPivot);
    }

    // Glowing Pedestal Base Ring under feet
    const ringColor =
      id === 'steve'
        ? '#06b6d4'
        : id === 'alex'
          ? '#22c55e'
          : id === 'creeper'
            ? '#4ade80'
            : '#a855f7';
    const ringGeo = new THREE.RingGeometry(0.24, 0.34, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.02;
    root.add(ringMesh);

    // Intrinsic XZY order ensures local Y yaw is applied first, then world X/Z tile tilt on top!
    root.rotation.order = 'XZY';
    root.userData = { characterId: id };
    root.traverse((child) => {
      child.userData = { ...child.userData, characterId: id };
    });

    return {
      id,
      root,
      visualGroup,
      head,
      body,
      leftArmPivot,
      rightArmPivot,
      leftLegPivot,
      rightLegPivot,
      flashMaterials,
      basePhase: idx * 1.4,
      isStepping: false,
      eliminated: false
    };
  }

  public getParentGroup(): THREE.Group {
    return this.parentGroup;
  }

  public getCharacterWorldPosition(id: CharacterId): THREE.Vector3 {
    const rig = this.rigs.get(id);
    return rig ? rig.root.position.clone() : new THREE.Vector3();
  }

  public placeCharacterAt(
    id: CharacterId,
    targetPos: THREE.Vector3,
    rotationY?: number,
    rotX = 0,
    rotZ = 0,
    scale = 1
  ): void {
    const rig = this.rigs.get(id);
    if (!rig) return;
    rig.root.position.copy(targetPos);
    if (typeof rotationY === 'number') {
      rig.root.rotation.y = rotationY;
    }
    rig.root.rotation.x = rotX;
    rig.root.rotation.z = rotZ;
    rig.root.scale.setScalar(scale);
  }

  /**
   * Synchronizes an idle character's position, tilt (rotX, rotZ), and scale with the tile it is standing on.
   * When a tile is clicked and elevates (+0.94Y) + tilts (~27°) toward the camera, any character standing
   * on that tile smoothly rises and tilts along with the tile!
   */
  public syncCharacterToTileTransform(
    id: CharacterId,
    tf: { position: THREE.Vector3; rotX: number; rotZ: number; scale: number }
  ): void {
    const rig = this.rigs.get(id);
    if (!rig || rig.isStepping || rig.eliminated) return;
    rig.root.position.copy(tf.position);
    rig.root.rotation.x = tf.rotX;
    rig.root.rotation.z = tf.rotZ;
    rig.root.scale.setScalar(tf.scale);
  }

  public eliminateCharacter(id: CharacterId): void {
    const rig = this.rigs.get(id);
    if (!rig || rig.eliminated) return;
    rig.eliminated = true;
    this.particles.spawnCreeperTntExplosion(rig.root.position.clone());
    gsap.to(rig.visualGroup.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 0.45,
      ease: 'back.in(2)',
      onComplete: () => {
        rig.root.visible = false;
      }
    });
  }

  public resetAllCharactersVisibility(): void {
    this.rigs.forEach((rig) => {
      rig.eliminated = false;
      rig.isStepping = false;
      rig.root.visible = true;
      rig.root.rotation.set(0, 0, 0);
      rig.root.scale.setScalar(1);
      rig.visualGroup.scale.set(1, 1, 1);
    });
  }

  /**
   * Executes 1-tile step movement with the character's signature animation AND dynamic tile tilt:
   * - steve / alex: Parabolic hop + opposite limb swing + Squash & Stretch + White dust particles
   * - enderman: Instant portal teleport + Purple portal particle burst at origin & destination
   * - creeper: Swell & flash white fuse + TNT explosion particles + respawn bounce at destination
   */
  public animateStepToTile(
    id: CharacterId,
    fromPos: THREE.Vector3,
    toPos: THREE.Vector3,
    stepIdx = 0,
    speedMultiplier = 1,
    fromTilt: { rotX: number; rotZ: number; scale: number } = { rotX: 0, rotZ: 0, scale: 1 },
    toTilt: { rotX: number; rotZ: number; scale: number } = { rotX: 0, rotZ: 0, scale: 1 }
  ): Promise<void> {
    const rig = this.rigs.get(id);
    if (!rig || rig.eliminated) return Promise.resolve();

    rig.isStepping = true;

    // Face direction of movement
    const dx = toPos.x - fromPos.x;
    const dz = toPos.z - fromPos.z;
    if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
      rig.root.rotation.y = Math.atan2(dx, dz);
    }

    const speedFactor = Math.max(1, Math.min(4.5, 1 + (speedMultiplier - 1) * 0.75));

    const donePromise =
      id === 'enderman'
        ? this.animateEndermanTeleportStep(rig, fromPos, toPos, speedFactor, fromTilt, toTilt)
        : id === 'creeper'
          ? this.animateCreeperExplosionStep(rig, fromPos, toPos, speedFactor, fromTilt, toTilt)
          : this.animateParabolaHopStep(rig, fromPos, toPos, stepIdx, speedFactor, fromTilt, toTilt);

    return donePromise.finally(() => {
      rig.isStepping = false;
    });
  }

  /**
   * 1. Steve & Alex: Parabolic Hop + Opposite Arm/Leg Swing + Squash & Stretch + White Footstep Dust
   */
  private animateParabolaHopStep(
    rig: ChibiRig,
    fromPos: THREE.Vector3,
    toPos: THREE.Vector3,
    stepIdx: number,
    speedFactor: number,
    fromTilt: { rotX: number; rotZ: number; scale: number },
    toTilt: { rotX: number; rotZ: number; scale: number }
  ): Promise<void> {
    return new Promise((resolve) => {
      soundManager.playStepBoing(stepIdx);
      const state = { t: 0 };

      gsap.to(state, {
        t: 1,
        duration: 0.34 / speedFactor,
        ease: 'power1.inOut',
        onUpdate: () => {
          const t = state.t;
          rig.root.position.x = THREE.MathUtils.lerp(fromPos.x, toPos.x, t);
          rig.root.position.z = THREE.MathUtils.lerp(fromPos.z, toPos.z, t);
          // Parabolic arc height = 0.85
          const arcY = Math.sin(t * Math.PI) * 0.85;
          rig.root.position.y = THREE.MathUtils.lerp(fromPos.y, toPos.y, t) + arcY;

          // Interpolate surface tilt & scale so passing over an elevated tilted tile tilts the character too!
          rig.root.rotation.x = THREE.MathUtils.lerp(fromTilt.rotX, toTilt.rotX, t);
          rig.root.rotation.z = THREE.MathUtils.lerp(fromTilt.rotZ, toTilt.rotZ, t);
          rig.root.scale.setScalar(THREE.MathUtils.lerp(fromTilt.scale, toTilt.scale, t));

          // Swing arms and legs in opposite directions
          const swing = Math.sin(t * Math.PI * 2) * 0.78;
          rig.leftArmPivot.rotation.x = swing;
          rig.rightArmPivot.rotation.x = -swing;
          rig.leftLegPivot.rotation.x = -swing;
          rig.rightLegPivot.rotation.x = swing;

          // Mid-air slight stretch
          rig.visualGroup.scale.set(0.93, 1.12, 0.93);
        },
        onComplete: () => {
          rig.root.position.copy(toPos);
          rig.root.rotation.x = toTilt.rotX;
          rig.root.rotation.z = toTilt.rotZ;
          rig.root.scale.setScalar(toTilt.scale);
          rig.leftArmPivot.rotation.x = 0;
          rig.rightArmPivot.rotation.x = 0;
          rig.leftLegPivot.rotation.x = 0;
          rig.rightLegPivot.rotation.x = 0;

          // Spawn white dust puff under feet upon touching the tile!
          this.particles.spawnFootstepDust(
            toPos,
            rig.id === 'alex' ? '#bbf7d0' : '#ffffff'
          );

          // Squash & Stretch on landing
          gsap.timeline({ onComplete: () => resolve() })
            .to(rig.visualGroup.scale, {
              x: 1.28,
              y: 0.7,
              z: 1.28,
              duration: 0.07 / speedFactor,
              ease: 'power2.out'
            })
            .to(rig.visualGroup.scale, {
              x: 0.94,
              y: 1.1,
              z: 0.94,
              duration: 0.08 / speedFactor,
              ease: 'power2.out'
            })
            .to(rig.visualGroup.scale, {
              x: 1,
              y: 1,
              z: 1,
              duration: 0.08 / speedFactor,
              ease: 'back.out(2)'
            });
        }
      });
    });
  }

  /**
   * 2. Enderman: Instant Teleport per tile + Purple Portal Particles at Departure & Arrival
   */
  private animateEndermanTeleportStep(
    rig: ChibiRig,
    fromPos: THREE.Vector3,
    toPos: THREE.Vector3,
    speedFactor: number,
    _fromTilt: { rotX: number; rotZ: number; scale: number },
    toTilt: { rotX: number; rotZ: number; scale: number }
  ): Promise<void> {
    return new Promise((resolve) => {
      soundManager.playEndermanTeleport();
      this.particles.spawnEndermanPortalParticles(fromPos);

      const tl = gsap.timeline({ onComplete: () => resolve() });

      // Stretch thin & vanish into subspace
      tl.to(rig.visualGroup.scale, {
        x: 0.15,
        y: 1.75,
        z: 0.15,
        duration: 0.11 / speedFactor,
        ease: 'power2.in'
      })
        .call(() => {
          // Instant teleport to next tile (matching elevated/tilted surface if any!)
          rig.root.position.copy(toPos);
          rig.root.rotation.x = toTilt.rotX;
          rig.root.rotation.z = toTilt.rotZ;
          rig.root.scale.setScalar(toTilt.scale);
          this.particles.spawnEndermanPortalParticles(toPos);
        })
        // Materialize with squash & bounce
        .to(rig.visualGroup.scale, {
          x: 1.22,
          y: 0.78,
          z: 1.22,
          duration: 0.1 / speedFactor,
          ease: 'power2.out'
        })
        .to(rig.visualGroup.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.12 / speedFactor,
          ease: 'elastic.out(1, 0.5)'
        });
    });
  }

  /**
   * 3. Creeper: Swells up + Flashes White -> Explodes like TNT -> Respawns on Next Tile!
   */
  private animateCreeperExplosionStep(
    rig: ChibiRig,
    fromPos: THREE.Vector3,
    toPos: THREE.Vector3,
    speedFactor: number,
    _fromTilt: { rotX: number; rotZ: number; scale: number },
    toTilt: { rotX: number; rotZ: number; scale: number }
  ): Promise<void> {
    return new Promise((resolve) => {
      soundManager.playCreeperStepBoom();

      // Flash white like Minecraft TNT / Creeper fuse
      const setFlash = (intensity: number) => {
        for (const mat of rig.flashMaterials) {
          mat.emissive.setHex(0xffffff);
          mat.emissiveIntensity = intensity;
        }
      };

      const tl = gsap.timeline({
        onComplete: () => {
          setFlash(0);
          resolve();
        }
      });

      // Phase 1: Swell up & flash white at current tile
      tl.call(() => setFlash(0.85))
        .to(rig.visualGroup.scale, {
          x: 1.42,
          y: 1.35,
          z: 1.42,
          duration: 0.14 / speedFactor,
          ease: 'power2.in'
        })
        // Phase 2: BOOM! Spawn TNT fire & smoke explosion at old tile, hide briefly, move to next tile
        .call(() => {
          setFlash(0);
          this.particles.spawnCreeperTntExplosion(fromPos);
          rig.visualGroup.scale.set(0.01, 0.01, 0.01);
          rig.root.position.copy(toPos);
          rig.root.rotation.x = toTilt.rotX;
          rig.root.rotation.z = toTilt.rotZ;
          rig.root.scale.setScalar(toTilt.scale);
          this.particles.spawnFootstepDust(toPos, '#86efac');
        })
        // Phase 3: Respawn pop-up at next tile!
        .to(rig.visualGroup.scale, {
          x: 1.2,
          y: 0.82,
          z: 1.2,
          duration: 0.12 / speedFactor,
          ease: 'back.out(2.5)'
        })
        .to(rig.visualGroup.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.11 / speedFactor,
          ease: 'elastic.out(1, 0.5)'
        });
    });
  }

  /**
   * UPG-02: 3D Chibi Emote Bubble & Celebration / Slump Animation
   * Properly disposes temporary CanvasTexture and SpriteMaterial (FIX-02).
   */
  public playEmoteReaction(
    id: CharacterId,
    labelText: string,
    mood: 'HAPPY' | 'SAD' | 'WAVE' | 'TAKEOVER' = 'HAPPY'
  ): void {
    const rig = this.rigs.get(id);
    if (!rig || rig.eliminated) return;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle =
        mood === 'SAD'
          ? 'rgba(127, 29, 29, 0.92)'
          : mood === 'TAKEOVER'
            ? 'rgba(88, 28, 135, 0.94)'
            : 'rgba(6, 78, 59, 0.92)';
      ctx.strokeStyle =
        mood === 'SAD' ? '#f87171' : mood === 'TAKEOVER' ? '#c084fc' : '#34d399';
      ctx.lineWidth = 4;

      ctx.beginPath();
      ctx.roundRect(12, 10, 232, 68, 22);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 28px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, 128, 45);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 30;
    sprite.scale.set(0.01, 0.01, 0.01);
    sprite.position.set(0, 1.85, 0);
    rig.root.add(sprite);

    gsap.to(sprite.scale, {
      x: 2.1,
      y: 0.78,
      z: 1,
      duration: 0.25,
      ease: 'back.out(2)'
    });

    gsap.to(sprite.position, {
      y: 2.45,
      duration: 1.35,
      ease: 'power1.out'
    });

    gsap.to(mat, {
      opacity: 0,
      delay: 0.95,
      duration: 0.4,
      onComplete: () => {
        rig.root.remove(sprite);
        texture.dispose();
        mat.dispose();
      }
    });

    // Character body pose reaction
    if (mood === 'HAPPY' || mood === 'TAKEOVER') {
      gsap.fromTo(
        rig.visualGroup.position,
        { y: 0 },
        {
          y: 0.55,
          duration: 0.18,
          yoyo: true,
          repeat: 3,
          ease: 'power1.out'
        }
      );
      gsap.fromTo(
        rig.leftArmPivot.rotation,
        { x: 0 },
        { x: -2.4, duration: 0.18, yoyo: true, repeat: 3 }
      );
      gsap.fromTo(
        rig.rightArmPivot.rotation,
        { x: 0 },
        { x: -2.4, duration: 0.18, yoyo: true, repeat: 3 }
      );
    } else if (mood === 'SAD') {
      gsap.fromTo(
        rig.visualGroup.scale,
        { x: 1, y: 1, z: 1 },
        {
          x: 1.16,
          y: 0.72,
          z: 1.16,
          duration: 0.28,
          yoyo: true,
          repeat: 1,
          ease: 'sine.inOut'
        }
      );
    } else if (mood === 'WAVE') {
      gsap.fromTo(
        rig.rightArmPivot.rotation,
        { z: 0, x: 0 },
        {
          x: -2.2,
          z: -0.45,
          duration: 0.16,
          yoyo: true,
          repeat: 3
        }
      );
    }
  }

  /** Subtle idle breathing animation for all characters */
  public updateIdle(elapsedTime: number): void {
    this.rigs.forEach((rig) => {
      const bob = Math.sin(elapsedTime * 3.2 + rig.basePhase) * 0.025;
      rig.head.position.y = 0.92 + bob;
    });
  }
}
