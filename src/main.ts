import './styles/main.css';
import * as THREE from 'three';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import {
  BOARD_SIZE,
  BOARD_TILES,
  BUILDING_TIER_NAMES,
  CharacterId
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

  // Active keyboard shortcut handlers for Skip Bar & Action Modal (Space = Confirm/Buy/Skip, Esc = Cancel/Pass)
  private activeModalPrimaryAction: (() => void) | null = null;
  private activeModalSecondaryAction: (() => void) | null = null;

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

    const hemiLight = new THREE.HemisphereLight('#ffffff', '#38bdf8', 0.98);
    hemiLight.position.set(0, 35, 0);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#fffbeb', 1.5);
    sunLight.position.set(22, 36, 24);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 110;
    const d = 24;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.scene.add(sunLight);

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

    // Click on 3D Scene:
    // 1. If clicking a 3D Character Model -> Lock camera to follow that character (with free 360° rotation)!
    // 2. If clicking a 3D Tile -> Elevate & tilt tile toward camera (along with any character on it!) and fly camera to inspect!
    this.renderer.domElement.addEventListener('click', async (ev) => {
      if (this.cameraDirector.wasDragging()) return;
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

      // 2. Otherwise check if user clicked on a 3D Board Tile
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
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

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

    // 1. Landed on an Owned Property (`PAID_RENT`): Show Reason + Amount + Confirm Payment [Space] OR Direct Bankruptcy [Space]!
    if (res.action === 'PAID_RENT') {
      const rentAmount = res.amount ?? 0;
      const canAfford = res.canAffordRent ?? player.gold >= rentAmount;
      const afterGold = Math.max(0, player.gold - rentAmount);

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
          </div>
        `;
      } else {
        inner.innerHTML = `
          <span class="action-card-badge" style="background:#ef4444;color:#ffffff">
            💀 PHÁ SẢN • KHÔNG ĐỦ KHẢ NĂNG THANH TOÁN
          </span>
          <h3 class="action-card-title">Loại Khỏi Đường Đua!</h3>
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
              <span>Tài sản hiện có</span>
              <strong>$${player.gold}</strong>
            </div>
            <div class="rent-invoice-row">
              <span>Trạng thái</span>
              <span class="danger-val">💀 PHÁ SẢN & LOẠI KHỎI ĐƯỜNG ĐUA</span>
            </div>
          </div>
          <div class="action-btn-group">
            <button id="act-btn-confirm-rent" class="action-btn action-btn-bankrupt">
              <span>💀 Tuyên Bố Phá Sản & Rời Cuộc Đua</span>
              <kbd class="key-hint">Space</kbd>
            </button>
          </div>
        `;
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

      this.activeModalPrimaryAction = doConfirmRent;
      this.activeModalSecondaryAction = null;
      document.getElementById('act-btn-confirm-rent')!.addEventListener('click', doConfirmRent);
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
      const tileButtonsHtml = BOARD_TILES.filter((t) => t.index !== 30)
        .map(
          (t) =>
            `<button class="portal-tile-btn" data-target="${t.index}">#${t.index} ${t.icon} ${t.name.split(' ').slice(0, 2).join(' ')}</button>`
        )
        .join('');

      inner.innerHTML = `
        <span class="action-card-badge" style="background:#9333ea;color:#ffffff">🌌 Cổng Dịch Chuyển The End (12 Khung)</span>
        <h3 class="action-card-title">Chọn Ô Bất Kỳ Để Bay Tới!</h3>
        <p class="action-card-desc">Nếu bay qua Đại Lộ Khởi Hành (#0) bạn vẫn được nhận <strong>+$200</strong>!</p>
        <div class="portal-grid">${tileButtonsHtml}</div>
      `;

      inner.querySelectorAll<HTMLButtonElement>('.portal-tile-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetIdx = Number(btn.dataset.target || 0);
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
        const ownedButtons = owned
          .map((st) => {
            const cfg = this.engine.getTileConfig(st.index);
            return `<button class="portal-tile-btn" data-fest="${st.index}">${cfg.icon} ${cfg.name} ($${this.engine.calculateRent(st.index)})</button>`;
          })
          .join('');

        inner.innerHTML = `
          <span class="action-card-badge" style="background:#ec4899;color:#ffffff">🎉 Đại Tiệc Lễ Hội Thành Phố</span>
          <h3 class="action-card-title">Nhân Đôi (x2) Tiền Thuê Đất!</h3>
          <p class="action-card-desc">Chọn 1 ô đất thuộc sở hữu của bạn để nhân đôi tiền thuê:</p>
          <div class="portal-grid">${ownedButtons}</div>
        `;

        inner.querySelectorAll<HTMLButtonElement>('.portal-tile-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.fest || 0);
            this.engine.applyFestivalBoost(playerId, idx);
            const st = this.engine.getTileState(idx);
            this.islandBoard.updateTileBuilding(idx, st.level, player.color, st.festivalMultiplier);
            this.renderHUD();
            this.hideActionModal();
            this.advanceToNextTurn();
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
    document.getElementById('floating-action-modal')!.classList.add('hidden');
  }

  private advanceToNextTurn(): void {
    if (this.engine.getWinner()) return;

    const current = this.engine.getCurrentPlayer();
    let activePlayer = current;
    if (this.engine.canTakeExtraDoublesTurn()) {
      soundManager.playCoinChime();
    } else {
      const next = this.engine.nextTurn();
      activePlayer = next.activePlayer;
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

        const statusPills: string[] = [];
        if (p.bankrupt) {
          statusPills.push(`<span class="status-pill status-pill-bankrupt">💀 PHÁ SẢN • LOẠI</span>`);
        } else {
          if (p.skipTurns > 0) {
            statusPills.push(
              `<span class="status-pill status-pill-skip">🏝️ Mất ${p.skipTurns} lượt</span>`
            );
          }
          if (isFollowed) {
            statusPills.push(`<span class="status-pill status-pill-followed">🎯 ĐANG FOLLOW</span>`);
          }
        }

        return `
          <div
            class="player-rect-card ${isCurrent ? 'active-turn' : ''} ${p.bankrupt ? 'bankrupt' : ''} ${isFollowed ? 'followed-target' : ''}"
            data-player-card-id="${p.id}"
            data-player-char-id="${p.characterId}"
            title="Click để Camera theo dõi ${p.name} (Hoặc bấm phím A / D)"
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
