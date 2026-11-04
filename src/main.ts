import './styles/main.css';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import {
  BOARD_SIZE,
  BOARD_TILES,
  BUILDING_TIER_NAMES,
  COLOR_GROUP_LABELS,
  CharacterId
} from './core/boardData';
import { GameEngine, GameMode, TileResolutionResult } from './core/gameEngine';
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
 * for the compact rectangular player cards (Requirement #5)!
 */
function drawCharacterOnGrassBlockAvatar(canvas: HTMLCanvasElement, charId: CharacterId): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;

  // 1. Draw Isometric 3D Minecraft Grass Block at bottom (y: 44..78)
  // Top grass diamond
  ctx.fillStyle = '#4ade80';
  ctx.beginPath();
  ctx.moveTo(cx, 44);
  ctx.lineTo(cx + 26, 55);
  ctx.lineTo(cx, 66);
  ctx.lineTo(cx - 26, 55);
  ctx.closePath();
  ctx.fill();

  // Left dirt/grass face
  ctx.fillStyle = '#854d0e';
  ctx.beginPath();
  ctx.moveTo(cx - 26, 55);
  ctx.lineTo(cx, 66);
  ctx.lineTo(cx, 84);
  ctx.lineTo(cx - 26, 73);
  ctx.closePath();
  ctx.fill();

  // Left green grass overhang trim
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.moveTo(cx - 26, 55);
  ctx.lineTo(cx, 66);
  ctx.lineTo(cx, 72);
  ctx.lineTo(cx - 26, 61);
  ctx.closePath();
  ctx.fill();

  // Right dirt/grass face (slightly darker for 3D shading)
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

  // 2. Draw Chibi Character standing on top of the Grass Block (y: 8..54)
  const palette =
    charId === 'steve'
      ? { head: '#c68662', hair: '#4a2e1b', body: '#06b6d4', legs: '#3b4cca', eyes: '#3b4cca' }
      : charId === 'alex'
        ? { head: '#f3c6a5', hair: '#d96b27', body: '#22c55e', legs: '#78350f', eyes: '#15803d' }
        : charId === 'creeper'
          ? { head: '#4ade80', hair: '#22c55e', body: '#22c55e', legs: '#15803d', eyes: '#090d16' }
          : { head: '#18181b', hair: '#09090b', body: '#18181b', legs: '#09090b', eyes: '#d8b4fe' };

  // Legs
  ctx.fillStyle = palette.legs;
  ctx.fillRect(cx - 8, 44, 7, 10);
  ctx.fillRect(cx + 1, 44, 7, 10);

  // Body
  ctx.fillStyle = palette.body;
  ctx.fillRect(cx - 10, 31, 20, 14);

  // Chibi 1.2x Big Square Head
  ctx.fillStyle = palette.head;
  ctx.fillRect(cx - 14, 7, 28, 25);

  // Hair / Top detail
  ctx.fillStyle = palette.hair;
  ctx.fillRect(cx - 14, 7, 28, 7);

  // Eyes / Creeper Face
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
  private selectedSetupMode: GameMode = 'SOLO_VS_AI';
  private selectedHumanCount = 2;

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
    this.scene.fog = new THREE.FogExp2('#7dd3fc', 0.0085);

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
    sunLight.shadow.camera.far = 90;
    const d = 22;
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

    window.addEventListener('resize', () => {
      this.cameraDirector.resize(window.innerWidth, window.innerHeight);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Requirement #7: Click any tile on the 3D board -> show non-intrusive popup at bottom-left!
    this.renderer.domElement.addEventListener('click', (ev) => {
      if (this.cameraDirector.wasDragging()) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.cameraDirector.camera);

      const hits = this.raycaster.intersectObjects(this.islandBoard.root.children, true);
      for (const hit of hits) {
        const idx = hit.object.userData?.tileIndex ?? hit.object.parent?.userData?.tileIndex;
        if (typeof idx === 'number') {
          this.showBottomLeftTilePopup(idx);
          break;
        }
      }
    });
  }

  private bindUIEvents(): void {
    const btnRoll = document.getElementById('btn-roll-dice') as HTMLButtonElement;
    const btnGear = document.getElementById('btn-settings-gear')!;
    const settingsPopover = document.getElementById('settings-popover')!;
    const btnSfx = document.getElementById('btn-sfx-toggle')!;
    const btnBgm = document.getElementById('btn-bgm-toggle')!;
    const btnModeSelect = document.getElementById('btn-mode-select')!;
    const btnBlockbench = document.getElementById('btn-blockbench-info')!;

    btnRoll.addEventListener('click', () => {
      if (!this.isBusy) {
        this.executeCurrentPlayerTurn();
      }
    });

    // Requirement #4: Gear icon toggles settings popover
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
      label.textContent = on ? 'BẬT' : 'TẮT';
      label.className = on ? 'emerald-text' : 'muted-text';
    });

    btnBgm.addEventListener('click', () => {
      const on = soundManager.toggleBgm();
      const label = document.getElementById('bgm-status-label')!;
      label.textContent = on ? 'BẬT' : 'TẮT';
      label.className = on ? 'emerald-text' : 'muted-text';
    });

    // Requirement #7: Close bottom-left tile popup
    document.getElementById('btn-close-tile-popup')!.addEventListener('click', () => {
      document.getElementById('tile-popup-bottom-left')!.classList.add('hidden');
    });

    // Requirement #8: Collapsible right event log drawer
    const logDrawer = document.getElementById('event-log-drawer')!;
    const logArrowIcon = document.getElementById('log-drawer-arrow-icon')!;
    document.getElementById('btn-toggle-log-drawer')!.addEventListener('click', () => {
      const isCollapsed = logDrawer.classList.toggle('collapsed');
      logArrowIcon.textContent = isCollapsed ? '◀' : '▶';
    });

    // Setup Modal
    const setupModal = document.getElementById('setup-modal')!;
    btnModeSelect.addEventListener('click', () => {
      settingsPopover.classList.add('hidden');
      setupModal.classList.remove('hidden');
    });
    document.getElementById('btn-close-setup')!.addEventListener('click', () => {
      setupModal.classList.add('hidden');
    });

    document.querySelectorAll<HTMLButtonElement>('.mode-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.selectedSetupMode = (tab.dataset.mode as GameMode) || 'SOLO_VS_AI';
        const onlineSec = document.getElementById('online-room-section')!;
        onlineSec.style.display = this.selectedSetupMode === 'ONLINE_ROOM' ? 'block' : 'none';
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.count-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.count-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.selectedHumanCount = Number(chip.dataset.humans || 2);
      });
    });

    document.getElementById('btn-join-room')!.addEventListener('click', () => {
      const codeInput = document.getElementById('input-room-code') as HTMLInputElement;
      const roomCode = codeInput.value.trim() || 'ASTRO-888';
      this.connectOnlineRoom(roomCode);
      document.getElementById('room-status-note')!.textContent =
        `✅ Đã kết nối phòng [${roomCode}]!`;
    });

    document.getElementById('btn-start-new-game')!.addEventListener('click', () => {
      setupModal.classList.add('hidden');
      this.startNewGame(this.selectedSetupMode, this.selectedHumanCount);
    });

    // Blockbench Modal
    const bbModal = document.getElementById('blockbench-modal')!;
    btnBlockbench.addEventListener('click', () => {
      settingsPopover.classList.add('hidden');
      bbModal.classList.remove('hidden');
    });
    document.getElementById('btn-close-blockbench')!.addEventListener('click', () => {
      bbModal.classList.add('hidden');
    });
  }

  private connectOnlineRoom(roomCode: string): void {
    this.roomSync.connect(roomCode, (remoteState) => {
      this.engine.hydrate(remoteState);
      this.syncAllCharactersToBoard();
      this.syncAllBuildingsToBoard();
      this.renderHUD();
    });
  }

  private startNewGame(mode: GameMode, humanCount: number): void {
    this.isBusy = false;
    this.hideActionModal();
    this.dice3D.clearFusionFX();
    const humans = mode === 'SOLO_VS_AI' ? 1 : mode === 'ONLINE_ROOM' ? 4 : humanCount;
    this.engine.initGame(mode, humans, 1500);
    this.islandBoard.clearAllBuildings();
    this.syncAllCharactersToBoard();
    this.renderHUD();

    if (mode === 'ONLINE_ROOM') {
      this.roomSync.broadcastState(this.engine.serialize());
    }
  }

  private syncAllCharactersToBoard(): void {
    this.engine.getPlayers().forEach((p, idx) => {
      const pos = this.islandBoard.getTileStandPosition(p.position, idx);
      this.characters3D.placeCharacterAt(p.characterId, pos);
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
   * Requirement #10c:
   * Shows the fused dice total and waits 3 seconds (or until the player clicks Confirm)
   * before starting character movement, keeping game pacing smooth and unhurried.
   */
  private waitForDiceFusionConfirmation(d1: number, d2: number, total: number): Promise<void> {
    return new Promise((resolve) => {
      const bar = document.getElementById('dice-fusion-confirm-bar')!;
      const btnConfirm = document.getElementById('btn-confirm-move-now')!;
      const secSpan = document.getElementById('fusion-countdown-sec')!;

      document.getElementById('fusion-d1')!.textContent = `${d1}`;
      document.getElementById('fusion-d2')!.textContent = `${d2}`;
      document.getElementById('fusion-total')!.textContent = `${total} BƯỚC`;

      let remaining = 3;
      secSpan.textContent = `${remaining}`;
      bar.classList.remove('hidden');

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearInterval(timer);
        btnConfirm.removeEventListener('click', finish);
        bar.classList.add('hidden');
        this.dice3D.clearFusionFX();
        resolve();
      };

      btnConfirm.addEventListener('click', finish);

      const timer = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          finish();
        } else {
          secSpan.textContent = `${remaining}`;
        }
      }, 1000);
    });
  }

  private async executeCurrentPlayerTurn(): Promise<void> {
    if (this.isBusy || this.engine.getWinner()) return;
    this.isBusy = true;

    const player = this.engine.getCurrentPlayer();
    const playerIdx = this.engine.getCurrentPlayerIndex();
    const btnRoll = document.getElementById('btn-roll-dice') as HTMLButtonElement;
    btnRoll.disabled = true;

    // 1. Roll 3D Dice -> Glow Pips -> Fly Up -> Fuse into Total!
    const { d1, d2, total } = this.engine.rollDice();
    await this.dice3D.animateRollAndFuseTotal(d1, d2);

    document.getElementById('dice-last-result')!.textContent = `🎲 ${d1}+${d2}=${total}`;
    this.renderHUD();

    // 2. Show 3-second countdown / Confirm button before stepping
    await this.waitForDiceFusionConfirmation(d1, d2, total);

    // 3. Step-by-step locomotion across `total` tiles on the 40-tile board
    for (let step = 0; step < total; step++) {
      const fromPos = this.islandBoard.getTileStandPosition(player.position, playerIdx);
      const { newPosition, passedStart } = this.engine.stepPlayerOneTile(player.id);
      const toPos = this.islandBoard.getTileStandPosition(newPosition, playerIdx);

      await this.characters3D.animateStepToTile(player.characterId, fromPos, toPos, step);

      if (passedStart) {
        soundManager.playCoinChime();
        this.renderHUD();
      }
    }

    // 4. Update bottom-left tile popup & resolve landing
    this.showBottomLeftTilePopup(player.position);
    const resolution = this.engine.resolveTileLanding(player.id);
    this.renderHUD();

    if (resolution.action === 'PAID_RENT' || resolution.action === 'PAID_ROYAL_TAX') {
      soundManager.playPayRent();
    } else if (resolution.action === 'CHEST_DRAWN') {
      soundManager.playCoinChime();
      this.syncAllCharactersToBoard();
    }

    const winner = this.engine.getWinner();
    if (winner) {
      this.celebrateVictory(winner.name, winner.emoji);
      return;
    }

    if (player.isBot) {
      await this.delay(650);
      await this.handleBotPostLanding(player.id, playerIdx);
      await this.delay(550);
      this.advanceToNextTurn();
    } else {
      this.showHumanActionModal(player.id, playerIdx, resolution);
    }
  }

  private async handleBotPostLanding(botId: string, botSlot: number): Promise<void> {
    const bot = this.engine.getPlayerById(botId);
    const decision = chooseBotAction(this.engine, botId);

    if (decision.type === 'BUY_PROPERTY') {
      const res = this.engine.buyProperty(botId, decision.tileIndex);
      if (res.ok) {
        const state = this.engine.getTileState(decision.tileIndex);
        this.islandBoard.updateTileBuilding(
          decision.tileIndex,
          state.level,
          bot.color,
          state.festivalMultiplier
        );
      }
    } else if (decision.type === 'UPGRADE_PROPERTY') {
      const res = this.engine.upgradeProperty(botId, decision.tileIndex);
      if (res.ok) {
        const state = this.engine.getTileState(decision.tileIndex);
        this.islandBoard.updateTileBuilding(
          decision.tileIndex,
          state.level,
          bot.color,
          state.festivalMultiplier
        );
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
    } else if (decision.type === 'TELEPORT_TARGET') {
      soundManager.playPortalWarp();
      const fromPos = this.islandBoard.getTileStandPosition(bot.position, botSlot);
      this.particles.spawnEndermanPortalParticles(fromPos);
      this.engine.teleportFromEndPortal(botId, decision.tileIndex);
      const toPos = this.islandBoard.getTileStandPosition(bot.position, botSlot);
      this.characters3D.placeCharacterAt(bot.characterId, toPos);
      this.particles.spawnEndermanPortalParticles(toPos);

      const secondDecision = chooseBotAction(this.engine, botId);
      if (secondDecision.type === 'BUY_PROPERTY') {
        const buyRes = this.engine.buyProperty(botId, secondDecision.tileIndex);
        if (buyRes.ok) {
          const st = this.engine.getTileState(secondDecision.tileIndex);
          this.islandBoard.updateTileBuilding(
            secondDecision.tileIndex,
            st.level,
            bot.color,
            st.festivalMultiplier
          );
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

    if (res.action === 'CAN_BUY_PROPERTY') {
      inner.innerHTML = `
        <span class="action-card-badge" style="background:${tileCfg.colorHex};color:#0f172a">
          ${tileCfg.icon} Ô #${tileCfg.index} • Chưa Có Chủ
        </span>
        <h3 class="action-card-title">${tileCfg.name}</h3>
        <p class="action-card-desc">${res.message}<br/>Khi mua sẽ mọc ngay <strong>🪵 Cọc Rào Gỗ (Cấp 1)</strong>!</p>
        <div class="action-btn-group">
          <button id="act-btn-buy" class="action-btn action-btn-buy">🏠 Mua Đất (-$${res.amount})</button>
          <button id="act-btn-pass" class="action-btn action-btn-skip">Bỏ Qua</button>
        </div>
      `;

      document.getElementById('act-btn-buy')!.addEventListener('click', () => {
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
          this.renderHUD();
        }
        this.hideActionModal();
        this.advanceToNextTurn();
      });

      document.getElementById('act-btn-pass')!.addEventListener('click', () => {
        this.hideActionModal();
        this.advanceToNextTurn();
      });
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
            ⬆️ Nâng Cấp Nhà (-$${res.amount})
          </button>
          <button id="act-btn-pass" class="action-btn action-btn-skip">Giữ Nguyên</button>
        </div>
      `;

      document.getElementById('act-btn-upgrade')!.addEventListener('click', () => {
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
          this.renderHUD();
        }
        this.hideActionModal();
        this.advanceToNextTurn();
      });

      document.getElementById('act-btn-pass')!.addEventListener('click', () => {
        this.hideActionModal();
        this.advanceToNextTurn();
      });
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
        <span class="action-card-badge" style="background:#9333ea;color:#ffffff">🌌 Cổng Dịch Chuyển The End</span>
        <h3 class="action-card-title">Chọn Ô Bất Kỳ Để Bay Tới!</h3>
        <p class="action-card-desc">Nếu bay qua Ô Khởi Hành (#0) bạn vẫn được nhận <strong>+$200</strong>!</p>
        <div class="portal-grid">${tileButtonsHtml}</div>
      `;

      inner.querySelectorAll<HTMLButtonElement>('.portal-tile-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetIdx = Number(btn.dataset.target || 0);
          soundManager.playPortalWarp();
          const fromPos = this.islandBoard.getTileStandPosition(player.position, playerSlot);
          this.particles.spawnEndermanPortalParticles(fromPos);

          this.engine.teleportFromEndPortal(playerId, targetIdx);
          const toPos = this.islandBoard.getTileStandPosition(player.position, playerSlot);
          this.characters3D.placeCharacterAt(player.characterId, toPos);
          this.particles.spawnEndermanPortalParticles(toPos);

          this.showBottomLeftTilePopup(targetIdx);
          const postPortalRes = this.engine.resolveTileLanding(playerId);
          this.renderHUD();

          if (
            postPortalRes.action === 'CAN_BUY_PROPERTY' ||
            postPortalRes.action === 'CAN_UPGRADE_PROPERTY'
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
        player.gold += 80;
        soundManager.playCoinChime();
        this.renderHUD();
      } else {
        const ownedButtons = owned
          .map((st) => {
            const cfg = this.engine.getTileConfig(st.index);
            return `<button class="portal-tile-btn" data-fest="${st.index}">${cfg.icon} ${cfg.name} ($${this.engine.calculateRent(st.index)})</button>`;
          })
          .join('');

        inner.innerHTML = `
          <span class="action-card-badge" style="background:#ec4899;color:#ffffff">🎉 Đại Tiệc Lễ Hội Làng</span>
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
        res.action === 'PAID_RENT'
          ? `💸 Trả Tiền Thuê (-$${res.amount})`
          : res.action === 'CHEST_DRAWN'
            ? '🧰 Mở Rương Kho Báu Minecraft!'
            : res.action === 'SKIP_TURN_SET'
              ? '🏝️ Mắc Kẹt Trên Đảo Hoang!'
              : tileCfg.name
      }</h3>
      <p class="action-card-desc">${res.message}</p>
      <div class="action-btn-group">
        <button id="act-btn-continue" class="action-btn action-btn-buy">Tiếp Tục Lượt Kế ➡️</button>
      </div>
    `;

    document.getElementById('act-btn-continue')!.addEventListener('click', () => {
      this.hideActionModal();
      this.advanceToNextTurn();
    });
  }

  private hideActionModal(): void {
    document.getElementById('floating-action-modal')!.classList.add('hidden');
  }

  private advanceToNextTurn(): void {
    if (this.engine.getWinner()) return;

    const { activePlayer } = this.engine.nextTurn();
    this.isBusy = false;
    this.renderHUD();

    if (this.engine.getMode() === 'ONLINE_ROOM') {
      this.roomSync.broadcastState(this.engine.serialize());
    }

    if (activePlayer.isBot) {
      const btnRoll = document.getElementById('btn-roll-dice') as HTMLButtonElement;
      btnRoll.disabled = true;
      window.setTimeout(() => {
        this.executeCurrentPlayerTurn();
      }, 750);
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
      <span class="action-card-badge" style="background:#10b981;color:#0f172a">🏆 NHÀ VÔ ĐỊCH ĐẢO NỔI 40 Ô</span>
      <h3 class="action-card-title">${emoji} ${winnerName} Chiến Thắng!</h3>
      <p class="action-card-desc">Chúc mừng Tỷ Phú Voxel mới của vương quốc AstroCyberr Monopoly!</p>
      <div class="action-btn-group">
        <button id="act-btn-restart" class="action-btn action-btn-buy">🔄 Chơi Lại Ván Mới</button>
      </div>
    `;

    document.getElementById('act-btn-restart')!.addEventListener('click', () => {
      this.startNewGame(this.engine.getMode(), this.selectedHumanCount);
    });
  }

  /**
   * Requirement #7:
   * Non-intrusive Bottom-Left Tile Popup arranged vertically from top to bottom with clear spacing.
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
    const tier = BUILDING_TIER_NAMES[st.level] || BUILDING_TIER_NAMES[0];

    header.style.background = cfg.colorHex;
    iconEl.textContent = cfg.icon;
    titleEl.textContent = `#${cfg.index} ${cfg.name}`;

    if (cfg.type === 'PROPERTY' || cfg.type === 'RAILROAD' || cfg.type === 'UTILITY') {
      const currentRent = st.ownerId ? this.engine.calculateRent(cfg.index) : (cfg.rents?.[0] ?? 0);
      const groupName = cfg.colorGroup
        ? COLOR_GROUP_LABELS[cfg.colorGroup]
        : cfg.type === 'RAILROAD'
          ? 'Tuyến Đường Sắt Minecart'
          : 'Công Trình Năng Lượng';

      bodyEl.innerHTML = `
        <div class="popup-v-row">
          <span class="popup-v-label">Cụm / Loại</span>
          <span class="popup-v-val">${groupName}</span>
        </div>
        <div class="popup-v-row">
          <span class="popup-v-label">Giá mua đất</span>
          <span class="popup-v-val emerald">$${cfg.price}</span>
        </div>
        ${
          cfg.upgradeCost
            ? `<div class="popup-v-row">
                <span class="popup-v-label">Phí nâng cấp nhà</span>
                <span class="popup-v-val emerald">$${cfg.upgradeCost}</span>
               </div>`
            : ''
        }
        <div class="popup-v-row">
          <span class="popup-v-label">Tiền thuê hiện tại</span>
          <span class="popup-v-val emerald">$${currentRent}${st.festivalMultiplier > 1 ? ` (x${st.festivalMultiplier})` : ''}</span>
        </div>
        ${
          cfg.rents
            ? `<div class="popup-v-row">
                <span class="popup-v-label">Thuê Cấp 1 → 4</span>
                <span class="popup-v-val">$${cfg.rents.join(' / $')}</span>
               </div>`
            : ''
        }
        <div class="popup-v-row">
          <span class="popup-v-label">Công trình</span>
          <span class="popup-v-val">${tier.icon} ${tier.name}</span>
        </div>
        <div class="popup-v-row">
          <span class="popup-v-label">Chủ sở hữu</span>
          <span class="popup-v-val">${owner ? `${owner.emoji} ${owner.name}` : 'Chưa có chủ'}</span>
        </div>
        <div class="popup-v-desc">${cfg.description}</div>
      `;
    } else {
      bodyEl.innerHTML = `
        <div class="popup-v-row">
          <span class="popup-v-label">Loại ô đặc biệt</span>
          <span class="popup-v-val">${cfg.type}</span>
        </div>
        ${
          cfg.type === 'START'
            ? `<div class="popup-v-row"><span class="popup-v-label">Thưởng đi qua</span><span class="popup-v-val emerald">+$200</span></div>`
            : cfg.type === 'ROYAL_TAX'
              ? `<div class="popup-v-row"><span class="popup-v-label">Mức thuế</span><span class="popup-v-val" style="color:#f87171">-$${cfg.price ?? 120}</span></div>`
              : ''
        }
        <div class="popup-v-desc">${cfg.description}</div>
      `;
    }

    popup.classList.remove('hidden');
  }

  /**
   * Requirements #5 & #6:
   * Compact rectangular player cards showing ONLY:
   * - 3D Character Avatar standing on a Minecraft Grass Block
   * - Player Name
   * - Emerald Green `$` Balance
   */
  private renderHUD(): void {
    const active = this.engine.getCurrentPlayer();

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
        const isCurrent = p.id === active.id;
        return `
          <div class="player-rect-card ${isCurrent ? 'active-turn' : ''} ${p.bankrupt ? 'bankrupt' : ''}">
            <canvas
              class="player-grass-avatar-canvas"
              width="76"
              height="88"
              data-char-avatar="${p.characterId}"
            ></canvas>
            <div class="player-rect-info">
              <div class="player-rect-name">${p.name}</div>
              <div class="player-rect-coin">$${p.gold.toLocaleString('en-US')}</div>
            </div>
          </div>
        `;
      })
      .join('');

    // Render each character standing on a 3D Minecraft Grass Block onto their card canvas
    sidebar
      .querySelectorAll<HTMLCanvasElement>('canvas[data-char-avatar]')
      .forEach((canvas) => {
        const charId = canvas.dataset.charAvatar as CharacterId;
        drawCharacterOnGrassBlockAvatar(canvas, charId);
      });

    // Render Event Logs
    const logContainer = document.getElementById('event-log-list')!;
    logContainer.innerHTML = this.engine
      .getLogs()
      .slice(0, 18)
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
      this.characters3D.updateIdle(elapsed);
      this.particles.update(dt);
      this.cameraDirector.update(dt);

      this.renderer.render(this.scene, this.cameraDirector.camera);
    };
    tick();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new AstroCyberrMonopolyApp();
});
