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
  GAME_RULES_CONFIG,
  getTileAnalytics
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
import { PixelFxEngine } from './fx/PixelFxEngine';
import { RoomSync } from './net/RoomSync';
import {
  fetchAndApplyMonopolyCloudConfig,
  subscribeMonopolyCloudConfigRealtime
} from './lib/supabaseConfigSync';
import { escapeHtml, sanitizeColorHex } from './utils/security';

const cachedAvatarDataUrls = new Map<CharacterId, string>();

/**
 * Draws a cute 3D Isometric Voxel Grass Block with the Chibi character standing on top of it
 * and caches the rendered PNG DataURL so `renderHUD()` never re-renders 2D paths unnecessarily!
 */
function getOrDrawCharacterAvatarDataUrl(charId: CharacterId): string {
  const existing = cachedAvatarDataUrls.get(charId);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 76;
  canvas.height = 88;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

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

  const url = canvas.toDataURL('image/png');
  cachedAvatarDataUrls.set(charId, url);
  return url;
}

class AstroCyberrMonopolyApp {
  private engine = new GameEngine('SOLO_VS_AI', 1);
  private roomSync = new RoomSync();

  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private cameraDirector!: CameraDirector;
  private particles!: ParticleSystem3D;
  private pixelFx!: PixelFxEngine;
  private islandBoard!: IslandBoard3D;
  private characters3D!: ChibiCharacters3D;
  private dice3D!: Dice3D;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private clock = new THREE.Clock();
  private isBusy = false;
  private selectedMode: GameMode = 'SOLO_VS_AI';
  private selectedHumanCount = 2;
  private selectedPrimaryChar: CharacterId = 'steve';
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

  constructor() {
    this.initThreeScene();
    this.bindUIEvents();
    this.initLobbyModalUI();
    this.syncAllCharactersToBoard();
    this.renderHUD();
    this.initSupabaseLiveConfigSync();
    this.startRenderLoop();
    // Open the 3D Diorama Lobby Modal on startup so user can pick Mode & Character
    this.openLobbyModal();
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
    this.pixelFx = new PixelFxEngine(this.scene);
    this.islandBoard = new IslandBoard3D(this.scene, this.particles);
    this.characters3D = new ChibiCharacters3D(this.scene, this.particles);
    this.dice3D = new Dice3D(this.scene);

    window.addEventListener('resize', () => {
      this.cameraDirector.resize(window.innerWidth, window.innerHeight);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.renderer.domElement.addEventListener('pointerdown', (ev) => {
      this.pointerDownClientX = ev.clientX;
      this.pointerDownClientY = ev.clientY;
    });

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

      // 1. Check Whimsy Easter Eggs (Beacon or Courtyard Trees)
      const whimsyHits = this.raycaster.intersectObjects(
        this.islandBoard.getWhimsyClickables(),
        true
      );
      if (whimsyHits.length > 0) {
        const hitObj = whimsyHits[0].object;
        if (hitObj.userData?.whimsyType === 'BEACON') {
          const beamColor = this.islandBoard.cycleBeaconBeamColor();
          this.pixelFx.spawnLevelUpPillar(new THREE.Vector3(0, 1.4, 0), 4);
          this.engine.addLog(`🌈 Tháp Beacon trung tâm đổi sang ánh sáng ${beamColor.name}!`);
          this.renderHUD();
          return;
        }
        if (hitObj.userData?.whimsyType === 'TREE' && hitObj.userData?.treeGroup) {
          this.islandBoard.triggerTreeWhimsy(hitObj.userData.treeGroup);
          return;
        }
      }

      // 2. Check if user clicked on a 3D Board Tile
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
        if (this.active3DTilePickerHandler) {
          this.active3DTilePickerHandler(clickedTileIdx);
          return;
        }

        document.getElementById('tile-popup-bottom-left')!.classList.add('hidden');
        const tileCfg = this.engine.getTileConfig(clickedTileIdx);

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

  private initLobbyModalUI(): void {
    const lobbyModal = document.getElementById('lobby-setup-modal')!;
    const charGrid = document.getElementById('lobby-char-grid')!;
    const roomInput = document.getElementById('lobby-room-code-input') as HTMLInputElement;

    roomInput.value = this.roomSync.generateRoomCode();

    const renderCharCards = () => {
      charGrid.innerHTML = CHARACTER_CONFIGS.map((c) => {
        const isSelected = c.id === this.selectedPrimaryChar;
        return `
          <button
            type="button"
            class="lobby-char-card ${isSelected ? 'active' : ''}"
            data-lobby-char="${c.id}"
          >
            <div class="lobby-char-head">
              <span>${escapeHtml(c.emoji)}</span>
              <span>${escapeHtml(c.name)} — ${escapeHtml(c.title)}</span>
            </div>
            <div class="lobby-char-passive">${escapeHtml(c.passiveName)}</div>
            <div class="lobby-char-desc">${escapeHtml(c.passiveDescription)}</div>
          </button>
        `;
      }).join('');

      charGrid.querySelectorAll<HTMLButtonElement>('[data-lobby-char]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.selectedPrimaryChar = btn.dataset.lobbyChar as CharacterId;
          renderCharCards();
        });
      });
    };

    renderCharCards();

    // Mode cards
    document.querySelectorAll<HTMLButtonElement>('[data-lobby-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-lobby-mode]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedMode = btn.dataset.lobbyMode as GameMode;

        document
          .getElementById('lobby-human-count-row')!
          .classList.toggle('hidden', this.selectedMode !== 'PASS_AND_PLAY');
        document
          .getElementById('lobby-online-room-row')!
          .classList.toggle('hidden', this.selectedMode !== 'ONLINE_ROOM');
      });
    });

    // Pass & Play Human Count pills
    document.querySelectorAll<HTMLButtonElement>('[data-human-count]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document
          .querySelectorAll('[data-human-count]')
          .forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedHumanCount = Number(btn.dataset.humanCount || 2);
      });
    });

    document.getElementById('btn-random-room-code')?.addEventListener('click', () => {
      roomInput.value = this.roomSync.generateRoomCode();
    });

    document.getElementById('btn-open-lobby')?.addEventListener('click', () => {
      renderCharCards();
      this.openLobbyModal();
    });

    document.getElementById('btn-close-lobby-modal')?.addEventListener('click', () => {
      lobbyModal.classList.add('hidden');
    });

    document.getElementById('btn-start-match-now')?.addEventListener('click', () => {
      lobbyModal.classList.add('hidden');
      const roomCode = roomInput.value.trim().toUpperCase();
      this.startNewGame(
        this.selectedMode,
        this.selectedHumanCount,
        this.selectedPrimaryChar,
        roomCode
      );
    });
  }

  private openLobbyModal(): void {
    document.getElementById('lobby-setup-modal')?.classList.remove('hidden');
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

    btnCamNormal.addEventListener('click', () => {
      btnCamNormal.classList.add('active');
      btnCamLive.classList.remove('active');
      this.cameraDirector.setCameraStyle('NORMAL');
    });

    btnCamLive.addEventListener('click', () => {
      btnCamLive.classList.add('active');
      btnCamNormal.classList.remove('active');
      this.cameraDirector.setCameraStyle('LIVE');
      this.focusCurrentPlayerInLiveMode();
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
      this.renderHUD();
    });

    // Quick 3D Emote Bar
    const btnOpenEmotes = document.getElementById('btn-open-emotes');
    const emoteBar = document.getElementById('emote-quick-bar');
    btnOpenEmotes?.addEventListener('click', (e) => {
      e.stopPropagation();
      emoteBar?.classList.toggle('hidden');
    });
    emoteBar?.querySelectorAll<HTMLButtonElement>('.emote-chip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const active = this.engine.getCurrentPlayer();
        const text = btn.dataset.emote || '👋 Chào!';
        const mood = (btn.dataset.mood || 'WAVE') as 'HAPPY' | 'SAD' | 'WAVE' | 'TAKEOVER';
        this.characters3D.playEmoteReaction(active.characterId, text, mood);
        soundManager.playCoinChime();
        if (this.engine.getMode() === 'ONLINE_ROOM') {
          this.roomSync.broadcastQuickEmote({
            playerId: active.id,
            emoji: text,
            text: mood
          });
        }
        emoteBar.classList.add('hidden');
      });
    });

    // Open Property Trade Modal
    document.getElementById('btn-open-trade')?.addEventListener('click', () => {
      this.openPropertyTradeModal();
    });
    document.getElementById('btn-close-trade-modal')?.addEventListener('click', () => {
      document.getElementById('trade-modal')?.classList.add('hidden');
    });

    // Spacebar & Pointer Hold Power Charge Bar for Rolling Dice!
    const startPowerCharge = () => {
      const lobbyOpen = !document.getElementById('lobby-setup-modal')?.classList.contains('hidden');
      const tradeOpen = !document.getElementById('trade-modal')?.classList.contains('hidden');
      const active = this.engine.getCurrentPlayer();
      if (
        lobbyOpen ||
        tradeOpen ||
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

    window.addEventListener('keydown', (e) => {
      if (
        ((e.target as HTMLElement)?.tagName === 'INPUT' ||
          (e.target as HTMLElement)?.tagName === 'TEXTAREA' ||
          (e.target as HTMLElement)?.tagName === 'SELECT') &&
        e.key !== 'Escape'
      ) {
        return;
      }

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
        document.getElementById('lobby-setup-modal')?.classList.add('hidden');
        document.getElementById('trade-modal')?.classList.add('hidden');
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
      if (emoteBar && !emoteBar.contains(e.target as Node) && e.target !== btnOpenEmotes) {
        emoteBar.classList.add('hidden');
      }
    });

    btnSfx.addEventListener('click', () => {
      const on = soundManager.toggleSfx();
      const label = document.getElementById('sfx-status-label')!;
      const sw = document.getElementById('sfx-switch-ui')!;
      btnSfx.setAttribute('aria-checked', String(on));
      label.textContent = on ? 'Đang bật' : 'Đang tắt';
      label.className = on ? 'emerald-text' : 'muted-text';
      sw.classList.toggle('on', on);
    });

    btnBgm.addEventListener('click', () => {
      const on = soundManager.toggleBgm();
      const label = document.getElementById('bgm-status-label')!;
      const sw = document.getElementById('bgm-switch-ui')!;
      btnBgm.setAttribute('aria-checked', String(on));
      label.textContent = on ? 'Đang bật' : 'Đang tắt';
      label.className = on ? 'emerald-text' : 'muted-text';
      sw.classList.toggle('on', on);
    });

    sliderVolume.addEventListener('input', () => {
      const pct = Number(sliderVolume.value);
      soundManager.setMasterVolume(pct / 100);
      document.getElementById('volume-pct-label')!.textContent = `${pct}%`;
    });

    sliderSpeed.addEventListener('input', () => {
      const spd = Number(sliderSpeed.value);
      this.gameSpeedMultiplier = spd;
      document.getElementById('speed-multiplier-label')!.textContent = `${spd}x`;
    });

    const btnReducedMotion = document.getElementById('btn-reduced-motion-toggle');
    btnReducedMotion?.addEventListener('click', () => {
      const active = document.body.classList.toggle('reduced-motion');
      btnReducedMotion.setAttribute('aria-checked', String(active));
      const label = document.getElementById('reduced-motion-status-label')!;
      const sw = document.getElementById('reduced-motion-switch-ui')!;
      label.textContent = active ? 'Đang bật' : 'Đang tắt';
      label.className = active ? 'emerald-text' : 'muted-text';
      sw.classList.toggle('on', active);
    });

    document.getElementById('btn-time-of-day')?.addEventListener('click', () => {
      const nextPhase =
        this.timeOfDayPhase === 'DAY'
          ? 'SUNSET'
          : this.timeOfDayPhase === 'SUNSET'
            ? 'NIGHT'
            : 'DAY';
      this.setEnvironmentTimeOfDay(nextPhase);
    });

    document.getElementById('btn-close-tile-popup')!.addEventListener('click', () => {
      document.getElementById('tile-popup-bottom-left')!.classList.add('hidden');
      this.islandBoard.highlightTile(null);
      if (this.cameraDirector.getCameraStyle() === 'NORMAL') {
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

  /**
   * Opens the interactive Player-to-Player & Player-to-Bot Property Trading Modal (`🤝 Thương Lượng`)
   */
  private openPropertyTradeModal(): void {
    const modal = document.getElementById('trade-modal')!;
    const body = document.getElementById('trade-modal-body')!;
    const activePlayer = this.engine.getCurrentPlayer();

    if (activePlayer.isBot) {
      body.innerHTML = `<p style="font-size:13.5px;color:#cbd5e1">⏳ Vui lòng đợi tới lượt của Người chơi để mở bàn thương lượng bất động sản!</p>`;
      modal.classList.remove('hidden');
      return;
    }

    const opponentTiles = this.engine
      .getAllTileStates()
      .filter((t) => t.ownerId !== null && t.ownerId !== activePlayer.id && t.level < 4);

    if (opponentTiles.length === 0) {
      body.innerHTML = `<p style="font-size:13.5px;color:#cbd5e1">Hiện chưa có ô đất nào của đối thủ (dưới Cấp 4) để thương lượng mua lại.</p>`;
      modal.classList.remove('hidden');
      return;
    }

    const myTiles = this.engine
      .getAllTileStates()
      .filter((t) => t.ownerId === activePlayer.id && t.level < 4);

    const targetOptionsHtml = opponentTiles
      .map((st) => {
        const cfg = this.engine.getTileConfig(st.index);
        const owner = this.engine.getPlayerById(st.ownerId!);
        return `<option value="${st.index}">#${st.index} ${escapeHtml(cfg.icon)} ${escapeHtml(cfg.name)} — Chủ: ${escapeHtml(owner.name)} (Giá gốc $${cfg.price ?? 100})</option>`;
      })
      .join('');

    const myTileOptionsHtml = [
      `<option value="">-- Không kèm đất trao đổi (Chỉ trả tiền mặt) --</option>`,
      ...myTiles.map((st) => {
        const cfg = this.engine.getTileConfig(st.index);
        return `<option value="${st.index}">#${st.index} ${escapeHtml(cfg.icon)} ${escapeHtml(cfg.name)} (Giá gốc $${cfg.price ?? 100})</option>`;
      })
    ].join('');

    const defaultTargetCfg = this.engine.getTileConfig(opponentTiles[0].index);
    const suggestedOffer = Math.min(
      activePlayer.gold,
      Math.round((defaultTargetCfg.price ?? 120) * 1.3)
    );

    body.innerHTML = `
      <div class="lobby-section">
        <label class="lobby-section-label">Người đề nghị thương lượng:</label>
        <div style="font-size:14px;font-weight:800;color:#34d399">
          ${escapeHtml(activePlayer.emoji)} ${escapeHtml(activePlayer.name)} (Số dư hiện có: $${activePlayer.gold.toLocaleString('en-US')})
        </div>
      </div>

      <div class="lobby-section">
        <label class="lobby-section-label" for="trade-target-tile">1. Chọn Ô Đất Muốn Mua Từ Đối Thủ:</label>
        <select id="trade-target-tile" class="lobby-text-input" style="text-transform:none">
          ${targetOptionsHtml}
        </select>
      </div>

      <div class="lobby-section">
        <label class="lobby-section-label" for="trade-offered-tile">2. Chọn Ô Đất Của Bạn Đem Ra Trao Đổi (Tùy chọn):</label>
        <select id="trade-offered-tile" class="lobby-text-input" style="text-transform:none">
          ${myTileOptionsHtml}
        </select>
      </div>

      <div class="lobby-section">
        <label class="lobby-section-label" for="trade-cash-offer">3. Số Tiền Mặt Đề Nghị Trả Thêm ($):</label>
        <input
          id="trade-cash-offer"
          type="number"
          min="0"
          max="${activePlayer.gold}"
          step="10"
          value="${suggestedOffer}"
          class="lobby-text-input"
        />
        <small style="font-size:11.5px;color:#94a3b8">
          💡 Mẹo: Tỷ phú AI thường đồng ý khi tổng giá trị đề nghị đạt từ <strong>125%</strong> giá trị đất trở lên (hoặc 155% nếu đã độc quyền cụm màu).
        </small>
      </div>

      <div id="trade-feedback-msg" class="hidden" style="padding:10px 12px;border-radius:10px;font-size:12.5px;font-weight:700"></div>

      <div class="action-btn-group">
        <button type="button" id="btn-submit-trade" class="action-btn action-btn-buy" style="flex:1">
          🤝 Gửi Đề Nghị Thương Lượng
        </button>
      </div>
    `;

    modal.classList.remove('hidden');

    document.getElementById('btn-submit-trade')?.addEventListener('click', () => {
      const targetTileIdx = Number(
        (document.getElementById('trade-target-tile') as HTMLSelectElement).value
      );
      const offeredRaw = (document.getElementById('trade-offered-tile') as HTMLSelectElement).value;
      const offeredTileIdx = offeredRaw !== '' ? Number(offeredRaw) : undefined;
      const cashOffer = Number(
        (document.getElementById('trade-cash-offer') as HTMLInputElement).value || 0
      );

      const targetState = this.engine.getTileState(targetTileIdx);
      if (!targetState.ownerId) return;

      const res = this.engine.proposePropertyTrade({
        fromPlayerId: activePlayer.id,
        toPlayerId: targetState.ownerId,
        targetTileIndex: targetTileIdx,
        offeredTileIndex: offeredTileIdx,
        cashOffer
      });

      const msgEl = document.getElementById('trade-feedback-msg')!;
      msgEl.classList.remove('hidden');

      if (res.accepted) {
        soundManager.playCoinChime();
        msgEl.style.background = 'rgba(16, 185, 129, 0.22)';
        msgEl.style.border = '1px solid #34d399';
        msgEl.style.color = '#6ee7b7';
        msgEl.textContent = `✅ ${res.reason}`;
        this.syncAllBuildingsToBoard();
        this.renderHUD();
        if (this.engine.getMode() === 'ONLINE_ROOM') {
          this.roomSync.broadcastState(this.engine.serialize());
        }
        window.setTimeout(() => {
          modal.classList.add('hidden');
        }, 1200);
      } else {
        soundManager.playPayRent();
        msgEl.style.background = 'rgba(239, 68, 68, 0.2)';
        msgEl.style.border = '1px solid #f87171';
        msgEl.style.color = '#fca5a5';
        msgEl.textContent = `❌ ${res.reason}`;
        this.renderHUD();
      }
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
    return this.cameraDirector.focusActivePlayerLive(
      standPos,
      tileCfg.outwardRotationY,
      this.gameSpeedMultiplier
    );
  }

  private startNewGame(
    mode: GameMode,
    humanCount: number,
    primaryChar: CharacterId = this.selectedPrimaryChar,
    roomCode?: string
  ): void {
    this.isBusy = false;
    this.hideActionModal();
    this.dice3D.clearFusionFX();
    this.islandBoard.hideTargetTileBeacon();
    const humans = mode === 'SOLO_VS_AI' ? 1 : mode === 'ONLINE_ROOM' ? 4 : humanCount;
    this.engine.initGame(mode, humans, GAME_RULES_CONFIG.startingGold, primaryChar);
    this.islandBoard.clearAllBuildings();
    this.characters3D.resetAllCharactersVisibility();
    this.syncAllCharactersToBoard();
    this.renderHUD();
    this.focusCurrentPlayerInLiveMode();

    const roomPill = document.getElementById('room-status-pill');
    if (mode === 'ONLINE_ROOM') {
      const code = this.roomSync.joinRoom(
        roomCode || this.roomSync.generateRoomCode(),
        (remoteState) => {
          this.engine.hydrate(remoteState);
          this.syncAllBuildingsToBoard();
          this.syncAllCharactersToBoard();
          this.renderHUD();
        },
        {
          onEmote: (emote) => {
            try {
              const p = this.engine.getPlayerById(emote.playerId);
              this.characters3D.playEmoteReaction(
                p.characterId,
                emote.emoji,
                (emote.text as 'WAVE' | 'HAPPY' | 'SAD' | 'TAKEOVER') || 'WAVE'
              );
            } catch {
              // ignore unknown peer player
            }
          },
          onPeerCount: (count) => {
            if (roomPill) {
              roomPill.textContent = `🌐 PHÒNG ${this.roomSync.getRoomCode()} (${count} Online)`;
            }
          }
        }
      );
      if (roomPill) {
        roomPill.textContent = `🌐 PHÒNG ${code}`;
        roomPill.classList.remove('hidden');
      }
      this.roomSync.broadcastState(this.engine.serialize());
    } else {
      this.roomSync.leaveRoom();
      roomPill?.classList.add('hidden');
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

  private async playEndPortalToSkyJailCutscene(
    playerId: string,
    playerSlot: number,
    originTileIdx: number
  ): Promise<void> {
    const player = this.engine.getPlayerById(playerId);
    const originPortalCenter = this.islandBoard.getTileWorldCenter(originTileIdx);

    this.pixelFx.spawnEndPortalVortexSuck(originPortalCenter);
    await this.characters3D.animateEndPortalSuckIn(
      player.characterId,
      originPortalCenter,
      this.gameSpeedMultiplier
    );

    const jailCfg = this.engine.getTileConfig(10);
    const jailStandTf = this.islandBoard.getTileStandTransform(10, playerSlot);
    const jailCenter = this.islandBoard.getTileWorldCenter(10);
    const skyPortalPos = new THREE.Vector3(jailCenter.x, 4.6, jailCenter.z);

    await Promise.all([
      this.cameraDirector.focusJailSkyPortalCutscene(jailCfg, this.gameSpeedMultiplier),
      this.islandBoard.showJailSkyEndPortal()
    ]);

    this.pixelFx.spawnEndPortalVortexSuck(new THREE.Vector3(jailCenter.x, 4.35, jailCenter.z));

    await this.characters3D.animateDropFromSkyPortalIntoJail(
      player.characterId,
      skyPortalPos,
      jailStandTf,
      jailCfg.outwardRotationY,
      this.gameSpeedMultiplier,
      (impactPos) => {
        this.pixelFx.spawnJailChainsSlam(impactPos);
        this.pixelFx.triggerHudCardPixelFx(player.id, 'JAIL');
        this.pixelFx.triggerHitStop(0.065);
        this.cameraDirector.triggerCameraShake(0.42, 0.34);
        this.characters3D.playEmoteReaction(player.characterId, '🚓 Ở Tù Chí Hòa!', 'SAD');
      }
    );

    await this.islandBoard.hideJailSkyEndPortal();
    this.showBottomLeftTilePopup(10);
    this.renderHUD();
  }

  private async playCardPerimeterFlight(
    playerId: string,
    playerSlot: number,
    fromTileIdx: number,
    toTileIdx: number,
    direction: 'FORWARD' | 'BACKWARD',
    deck: 'KHI_VAN' | 'CO_HOI'
  ): Promise<void> {
    const player = this.engine.getPlayerById(playerId);
    const waypoints: Array<{
      position: THREE.Vector3;
      outwardRotY: number;
      rotX: number;
      rotZ: number;
      scale: number;
    }> = [];

    const stepDir = direction === 'BACKWARD' ? -1 : 1;
    let cur = ((fromTileIdx % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
    const target = ((toTileIdx % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;

    let guard = 0;
    do {
      cur = (cur + stepDir + BOARD_SIZE) % BOARD_SIZE;
      const tf = this.islandBoard.getTileStandTransform(cur, playerSlot);
      const cfg = this.engine.getTileConfig(cur);
      waypoints.push({
        position: tf.position,
        outwardRotY: cfg.outwardRotationY,
        rotX: tf.rotX,
        rotZ: tf.rotZ,
        scale: tf.scale
      });
      guard++;
    } while (cur !== target && guard <= BOARD_SIZE);

    this.islandBoard.showTargetTileBeacon(target);
    const trailPalette = deck === 'KHI_VAN' ? 'gold' : 'arcane';

    await this.characters3D.animatePerimeterFlightToTile(
      player.characterId,
      waypoints,
      this.gameSpeedMultiplier,
      (curWorldPos, stepIdx) => {
        const wp = waypoints[Math.min(waypoints.length - 1, Math.max(0, stepIdx - 1))];
        this.cameraDirector.followCharacterStep(curWorldPos, wp?.outwardRotY ?? 0);
        this.pixelFx.spawnFlightTrailSparkle(curWorldPos, trailPalette);
      }
    );

    this.islandBoard.hideTargetTileBeacon();
    const landedPos = this.islandBoard.getTileStandPosition(target, playerSlot);
    const landedCfg = this.engine.getTileConfig(target);
    this.pixelFx.spawnChestCardBurst(landedPos, deck);
    await this.cameraDirector.focusTileEventCloseUp(
      landedPos,
      landedCfg.outwardRotationY,
      this.gameSpeedMultiplier
    );
    this.showBottomLeftTilePopup(target);
    this.renderHUD();
  }

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
    this.pixelFx.triggerHudCardPixelFx(playerId, isGain ? 'GAIN' : 'LOSS');
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
      this.pixelFx.triggerHudCardPixelFx(payerId, 'LOSS');
      this.pixelFx.triggerHudCardPixelFx(ownerId, 'GAIN');
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

  private promptHumanJailEscapeChoice(
    playerId: string
  ): Promise<'ROLL_DOUBLES' | 'PAY_FINE' | 'USE_CARD'> {
    return new Promise((resolve) => {
      const modal = document.getElementById('floating-action-modal')!;
      const inner = document.getElementById('action-card-inner')!;
      const player = this.engine.getPlayerById(playerId);
      const fineAmt = GAME_RULES_CONFIG.jailFineAmount;
      const canPayFine = player.gold >= fineAmt;
      const freeCards = player.jailFreeCards ?? 0;

      modal.classList.remove('hidden');
      inner.innerHTML = `
        <span class="action-card-badge" style="background:#ef4444;color:#ffffff">
          🚓 Ô #10 • ĐANG BỊ GIAM TẠI NHÀ TÙ CHÍ HÒA
        </span>
        <h3 class="action-card-title">Chọn Cách Thoát Khỏi Nhà Tù Chí Hòa</h3>
        <p class="action-card-desc">
          Bạn đang trong trạng thái <strong>Ở Tù</strong> (do vào ô #30, rút thẻ Vào Tù, hoặc đổ đôi 3 lần).<br/>
          Hãy chọn 1 trong các phương án chuẩn <strong>Cờ Tỷ Phú Bản Việt Nam</strong> dưới đây:
        </p>
        <div class="action-btn-group">
          <button id="jail-btn-roll" class="action-btn action-btn-buy">
            <span>🎲 Đổ Xúc Xắc Tìm Cặp Đôi (Miễn phí)</span>
            <kbd class="key-hint">Space</kbd>
          </button>
          ${
            canPayFine
              ? `<button id="jail-btn-pay" class="action-btn action-btn-upgrade">
                   <span>💸 Nộp Phạt Bảo Lãnh (-$${fineAmt}) & Đi Ngay</span>
                   <kbd class="key-hint">B</kbd>
                 </button>`
              : ''
          }
          ${
            freeCards > 0
              ? `<button id="jail-btn-card" class="action-btn action-btn-skip">
                   <span>🕊️ Dùng Thẻ Ra Tù Miễn Phí (Còn ${freeCards})</span>
                   <kbd class="key-hint">Esc</kbd>
                 </button>`
              : ''
          }
        </div>
      `;

      const finish = (choice: 'ROLL_DOUBLES' | 'PAY_FINE' | 'USE_CARD') => {
        this.hideActionModal();
        resolve(choice);
      };

      const doRoll = () => finish('ROLL_DOUBLES');
      const doPay = () => finish('PAY_FINE');
      const doCard = () => finish('USE_CARD');

      this.activeModalPrimaryAction = doRoll;
      this.activeModalBuyoutAction = canPayFine ? doPay : null;
      this.activeModalSecondaryAction = freeCards > 0 ? doCard : null;

      document.getElementById('jail-btn-roll')?.addEventListener('click', doRoll);
      document.getElementById('jail-btn-pay')?.addEventListener('click', doPay);
      document.getElementById('jail-btn-card')?.addEventListener('click', doCard);
    });
  }

  private async executeCurrentPlayerTurn(throwPower = 1.0): Promise<void> {
    if (this.isBusy || this.engine.getWinner()) return;
    this.isBusy = true;

    const player = this.engine.getCurrentPlayer();
    const playerIdx = this.engine.getCurrentPlayerIndex();
    const btnRoll = document.getElementById('btn-roll-dice') as HTMLButtonElement;
    btnRoll.disabled = true;

    const startStandPos = this.islandBoard.getTileStandPosition(player.position, playerIdx);
    const startTileCfg = this.engine.getTileConfig(player.position);
    this.cameraDirector.focusDiceRoll(startStandPos, startTileCfg.outwardRotationY);

    let d1 = 1;
    let d2 = 1;
    let total = 2;
    let isDoubles = false;
    let sentToJailByTripleDoubles = false;
    let alreadyRolledViaJailEscape = false;

    if (player.inJail) {
      if (player.isBot) {
        if ((player.jailFreeCards ?? 0) > 0) {
          const prevGold = player.gold;
          this.engine.useJailFreeCard(player.id);
          if (player.gold !== prevGold) {
            this.animateSinglePlayerCoinDeltaOnHUD(player.id, prevGold, player.gold);
          } else {
            this.renderHUD();
          }
        } else if (player.gold >= 200) {
          const prevGold = player.gold;
          this.engine.payJailFine(player.id, GAME_RULES_CONFIG.jailFineAmount);
          soundManager.playPayRent();
          this.animateSinglePlayerCoinDeltaOnHUD(player.id, prevGold, player.gold);
        } else {
          const prevGold = player.gold;
          const jailRoll = this.engine.attemptRollDoublesInJail(player.id);
          await this.dice3D.animateRollAndFuseTotal(
            jailRoll.d1,
            jailRoll.d2,
            throwPower,
            this.gameSpeedMultiplier
          );
          document.getElementById('dice-last-result')!.textContent =
            `🎲 ${jailRoll.d1}+${jailRoll.d2}=${jailRoll.total}${jailRoll.escaped ? ' (THOÁT TÙ!)' : ' (Ở TÙ)'}`;
          this.dice3D.clearFusionFX();
          if (player.gold !== prevGold) {
            this.animateSinglePlayerCoinDeltaOnHUD(player.id, prevGold, player.gold);
          } else {
            this.renderHUD();
          }

          if (!jailRoll.escaped) {
            await this.delay(550 / this.gameSpeedMultiplier);
            this.advanceToNextTurn();
            return;
          }
          d1 = jailRoll.d1;
          d2 = jailRoll.d2;
          total = jailRoll.total;
          isDoubles = false;
          alreadyRolledViaJailEscape = true;
        }
      } else {
        const choice = await this.promptHumanJailEscapeChoice(player.id);
        if (choice === 'USE_CARD') {
          const prevGold = player.gold;
          this.engine.useJailFreeCard(player.id);
          soundManager.playCoinChime();
          this.animateSinglePlayerCoinDeltaOnHUD(player.id, prevGold, player.gold);
        } else if (choice === 'PAY_FINE') {
          const prevGold = player.gold;
          this.engine.payJailFine(player.id, GAME_RULES_CONFIG.jailFineAmount);
          soundManager.playPayRent();
          this.animateSinglePlayerCoinDeltaOnHUD(player.id, prevGold, player.gold);
        } else {
          const prevGold = player.gold;
          const jailRoll = this.engine.attemptRollDoublesInJail(player.id);
          await this.dice3D.animateRollAndFuseTotal(
            jailRoll.d1,
            jailRoll.d2,
            throwPower,
            this.gameSpeedMultiplier
          );
          document.getElementById('dice-last-result')!.textContent =
            `🎲 ${jailRoll.d1}+${jailRoll.d2}=${jailRoll.total}${jailRoll.escaped ? ' (ĐÔI THOÁT TÙ!)' : ' (CHƯA ĐÔI)'}`;
          this.dice3D.clearFusionFX();
          if (player.gold !== prevGold) {
            this.animateSinglePlayerCoinDeltaOnHUD(player.id, prevGold, player.gold);
          } else {
            this.renderHUD();
          }

          if (!jailRoll.escaped) {
            await this.delay(650 / this.gameSpeedMultiplier);
            this.advanceToNextTurn();
            return;
          }
          d1 = jailRoll.d1;
          d2 = jailRoll.d2;
          total = jailRoll.total;
          isDoubles = false;
          alreadyRolledViaJailEscape = true;
        }
      }
    }

    const preRollTileIdx = player.position;
    if (!alreadyRolledViaJailEscape) {
      const rollRes = this.engine.rollDice();
      d1 = rollRes.d1;
      d2 = rollRes.d2;
      total = rollRes.total;
      isDoubles = rollRes.isDoubles;
      sentToJailByTripleDoubles = Boolean(rollRes.sentToJailByTripleDoubles);
      await this.dice3D.animateRollAndFuseTotal(d1, d2, throwPower, this.gameSpeedMultiplier);
      this.pixelFx.spawnDiceImpactBurst(new THREE.Vector3(0, 0.95, 0), isDoubles);
      if (isDoubles) {
        this.pixelFx.triggerHitStop(0.055);
        this.cameraDirector.triggerCameraShake(0.28, 0.24);
      }

      document.getElementById('dice-last-result')!.textContent =
        `🎲 ${d1}+${d2}=${total}${isDoubles ? ' (ĐÔI!)' : ''}`;
      this.renderHUD();
    } else {
      this.pixelFx.spawnDiceImpactBurst(new THREE.Vector3(0, 0.95, 0), true);
    }

    if (sentToJailByTripleDoubles) {
      this.dice3D.clearFusionFX();
      soundManager.playPayRent();
      await this.playEndPortalToSkyJailCutscene(player.id, playerIdx, preRollTileIdx);
      await this.delay(450 / this.gameSpeedMultiplier);
      this.advanceToNextTurn();
      return;
    }

    const targetTileIdx = (player.position + total) % BOARD_SIZE;
    this.islandBoard.showTargetTileBeacon(targetTileIdx);

    await this.delay(180 / this.gameSpeedMultiplier);
    this.dice3D.clearFusionFX();

    await this.focusCurrentPlayerInLiveMode();

    for (let step = 0; step < total; step++) {
      const fromTf = this.islandBoard.getTileStandTransform(player.position, playerIdx);
      const prevGold = player.gold;
      const { newPosition, passedStart } = this.engine.stepPlayerOneTile(player.id);
      const toTf = this.islandBoard.getTileStandTransform(newPosition, playerIdx);
      const toTileCfg = this.engine.getTileConfig(newPosition);

      this.cameraDirector.followCharacterStep(toTf.position, toTileCfg.outwardRotationY);

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

    const coTilePlayers = this.engine
      .getPlayers()
      .filter((p) => !p.bankrupt && p.id !== player.id && p.position === player.position);
    if (coTilePlayers.length > 0) {
      this.characters3D.playEmoteReaction(player.characterId, '👋 Chào!', 'WAVE');
      this.characters3D.playEmoteReaction(coTilePlayers[0].characterId, '👋 Hi!', 'WAVE');
    }

    const landedPos = this.islandBoard.getTileStandPosition(player.position, playerIdx);
    const landedCfg = this.engine.getTileConfig(player.position);
    await this.cameraDirector.focusTileEventCloseUp(
      landedPos,
      landedCfg.outwardRotationY,
      this.gameSpeedMultiplier
    );

    this.showBottomLeftTilePopup(player.position);
    let resolution = this.engine.resolveTileLanding(player.id, { deferRentPayment: true });
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
    } else if (resolution.action === 'SENT_TO_JAIL') {
      soundManager.playPayRent();
      await this.playEndPortalToSkyJailCutscene(
        player.id,
        playerIdx,
        resolution.movedFromTile ?? 30
      );
    } else if (resolution.action === 'CHEST_DRAWN') {
      soundManager.playCoinChime();
      const deckType = resolution.chestCard?.deck ?? 'CO_HOI';
      this.pixelFx.spawnChestCardBurst(landedPos, deckType);
      this.pixelFx.triggerHudCardPixelFx(player.id, 'CARD');

      if (resolution.amount) {
        this.animateSinglePlayerCoinDeltaOnHUD(
          player.id,
          resolution.payerPrevGold ?? player.gold - resolution.amount,
          player.gold
        );
      } else {
        this.renderHUD();
      }

      if (resolution.sentToJailByCard) {
        await this.playEndPortalToSkyJailCutscene(
          player.id,
          playerIdx,
          resolution.movedFromTile ?? resolution.tileIndex
        );
      } else if (
        typeof resolution.movedFromTile === 'number' &&
        typeof resolution.movedToTile === 'number'
      ) {
        await this.playCardPerimeterFlight(
          player.id,
          playerIdx,
          resolution.movedFromTile,
          resolution.movedToTile,
          resolution.moveDirection ?? 'FORWARD',
          deckType
        );
        if (resolution.movedToTile !== 0 && !player.bankrupt) {
          const destRes = this.engine.resolveTileLanding(player.id, { deferRentPayment: true });
          if (destRes.action === 'SENT_TO_JAIL') {
            await this.playEndPortalToSkyJailCutscene(player.id, playerIdx, resolution.movedToTile);
          } else if (
            destRes.action === 'CAN_BUY_PROPERTY' ||
            destRes.action === 'CAN_UPGRADE_PROPERTY' ||
            destRes.action === 'PAID_RENT' ||
            destRes.action === 'PAID_ROYAL_TAX'
          ) {
            if (destRes.action === 'PAID_ROYAL_TAX') {
              soundManager.playPayRent();
              this.animateSinglePlayerCoinDeltaOnHUD(
                player.id,
                destRes.payerPrevGold ?? player.gold + (destRes.amount ?? 0),
                player.gold
              );
            } else {
              resolution = destRes;
            }
          }
        }
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
        // Check if Bot wants to execute strategic Hostile Buyout after paying rent!
        if (!player.bankrupt) {
          const botPostRent = chooseBotAction(this.engine, player.id);
          if (botPostRent.type === 'BUYOUT_OPPONENT') {
            const prevGold = player.gold;
            const bo = this.engine.buyoutOpponentProperty(player.id, botPostRent.tileIndex);
            if (bo.ok) {
              soundManager.playCoinChime();
              const st = this.engine.getTileState(botPostRent.tileIndex);
              this.islandBoard.updateTileBuilding(
                botPostRent.tileIndex,
                st.level,
                player.color,
                st.festivalMultiplier
              );
              this.characters3D.playEmoteReaction(player.characterId, '⚔️ Thôn Tính!', 'TAKEOVER');
              this.animateSinglePlayerCoinDeltaOnHUD(player.id, prevGold, player.gold);
            }
          }
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
      <span class="action-card-badge" style="background:${sanitizeColorHex(tileCfg.colorHex)};color:#0f172a">
        ${escapeHtml(tileCfg.icon)} Ô #${tileCfg.index} • Đất Của ${escapeHtml(res.ownerName)}
      </span>
      <h3 class="action-card-title">${
        res.canAffordRent ? `💸 ${escapeHtml(botName)} Trả Tiền Thuê (-$${res.amount})` : `💀 ${escapeHtml(botName)} Phá Sản!`
      }</h3>
      <p class="action-card-desc">
        <strong>${escapeHtml(botName)}</strong> đã đi vào đất <strong>${escapeHtml(tileCfg.name)}</strong> của <strong>${escapeHtml(res.ownerName)}</strong>.<br/>
        Vì <em>${escapeHtml(res.rentReason)}</em> nên phải trả <strong>$${res.amount}</strong>!
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
        this.pixelFx.spawnLevelUpPillar(
          this.islandBoard.getTileWorldCenter(decision.tileIndex),
          state.level
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
        this.pixelFx.spawnLevelUpPillar(
          this.islandBoard.getTileWorldCenter(decision.tileIndex),
          state.level
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
    } else if (decision.type === 'SKIP_ACTION') {
      const tileCfg = this.engine.getTileConfig(bot.position);
      const tileState = this.engine.getTileState(bot.position);
      if (
        tileState.ownerId === null &&
        (tileCfg.type === 'PROPERTY' || tileCfg.type === 'RAILROAD' || tileCfg.type === 'UTILITY')
      ) {
        const auc = this.engine.runPropertyAuction(bot.position);
        if (auc.winnerId) {
          const winner = this.engine.getPlayerById(auc.winnerId);
          const st = this.engine.getTileState(bot.position);
          this.islandBoard.updateTileBuilding(
            bot.position,
            st.level,
            winner.color,
            st.festivalMultiplier
          );
        }
      }
    }

    this.renderHUD();
  }

  private renderPortalTargetPickerModal(playerId: string, playerSlot: number): void {
    const inner = document.getElementById('action-card-inner')!;
    const player = this.engine.getPlayerById(playerId);
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

    this.active3DTilePickerHandler = (clickedIdx: number) => {
      if (clickedIdx !== 30) {
        executePortalJump(clickedIdx);
      }
    };

    const tileButtonsHtml = validTargets
      .map(
        (t) =>
          `<button class="portal-tile-btn" data-target="${t.index}">#${t.index} ${escapeHtml(t.icon)} ${escapeHtml(t.name.split(' ').slice(0, 2).join(' '))}</button>`
      )
      .join('');

    inner.innerHTML = `
      <span class="action-card-badge" style="background:#9333ea;color:#ffffff">🌌 Cổng Dịch Chuyển Không Gian</span>
      <h3 class="action-card-title">Click Ô 3D Bất Kỳ Hoặc Chọn Nhanh!</h3>
      <p class="action-card-desc">💡 <strong>Mẹo:</strong> Click trực tiếp lên ô đất 3D đang phát sáng trên bàn cờ hoặc chọn bên dưới!</p>
      <div class="portal-grid">${tileButtonsHtml}</div>
    `;

    inner.querySelectorAll<HTMLButtonElement>('.portal-tile-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        executePortalJump(Number(btn.dataset.target || 0));
      });
    });
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
    const analytics = getTileAnalytics(res.tileIndex);

    modal.classList.remove('hidden');

    // 1. Landed on an Owned Property (`PAID_RENT`)
    if (res.action === 'PAID_RENT') {
      const rentAmount = res.amount ?? 0;
      const canAfford = player.gold >= rentAmount;
      const afterGold = Math.max(0, player.gold - rentAmount);
      const buyoutCost = this.engine.getBuyoutCost(res.tileIndex);
      const canBuyout = buyoutCost !== null && player.gold >= rentAmount + buyoutCost;
      const liquidatable = this.engine.getPlayerLiquidatableProperties(playerId);
      const ownerPlayer = res.ownerId ? this.engine.getPlayerById(res.ownerId) : null;
      const creeperTag =
        ownerPlayer?.characterId === 'creeper' ? ' (Gồm +15% Bẫy TNT Creeper)' : '';

      if (canAfford) {
        inner.innerHTML = `
          <span class="action-card-badge" style="background:${sanitizeColorHex(tileCfg.colorHex)};color:#0f172a">
            ${escapeHtml(tileCfg.icon)} Ô #${tileCfg.index} • Đất Của ${escapeHtml(res.ownerName)}
          </span>
          <h3 class="action-card-title">💸 Thông Báo Thu Phí Lãnh Địa</h3>
          <p class="action-card-desc">
            Bạn đã đi vào đất <strong>${escapeHtml(tileCfg.name)}</strong> của <strong>${escapeHtml(res.ownerName)}</strong>.<br/>
            Vì <strong>${escapeHtml(res.rentReason)}</strong> nên bạn sẽ phải trả <strong>$${rentAmount}</strong>!
          </p>
          <div class="rent-invoice-box">
            <div class="rent-invoice-row">
              <span>Chủ sở hữu</span>
              <strong>${escapeHtml(res.ownerName)}</strong>
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
                     <span>⚔️ Trả Thuê & Mua Đứt${creeperTag} (-$${rentAmount + buyoutCost})</span>
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
                <div class="emergency-liquidation-title">🏦 Thanh Lý Tài Sản Khẩn Cấp (Thu hồi ${GAME_RULES_CONFIG.liquidationRatePct}% giá trị để cứu mạng):</div>
                ${liquidatable
                  .map(
                    (item) => `
                  <div class="liquidation-item-row">
                    <span>#${item.tileIndex} ${escapeHtml(item.name)} (Cấp ${item.level})</span>
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
            Bạn đã đi vào đất <strong>${escapeHtml(tileCfg.name)}</strong> của <strong>${escapeHtml(res.ownerName)}</strong>.<br/>
            Vì <strong>${escapeHtml(res.rentReason)}</strong> nên phải trả <strong>$${rentAmount}</strong>, nhưng bạn chỉ còn <strong>$${player.gold}</strong>!
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
          this.animateSinglePlayerCoinDeltaOnHUD(playerId, prevGoldFromTakeover(prevBuyerGold), player.gold);
        }
        this.showBottomLeftTilePopup(res.tileIndex);
        this.advanceToNextTurn();
      };

      const prevGoldFromTakeover = (val: number) => val;

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
      const ownGrp = this.engine.getPlayerColorGroupOwnership(playerId, tileCfg.group);
      const completesMonopoly =
        tileCfg.type === 'PROPERTY' &&
        ownGrp.totalCount > 1 &&
        ownGrp.ownedCount === ownGrp.totalCount - 1;

      inner.innerHTML = `
        <span class="action-card-badge" style="background:${sanitizeColorHex(tileCfg.colorHex)};color:#0f172a">
          ${escapeHtml(tileCfg.icon)} Ô #${tileCfg.index} • Chưa Có Chủ
        </span>
        <h3 class="action-card-title">${escapeHtml(tileCfg.name)}</h3>
        <div class="smart-nudge-row">
          <span class="smart-nudge-pill">🎯 Xác suất dừng: ${analytics.landingProbabilityPct}%</span>
          <span class="smart-nudge-pill roi">📈 ROI: ${analytics.baseRoiPct}% – ${analytics.maxRoiPct}%</span>
          <span class="smart-nudge-pill ${analytics.strategicTier === 'S' ? 'tier-s' : ''}">⭐ Hạng ${analytics.strategicTier}</span>
          ${completesMonopoly ? '<span class="smart-nudge-pill tier-s">🔥 Mua để ĐỘC QUYỀN Cụm Màu (x1.5 Thuê)!</span>' : ''}
        </div>
        <p class="action-card-desc">${escapeHtml(res.message)}<br/>Khi mua sẽ mọc ngay <strong>🪵 Cọc Rào Gỗ (Cấp 1)</strong> (Hoàn vốn sau ~${analytics.breaksEvenInHits} lượt khách)!</p>
        <div class="action-btn-group">
          <button id="act-btn-buy" class="action-btn action-btn-buy">
            <span>🏠 Mua Đất (-$${res.amount})</span>
            <kbd class="key-hint">Space</kbd>
          </button>
          <button id="act-btn-pass" class="action-btn action-btn-skip">
            <span>🔨 Bỏ Qua & Đấu Giá</span>
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
          this.pixelFx.spawnLevelUpPillar(
            this.islandBoard.getTileWorldCenter(res.tileIndex),
            st.level
          );
          this.showBottomLeftTilePopup(res.tileIndex);
          this.animateSinglePlayerCoinDeltaOnHUD(playerId, prevGold, player.gold);
        }
        this.hideActionModal();
        this.advanceToNextTurn();
      };

      const doPassToAuction = () => {
        this.showPropertyAuctionModal(playerId, res.tileIndex);
      };

      this.activeModalPrimaryAction = doBuy;
      this.activeModalSecondaryAction = doPassToAuction;

      document.getElementById('act-btn-buy')!.addEventListener('click', doBuy);
      document.getElementById('act-btn-pass')!.addEventListener('click', doPassToAuction);
      return;
    }

    if (res.action === 'CAN_UPGRADE_PROPERTY') {
      const nextTier = BUILDING_TIER_NAMES[tileState.level + 1];
      const nextRent = tileCfg.rents?.[tileState.level] ?? 0;
      inner.innerHTML = `
        <span class="action-card-badge" style="background:${sanitizeColorHex(tileCfg.colorHex)};color:#0f172a">
          ${escapeHtml(tileCfg.icon)} Lãnh Địa Của Bạn (Cấp ${tileState.level})
        </span>
        <h3 class="action-card-title">Nâng Cấp ${escapeHtml(tileCfg.name)}</h3>
        <div class="smart-nudge-row">
          <span class="smart-nudge-pill roi">💰 Tiền thuê mới: $${nextRent}/lượt</span>
          <span class="smart-nudge-pill">🎯 Xác suất khách ghé: ${analytics.landingProbabilityPct}%</span>
        </div>
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
          this.pixelFx.spawnLevelUpPillar(
            this.islandBoard.getTileWorldCenter(res.tileIndex),
            st.level
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
        <span class="action-card-badge" style="background:#9333ea;color:#ffffff">🟣 Cổng Obsidian Nether</span>
        <h3 class="action-card-title">Dịch Chuyển Xuyên Không Gian Nether!</h3>
        <p class="action-card-desc">${escapeHtml(res.message)}</p>
        <div class="action-btn-group">
          <button id="act-btn-nether-warp" class="action-btn action-btn-buy">
            <span>🟣 Bước Vào Cổng Nether (+$${GAME_RULES_CONFIG.netherWarpGoldBonus})</span>
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
      this.renderPortalTargetPickerModal(playerId, playerSlot);
      return;
    }

    // Q3 Resolved Decision: At Tile #20 (`FESTIVAL`), player can EITHER:
    // 1. Boost an owned property's rent x2 for 3 rounds (`festivalTurnsLeft = 3`)
    // 2. OR Open the Dimensional Portal to fly to any tile on the board!
    if (res.action === 'CHOOSE_FESTIVAL_TILE') {
      const owned = this.engine.getAllTileStates().filter((t) => t.ownerId === playerId);
      if (owned.length === 0) {
        const prevGold = player.gold;
        player.gold += GAME_RULES_CONFIG.festivalNoPropertyGoldBonus;
        soundManager.playCoinChime();
        this.animateSinglePlayerCoinDeltaOnHUD(playerId, prevGold, player.gold);

        inner.innerHTML = `
          <span class="action-card-badge" style="background:#ec4899;color:#ffffff">🎉 Đại Tiệc & Cổng Lễ Hội (#20)</span>
          <h3 class="action-card-title">Trợ Cấp Lễ Hội +$${GAME_RULES_CONFIG.festivalNoPropertyGoldBonus} Hoặc Mở Cổng Dịch Chuyển!</h3>
          <p class="action-card-desc">
            Bạn chưa sở hữu ô đất nào nên đã nhận ngay <strong>+$${GAME_RULES_CONFIG.festivalNoPropertyGoldBonus}</strong> quỹ Lễ Hội.<br/>
            Bạn có muốn mở <strong>🌌 Cổng Dịch Chuyển Không Gian</strong> để bay tới ô bất kỳ không?
          </p>
          <div class="action-btn-group">
            <button id="fest-btn-open-portal" class="action-btn action-btn-upgrade">
              <span>🌌 Mở Cổng Dịch Chuyển Tới Ô Bất Kỳ</span>
              <kbd class="key-hint">B</kbd>
            </button>
            <button id="fest-btn-done" class="action-btn action-btn-buy">
              <span>Tiếp Tục Lượt Kế ➡️</span>
              <kbd class="key-hint">Space</kbd>
            </button>
          </div>
        `;

        const doOpenPortal = () => {
          this.activeModalPrimaryAction = null;
          this.activeModalBuyoutAction = null;
          this.renderPortalTargetPickerModal(playerId, playerSlot);
        };
        const doDone = () => {
          this.hideActionModal();
          this.advanceToNextTurn();
        };

        this.activeModalPrimaryAction = doDone;
        this.activeModalBuyoutAction = doOpenPortal;
        document.getElementById('fest-btn-open-portal')?.addEventListener('click', doOpenPortal);
        document.getElementById('fest-btn-done')?.addEventListener('click', doDone);
        return;
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
            return `<button class="portal-tile-btn" data-fest="${st.index}">${escapeHtml(cfg.icon)} ${escapeHtml(cfg.name)} ($${this.engine.calculateRent(st.index)})</button>`;
          })
          .join('');

        inner.innerHTML = `
          <span class="action-card-badge" style="background:#ec4899;color:#ffffff">🎉 Đại Tiệc & Cổng Lễ Hội (#20)</span>
          <h3 class="action-card-title">Nhân Đôi (x2 Thuê 3 Vòng) Hoặc Dịch Chuyển!</h3>
          <p class="action-card-desc">Chọn 1 ô đất của bạn bên dưới để <strong>Nhân Đôi (x2) tiền thuê trong 3 vòng</strong>, hoặc mở Cổng Dịch Chuyển:</p>
          <div class="portal-grid">${ownedButtons}</div>
          <div class="action-btn-group">
            <button id="fest-btn-open-portal" class="action-btn action-btn-upgrade" style="width:100%">
              <span>🌌 Hoặc Mở Cổng Dịch Chuyển Tới Ô Bất Kỳ</span>
              <kbd class="key-hint">B</kbd>
            </button>
          </div>
        `;

        inner.querySelectorAll<HTMLButtonElement>('.portal-tile-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            executeFest(Number(btn.dataset.fest || 0));
          });
        });

        const doSwitchToPortal = () => {
          this.activeModalBuyoutAction = null;
          this.renderPortalTargetPickerModal(playerId, playerSlot);
        };
        this.activeModalBuyoutAction = doSwitchToPortal;
        document
          .getElementById('fest-btn-open-portal')
          ?.addEventListener('click', doSwitchToPortal);
        return;
      }
    }

    const chestCard = res.chestCard;
    const isKhiVan = chestCard?.deck === 'KHI_VAN';
    const routePillHtml =
      res.action === 'CHEST_DRAWN' &&
      typeof res.movedFromTile === 'number' &&
      typeof res.movedToTile === 'number'
        ? `<div class="chest-card-route-pill">✈️ Đã bay 1 vòng bàn cờ: Ô #${res.movedFromTile} ➡️ Ô #${res.movedToTile} (${escapeHtml(this.engine.getTileConfig(res.movedToTile).name)})</div>`
        : res.sentToJailByCard
          ? `<div class="chest-card-route-pill">🌌 Đã bị hút vào Cổng The End ➡️ Rơi xuống Nhà Tù Chí Hòa (#10)</div>`
          : '';

    const chestFlipStageHtml =
      res.action === 'CHEST_DRAWN' && chestCard
        ? `
          <div class="chest-card-flip-stage">
            <div class="chest-card-flip-inner ${isKhiVan ? 'chest-deck-khi-van' : 'chest-deck-co-hoi'}">
              <div class="chest-card-emblem">${isKhiVan ? '🧧' : '⚡'}</div>
              <div style="font-size:13px;font-weight:900;color:#fde68a;margin-bottom:4px">
                ${escapeHtml(chestCard.title)}
              </div>
              <div style="font-size:12px;color:#e2e8f0;line-height:1.45">
                ${escapeHtml(chestCard.description)}
              </div>
              ${routePillHtml}
            </div>
          </div>
        `
        : '';

    inner.innerHTML = `
      <span class="action-card-badge" style="background:${sanitizeColorHex(tileCfg.colorHex)};color:#0f172a">
        ${escapeHtml(tileCfg.icon)} Ô #${tileCfg.index} • ${escapeHtml(tileCfg.name)}
      </span>
      <h3 class="action-card-title">${
        res.action === 'CHEST_DRAWN'
          ? isKhiVan
            ? '🧧 Thẻ Khí Vận Việt Nam!'
            : '⚡ Thẻ Cơ Hội Việt Nam!'
          : res.action === 'JUST_VISITING_JAIL'
            ? '👀 Thăm Tù Chí Hòa (An Toàn • Không Mất Lượt)'
            : res.action === 'SENT_TO_JAIL'
              ? '🚓 Áp Giải Vào Nhà Tù Chí Hòa (#10)!'
              : res.action === 'SKIP_TURN_SET'
                ? '🏝️ Tạm Giữ Tại Đảo Cách Ly (Mất 1 Lượt)!'
                : escapeHtml(tileCfg.name)
      }</h3>
      ${chestFlipStageHtml}
      <p class="action-card-desc">${escapeHtml(res.message)}</p>
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

    const newRound = this.engine.getRound();
    if (newRound !== prevRound) {
      this.syncAllBuildingsToBoard();
      if (newRound % 3 === 1) {
        const nextPhase =
          this.timeOfDayPhase === 'DAY'
            ? 'SUNSET'
            : this.timeOfDayPhase === 'SUNSET'
              ? 'NIGHT'
              : 'DAY';
        this.setEnvironmentTimeOfDay(nextPhase);
      }
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

  /**
   * Generates a downloadable Victory Share Card PNG (`📸 Tải Ảnh Vinh Danh Tỷ Phú`)
   */
  private downloadVictoryShareCardPng(winnerName: string, emoji: string): void {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 960, 540);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#064e3b');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 960, 540);

    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 8;
    ctx.strokeRect(24, 24, 912, 492);

    ctx.fillStyle = '#fde047';
    ctx.font = '900 28px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 ASTROCYBERR MONOPOLY — SÀI GÒN VOXEL CYBER-CRAFT 🏆', 480, 110);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 58px "Be Vietnam Pro", sans-serif';
    ctx.fillText(`${emoji} ${winnerName}`, 480, 230);

    ctx.fillStyle = '#6ee7b7';
    ctx.font = '800 32px "Be Vietnam Pro", sans-serif';
    ctx.fillText(
      `NHÀ VÔ ĐỊCH ĐÔ THỊ 40 Ô • VÒNG ${this.engine.getRound()}`,
      480,
      310
    );

    const winner = this.engine.getWinner();
    const netWorth = winner ? this.engine.calculatePlayerNetWorth(winner.id) : 0;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 24px "Be Vietnam Pro", sans-serif';
    ctx.fillText(`Tổng Tài Sản Ròng (Net Worth): $${netWorth.toLocaleString('en-US')}`, 480, 385);

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `astrocyberr-victory-${Date.now()}.png`;
    a.click();
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
      <h3 class="action-card-title">${escapeHtml(emoji)} ${escapeHtml(winnerName)} Chiến Thắng!</h3>
      <p class="action-card-desc">Chúc mừng Tỷ Phú Voxel mới của vương quốc Sài Gòn Voxel Cyber-Craft!</p>
      <div class="action-btn-group">
        <button id="act-btn-share-png" class="action-btn action-btn-upgrade">
          <span>📸 Tải Ảnh Vinh Danh Tỷ Phú</span>
        </button>
        <button id="act-btn-restart" class="action-btn action-btn-buy">
          <span>🔄 Chơi Lại Ván Mới</span>
          <kbd class="key-hint">Space</kbd>
        </button>
      </div>
    `;

    const doRestart = () => {
      this.startNewGame(
        this.engine.getMode(),
        this.selectedHumanCount,
        this.selectedPrimaryChar
      );
    };
    this.activeModalPrimaryAction = doRestart;
    document.getElementById('act-btn-restart')!.addEventListener('click', doRestart);
    document.getElementById('act-btn-share-png')?.addEventListener('click', () => {
      this.downloadVictoryShareCardPng(winnerName, emoji);
    });
  }

  private showBottomLeftTilePopup(tileIndex: number): void {
    const popup = document.getElementById('tile-popup-bottom-left')!;
    const header = document.getElementById('tile-popup-header')!;
    const iconEl = document.getElementById('tile-popup-icon')!;
    const titleEl = document.getElementById('tile-popup-title')!;
    const bodyEl = document.getElementById('tile-popup-body')!;

    const cfg = this.engine.getTileConfig(tileIndex % BOARD_SIZE);
    const st = this.engine.getTileState(tileIndex % BOARD_SIZE);
    const owner = st.ownerId ? this.engine.getPlayerById(st.ownerId) : null;
    const analytics = getTileAnalytics(cfg.index);

    header.style.background = sanitizeColorHex(cfg.colorHex);
    iconEl.textContent = cfg.icon;
    titleEl.textContent = `#${cfg.index} ${cfg.name}`;

    const rows: string[] = [];

    const groupInfo = COLOR_GROUP_ORDER.find((g) => g.id === cfg.group);
    if (groupInfo) {
      rows.push(`
        <div class="popup-v-row">
          <span class="popup-v-label">Cụm màu</span>
          <span class="popup-v-val" style="color:${groupInfo.hex}">${escapeHtml(groupInfo.label)}</span>
        </div>
      `);
    }

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
      const currentRent = st.mortgaged
        ? 0
        : st.ownerId
          ? this.engine.calculateRent(cfg.index)
          : cfg.type === 'UTILITY'
            ? `${cfg.rents[0]}× Xúc xắc`
            : cfg.rents[0];
      const rentTableStr =
        cfg.type === 'UTILITY'
          ? `${cfg.rents[0]}× / ${cfg.rents[1]}× Xúc xắc`
          : `$${cfg.rents.join(' / $')}`;

      const festBadge =
        st.festivalMultiplier > 1
          ? ` (x${st.festivalMultiplier} • còn ${st.festivalTurnsLeft ?? 1} vòng)`
          : '';

      rows.push(`
        <div class="popup-v-row">
          <span class="popup-v-label">Tiền thuê hiện tại</span>
          <span class="popup-v-val emerald">${
            st.mortgaged
              ? '<span style="color:#f59e0b">📜 ĐANG THẾ CHẤP ($0)</span>'
              : typeof currentRent === 'number'
                ? `$${currentRent}${festBadge}`
                : currentRent
          }</span>
        </div>
        <div class="popup-v-row">
          <span class="popup-v-label">Bảng giá thuê</span>
          <span class="popup-v-val">${escapeHtml(rentTableStr)}</span>
        </div>
      `);
    }

    if (cfg.type === 'PROPERTY' || cfg.type === 'RAILROAD' || cfg.type === 'UTILITY') {
      rows.push(`
        <div class="popup-v-row">
          <span class="popup-v-label">Xác suất dừng / ROI</span>
          <span class="popup-v-val" style="color:#7dd3fc">${analytics.landingProbabilityPct}% • ROI ${analytics.baseRoiPct}%-${analytics.maxRoiPct}%</span>
        </div>
        <div class="popup-v-row">
          <span class="popup-v-label">Chủ sở hữu</span>
          <span class="popup-v-val">${owner ? `${escapeHtml(owner.emoji)} ${escapeHtml(owner.name)}` : 'Chưa có chủ'}</span>
        </div>
        <div class="popup-v-row">
          <span class="popup-v-label">Thế chấp (${GAME_RULES_CONFIG.mortgageRatePct}%)</span>
          <span class="popup-v-val">$${this.engine.getMortgageValue(cfg.index)} (Chuộc: $${this.engine.getUnmortgageCost(cfg.index)})</span>
        </div>
      `);

      const activePlayer = this.engine.getCurrentPlayer();
      if (!activePlayer.isBot && st.ownerId === activePlayer.id) {
        if (!st.mortgaged) {
          rows.push(`
            <div style="margin-top:6px">
              <button id="btn-popup-mortgage" class="action-btn action-btn-skip" style="width:100%;padding:7px 10px;font-size:12px">
                📜 Thế Chấp Ngân Hàng (+$${this.engine.getMortgageValue(cfg.index)})
              </button>
            </div>
          `);
        } else {
          rows.push(`
            <div style="margin-top:6px">
              <button id="btn-popup-unmortgage" class="action-btn action-btn-buy" style="width:100%;padding:7px 10px;font-size:12px">
                🔓 Giải Chấp Chuộc Đất (-$${this.engine.getUnmortgageCost(cfg.index)})
              </button>
            </div>
          `);
        }
      }
    }

    if (cfg.rentReason) {
      rows.push(`
        <div class="popup-v-row">
          <span class="popup-v-label">Lý do thu phí</span>
          <span class="popup-v-val" style="text-align:right;max-width:155px">${escapeHtml(cfg.rentReason)}</span>
        </div>
      `);
    }

    rows.push(`<div class="popup-v-desc">${escapeHtml(cfg.description)}</div>`);

    bodyEl.innerHTML = rows.join('');
    popup.classList.remove('hidden');

    document.getElementById('btn-popup-mortgage')?.addEventListener('click', () => {
      const activePlayer = this.engine.getCurrentPlayer();
      const prevGold = activePlayer.gold;
      const res = this.engine.mortgageProperty(activePlayer.id, cfg.index);
      if (res.ok) {
        soundManager.playCoinChime();
        this.animateSinglePlayerCoinDeltaOnHUD(activePlayer.id, prevGold, activePlayer.gold);
        this.showBottomLeftTilePopup(cfg.index);
      }
    });

    document.getElementById('btn-popup-unmortgage')?.addEventListener('click', () => {
      const activePlayer = this.engine.getCurrentPlayer();
      const prevGold = activePlayer.gold;
      const res = this.engine.unmortgageProperty(activePlayer.id, cfg.index);
      if (res.ok) {
        soundManager.playCoinChime();
        this.animateSinglePlayerCoinDeltaOnHUD(activePlayer.id, prevGold, activePlayer.gold);
        this.showBottomLeftTilePopup(cfg.index);
      }
    });
  }

  private showPropertyAuctionModal(humanPlayerId: string, tileIndex: number): void {
    const modal = document.getElementById('floating-action-modal')!;
    const inner = document.getElementById('action-card-inner')!;
    const human = this.engine.getPlayerById(humanPlayerId);
    const tileCfg = this.engine.getTileConfig(tileIndex);
    const listPrice = tileCfg.price ?? 100;

    let currentHumanBid = Math.min(human.gold, Math.max(20, Math.round(listPrice * 0.6)));

    const renderAuctionUI = () => {
      inner.innerHTML = `
        <span class="action-card-badge" style="background:#f59e0b;color:#0f172a">
          🔨 ĐẤU GIÁ CÔNG KHAI • LUẬT CỜ TỶ PHÚ
        </span>
        <h3 class="action-card-title">Đấu Giá: ${escapeHtml(tileCfg.icon)} ${escapeHtml(tileCfg.name)}</h3>
        <p class="action-card-desc">
          Ô đất bị bỏ qua được đưa ra đấu giá công khai (Giá niêm yết: <strong>$${listPrice}</strong>).<br/>
          Đặt mức giá của bạn để cạnh tranh cùng các Tỷ Phú AI!
        </p>
        <div class="rent-invoice-box">
          <div class="rent-invoice-row">
            <span>Mức trả giá của bạn</span>
            <strong class="emerald-val">$${currentHumanBid}</strong>
          </div>
          <div class="rent-invoice-row">
            <span>Số dư hiện tại</span>
            <span>$${human.gold}</span>
          </div>
        </div>
        <div class="action-btn-group" style="display:flex;gap:8px;margin-bottom:8px">
          <button id="auc-btn-plus-10" class="action-btn action-btn-skip" style="flex:1">+$10</button>
          <button id="auc-btn-plus-25" class="action-btn action-btn-skip" style="flex:1">+$25</button>
          <button id="auc-btn-plus-50" class="action-btn action-btn-skip" style="flex:1">+$50</button>
        </div>
        <div class="action-btn-group">
          <button id="auc-btn-submit" class="action-btn action-btn-buy">
            <span>🔨 Chốt Giá Đấu ($${currentHumanBid})</span>
            <kbd class="key-hint">Space</kbd>
          </button>
          <button id="auc-btn-fold" class="action-btn action-btn-skip">
            <span>Bỏ Cuộc (Nhường AI Đấu Giá)</span>
            <kbd class="key-hint">Esc</kbd>
          </button>
        </div>
      `;

      document.getElementById('auc-btn-plus-10')?.addEventListener('click', () => {
        currentHumanBid = Math.min(human.gold, currentHumanBid + 10);
        renderAuctionUI();
      });
      document.getElementById('auc-btn-plus-25')?.addEventListener('click', () => {
        currentHumanBid = Math.min(human.gold, currentHumanBid + 25);
        renderAuctionUI();
      });
      document.getElementById('auc-btn-plus-50')?.addEventListener('click', () => {
        currentHumanBid = Math.min(human.gold, currentHumanBid + 50);
        renderAuctionUI();
      });

      const finalizeAuction = (humanBidAmount: number) => {
        const res = this.engine.runPropertyAuction(tileIndex, {
          [humanPlayerId]: humanBidAmount
        });
        if (res.winnerId) {
          soundManager.playCoinChime();
          const winner = this.engine.getPlayerById(res.winnerId);
          const st = this.engine.getTileState(tileIndex);
          this.islandBoard.updateTileBuilding(
            tileIndex,
            st.level,
            winner.color,
            st.festivalMultiplier
          );
        }
        this.showBottomLeftTilePopup(tileIndex);
        this.renderHUD();
        this.hideActionModal();
        this.advanceToNextTurn();
      };

      const doSubmit = () => finalizeAuction(currentHumanBid);
      const doFold = () => finalizeAuction(0);

      this.activeModalPrimaryAction = doSubmit;
      this.activeModalSecondaryAction = doFold;

      document.getElementById('auc-btn-submit')!.addEventListener('click', doSubmit);
      document.getElementById('auc-btn-fold')!.addEventListener('click', doFold);
    };

    modal.classList.remove('hidden');
    renderAuctionUI();
  }

  private renderHUD(): void {
    const active = this.engine.getCurrentPlayer();

    document.getElementById('round-counter')!.textContent = `VÒNG ${this.engine.getRound()}`;
    document.getElementById('active-player-banner')!.textContent =
      `Lượt: ${active.name.toUpperCase()}`;

    const btnRoll = document.getElementById('btn-roll-dice') as HTMLButtonElement;
    btnRoll.disabled = this.isBusy || active.isBot;
    document.getElementById('btn-roll-text')!.textContent = active.isBot
      ? `${active.name} ĐANG ĐI...`
      : active.inJail
        ? '🚓 THOÁT TÙ / TUNG XÚC XẮC'
        : 'TUNG XÚC XẮC';

    const sidebar = document.getElementById('players-sidebar')!;
    sidebar.innerHTML = this.engine
      .getPlayers()
      .map((p) => {
        const isCurrent = p.id === active.id && !p.bankrupt;
        const charCfg = CHARACTER_CONFIGS.find((c) => c.id === p.characterId);
        const netWorth = this.engine.calculatePlayerNetWorth(p.id);
        const avatarUrl = getOrDrawCharacterAvatarDataUrl(p.characterId);

        const statusPills: string[] = [];
        if (p.bankrupt) {
          statusPills.push(`<span class="status-pill status-pill-bankrupt">💀 PHÁ SẢN • LOẠI</span>`);
        } else {
          if (charCfg) {
            statusPills.push(
              `<span class="status-pill status-pill-passive" title="${escapeHtml(charCfg.passiveDescription)}">${escapeHtml(charCfg.passiveName)}</span>`
            );
          }
          if (p.inJail) {
            statusPills.push(
              `<span class="status-pill status-pill-skip">🚓 ĐANG Ở TÙ (#10)</span>`
            );
          }
          if ((p.jailFreeCards ?? 0) > 0) {
            statusPills.push(
              `<span class="status-pill status-pill-passive">🕊️ Thẻ Ra Tù x${p.jailFreeCards}</span>`
            );
          }
          if (p.skipTurns > 0) {
            statusPills.push(
              `<span class="status-pill status-pill-skip">🏝️ Mất ${p.skipTurns} lượt</span>`
            );
          }
        }

        const colorDotsHtml = COLOR_GROUP_ORDER.map((grp) => {
          const own = this.engine.getPlayerColorGroupOwnership(p.id, grp.id);
          const cls = own.isMonopoly ? 'monopoly' : own.ownedCount > 0 ? 'owned' : '';
          return `<span class="color-group-dot ${cls}" style="--dot-color:${grp.hex}" title="${escapeHtml(grp.fullLabel)}: ${own.ownedCount}/${own.totalCount} ô${own.isMonopoly ? ' (ĐỘC QUYỀN x1.5!)' : ''}"></span>`;
        }).join('');

        return `
          <div
            class="player-rect-card ${isCurrent ? 'active-turn' : ''} ${p.bankrupt ? 'bankrupt' : ''}"
            data-player-card-id="${p.id}"
            data-player-char-id="${p.characterId}"
            title="${escapeHtml(p.name)} • Tổng tài sản: $${netWorth.toLocaleString('en-US')} • ${escapeHtml(charCfg?.passiveDescription ?? '')}"
          >
            ${isCurrent ? '<span class="active-turn-pill">▶ ĐANG ĐI</span>' : ''}
            <img
              class="player-grass-avatar-canvas"
              src="${avatarUrl}"
              alt="${escapeHtml(p.name)}"
            />
            <div class="player-rect-info">
              <div class="player-rect-name">${escapeHtml(p.name)}</div>
              <div class="player-rect-coin" data-player-coin-id="${p.id}">
                $${p.gold.toLocaleString('en-US')}
                <span class="player-networth-sub" title="Tổng tài sản ròng (Tiền mặt + Đất + Nhà)">• TS $${netWorth.toLocaleString('en-US')}</span>
              </div>
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

    const logContainer = document.getElementById('event-log-list')!;
    logContainer.innerHTML = this.engine
      .getLogs()
      .slice(0, 28)
      .map((item) => `<div class="log-item">${escapeHtml(item)}</div>`)
      .join('');
  }

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

  private initSupabaseLiveConfigSync(): void {
    fetchAndApplyMonopolyCloudConfig()
      .then((cloud) => {
        if (cloud) {
          this.syncAllBuildingsToBoard();
          this.renderHUD();
        }
      })
      .catch(() => {});

    subscribeMonopolyCloudConfigRealtime(() => {
      this.syncAllBuildingsToBoard();
      this.renderHUD();
    });
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
      this.syncIdleCharactersToElevatedTiles();
      this.characters3D.updateIdle(elapsed);
      this.particles.update(dt);
      this.pixelFx.update(dt);

      const activePlayer = this.engine.getCurrentPlayer();
      const activePos = activePlayer
        ? this.characters3D.getCharacterWorldPosition(activePlayer.characterId)
        : undefined;
      this.cameraDirector.update(dt, activePos);

      this.renderer.render(this.scene, this.cameraDirector.camera);
    };
    tick();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new AstroCyberrMonopolyApp();
});
