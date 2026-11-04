import './styles/main.css';
import * as THREE from 'three';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import {
  BOARD_SIZE,
  BOARD_TILES,
  BUILDING_TIER_NAMES,
  CHARACTER_CONFIGS,
  COLOR_GROUP_ORDER,
  CharacterId,
  getExportableTilesSpecArray,
  resetBoardTilesToDefault,
  updateBoardTileConfigInPlace
} from './core/boardData';
import {
  ConfirmedRentPaymentResult,
  GameEngine,
  GameMode,
  TileResolutionResult
} from './core/gameEngine';
import { chooseBotAction } from './core/botAI';
import { soundManager } from './audio/SoundManager';
import { ParticleSystem3D } from './scene/ParticleSystem3D';
import { IslandBoard3D } from './scene/IslandBoard3D';
import { ChibiCharacters3D } from './scene/ChibiCharacters3D';
import { Dice3D } from './scene/Dice3D';
import { CameraDirector } from './scene/CameraDirector';
import { RoomSync } from './net/RoomSync';

/**
 * Draws a cute 3D Isometric Voxel Grass Block with the Chibi character standing on top of it
 * for the compact rectangular player cards!
 */
function drawCharacterOnGrassBlockAvatar(canvas: HTMLCanvasElement, charId: CharacterId): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;

  ctx.fillStyle = '#4ade80';
  ctx.beginPath();
  ctx.moveTo(cx, 44);
  ctx.lineTo(cx + 26, 55);
  ctx.lineTo(cx, 66);
  ctx.lineTo(cx - 26, 55);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#854d0e';
  ctx.beginPath();
  ctx.moveTo(cx - 26, 55);
  ctx.lineTo(cx, 66);
  ctx.lineTo(cx, 84);
  ctx.lineTo(cx - 26, 73);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.moveTo(cx - 26, 55);
  ctx.lineTo(cx, 66);
  ctx.lineTo(cx, 72);
  ctx.lineTo(cx - 26, 61);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#713f12';
  ctx.beginPath();
  ctx.moveTo(cx + 26, 55);
  ctx.lineTo(cx, 66);
  ctx.lineTo(cx, 84);
  ctx.lineTo(cx + 26, 73);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.moveTo(cx + 26, 55);
  ctx.lineTo(cx, 66);
  ctx.lineTo(cx, 72);
  ctx.lineTo(cx + 26, 61);
  ctx.closePath();
  ctx.fill();

  const palette =
    charId === 'steve'
      ? { head: '#c68662', hair: '#4a2e1b', body: '#06b6d4', legs: '#3b4cca', eyes: '#3b4cca' }
      : charId === 'alex'
        ? { head: '#f3c6a5', hair: '#d96b27', body: '#22c55e', legs: '#78350f', eyes: '#15803d' }
        : charId === 'creeper'
          ? { head: '#4ade80', hair: '#22c55e', body: '#22c55e', legs: '#15803d', eyes: '#090d16' }
          : { head: '#18181b', hair: '#09090b', body: '#18181b', legs: '#09090b', eyes: '#d8b4fe' };

  ctx.fillStyle = palette.legs;
  ctx.fillRect(cx - 8, 44, 7, 10);
  ctx.fillRect(cx + 1, 44, 7, 10);

  ctx.fillStyle = palette.body;
  ctx.fillRect(cx - 10, 31, 20, 14);

  ctx.fillStyle = palette.head;
  ctx.fillRect(cx - 14, 7, 28, 25);

  ctx.fillStyle = palette.hair;
  ctx.fillRect(cx - 14, 7, 28, 7);

  ctx.fillStyle = palette.eyes;
  if (charId === 'creeper') {
    ctx.fillRect(cx - 9, 15, 5, 5);
    ctx.fillRect(cx + 4, 15, 5, 5);
    ctx.fillRect(cx - 4, 21, 8, 6);
  } else {
    ctx.fillRect(cx - 9, 18, 5, 4);
    ctx.fillRect(cx + 4, 18, 5, 4);
  }
}

class AstroCyberrMonopolyApp {
  private engine = new GameEngine('SOLO_VS_AI', 1);
  private roomSync = new RoomSync();

  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private cameraDirector!: CameraDirector;
  private particles!: ParticleSystem3D;
  private islandBoard!: IslandBoard3D;
  private characters3D!: ChibiCharacters3D;
  private dice3D!: Dice3D;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private clock = new THREE.Clock();
  private isBusy = false;
  private selectedHumanCount = 2;
  private gameSpeedMultiplier = 1;

  // Spacebar / Pointer Hold Power Charge Bar State
  private isChargingRoll = false;
  private rollChargeRatio = 0;
  private rollChargeTimer: number | null = null;

  // Active keyboard shortcut handlers for Skip Bar & Action Modal (Space = Confirm/Buy/Skip, Esc = Cancel/Pass, B = Hostile Buyout)
  private activeModalPrimaryAction: (() => void) | null = null;
  private activeModalSecondaryAction: (() => void) | null = null;
  private activeModalBuyoutAction: (() => void) | null = null;

  // UX-03: Direct 3D Tile Picker callback (for End Portal #30 & Festival #20)
  private active3DTilePickerHandler: ((tileIndex: number) => void) | null = null;

  // FIX-03: Pointer down coordinates to distinguish 360° camera drag from intentional click
  private pointerDownClientX = 0;
  private pointerDownClientY = 0;

  // UPG-01: Dynamic Day / Sunset / Starry Night Environment Cycle
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private timeOfDayPhase: 'DAY' | 'SUNSET' | 'NIGHT' = 'DAY';

  // FEAT-05: Owner-Only Admin Studio State
  private isAdminUnlocked = false;
  private versionClickCount = 0;

  constructor() {
    this.initThreeScene();
    this.bindUIEvents();
    this.syncAllCharactersToBoard();
    this.renderHUD();
    this.startRenderLoop();
  }

  private initThreeScene(): void {
    const container = document.getElementById('canvas-container')!;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#7dd3fc');
    this.scene.fog = new THREE.FogExp2('#7dd3fc', 0.0042);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
    });

    this.hemiLight = new THREE.HemisphereLight('#ffffff', '#38bdf8', 0.98);
    this.hemiLight.position.set(0, 35, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fffbeb', 1.5);
    this.sunLight.position.set(22, 36, 24);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 110;
    const d = 24;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    this.cameraDirector = new CameraDirector(
      window.innerWidth / window.innerHeight,
      this.renderer.domElement
    );
    this.particles = new ParticleSystem3D(this.scene);
    this.islandBoard = new IslandBoard3D(this.scene, this.particles);
    this.characters3D = new ChibiCharacters3D(this.scene, this.particles);
    this.dice3D = new Dice3D(this.scene);

    this.cameraDirector.onFollowChange(() => {
      this.updateCameraFollowBanner();
      this.renderHUD();
    });

    window.addEventListener('resize', () => {
      this.cameraDirector.resize(window.innerWidth, window.innerHeight);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // FIX-03: Record pointerdown coords so dragging to rotate camera never triggers an accidental tile/character click!
    this.renderer.domElement.addEventListener('pointerdown', (ev) => {
      this.pointerDownClientX = ev.clientX;
      this.pointerDownClientY = ev.clientY;
    });

    // Click on 3D Scene:
    // 1. If clicking a 3D Character Model -> Lock camera to follow that character (with free 360° rotation)!
    // 2. If clicking Central Beacon / Courtyard Trees -> Trigger Whimsy Easter Egg (UPG-05)!
    // 3. If clicking a 3D Tile -> Either trigger active3DTilePickerHandler (UX-03) or Elevate & Tilt tile toward camera!
    this.renderer.domElement.addEventListener('click', async (ev) => {
      const dragDist = Math.hypot(
        ev.clientX - this.pointerDownClientX,
        ev.clientY - this.pointerDownClientY
      );
      if (dragDist > 5 || this.cameraDirector.wasDragging()) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.cameraDirector.camera);

      // 1. Check if user clicked on a 3D Chibi Character Model first
      const charHits = this.raycaster.intersectObjects(
        this.characters3D.getParentGroup().children,
        true
      );
      for (const hit of charHits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (obj.userData?.characterId) {
            const clickedCharId = obj.userData.characterId as CharacterId;
            const targetPlayer = this.engine
              .getPlayers()
              .find((p) => p.characterId === clickedCharId && !p.bankrupt);
            if (targetPlayer) {
              this.selectCharacterToFollow(targetPlayer.characterId);
              return;
            }
          }
          obj = obj.parent;
        }
      }

      // 2. UPG-05: Check if user clicked on Whimsy Easter Eggs (Beacon or Courtyard Trees)
      const whimsyHits = this.raycaster.intersectObjects(
        this.islandBoard.getWhimsyClickables(),
        true
      );
      if (whimsyHits.length > 0) {
        const hitObj = whimsyHits[0].object;
        if (hitObj.userData?.whimsyType === 'BEACON') {
          const beamColor = this.islandBoard.cycleBeaconBeamColor();
          this.engine.addLog(`🌈 Tháp Beacon trung tâm đổi sang ánh sáng ${beamColor.name}!`);
          this.renderHUD();
          return;
        }
        if (hitObj.userData?.whimsyType === 'TREE' && hitObj.userData?.treeGroup) {
          this.islandBoard.triggerTreeWhimsy(hitObj.userData.treeGroup);
          return;
        }
      }

      // 3. Otherwise check if user clicked on a 3D Board Tile
      const hits = this.raycaster.intersectObjects(this.islandBoard.root.children, true);
      let clickedTileIdx: number | null = null;
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (typeof obj.userData?.tileIndex === 'number') {
            clickedTileIdx = obj.userData.tileIndex;
            break;
          }
          obj = obj.parent;
        }
        if (clickedTileIdx !== null) break;
      }

      if (clickedTileIdx !== null) {
        // UX-03: If a 3D Tile Picker is active (End Portal #30 or Festival #20), trigger it directly on 3D click!
        if (this.active3DTilePickerHandler) {
          this.active3DTilePickerHandler(clickedTileIdx);
          return;
        }

        document.getElementById('tile-popup-bottom-left')!.classList.add('hidden');
        const tileCfg = this.engine.getTileConfig(clickedTileIdx);

        // Compute target camera position so the tile tilts directly toward the arriving camera angle!
        const outX = Math.sin(tileCfg.outwardRotationY);
        const outZ = Math.cos(tileCfg.outwardRotationY);
        const expectedCamPos = new THREE.Vector3(
          tileCfg.gridX * 2.22 + outX * 8.6,
          7.8,
          tileCfg.gridZ * 2.22 + outZ * 8.6
        );
        this.islandBoard.highlightTile(clickedTileIdx, expectedCamPos);

        await this.cameraDirector.flyToTile(tileCfg, this.gameSpeedMultiplier);
        this.showBottomLeftTilePopup(clickedTileIdx);
      } else {
        document.getElementById('tile-popup-bottom-left')!.classList.add('hidden');
        this.islandBoard.highlightTile(null);
        if (this.cameraDirector.getCameraStyle() === 'NORMAL') {
          this.cameraDirector.resetToPanoramic(this.gameSpeedMultiplier);
        }
      }
    });
  }

  private selectCharacterToFollow(charId: CharacterId): void {
    const players = this.engine.getPlayers();
    const targetIdx = players.findIndex((p) => p.characterId === charId && !p.bankrupt);
    if (targetIdx < 0) return;

    const targetPlayer = players[targetIdx];
    const charPos = this.characters3D.getCharacterWorldPosition(targetPlayer.characterId);
    const tileCfg = this.engine.getTileConfig(targetPlayer.position);

    document.getElementById('tile-popup-bottom-left')!.classList.add('hidden');
    this.islandBoard.highlightTile(null);

    this.cameraDirector.setFollowedCharacter(targetPlayer.characterId, charPos);
    if (this.cameraDirector.getCameraStyle() === 'LIVE') {
      this.cameraDirector.focusActivePlayerLive(
        charPos,
        tileCfg.outwardRotationY,
        this.gameSpeedMultiplier
      );
    }
    this.updateCameraFollowBanner();
    this.renderHUD();
  }

  /**
   * Cycles backward (dir = -1, Key 'A') or forward (dir = +1, Key 'D') through active non-bankrupt characters!
   */
  private cycleFollowedCharacter(dir: -1 | 1): void {
    const activePlayers = this.engine.getPlayers().filter((p) => !p.bankrupt);
    if (activePlayers.length === 0) return;

    const currentFollowedId =
      this.cameraDirector.getFollowedCharacterId() || this.engine.getCurrentPlayer().characterId;
    const curIdx = activePlayers.findIndex((p) => p.characterId === currentFollowedId);
    const nextIdx =
      curIdx < 0
        ? 0
        : (curIdx + dir + activePlayers.length) % activePlayers.length;

    this.selectCharacterToFollow(activePlayers[nextIdx].characterId);
  }

  private updateCameraFollowBanner(): void {
    const banner = document.getElementById('camera-follow-banner')!;
    const dot = document.getElementById('follow-banner-dot')!;
    const text = document.getElementById('follow-banner-text')!;

    const style = this.cameraDirector.getCameraStyle();
    const followedCharId = this.cameraDirector.getFollowedCharacterId();

    if (style === 'LIVE') {
      const targetCharId = followedCharId || this.engine.getCurrentPlayer().characterId;
      const targetPlayer =
        this.engine.getPlayers().find((p) => p.characterId === targetCharId) ||
        this.engine.getCurrentPlayer();
      const tileCfg = this.engine.getTileConfig(targetPlayer.position);

      banner.classList.remove('hidden');
      dot.classList.remove('normal-follow');
      text.textContent = `🔴 LIVE • Đang theo dõi: ${targetPlayer.name} — Ô #${targetPlayer.position} (${tileCfg.name})`;
    } else if (followedCharId) {
      const targetPlayer = this.engine
        .getPlayers()
        .find((p) => p.characterId === followedCharId);
      if (targetPlayer && !targetPlayer.bankrupt) {
        const tileCfg = this.engine.getTileConfig(targetPlayer.position);
        banner.classList.remove('hidden');
        dot.classList.add('normal-follow');
        text.textContent = `🎯 FOLLOW 360° • ${targetPlayer.name} — Ô #${targetPlayer.position} (${tileCfg.name})`;
      } else {
        banner.classList.add('hidden');
      }
    } else {
      banner.classList.add('hidden');
    }
  }

  private toggleCameraStyleQuick(): void {
    const btnCamNormal = document.getElementById('btn-cam-normal')!;
    const btnCamLive = document.getElementById('btn-cam-live')!;
    if (this.cameraDirector.getCameraStyle() === 'NORMAL') {
      btnCamLive.classList.add('active');
      btnCamNormal.classList.remove('active');
      this.cameraDirector.setCameraStyle('LIVE');
      this.focusCurrentPlayerInLiveMode();
    } else {
      btnCamNormal.classList.add('active');
      btnCamLive.classList.remove('active');
      this.cameraDirector.setCameraStyle('NORMAL');
    }
    this.updateCameraFollowBanner();
  }

  private bindUIEvents(): void {
    const btnRoll = document.getElementById('btn-roll-dice') as HTMLButtonElement;
    const btnCamNormal = document.getElementById('btn-cam-normal')!;
    const btnCamLive = document.getElementById('btn-cam-live')!;
    const btnCamReset = document.getElementById('btn-cam-reset')!;
    const btnGear = document.getElementById('btn-settings-gear')!;
    const settingsPopover = document.getElementById('settings-popover')!;
    const btnSfx = document.getElementById('btn-sfx-toggle')!;
    const btnBgm = document.getElementById('btn-bgm-toggle')!;
    const sliderVolume = document.getElementById('slider-master-volume') as HTMLInputElement;
    const sliderSpeed = document.getElementById('slider-game-speed') as HTMLInputElement;
    const btnFollowPrev = document.getElementById('btn-follow-prev')!;
    const btnFollowNext = document.getElementById('btn-follow-next')!;

    btnCamNormal.addEventListener('click', () => {
      btnCamNormal.classList.add('active');
      btnCamLive.classList.remove('active');
      this.cameraDirector.setCameraStyle('NORMAL');
      this.updateCameraFollowBanner();
    });

    btnCamLive.addEventListener('click', () => {
      btnCamLive.classList.add('active');
      btnCamNormal.classList.remove('active');
      this.cameraDirector.setCameraStyle('LIVE');
      this.focusCurrentPlayerInLiveMode();
      this.updateCameraFollowBanner();
    });

    btnCamReset.addEventListener('click', () => {
      document.getElementById('tile-popup-bottom-left')!.classList.add('hidden');
      this.islandBoard.highlightTile(null);
      if (this.cameraDirector.getCameraStyle() !== 'NORMAL') {
        btnCamNormal.classList.add('active');
        btnCamLive.classList.remove('active');
        this.cameraDirector.setCameraStyle('NORMAL');
      }
      this.cameraDirector.resetToPanoramic(this.gameSpeedMultiplier);
      this.updateCameraFollowBanner();
      this.renderHUD();
    });

    btnFollowPrev.addEventListener('click', () => {
      this.cycleFollowedCharacter(-1);
    });
    btnFollowNext.addEventListener('click', () => {
      this.cycleFollowedCharacter(1);
    });

    // Spacebar & Pointer Hold Power Charge Bar for Rolling Dice!
    const startPowerCharge = () => {
      const active = this.engine.getCurrentPlayer();
      if (
        this.isBusy ||
        active.isBot ||
        this.isChargingRoll ||
        this.engine.getWinner() ||
        this.activeModalPrimaryAction !== null
      ) {
        return;
      }
      this.isChargingRoll = true;
      this.rollChargeRatio = 0.08;
      btnRoll.classList.add('charging');
      this.updatePowerBarUI(this.rollChargeRatio);

      // In LIVE mode, Stage 1 Director Cut: Over-the-Shoulder Dice Action Shot while charging!
      const activeIdx = this.engine.getCurrentPlayerIndex();
      const standPos = this.islandBoard.getTileStandPosition(active.position, activeIdx);
      const tileCfg = this.engine.getTileConfig(active.position);
      this.cameraDirector.focusDiceRoll(standPos, tileCfg.outwardRotationY);

      this.rollChargeTimer = window.setInterval(() => {
        this.rollChargeRatio = Math.min(1.0, this.rollChargeRatio + 0.06);
        this.updatePowerBarUI(this.rollChargeRatio);
        soundManager.playPowerChargeTick(this.rollChargeRatio);
      }, 45);
    };

    const releasePowerChargeAndRoll = () => {
      if (!this.isChargingRoll) return;
      this.isChargingRoll = false;
      btnRoll.classList.remove('charging');
      if (this.rollChargeTimer !== null) {
        clearInterval(this.rollChargeTimer);
        this.rollChargeTimer = null;
      }
      const pwr = 1.0 + this.rollChargeRatio * 1.15;
      this.updatePowerBarUI(0);
      this.executeCurrentPlayerTurn(pwr);
    };

    btnRoll.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      startPowerCharge();
    });
    window.addEventListener('pointerup', () => {
      if (this.isChargingRoll) {
        releasePowerChargeAndRoll();
      }
    });

    // Global Keyboard Shortcuts:
    // - F: Quick toggle Camera Normal <-> Live
    // - A / D: Cycle backward / forward through followed characters
    // - Space: Confirm Buy / Upgrade / Pay Rent / Bankruptcy / Skip 3s Delay / Hold to Roll Dice
    // - Escape: Pass / Skip Buy / Close Tile Popup
    window.addEventListener('keydown', (e) => {
      if (
        ((e.target as HTMLElement)?.tagName === 'INPUT' ||
          (e.target as HTMLElement)?.tagName === 'TEXTAREA' ||
          (e.target as HTMLElement)?.tagName === 'SELECT') &&
        e.key !== 'Escape'
      ) {
        return;
      }

      // FEAT-05: Secret Owner Shortcut (Ctrl + Shift + E) to unlock & open the Admin 40-Tile Studio
      if (e.ctrlKey && e.shiftKey && (e.key === 'e' || e.key === 'E') && !e.repeat) {
        e.preventDefault();
        this.unlockAndOpenAdminStudio();
        return;
      }

      // FEAT-01: Press 'B' in Rent Modal to execute Hostile Buyout!
      if ((e.key === 'b' || e.key === 'B') && !e.repeat && this.activeModalBuyoutAction) {
        e.preventDefault();
        const fn = this.activeModalBuyoutAction;
        fn();
        return;
      }

      if ((e.key === 'f' || e.key === 'F') && !e.repeat) {
        e.preventDefault();
        this.toggleCameraStyleQuick();
        return;
      }

      if ((e.key === 'a' || e.key === 'A') && !e.repeat) {
        e.preventDefault();
        this.cycleFollowedCharacter(-1);
        return;
      }

      if ((e.key === 'd' || e.key === 'D') && !e.repeat) {
        e.preventDefault();
        this.cycleFollowedCharacter(1);
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (this.activeModalPrimaryAction) {
          const fn = this.activeModalPrimaryAction;
          fn();
          return;
        }
        startPowerCharge();
        return;
      }

      if (e.key === 'Escape' && !e.repeat) {
        if (this.activeModalSecondaryAction) {
          e.preventDefault();
          const fn = this.activeModalSecondaryAction;
          fn();
          return;
        }
        document.getElementById('tile-popup-bottom-left')!.classList.add('hidden');
        this.islandBoard.highlightTile(null);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        if (this.isChargingRoll) {
          e.preventDefault();
          releasePowerChargeAndRoll();
        }
      }
    });

    btnGear.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsPopover.classList.toggle('hidden');
    });

    window.addEventListener('click', (e) => {
      if (!settingsPopover.contains(e.target as Node) && e.target !== btnGear) {
        settingsPopover.classList.add('hidden');
      }
    });

    btnSfx.addEventListener('click', () => {
      const on = soundManager.toggleSfx();
      const label = document.getElementById('sfx-status-label')!;
      const sw = document.getElementById('sfx-switch-ui')!;
      label.textContent = on ? 'Đang bật' : 'Đang tắt';
      label.className = on ? 'emerald-text' : 'muted-text';
      sw.classList.toggle('on', on);
    });

    btnBgm.addEventListener('click', () => {
      const on = soundManager.toggleBgm();
      const label = document.getElementById('bgm-status-label')!;
      const sw = document.getElementById('bgm-switch-ui')!;
      label.textContent = on ? 'Đang bật' : 'Đang tắt';
      label.className = on ? 'emerald-text' : 'muted-text';
      sw.classList.toggle('on', on);
    });

    sliderVolume.addEventListener('input', () => {
      const pct = Number(sliderVolume.value);
      soundManager.setMasterVolume(pct / 100);
      document.getElementById('volume-pct-label')!.textContent = `${pct}%`;
    });

    // Game Speed Slider (1x -> 5x)
    sliderSpeed.addEventListener('input', () => {
      const spd = Number(sliderSpeed.value);
      this.gameSpeedMultiplier = spd;
      document.getElementById('speed-multiplier-label')!.textContent = `${spd}x`;
    });

    // UX-04: Reduced Motion Toggle
    const btnReducedMotion = document.getElementById('btn-reduced-motion-toggle');
    btnReducedMotion?.addEventListener('click', () => {
      const active = document.body.classList.toggle('reduced-motion');
      const label = document.getElementById('reduced-motion-status-label')!;
      const sw = document.getElementById('reduced-motion-switch-ui')!;
      label.textContent = active ? 'Đang bật' : 'Đang tắt';
      label.className = active ? 'emerald-text' : 'muted-text';
      sw.classList.toggle('on', active);
    });

    // UPG-01: Time of Day Toggle Button
    document.getElementById('btn-time-of-day')?.addEventListener('click', () => {
      const nextPhase =
        this.timeOfDayPhase === 'DAY'
          ? 'SUNSET'
          : this.timeOfDayPhase === 'SUNSET'
            ? 'NIGHT'
            : 'DAY';
      this.setEnvironmentTimeOfDay(nextPhase);
    });

    // FEAT-05: Admin Studio Setup (Unlocked via ?admin=1, localStorage flag, Ctrl+Shift+E, or 3x clicking v4.0 badge)
    this.setupOwnerAdminTileStudio();

    document.getElementById('btn-close-tile-popup')!.addEventListener('click', () => {
      document.getElementById('tile-popup-bottom-left')!.classList.add('hidden');
      this.islandBoard.highlightTile(null);
      if (
        this.cameraDirector.getCameraStyle() === 'NORMAL' &&
        !this.cameraDirector.getFollowedCharacterId()
      ) {
        this.cameraDirector.resetToPanoramic(this.gameSpeedMultiplier);
      }
    });

    const logDrawer = document.getElementById('event-log-drawer')!;
    const logArrowIcon = document.getElementById('log-drawer-arrow-icon')!;
    document.getElementById('btn-toggle-log-drawer')!.addEventListener('click', () => {
      const isCollapsed = logDrawer.classList.toggle('collapsed');
      logArrowIcon.textContent = isCollapsed ? '◀' : '▶';
    });
  }

  private updatePowerBarUI(ratio: number): void {
    const pct = Math.round(ratio * 100);
    const fill = document.getElementById('roll-power-fill');
    const label = document.getElementById('roll-power-pct');
    if (fill) fill.style.width = `${pct}%`;
    if (label) label.textContent = `${pct}%`;
  }

  private focusCurrentPlayerInLiveMode(): Promise<void> {
    const active = this.engine.getCurrentPlayer();
    const activeIdx = this.engine.getCurrentPlayerIndex();
    const standPos = this.islandBoard.getTileStandPosition(active.position, activeIdx);
    const tileCfg = this.engine.getTileConfig(active.position);
    if (this.cameraDirector.getCameraStyle() === 'LIVE') {
      this.cameraDirector.setFollowedCharacter(active.characterId, standPos);
    }
    this.updateCameraFollowBanner();
    return this.cameraDirector.focusActivePlayerLive(
      standPos,
      tileCfg.outwardRotationY,
      this.gameSpeedMultiplier
    );
  }

  private startNewGame(mode: GameMode, humanCount: number): void {
    this.isBusy = false;
    this.hideActionModal();
    this.dice3D.clearFusionFX();
    this.islandBoard.hideTargetTileBeacon();
    const humans = mode === 'SOLO_VS_AI' ? 1 : mode === 'ONLINE_ROOM' ? 4 : humanCount;
    this.engine.initGame(mode, humans, 1500);
    this.islandBoard.clearAllBuildings();
    this.characters3D.resetAllCharactersVisibility();
    this.syncAllCharactersToBoard();
    this.renderHUD();
    this.focusCurrentPlayerInLiveMode();

    if (mode === 'ONLINE_ROOM') {
      this.roomSync.broadcastState(this.engine.serialize());
    }
  }

  private syncAllCharactersToBoard(): void {
    this.engine.getPlayers().forEach((p, idx) => {
      if (p.bankrupt) {
        this.characters3D.eliminateCharacter(p.characterId);
        return;
      }
      const tf = this.islandBoard.getTileStandTransform(p.position, idx);
      const tileCfg = this.engine.getTileConfig(p.position);
      this.characters3D.placeCharacterAt(
        p.characterId,
        tf.position,
        tileCfg.outwardRotationY,
        tf.rotX,
        tf.rotZ,
        tf.scale
      );
    });
  }

  /**
   * Called every frame in the 60fps render loop so any character standing on a tile that is
   * currently elevating (+0.94Y) and tilting (~27°) toward the camera rises and tilts in lockstep!
   */
  private syncIdleCharactersToElevatedTiles(): void {
    this.engine.getPlayers().forEach((p, idx) => {
      if (p.bankrupt) return;
      const tf = this.islandBoard.getTileStandTransform(p.position, idx);
      this.characters3D.syncCharacterToTileTransform(p.characterId, tf);
    });
  }

  private syncAllBuildingsToBoard(): void {
    this.islandBoard.clearAllBuildings();
    for (const tileState of this.engine.getAllTileStates()) {
      if (tileState.ownerId && tileState.level > 0) {
        const owner = this.engine.getPlayerById(tileState.ownerId);
        this.islandBoard.updateTileBuilding(
          tileState.index,
          tileState.level,
          owner.color,
          tileState.festivalMultiplier
        );
      }
    }
  }

  /**
   * Shows the 3-second Skip Bar ONLY for Human Players (`!player.isBot`).
   * Pressing Space or clicking the Skip button immediately skips the countdown!
   */
  private waitForHumanDiceSkipConfirmation(
    d1: number,
    d2: number,
    total: number,
    isDoubles: boolean
  ): Promise<void> {
    return new Promise((resolve) => {
      const bar = document.getElementById('dice-fusion-confirm-bar')!;
      const btnConfirm = document.getElementById('btn-confirm-move-now')!;
      const secSpan = document.getElementById('fusion-countdown-sec')!;
      const doublesTag = document.getElementById('fusion-doubles-tag')!;

      document.getElementById('fusion-d1')!.textContent = `${d1}`;
      document.getElementById('fusion-d2')!.textContent = `${d2}`;
      document.getElementById('fusion-total')!.textContent = `${total} BƯỚC`;
      doublesTag.classList.toggle('hidden', !isDoubles);

      let remaining = 3;
      secSpan.textContent = `${remaining}`;
      bar.classList.remove('hidden');

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearInterval(timer);
        btnConfirm.removeEventListener('click', finish);
        this.activeModalPrimaryAction = null;
        bar.classList.add('hidden');
        this.dice3D.clearFusionFX();
        resolve();
      };

      btnConfirm.addEventListener('click', finish);
      this.activeModalPrimaryAction = finish;

      const stepMs = Math.round(1000 / Math.max(1, this.gameSpeedMultiplier));
      const timer = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          finish();
        } else {
          secSpan.textContent = `${remaining}`;
        }
      }, stepMs);
    });
  }

  /**
   * Animates a single player's HUD card when gaining or losing money (GO +$200, Chest, Tax, Buy/Upgrade)
   */
  private animateSinglePlayerCoinDeltaOnHUD(
    playerId: string,
    prevGold: number,
    newGold: number
  ): void {
    const delta = newGold - prevGold;
    if (delta === 0) {
      this.renderHUD();
      return;
    }

    this.renderHUD();
    const cardEl = document.querySelector<HTMLElement>(`[data-player-card-id="${playerId}"]`);
    const coinEl = document.querySelector<HTMLElement>(`[data-player-coin-id="${playerId}"]`);
    if (!coinEl || !cardEl) return;

    const isGain = delta > 0;
    cardEl.classList.add(isGain ? 'flash-gain' : 'flash-loss');
    coinEl.classList.add(isGain ? 'counting-up' : 'counting-down');

    const state = { u: 0 };
    gsap.to(state, {
      u: 1,
      duration: 0.65 / Math.max(1, this.gameSpeedMultiplier),
      ease: 'power1.out',
      onUpdate: () => {
        const cur = Math.round(THREE.MathUtils.lerp(prevGold, newGold, state.u));
        const sign = isGain ? '+' : '-';
        const cls = isGain ? 'plus' : 'minus';
        coinEl.innerHTML = `$${cur.toLocaleString('en-US')} <span class="coin-delta-badge ${cls}">${sign}$${Math.abs(delta)}</span>`;
      },
      onComplete: () => {
        coinEl.classList.remove('counting-up', 'counting-down');
        cardEl.classList.remove('flash-gain', 'flash-loss');
        this.renderHUD();
      }
    });
  }

  /**
   * Animates 2D parabolic flying '$' banknotes between the two player cards on the left HUD
   * AND ticks both players' coin balances unit-by-unit!
   */
  private animate2DRentTransferOnHUD(
    payerId: string,
    ownerId: string,
    payerPrevGold: number,
    payerNewGold: number,
    ownerPrevGold: number,
    ownerNewGold: number,
    rentAmount: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const payerCardEl = document.querySelector<HTMLElement>(`[data-player-card-id="${payerId}"]`);
      const ownerCardEl = document.querySelector<HTMLElement>(`[data-player-card-id="${ownerId}"]`);
      const payerCoinEl = document.querySelector<HTMLElement>(
        `[data-player-coin-id="${payerId}"]`
      );
      const ownerCoinEl = document.querySelector<HTMLElement>(
        `[data-player-coin-id="${ownerId}"]`
      );
      const overlay = document.getElementById('fx-2d-overlay');

      if (!payerCoinEl || !ownerCoinEl || !overlay) {
        this.renderHUD();
        resolve();
        return;
      }

      payerCardEl?.classList.add('flash-loss');
      ownerCardEl?.classList.add('flash-gain');
      payerCoinEl.classList.add('counting-down');
      ownerCoinEl.classList.add('counting-up');

      const fromRect = payerCoinEl.getBoundingClientRect();
      const toRect = ownerCoinEl.getBoundingClientRect();

      const startX = fromRect.left + fromRect.width * 0.65;
      const startY = fromRect.top + fromRect.height * 0.5;
      const endX = toRect.left + toRect.width * 0.65;
      const endY = toRect.top + toRect.height * 0.5;

      const billCount = 10;
      for (let i = 0; i < billCount; i++) {
        const bill = document.createElement('div');
        bill.className = 'flying-dollar-2d';
        bill.textContent = '$';
        overlay.appendChild(bill);

        const prog = { t: 0 };
        const curveOutX = 75 + (i % 3) * 18;
        gsap.to(prog, {
          t: 1,
          delay: (i * 0.045) / Math.max(1, this.gameSpeedMultiplier),
          duration: 0.62 / Math.max(1, this.gameSpeedMultiplier),
          ease: 'power1.inOut',
          onUpdate: () => {
            const u = prog.t;
            const parabola = 4 * u * (1 - u);
            const x = THREE.MathUtils.lerp(startX, endX, u) + curveOutX * parabola;
            const y = THREE.MathUtils.lerp(startY, endY, u) - 24 * parabola;
            const scale = 0.85 + 0.35 * parabola;
            bill.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
          },
          onComplete: () => {
            bill.remove();
          }
        });
      }

      const counterState = { u: 0 };
      gsap.to(counterState, {
        u: 1,
        duration: 0.88 / Math.max(1, this.gameSpeedMultiplier),
        ease: 'power1.out',
        onUpdate: () => {
          const curPayer = Math.round(
            THREE.MathUtils.lerp(payerPrevGold, payerNewGold, counterState.u)
          );
          const curOwner = Math.round(
            THREE.MathUtils.lerp(ownerPrevGold, ownerNewGold, counterState.u)
          );
          payerCoinEl.innerHTML = `$${curPayer.toLocaleString('en-US')} <span class="coin-delta-badge minus">-$${rentAmount}</span>`;
          ownerCoinEl.innerHTML = `$${curOwner.toLocaleString('en-US')} <span class="coin-delta-badge plus">+$${rentAmount}</span>`;
        },
        onComplete: () => {
          payerCoinEl.classList.remove('counting-down');
          ownerCoinEl.classList.remove('counting-up');
          payerCardEl?.classList.remove('flash-loss');
          ownerCardEl?.classList.remove('flash-gain');
          this.renderHUD();
          resolve();
        }
      });
    });
  }

  /**
   * Plays the combined 3D Parabolic '$' stream + 2D HUD unit-by-unit counter after rent confirmation!
   */
  private async playConfirmedRentTransferEffects(
    payerId: string,
    payerSlot: number,
    payRes: ConfirmedRentPaymentResult
  ): Promise<void> {
    soundManager.playPayRent();
    const payer = this.engine.getPlayerById(payerId);
    const owner = this.engine.getPlayerById(payRes.ownerId);
    const ownerSlot = this.engine
      .getPlayers()
      .findIndex((p) => p.id === payRes.ownerId);

    const payerPos3D = this.islandBoard.getTileStandPosition(payer.position, payerSlot);
    const ownerPos3D = this.islandBoard.getTileStandPosition(
      owner.position,
      Math.max(0, ownerSlot)
    );

    if (payRes.paidAmount > 0) {
      // UPG-02: Trigger 3D Chibi Emote Reactions on both Payer and Landlord!
      this.characters3D.playEmoteReaction(payer.characterId, `😭 -$${payRes.paidAmount}`, 'SAD');
      this.characters3D.playEmoteReaction(owner.characterId, `🤑 +$${payRes.paidAmount}`, 'HAPPY');

      await Promise.all([
        this.particles.spawnRentCashParabola3D(payerPos3D, ownerPos3D, this.gameSpeedMultiplier),
        this.animate2DRentTransferOnHUD(
          payer.id,
          owner.id,
          payRes.payerPrevGold,
          payRes.payerNewGold,
          payRes.ownerPrevGold,
          payRes.ownerNewGold,
          payRes.paidAmount
        )
      ]);
    }

    if (payRes.bankrupt) {
      this.characters3D.eliminateCharacter(payer.characterId);
      this.syncAllBuildingsToBoard();
      this.renderHUD();
    }
  }

  private async executeCurrentPlayerTurn(throwPower = 1.0): Promise<void> {
    if (this.isBusy || this.engine.getWinner()) return;
    this.isBusy = true;

    const player = this.engine.getCurrentPlayer();
    const playerIdx = this.engine.getCurrentPlayerIndex();
    const btnRoll = document.getElementById('btn-roll-dice') as HTMLButtonElement;
    btnRoll.disabled = true;

    // 1. LIVE Mode Stage 1: Over-the-Shoulder Dice Action Shot!
    const startStandPos = this.islandBoard.getTileStandPosition(player.position, playerIdx);
    const startTileCfg = this.engine.getTileConfig(player.position);
    this.cameraDirector.focusDiceRoll(startStandPos, startTileCfg.outwardRotationY);

    const { d1, d2, total, isDoubles } = this.engine.rollDice();
    await this.dice3D.animateRollAndFuseTotal(d1, d2, throwPower, this.gameSpeedMultiplier);

    document.getElementById('dice-last-result')!.textContent =
      `🎲 ${d1}+${d2}=${total}${isDoubles ? ' (ĐÔI!)' : ''}`;
    this.renderHUD();

    // 2. Spawn the Raised Authentic 3D Target Beacon + 9 Iron Blocks above the destination tile!
    const targetTileIdx = (player.position + total) % BOARD_SIZE;
    this.islandBoard.showTargetTileBeacon(targetTileIdx);

    // 3. ONLY show the 3-second Skip Bar for Human Players! AI moves immediately without delay!
    if (!player.isBot) {
      await this.waitForHumanDiceSkipConfirmation(d1, d2, total, isDoubles);
    } else {
      await this.delay(160 / this.gameSpeedMultiplier);
      this.dice3D.clearFusionFX();
    }

    // 4. LIVE Mode Stage 2: 3rd-Person Chase Cam with Smooth Corner Banking!
    await this.focusCurrentPlayerInLiveMode();

    for (let step = 0; step < total; step++) {
      const fromTf = this.islandBoard.getTileStandTransform(player.position, playerIdx);
      const prevGold = player.gold;
      const { newPosition, passedStart } = this.engine.stepPlayerOneTile(player.id);
      const toTf = this.islandBoard.getTileStandTransform(newPosition, playerIdx);
      const toTileCfg = this.engine.getTileConfig(newPosition);

      this.cameraDirector.followCharacterStep(toTf.position, toTileCfg.outwardRotationY);
      this.updateCameraFollowBanner();

      await this.characters3D.animateStepToTile(
        player.characterId,
        fromTf.position,
        toTf.position,
        step,
        this.gameSpeedMultiplier,
        { rotX: fromTf.rotX, rotZ: fromTf.rotZ, scale: fromTf.scale },
        { rotX: toTf.rotX, rotZ: toTf.rotZ, scale: toTf.scale }
      );

      if (passedStart) {
        soundManager.playCoinChime();
        this.animateSinglePlayerCoinDeltaOnHUD(player.id, prevGold, player.gold);
      }
    }

    this.islandBoard.hideTargetTileBeacon();

    // UPG-02: If another character is standing on the same tile, wave hello to each other!
    const coTilePlayers = this.engine
      .getPlayers()
      .filter((p) => !p.bankrupt && p.id !== player.id && p.position === player.position);
    if (coTilePlayers.length > 0) {
      this.characters3D.playEmoteReaction(player.characterId, '👋 Chào!', 'WAVE');
      this.characters3D.playEmoteReaction(coTilePlayers[0].characterId, '👋 Hi!', 'WAVE');
    }

    // 5. LIVE Mode Stage 3: Close-Up on Landed Tile / Event!
    const landedPos = this.islandBoard.getTileStandPosition(player.position, playerIdx);
    const landedCfg = this.engine.getTileConfig(player.position);
    await this.cameraDirector.focusTileEventCloseUp(
      landedPos,
      landedCfg.outwardRotationY,
      this.gameSpeedMultiplier
    );

    // 6. Resolve tile landing (with deferRentPayment: true so rent waits for confirmation!)
    this.showBottomLeftTilePopup(player.position);
    const resolution = this.engine.resolveTileLanding(player.id, { deferRentPayment: true });
    this.syncAllBuildingsToBoard();

    if (resolution.action === 'PAID_ROYAL_TAX') {
      soundManager.playPayRent();
      this.animateSinglePlayerCoinDeltaOnHUD(
        player.id,
        resolution.payerPrevGold ?? player.gold + (resolution.amount ?? 0),
        player.gold
      );
      if (player.bankrupt) {
        this.characters3D.eliminateCharacter(player.characterId);
        this.syncAllBuildingsToBoard();
      }
    } else if (resolution.action === 'CHEST_DRAWN') {
      soundManager.playCoinChime();
      this.syncAllCharactersToBoard();
      if (resolution.amount) {
        this.animateSinglePlayerCoinDeltaOnHUD(
          player.id,
          resolution.payerPrevGold ?? player.gold - resolution.amount,
          player.gold
        );
      } else {
        this.renderHUD();
      }
      if (player.bankrupt) {
        this.characters3D.eliminateCharacter(player.characterId);
        this.syncAllBuildingsToBoard();
      }
    } else {
      this.renderHUD();
    }

    const winner = this.engine.getWinner();
    if (winner) {
      this.celebrateVictory(winner.name, winner.emoji);
      return;
    }

    if (player.isBot) {
      // If Bot landed on an owned property (`PAID_RENT`), show brief rent/bankruptcy notice then execute payment & parabolic '$'
      if (resolution.action === 'PAID_RENT') {
        this.showBotRentPreviewBanner(player.name, resolution);
        await this.delay(650 / this.gameSpeedMultiplier);
        const payRes = this.engine.executeConfirmedRentPayment(player.id, resolution.tileIndex);
        this.hideActionModal();
        await this.playConfirmedRentTransferEffects(player.id, playerIdx, payRes);

        const winAfterRent = this.engine.getWinner();
        if (winAfterRent) {
          this.celebrateVictory(winAfterRent.name, winAfterRent.emoji);
          return;
        }
      } else {
        await this.delay(480 / this.gameSpeedMultiplier);
        await this.handleBotPostLanding(player.id, playerIdx);
      }

      await this.delay(380 / this.gameSpeedMultiplier);
      this.advanceToNextTurn();
    } else {
      this.showHumanActionModal(player.id, playerIdx, resolution);
    }
  }

  private showBotRentPreviewBanner(botName: string, res: TileResolutionResult): void {
    const modal = document.getElementById('floating-action-modal')!;
    const inner = document.getElementById('action-card-inner')!;
    const tileCfg = this.engine.getTileConfig(res.tileIndex);
    modal.classList.remove('hidden');

    inner.innerHTML = `
      <span class="action-card-badge" style="background:${tileCfg.colorHex};color:#0f172a">
        ${tileCfg.icon} Ô #${tileCfg.index} • Đất Của ${res.ownerName}
      </span>
      <h3 class="action-card-title">${
        res.canAffordRent ? `💸 ${botName} Trả Tiền Thuê (-$${res.amount})` : `💀 ${botName} Phá Sản!`
      }</h3>
      <p class="action-card-desc">
        <strong>${botName}</strong> đã đi vào đất <strong>${tileCfg.name}</strong> của <strong>${res.ownerName}</strong>.<br/>
        Vì <em>${res.rentReason}</em> nên phải trả <strong>$${res.amount}</strong>!
      </p>
    `;
  }

  private async handleBotPostLanding(botId: string, botSlot: number): Promise<void> {
    const bot = this.engine.getPlayerById(botId);
    if (bot.bankrupt) return;
    const decision = chooseBotAction(this.engine, botId);

    if (decision.type === 'BUY_PROPERTY') {
      const prevGold = bot.gold;
      const res = this.engine.buyProperty(botId, decision.tileIndex);
      if (res.ok) {
        const state = this.engine.getTileState(decision.tileIndex);
        this.islandBoard.updateTileBuilding(
          decision.tileIndex,
          state.level,
          bot.color,
          state.festivalMultiplier
        );
        this.animateSinglePlayerCoinDeltaOnHUD(botId, prevGold, bot.gold);
      }
    } else if (decision.type === 'UPGRADE_PROPERTY') {
      const prevGold = bot.gold;
      const res = this.engine.upgradeProperty(botId, decision.tileIndex);
      if (res.ok) {
        const state = this.engine.getTileState(decision.tileIndex);
        this.islandBoard.updateTileBuilding(
          decision.tileIndex,
          state.level,
          bot.color,
          state.festivalMultiplier
        );
        this.animateSinglePlayerCoinDeltaOnHUD(botId, prevGold, bot.gold);
      }
    } else if (decision.type === 'FESTIVAL_BOOST') {
      this.engine.applyFestivalBoost(botId, decision.tileIndex);
      const state = this.engine.getTileState(decision.tileIndex);
      this.islandBoard.updateTileBuilding(
        decision.tileIndex,
        state.level,
        bot.color,
        state.festivalMultiplier
      );
    } else if (decision.type === 'NETHER_WARP') {
      soundManager.playPortalWarp();
      const prevGold = bot.gold;
      const fromPos = this.islandBoard.getTileStandPosition(bot.position, botSlot);
      this.particles.spawnEndermanPortalParticles(fromPos);
      this.engine.warpThroughNetherPortal(botId);
      const toTf = this.islandBoard.getTileStandTransform(bot.position, botSlot);
      const tileCfg = this.engine.getTileConfig(bot.position);
      this.characters3D.placeCharacterAt(
        bot.characterId,
        toTf.position,
        tileCfg.outwardRotationY,
        toTf.rotX,
        toTf.rotZ,
        toTf.scale
      );
      this.particles.spawnEndermanPortalParticles(toTf.position);
      this.animateSinglePlayerCoinDeltaOnHUD(botId, prevGold, bot.gold);
    } else if (decision.type === 'TELEPORT_TARGET') {
      soundManager.playPortalWarp();
      const prevGold = bot.gold;
      const fromPos = this.islandBoard.getTileStandPosition(bot.position, botSlot);
      this.particles.spawnEndermanPortalParticles(fromPos);
      this.engine.teleportFromEndPortal(botId, decision.tileIndex);
      const toTf = this.islandBoard.getTileStandTransform(bot.position, botSlot);
      const tileCfg = this.engine.getTileConfig(bot.position);
      this.characters3D.placeCharacterAt(
        bot.characterId,
        toTf.position,
        tileCfg.outwardRotationY,
        toTf.rotX,
        toTf.rotZ,
        toTf.scale
      );
      this.particles.spawnEndermanPortalParticles(toTf.position);
      if (bot.gold !== prevGold) {
        this.animateSinglePlayerCoinDeltaOnHUD(botId, prevGold, bot.gold);
      }

      const secondDecision = chooseBotAction(this.engine, botId);
      if (secondDecision.type === 'BUY_PROPERTY') {
        const beforeBuy = bot.gold;
        const buyRes = this.engine.buyProperty(botId, secondDecision.tileIndex);
        if (buyRes.ok) {
          const st = this.engine.getTileState(secondDecision.tileIndex);
          this.islandBoard.updateTileBuilding(
            secondDecision.tileIndex,
            st.level,
            bot.color,
            st.festivalMultiplier
          );
          this.animateSinglePlayerCoinDeltaOnHUD(botId, beforeBuy, bot.gold);
        }
      }
    }

    this.renderHUD();
  }

  private showHumanActionModal(
    playerId: string,
    playerSlot: number,
    res: TileResolutionResult
  ): void {
    const modal = document.getElementById('floating-action-modal')!;
    const inner = document.getElementById('action-card-inner')!;
    const player = this.engine.getPlayerById(playerId);
    const tileCfg = this.engine.getTileConfig(res.tileIndex);
    const tileState = this.engine.getTileState(res.tileIndex);

    modal.classList.remove('hidden');

    // 1. Landed on an Owned Property (`PAID_RENT`): Show Reason + Amount + Confirm Payment [Space] + Hostile Buyout [B] OR Emergency Liquidation / Bankruptcy!
    if (res.action === 'PAID_RENT') {
      const rentAmount = res.amount ?? 0;
      const canAfford = player.gold >= rentAmount;
      const afterGold = Math.max(0, player.gold - rentAmount);
      const buyoutCost = this.engine.getBuyoutCost(res.tileIndex);
      const canBuyout = buyoutCost !== null && player.gold >= rentAmount + buyoutCost;
      const liquidatable = this.engine.getPlayerLiquidatableProperties(playerId);

      if (canAfford) {
        inner.innerHTML = `
          <span class="action-card-badge" style="background:${tileCfg.colorHex};color:#0f172a">
            ${tileCfg.icon} Ô #${tileCfg.index} • Đất Của ${res.ownerName}
          </span>
          <h3 class="action-card-title">💸 Thông Báo Thu Phí Lãnh Địa</h3>
          <p class="action-card-desc">
            Bạn đã đi vào đất <strong>${tileCfg.name}</strong> của <strong>${res.ownerName}</strong>.<br/>
            Vì <strong>${res.rentReason}</strong> nên bạn sẽ phải trả <strong>$${rentAmount}</strong>!
          </p>
          <div class="rent-invoice-box">
            <div class="rent-invoice-row">
              <span>Chủ sở hữu</span>
              <strong>${res.ownerName}</strong>
            </div>
            <div class="rent-invoice-row">
              <span>Số tiền thanh toán</span>
              <span class="danger-val">-$${rentAmount}</span>
            </div>
            <div class="rent-invoice-row">
              <span>Số dư sau thanh toán</span>
              <span class="emerald-val">$${afterGold.toLocaleString('en-US')}</span>
            </div>
          </div>
          <div class="action-btn-group">
            <button id="act-btn-confirm-rent" class="action-btn action-btn-buy">
              <span>💸 Xác Nhận Thanh Toán (-$${rentAmount})</span>
              <kbd class="key-hint">Space</kbd>
            </button>
            ${
              canBuyout && buyoutCost
                ? `<button id="act-btn-hostile-buyout" class="action-btn modal-btn buyout">
                     <span>⚔️ Trả Thuê & Mua Đứt Luôn (-$${rentAmount + buyoutCost})</span>
                     <kbd class="key-hint">B</kbd>
                   </button>`
                : ''
            }
          </div>
        `;
      } else {
        const liquidationHtml =
          liquidatable.length > 0
            ? `
              <div class="emergency-liquidation-box">
                <div class="emergency-liquidation-title">🏦 Thanh Lý Tài Sản Khẩn Cấp (Thu hồi 75% giá trị để cứu mạng):</div>
                ${liquidatable
                  .map(
                    (item) => `
                  <div class="liquidation-item-row">
                    <span>#${item.tileIndex} ${item.name} (Cấp ${item.level})</span>
                    <button class="btn-sell-property" data-sell-tile="${item.tileIndex}">Bán +$${item.resaleValue}</button>
                  </div>
                `
                  )
                  .join('')}
              </div>
            `
            : '';

        inner.innerHTML = `
          <span class="action-card-badge" style="background:#ef4444;color:#ffffff">
            💀 CẢNH BÁO PHÁ SẢN • THIẾU $${rentAmount - player.gold}
          </span>
          <h3 class="action-card-title">${
            liquidatable.length > 0 ? 'Thanh Lý Đất Hoặc Phá Sản!' : 'Loại Khỏi Đường Đua!'
          }</h3>
          <p class="action-card-desc">
            Bạn đã đi vào đất <strong>${tileCfg.name}</strong> của <strong>${res.ownerName}</strong>.<br/>
            Vì <strong>${res.rentReason}</strong> nên phải trả <strong>$${rentAmount}</strong>, nhưng bạn chỉ còn <strong>$${player.gold}</strong>!
          </p>
          <div class="rent-invoice-box">
            <div class="rent-invoice-row">
              <span>Khoản nợ phải trả</span>
              <span class="danger-val">$${rentAmount}</span>
            </div>
            <div class="rent-invoice-row">
              <span>Tiền mặt hiện có</span>
              <strong>$${player.gold}</strong>
            </div>
            <div class="rent-invoice-row">
              <span>Trạng thái</span>
              <span class="danger-val">💀 PHÁ SẢN & LOẠI KHỎI ĐƯỜNG ĐUA</span>
            </div>
          </div>
          ${liquidationHtml}
          <div class="action-btn-group">
            <button id="act-btn-confirm-rent" class="action-btn action-btn-bankrupt">
              <span>💀 Tuyên Bố Phá Sản & Rời Cuộc Đua</span>
              <kbd class="key-hint">Space</kbd>
            </button>
          </div>
        `;

        // FEAT-02: Bind emergency property liquidation buttons
        inner.querySelectorAll<HTMLButtonElement>('.btn-sell-property').forEach((btn) => {
          btn.addEventListener('click', () => {
            const sellIdx = Number(btn.dataset.sellTile);
            const prevGold = player.gold;
            const sold = this.engine.liquidateProperty(playerId, sellIdx);
            if (sold.ok) {
              soundManager.playCoinChime();
              this.islandBoard.updateTileBuilding(sellIdx, 0, player.color, 1);
              this.animateSinglePlayerCoinDeltaOnHUD(playerId, prevGold, player.gold);
              res.canAffordRent = player.gold >= rentAmount;
              this.showHumanActionModal(playerId, playerSlot, res);
            }
          });
        });
      }

      const doConfirmRent = async () => {
        this.hideActionModal();
        const payRes = this.engine.executeConfirmedRentPayment(playerId, res.tileIndex);
        await this.playConfirmedRentTransferEffects(playerId, playerSlot, payRes);
        this.showBottomLeftTilePopup(res.tileIndex);

        const winner = this.engine.getWinner();
        if (winner) {
          this.celebrateVictory(winner.name, winner.emoji);
          return;
        }
        this.advanceToNextTurn();
      };

      const doHostileBuyout = async () => {
        this.hideActionModal();
        const payRes = this.engine.executeConfirmedRentPayment(playerId, res.tileIndex);
        await this.playConfirmedRentTransferEffects(playerId, playerSlot, payRes);

        const prevBuyerGold = player.gold;
        const takeover = this.engine.buyoutOpponentProperty(playerId, res.tileIndex);
        if (takeover.ok) {
          soundManager.playCoinChime();
          const st = this.engine.getTileState(res.tileIndex);
          this.islandBoard.updateTileBuilding(
            res.tileIndex,
            st.level,
            player.color,
            st.festivalMultiplier
          );
          this.characters3D.playEmoteReaction(player.characterId, '⚔️ Thôn Tính!', 'TAKEOVER');
          this.animateSinglePlayerCoinDeltaOnHUD(playerId, prevBuyerGold, player.gold);
        }
        this.showBottomLeftTilePopup(res.tileIndex);
        this.advanceToNextTurn();
      };

      this.activeModalPrimaryAction = doConfirmRent;
      this.activeModalSecondaryAction = null;
      this.activeModalBuyoutAction = canBuyout ? doHostileBuyout : null;

      document.getElementById('act-btn-confirm-rent')!.addEventListener('click', doConfirmRent);
      document
        .getElementById('act-btn-hostile-buyout')
        ?.addEventListener('click', doHostileBuyout);
      return;
    }

    if (res.action === 'CAN_BUY_PROPERTY') {
      inner.innerHTML = `
        <span class="action-card-badge" style="background:${tileCfg.colorHex};color:#0f172a">
          ${tileCfg.icon} Ô #${tileCfg.index} • Chưa Có Chủ
        </span>
        <h3 class="action-card-title">${tileCfg.name}</h3>
        <p class="action-card-desc">${res.message}<br/>Khi mua sẽ mọc ngay <strong>🪵 Cọc Rào Gỗ (Cấp 1)</strong>!</p>
        <div class="action-btn-group">
          <button id="act-btn-buy" class="action-btn action-btn-buy">
            <span>🏠 Mua Đất (-$${res.amount})</span>
            <kbd class="key-hint">Space</kbd>
          </button>
          <button id="act-btn-pass" class="action-btn action-btn-skip">
            <span>Bỏ Qua</span>
            <kbd class="key-hint">Esc</kbd>
          </button>
        </div>
      `;

      const doBuy = () => {
        const prevGold = player.gold;
        const buy = this.engine.buyProperty(playerId, res.tileIndex);
        if (buy.ok) {
          const st = this.engine.getTileState(res.tileIndex);
          this.islandBoard.updateTileBuilding(
            res.tileIndex,
            st.level,
            player.color,
            st.festivalMultiplier
          );
          this.showBottomLeftTilePopup(res.tileIndex);
          this.animateSinglePlayerCoinDeltaOnHUD(playerId, prevGold, player.gold);
        }
        this.hideActionModal();
        this.advanceToNextTurn();
      };

      const doPass = () => {
        this.hideActionModal();
        this.advanceToNextTurn();
      };

      this.activeModalPrimaryAction = doBuy;
      this.activeModalSecondaryAction = doPass;

      document.getElementById('act-btn-buy')!.addEventListener('click', doBuy);
      document.getElementById('act-btn-pass')!.addEventListener('click', doPass);
      return;
    }

    if (res.action === 'CAN_UPGRADE_PROPERTY') {
      const nextTier = BUILDING_TIER_NAMES[tileState.level + 1];
      inner.innerHTML = `
        <span class="action-card-badge" style="background:${tileCfg.colorHex};color:#0f172a">
          ${tileCfg.icon} Lãnh Địa Của Bạn (Cấp ${tileState.level})
        </span>
        <h3 class="action-card-title">Nâng Cấp ${tileCfg.name}</h3>
        <p class="action-card-desc">
          Nâng cấp công trình lên <strong>${nextTier.icon} ${nextTier.name} (Cấp ${tileState.level + 1})</strong>!
        </p>
        <div class="action-btn-group">
          <button id="act-btn-upgrade" class="action-btn action-btn-upgrade">
            <span>⬆️ Nâng Cấp Nhà (-$${res.amount})</span>
            <kbd class="key-hint">Space</kbd>
          </button>
          <button id="act-btn-pass" class="action-btn action-btn-skip">
            <span>Giữ Nguyên</span>
            <kbd class="key-hint">Esc</kbd>
          </button>
        </div>
      `;

      const doUpgrade = () => {
        const prevGold = player.gold;
        const up = this.engine.upgradeProperty(playerId, res.tileIndex);
        if (up.ok) {
          const st = this.engine.getTileState(res.tileIndex);
          this.islandBoard.updateTileBuilding(
            res.tileIndex,
            st.level,
            player.color,
            st.festivalMultiplier
          );
          this.showBottomLeftTilePopup(res.tileIndex);
          this.animateSinglePlayerCoinDeltaOnHUD(playerId, prevGold, player.gold);
        }
        this.hideActionModal();
        this.advanceToNextTurn();
      };

      const doPass = () => {
        this.hideActionModal();
        this.advanceToNextTurn();
      };

      this.activeModalPrimaryAction = doUpgrade;
      this.activeModalSecondaryAction = doPass;

      document.getElementById('act-btn-upgrade')!.addEventListener('click', doUpgrade);
      document.getElementById('act-btn-pass')!.addEventListener('click', doPass);
      return;
    }

    if (res.action === 'NETHER_PORTAL_READY') {
      inner.innerHTML = `
        <span class="action-card-badge" style="background:#9333ea;color:#ffffff">🟣 Cổng Obsidian Nether (#33)</span>
        <h3 class="action-card-title">Dịch Chuyển Xuyên Không Gian Nether!</h3>
        <p class="action-card-desc">${res.message}</p>
        <div class="action-btn-group">
          <button id="act-btn-nether-warp" class="action-btn action-btn-buy">
            <span>🟣 Bước Vào Cổng Nether (+$120)</span>
            <kbd class="key-hint">Space</kbd>
          </button>
          <button id="act-btn-pass" class="action-btn action-btn-skip">
            <span>Đứng Yên</span>
            <kbd class="key-hint">Esc</kbd>
          </button>
        </div>
      `;

      const doNetherWarp = () => {
        soundManager.playPortalWarp();
        const prevGold = player.gold;
        const fromPos = this.islandBoard.getTileStandPosition(player.position, playerSlot);
        this.particles.spawnEndermanPortalParticles(fromPos);

        const warpRes = this.engine.warpThroughNetherPortal(playerId);
        const toTf = this.islandBoard.getTileStandTransform(player.position, playerSlot);
        const destCfg = this.engine.getTileConfig(player.position);
        this.characters3D.placeCharacterAt(
          player.characterId,
          toTf.position,
          destCfg.outwardRotationY,
          toTf.rotX,
          toTf.rotZ,
          toTf.scale
        );
        this.particles.spawnEndermanPortalParticles(toTf.position);
        this.animateSinglePlayerCoinDeltaOnHUD(playerId, prevGold, player.gold);

        this.showBottomLeftTilePopup(warpRes.targetTileIndex);
        const postWarpRes = this.engine.resolveTileLanding(playerId, { deferRentPayment: true });
        this.syncAllBuildingsToBoard();
        this.renderHUD();

        if (
          postWarpRes.action === 'CAN_BUY_PROPERTY' ||
          postWarpRes.action === 'CAN_UPGRADE_PROPERTY' ||
          postWarpRes.action === 'PAID_RENT'
        ) {
          this.showHumanActionModal(playerId, playerSlot, postWarpRes);
        } else {
          this.hideActionModal();
          this.advanceToNextTurn();
        }
      };

      const doStay = () => {
        this.hideActionModal();
        this.advanceToNextTurn();
      };

      this.activeModalPrimaryAction = doNetherWarp;
      this.activeModalSecondaryAction = doStay;

      document.getElementById('act-btn-nether-warp')!.addEventListener('click', doNetherWarp);
      document.getElementById('act-btn-pass')!.addEventListener('click', doStay);
      return;
    }

    if (res.action === 'CHOOSE_PORTAL_TARGET') {
      const validTargets = BOARD_TILES.filter((t) => t.index !== 30);
      this.islandBoard.setPickerHighlightTiles(validTargets.map((t) => t.index));

      const executePortalJump = (targetIdx: number) => {
        this.active3DTilePickerHandler = null;
        this.islandBoard.setPickerHighlightTiles([]);
        soundManager.playPortalWarp();
        const prevGold = player.gold;
        const fromPos = this.islandBoard.getTileStandPosition(player.position, playerSlot);
        this.particles.spawnEndermanPortalParticles(fromPos);

        this.engine.teleportFromEndPortal(playerId, targetIdx);
        const toTf = this.islandBoard.getTileStandTransform(player.position, playerSlot);
        const destCfg = this.engine.getTileConfig(player.position);
        this.characters3D.placeCharacterAt(
          player.characterId,
          toTf.position,
          destCfg.outwardRotationY,
          toTf.rotX,
          toTf.rotZ,
          toTf.scale
        );
        this.particles.spawnEndermanPortalParticles(toTf.position);
        if (player.gold !== prevGold) {
          this.animateSinglePlayerCoinDeltaOnHUD(playerId, prevGold, player.gold);
        }

        this.showBottomLeftTilePopup(targetIdx);
        const postPortalRes = this.engine.resolveTileLanding(playerId, {
          deferRentPayment: true
        });
        this.syncAllBuildingsToBoard();
        this.renderHUD();

        if (
          postPortalRes.action === 'CAN_BUY_PROPERTY' ||
          postPortalRes.action === 'CAN_UPGRADE_PROPERTY' ||
          postPortalRes.action === 'PAID_RENT'
        ) {
          this.showHumanActionModal(playerId, playerSlot, postPortalRes);
        } else {
          this.hideActionModal();
          this.advanceToNextTurn();
        }
      };

      // UX-03: Allow clicking any 3D tile directly on the board!
      this.active3DTilePickerHandler = (clickedIdx: number) => {
        if (clickedIdx !== 30) {
          executePortalJump(clickedIdx);
        }
      };

      const tileButtonsHtml = validTargets
        .map(
          (t) =>
            `<button class="portal-tile-btn" data-target="${t.index}">#${t.index} ${t.icon} ${t.name.split(' ').slice(0, 2).join(' ')}</button>`
        )
        .join('');

      inner.innerHTML = `
        <span class="action-card-badge" style="background:#9333ea;color:#ffffff">🌌 Cổng Dịch Chuyển The End (12 Khung)</span>
        <h3 class="action-card-title">Click Ô 3D Bất Kỳ Hoặc Chọn Nhanh!</h3>
        <p class="action-card-desc">💡 <strong>Mẹo:</strong> Bạn có thể click trực tiếp lên ô đất 3D đang phát sáng trên bàn cờ hoặc chọn bên dưới!</p>
        <div class="portal-grid">${tileButtonsHtml}</div>
      `;

      inner.querySelectorAll<HTMLButtonElement>('.portal-tile-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          executePortalJump(Number(btn.dataset.target || 0));
        });
      });
      return;
    }

    if (res.action === 'CHOOSE_FESTIVAL_TILE') {
      const owned = this.engine.getAllTileStates().filter((t) => t.ownerId === playerId);
      if (owned.length === 0) {
        const prevGold = player.gold;
        player.gold += 80;
        soundManager.playCoinChime();
        this.animateSinglePlayerCoinDeltaOnHUD(playerId, prevGold, player.gold);
      } else {
        this.islandBoard.setPickerHighlightTiles(owned.map((o) => o.index));

        const executeFest = (idx: number) => {
          this.active3DTilePickerHandler = null;
          this.islandBoard.setPickerHighlightTiles([]);
          this.engine.applyFestivalBoost(playerId, idx);
          const st = this.engine.getTileState(idx);
          this.islandBoard.updateTileBuilding(idx, st.level, player.color, st.festivalMultiplier);
          this.renderHUD();
          this.hideActionModal();
          this.advanceToNextTurn();
        };

        this.active3DTilePickerHandler = (clickedIdx: number) => {
          if (owned.some((o) => o.index === clickedIdx)) {
            executeFest(clickedIdx);
          }
        };

        const ownedButtons = owned
          .map((st) => {
            const cfg = this.engine.getTileConfig(st.index);
            return `<button class="portal-tile-btn" data-fest="${st.index}">${cfg.icon} ${cfg.name} ($${this.engine.calculateRent(st.index)})</button>`;
          })
          .join('');

        inner.innerHTML = `
          <span class="action-card-badge" style="background:#ec4899;color:#ffffff">🎉 Đại Tiệc Lễ Hội Thành Phố</span>
          <h3 class="action-card-title">Nhân Đôi (x2) Tiền Thuê Đất!</h3>
          <p class="action-card-desc">Click trực tiếp vào ô đất 3D đang phát sáng của bạn hoặc chọn dưới đây:</p>
          <div class="portal-grid">${ownedButtons}</div>
        `;

        inner.querySelectorAll<HTMLButtonElement>('.portal-tile-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            executeFest(Number(btn.dataset.fest || 0));
          });
        });
        return;
      }
    }

    inner.innerHTML = `
      <span class="action-card-badge" style="background:${tileCfg.colorHex};color:#0f172a">
        ${tileCfg.icon} Ô #${tileCfg.index} • ${tileCfg.name}
      </span>
      <h3 class="action-card-title">${
        res.action === 'CHEST_DRAWN'
          ? '🧰 Mở Rương Sự Kiện Đô Thị!'
          : res.action === 'SKIP_TURN_SET'
            ? '🏝️ Tạm Giữ Tại Đảo Cách Ly (Mất 1 Lượt)!'
            : tileCfg.name
      }</h3>
      <p class="action-card-desc">${res.message}</p>
      <div class="action-btn-group">
        <button id="act-btn-continue" class="action-btn action-btn-buy">
          <span>Tiếp Tục Lượt Kế ➡️</span>
          <kbd class="key-hint">Space</kbd>
        </button>
      </div>
    `;

    const doContinue = () => {
      this.hideActionModal();
      this.advanceToNextTurn();
    };

    this.activeModalPrimaryAction = doContinue;
    this.activeModalSecondaryAction = doContinue;

    document.getElementById('act-btn-continue')!.addEventListener('click', doContinue);
  }

  private hideActionModal(): void {
    this.activeModalPrimaryAction = null;
    this.activeModalSecondaryAction = null;
    this.activeModalBuyoutAction = null;
    this.active3DTilePickerHandler = null;
    this.islandBoard.setPickerHighlightTiles([]);
    document.getElementById('floating-action-modal')!.classList.add('hidden');
  }

  private advanceToNextTurn(): void {
    if (this.engine.getWinner()) return;

    const prevRound = this.engine.getRound();
    const current = this.engine.getCurrentPlayer();
    let activePlayer = current;
    if (this.engine.canTakeExtraDoublesTurn()) {
      soundManager.playCoinChime();
    } else {
      const next = this.engine.nextTurn();
      activePlayer = next.activePlayer;
    }

    // UPG-01: Automatically transition Day -> Sunset -> Starry Night every 3 rounds!
    const newRound = this.engine.getRound();
    if (newRound !== prevRound && newRound % 3 === 1) {
      const nextPhase =
        this.timeOfDayPhase === 'DAY'
          ? 'SUNSET'
          : this.timeOfDayPhase === 'SUNSET'
            ? 'NIGHT'
            : 'DAY';
      this.setEnvironmentTimeOfDay(nextPhase);
    }

    this.isBusy = false;
    this.renderHUD();
    this.focusCurrentPlayerInLiveMode();

    if (this.engine.getMode() === 'ONLINE_ROOM') {
      this.roomSync.broadcastState(this.engine.serialize());
    }

    if (activePlayer.isBot) {
      const btnRoll = document.getElementById('btn-roll-dice') as HTMLButtonElement;
      btnRoll.disabled = true;
      window.setTimeout(() => {
        this.executeCurrentPlayerTurn(1.1);
      }, Math.round(620 / this.gameSpeedMultiplier));
    }
  }

  private celebrateVictory(winnerName: string, emoji: string): void {
    soundManager.playVictoryFireworks();
    confetti({
      particleCount: 150,
      spread: 95,
      origin: { y: 0.55 }
    });

    const modal = document.getElementById('floating-action-modal')!;
    const inner = document.getElementById('action-card-inner')!;
    modal.classList.remove('hidden');
    inner.innerHTML = `
      <span class="action-card-badge" style="background:#10b981;color:#0f172a">🏆 NHÀ VÔ ĐỊCH ĐÔ THỊ 40 Ô</span>
      <h3 class="action-card-title">${emoji} ${winnerName} Chiến Thắng!</h3>
      <p class="action-card-desc">Chúc mừng Tỷ Phú Voxel mới của vương quốc AstroCyberr Monopoly!</p>
      <div class="action-btn-group">
        <button id="act-btn-restart" class="action-btn action-btn-buy">
          <span>🔄 Chơi Lại Ván Mới</span>
          <kbd class="key-hint">Space</kbd>
        </button>
      </div>
    `;

    const doRestart = () => {
      this.startNewGame(this.engine.getMode(), this.selectedHumanCount);
    };
    this.activeModalPrimaryAction = doRestart;
    document.getElementById('act-btn-restart')!.addEventListener('click', doRestart);
  }

  /**
   * Renders ONLY the explicitly configured properties from `src/config/tilesConfig.ts`
   * without generating unrelated filler text!
   */
  private showBottomLeftTilePopup(tileIndex: number): void {
    const popup = document.getElementById('tile-popup-bottom-left')!;
    const header = document.getElementById('tile-popup-header')!;
    const iconEl = document.getElementById('tile-popup-icon')!;
    const titleEl = document.getElementById('tile-popup-title')!;
    const bodyEl = document.getElementById('tile-popup-body')!;

    const cfg = this.engine.getTileConfig(tileIndex % BOARD_SIZE);
    const st = this.engine.getTileState(tileIndex % BOARD_SIZE);
    const owner = st.ownerId ? this.engine.getPlayerById(st.ownerId) : null;

    header.style.background = cfg.colorHex;
    iconEl.textContent = cfg.icon;
    titleEl.textContent = `#${cfg.index} ${cfg.name}`;

    const rows: string[] = [];

    if (typeof cfg.price === 'number') {
      const label = cfg.type === 'ROYAL_TAX' ? 'Mức thuế' : 'Giá mua';
      const val =
        cfg.type === 'ROYAL_TAX'
          ? `<span class="popup-v-val" style="color:#f87171">-$${cfg.price}</span>`
          : `<span class="popup-v-val emerald">$${cfg.price}</span>`;
      rows.push(`<div class="popup-v-row"><span class="popup-v-label">${label}</span>${val}</div>`);
    }

    if (typeof cfg.upgradeCost === 'number') {
      rows.push(`
        <div class="popup-v-row">
          <span class="popup-v-label">Phí nâng cấp</span>
          <span class="popup-v-val emerald">$${cfg.upgradeCost}</span>
        </div>
      `);
    }

    if (cfg.rents && cfg.rents.length > 0) {
      const currentRent = st.ownerId ? this.engine.calculateRent(cfg.index) : cfg.rents[0];
      rows.push(`
        <div class="popup-v-row">
          <span class="popup-v-label">Tiền thuê hiện tại</span>
          <span class="popup-v-val emerald">$${currentRent}${
            st.festivalMultiplier > 1 ? ` (x${st.festivalMultiplier})` : ''
          }</span>
        </div>
        <div class="popup-v-row">
          <span class="popup-v-label">Bảng giá thuê</span>
          <span class="popup-v-val">$${cfg.rents.join(' / $')}</span>
        </div>
      `);
    }

    if (cfg.type === 'PROPERTY' || cfg.type === 'RAILROAD' || cfg.type === 'UTILITY') {
      rows.push(`
        <div class="popup-v-row">
          <span class="popup-v-label">Chủ sở hữu</span>
          <span class="popup-v-val">${owner ? `${owner.emoji} ${owner.name}` : 'Chưa có chủ'}</span>
        </div>
      `);
    }

    if (cfg.rentReason) {
      rows.push(`
        <div class="popup-v-row">
          <span class="popup-v-label">Lý do thu phí</span>
          <span class="popup-v-val" style="text-align:right;max-width:155px">${cfg.rentReason}</span>
        </div>
      `);
    }

    rows.push(`<div class="popup-v-desc">${cfg.description}</div>`);

    bodyEl.innerHTML = rows.join('');
    popup.classList.remove('hidden');
  }

  private renderHUD(): void {
    const active = this.engine.getCurrentPlayer();
    const followedCharId = this.cameraDirector?.getFollowedCharacterId() ?? null;

    document.getElementById('round-counter')!.textContent = `VÒNG ${this.engine.getRound()}`;
    document.getElementById('active-player-banner')!.textContent =
      `Lượt: ${active.name.toUpperCase()}`;

    const btnRoll = document.getElementById('btn-roll-dice') as HTMLButtonElement;
    btnRoll.disabled = this.isBusy || active.isBot;
    document.getElementById('btn-roll-text')!.textContent = active.isBot
      ? `${active.name} ĐANG ĐI...`
      : 'TUNG XÚC XẮC';

    const sidebar = document.getElementById('players-sidebar')!;
    sidebar.innerHTML = this.engine
      .getPlayers()
      .map((p) => {
        const isCurrent = p.id === active.id && !p.bankrupt;
        const isFollowed = followedCharId === p.characterId && !p.bankrupt;
        const charCfg = CHARACTER_CONFIGS.find((c) => c.id === p.characterId);

        const statusPills: string[] = [];
        if (p.bankrupt) {
          statusPills.push(`<span class="status-pill status-pill-bankrupt">💀 PHÁ SẢN • LOẠI</span>`);
        } else {
          if (charCfg) {
            statusPills.push(
              `<span class="status-pill status-pill-passive" title="${charCfg.passiveDescription}">${charCfg.passiveName}</span>`
            );
          }
          if (p.skipTurns > 0) {
            statusPills.push(
              `<span class="status-pill status-pill-skip">🏝️ Mất ${p.skipTurns} lượt</span>`
            );
          }
          if (isFollowed) {
            statusPills.push(`<span class="status-pill status-pill-followed">🎯 ĐANG FOLLOW</span>`);
          }
        }

        // UX-02: 8 Color Group Ownership Dots (lights up when owning at least 1 tile; gold glow when Monopoly set completed!)
        const colorDotsHtml = COLOR_GROUP_ORDER.map((grp) => {
          const own = this.engine.getPlayerColorGroupOwnership(p.id, grp.id);
          const cls = own.isMonopoly ? 'monopoly' : own.ownedCount > 0 ? 'owned' : '';
          return `<span class="color-group-dot ${cls}" style="--dot-color:${grp.hex}" title="${grp.label}: ${own.ownedCount}/${own.totalCount} ô${own.isMonopoly ? ' (ĐỘC QUYỀN x1.5!)' : ''}"></span>`;
        }).join('');

        return `
          <div
            class="player-rect-card ${isCurrent ? 'active-turn' : ''} ${p.bankrupt ? 'bankrupt' : ''} ${isFollowed ? 'followed-target' : ''}"
            data-player-card-id="${p.id}"
            data-player-char-id="${p.characterId}"
            title="Click để Camera theo dõi ${p.name} (Hoặc bấm phím A / D) • ${charCfg?.passiveDescription ?? ''}"
          >
            ${isCurrent ? '<span class="active-turn-pill">▶ ĐANG ĐI</span>' : ''}
            <canvas
              class="player-grass-avatar-canvas"
              width="76"
              height="88"
              data-char-avatar="${p.characterId}"
            ></canvas>
            <div class="player-rect-info">
              <div class="player-rect-name">${p.name}</div>
              <div class="player-rect-coin" data-player-coin-id="${p.id}">$${p.gold.toLocaleString('en-US')}</div>
              <div class="player-color-dots-row">${colorDotsHtml}</div>
              ${
                statusPills.length > 0
                  ? `<div class="player-status-row">${statusPills.join('')}</div>`
                  : ''
              }
            </div>
          </div>
        `;
      })
      .join('');

    sidebar
      .querySelectorAll<HTMLCanvasElement>('canvas[data-char-avatar]')
      .forEach((canvas) => {
        const charId = canvas.dataset.charAvatar as CharacterId;
        drawCharacterOnGrassBlockAvatar(canvas, charId);
      });

    // Clicking any player card in the left sidebar follows that character!
    sidebar.querySelectorAll<HTMLElement>('.player-rect-card').forEach((card) => {
      card.addEventListener('click', () => {
        const charId = card.dataset.playerCharId as CharacterId;
        if (charId) {
          this.selectCharacterToFollow(charId);
        }
      });
    });

    const logContainer = document.getElementById('event-log-list')!;
    logContainer.innerHTML = this.engine
      .getLogs()
      .slice(0, 28)
      .map((item) => `<div class="log-item">${item}</div>`)
      .join('');
  }

  /**
   * UPG-01: Dynamic Day -> Sunset -> Starry Night Environment Cycle
   */
  private setEnvironmentTimeOfDay(phase: 'DAY' | 'SUNSET' | 'NIGHT'): void {
    this.timeOfDayPhase = phase;
    const pill = document.getElementById('btn-time-of-day');

    if (phase === 'DAY') {
      if (pill) pill.textContent = '☀️ Ngày';
      this.scene.background = new THREE.Color('#7dd3fc');
      this.scene.fog = new THREE.FogExp2('#7dd3fc', 0.0042);
      this.hemiLight.color.set('#ffffff');
      this.hemiLight.groundColor.set('#38bdf8');
      this.hemiLight.intensity = 0.98;
      this.sunLight.color.set('#fffbeb');
      this.sunLight.intensity = 1.5;
    } else if (phase === 'SUNSET') {
      if (pill) pill.textContent = '🌅 Hoàng Hôn';
      this.scene.background = new THREE.Color('#fb923c');
      this.scene.fog = new THREE.FogExp2('#f97316', 0.0048);
      this.hemiLight.color.set('#fed7aa');
      this.hemiLight.groundColor.set('#7c2d12');
      this.hemiLight.intensity = 0.82;
      this.sunLight.color.set('#fdba74');
      this.sunLight.intensity = 1.25;
    } else {
      if (pill) pill.textContent = '🌙 Đêm Sao';
      this.scene.background = new THREE.Color('#0f172a');
      this.scene.fog = new THREE.FogExp2('#0f172a', 0.0052);
      this.hemiLight.color.set('#818cf8');
      this.hemiLight.groundColor.set('#1e1b4b');
      this.hemiLight.intensity = 0.55;
      this.sunLight.color.set('#c7d2fe');
      this.sunLight.intensity = 0.72;
    }
  }

  /**
   * FEAT-05: Owner-Only 40-Tile Studio & JSON Exporter
   * Protected by Method 1: WebCrypto SHA-256 Passcode Hash + Secret Shortcut (Ctrl+Shift+E)
   */
  private static readonly OWNER_PIN_SHA256_HASH =
    '59c01efdcf1b63e7709325d63183f1b0e03e01c8afca97a49904919e0b942bd2';

  private async computeSha256Hex(rawText: string): Promise<string> {
    const encoded = new TextEncoder().encode(rawText);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private setupOwnerAdminTileStudio(): void {
    const savedHash = window.sessionStorage.getItem('astrocyberr_owner_sha256');
    if (savedHash === AstroCyberrMonopolyApp.OWNER_PIN_SHA256_HASH) {
      this.isAdminUnlocked = true;
      document.getElementById('btn-open-admin-studio')?.classList.remove('hidden');
    }

    // Secret 3-click on the "v4.0" version badge inside Settings Popover triggers SHA-256 PIN Gate
    const versionBadge = document.querySelector('.popover-version');
    versionBadge?.addEventListener('click', () => {
      this.versionClickCount += 1;
      if (this.versionClickCount >= 3) {
        this.versionClickCount = 0;
        this.unlockAndOpenAdminStudio();
      }
    });

    document.getElementById('btn-open-admin-studio')?.addEventListener('click', () => {
      this.unlockAndOpenAdminStudio();
    });

    document.getElementById('btn-close-pin-gate')?.addEventListener('click', () => {
      document.getElementById('admin-pin-gate-modal')?.classList.add('hidden');
    });

    const verifyPinAndOpen = async () => {
      const pinInput = document.getElementById('admin-pin-input') as HTMLInputElement | null;
      const errEl = document.getElementById('admin-pin-error');
      if (!pinInput) return;

      const digest = await this.computeSha256Hex(pinInput.value.trim());
      if (digest === AstroCyberrMonopolyApp.OWNER_PIN_SHA256_HASH) {
        this.isAdminUnlocked = true;
        window.sessionStorage.setItem('astrocyberr_owner_sha256', digest);
        pinInput.value = '';
        if (errEl) errEl.style.display = 'none';
        document.getElementById('admin-pin-gate-modal')?.classList.add('hidden');
        document.getElementById('btn-open-admin-studio')?.classList.remove('hidden');
        document.getElementById('admin-tile-editor-modal')?.classList.remove('hidden');
        soundManager.playCoinChime();
      } else {
        soundManager.playPayRent();
        if (errEl) errEl.style.display = 'block';
      }
    };

    document.getElementById('btn-submit-pin-gate')?.addEventListener('click', () => {
      verifyPinAndOpen();
    });

    document.getElementById('admin-pin-input')?.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        verifyPinAndOpen();
      }
    });

    document.getElementById('btn-close-admin-studio')?.addEventListener('click', () => {
      document.getElementById('admin-tile-editor-modal')?.classList.add('hidden');
    });

    document.getElementById('btn-admin-lock-studio')?.addEventListener('click', () => {
      this.isAdminUnlocked = false;
      window.sessionStorage.removeItem('astrocyberr_owner_sha256');
      document.getElementById('btn-open-admin-studio')?.classList.add('hidden');
      document.getElementById('admin-tile-editor-modal')?.classList.add('hidden');
    });

    const selectEl = document.getElementById('admin-select-tile') as HTMLSelectElement | null;
    if (!selectEl) return;

    const populateSelect = (selectedIdx = 0) => {
      selectEl.innerHTML = BOARD_TILES.map(
        (t) => `<option value="${t.index}">#${t.index} ${t.icon} ${t.name} (${t.type})</option>`
      ).join('');
      selectEl.value = `${selectedIdx}`;
    };

    const loadTileIntoForm = (idx: number) => {
      const t = BOARD_TILES[idx];
      if (!t) return;
      (document.getElementById('admin-tile-name') as HTMLInputElement).value = t.name;
      (document.getElementById('admin-tile-icon') as HTMLInputElement).value = t.icon;
      (document.getElementById('admin-tile-price') as HTMLInputElement).value =
        typeof t.price === 'number' ? `${t.price}` : '';
      (document.getElementById('admin-tile-upgrade') as HTMLInputElement).value =
        typeof t.upgradeCost === 'number' ? `${t.upgradeCost}` : '';
      (document.getElementById('admin-tile-color') as HTMLInputElement).value = t.colorHex;
      (document.getElementById('admin-rent-0') as HTMLInputElement).value = t.rents
        ? `${t.rents[0]}`
        : '';
      (document.getElementById('admin-rent-1') as HTMLInputElement).value = t.rents
        ? `${t.rents[1]}`
        : '';
      (document.getElementById('admin-rent-2') as HTMLInputElement).value = t.rents
        ? `${t.rents[2]}`
        : '';
      (document.getElementById('admin-rent-3') as HTMLInputElement).value = t.rents
        ? `${t.rents[3]}`
        : '';
      (document.getElementById('admin-tile-reason') as HTMLInputElement).value =
        t.rentReason ?? '';
      (document.getElementById('admin-tile-desc') as HTMLTextAreaElement).value = t.description;
    };

    populateSelect(0);
    loadTileIntoForm(0);

    selectEl.addEventListener('change', () => {
      loadTileIntoForm(Number(selectEl.value));
    });

    document.getElementById('btn-admin-save-tile')?.addEventListener('click', () => {
      const idx = Number(selectEl.value);
      const name = (document.getElementById('admin-tile-name') as HTMLInputElement).value.trim();
      const icon = (document.getElementById('admin-tile-icon') as HTMLInputElement).value.trim();
      const priceVal = (document.getElementById('admin-tile-price') as HTMLInputElement).value;
      const upVal = (document.getElementById('admin-tile-upgrade') as HTMLInputElement).value;
      const colorHex = (document.getElementById('admin-tile-color') as HTMLInputElement).value.trim();
      const r0 = Number((document.getElementById('admin-rent-0') as HTMLInputElement).value);
      const r1 = Number((document.getElementById('admin-rent-1') as HTMLInputElement).value);
      const r2 = Number((document.getElementById('admin-rent-2') as HTMLInputElement).value);
      const r3 = Number((document.getElementById('admin-rent-3') as HTMLInputElement).value);
      const rentReason = (document.getElementById('admin-tile-reason') as HTMLInputElement).value.trim();
      const description = (document.getElementById('admin-tile-desc') as HTMLTextAreaElement).value.trim();

      const hasRents = !Number.isNaN(r0) && r0 > 0;
      updateBoardTileConfigInPlace(idx, {
        name: name || BOARD_TILES[idx].name,
        icon: icon || BOARD_TILES[idx].icon,
        colorHex: colorHex || BOARD_TILES[idx].colorHex,
        price: priceVal !== '' ? Number(priceVal) : undefined,
        upgradeCost: upVal !== '' ? Number(upVal) : undefined,
        rents: hasRents ? [r0, r1 || r0, r2 || r1 || r0, r3 || r2 || r0] : undefined,
        rentReason: rentReason || undefined,
        description: description || BOARD_TILES[idx].description
      });

      const st = this.engine.getTileState(idx);
      const ownerColor = st.ownerId ? this.engine.getPlayerById(st.ownerId).color : null;
      this.islandBoard.refreshSingleTileVisual(idx, ownerColor, st.festivalMultiplier);
      populateSelect(idx);
      this.showBottomLeftTilePopup(idx);
      soundManager.playCoinChime();
    });

    document.getElementById('btn-admin-export-json')?.addEventListener('click', () => {
      const specs = getExportableTilesSpecArray();
      const jsonBlob = new Blob([JSON.stringify(specs, null, 2)], {
        type: 'application/json;charset=utf-8'
      });
      const url = URL.createObjectURL(jsonBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'astrocyberr-tiles-config.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      soundManager.playCoinChime();
    });

    document.getElementById('btn-admin-reset-default')?.addEventListener('click', () => {
      resetBoardTilesToDefault();
      this.syncAllBuildingsToBoard();
      populateSelect(Number(selectEl.value));
      loadTileIntoForm(Number(selectEl.value));
      soundManager.playCoinChime();
    });
  }

  private unlockAndOpenAdminStudio(): void {
    document.getElementById('settings-popover')?.classList.add('hidden');
    if (this.isAdminUnlocked) {
      document.getElementById('admin-tile-editor-modal')?.classList.remove('hidden');
      soundManager.playCoinChime();
      return;
    }

    const pinModal = document.getElementById('admin-pin-gate-modal');
    const pinInput = document.getElementById('admin-pin-input') as HTMLInputElement | null;
    const errEl = document.getElementById('admin-pin-error');
    if (errEl) errEl.style.display = 'none';
    pinModal?.classList.remove('hidden');
    window.setTimeout(() => pinInput?.focus(), 60);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private startRenderLoop(): void {
    const tick = () => {
      requestAnimationFrame(tick);
      const dt = Math.min(0.05, this.clock.getDelta());
      const elapsed = this.clock.getElapsedTime();

      this.islandBoard.update(elapsed);
      // Synchronize all standing characters with any elevated/tilted tile in real-time!
      this.syncIdleCharactersToElevatedTiles();
      this.characters3D.updateIdle(elapsed);
      this.particles.update(dt);

      const followedCharId = this.cameraDirector.getFollowedCharacterId();
      const followedPos = followedCharId
        ? this.characters3D.getCharacterWorldPosition(followedCharId)
        : undefined;
      this.cameraDirector.update(dt, followedPos);

      this.renderer.render(this.scene, this.cameraDirector.camera);
    };
    tick();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new AstroCyberrMonopolyApp();
});
