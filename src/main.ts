import './styles/main.css';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import {
  BOARD_TILES,
  BUILDING_TIER_NAMES,
  CHARACTER_CONFIGS
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
    this.inspectTile(0);
    this.startRenderLoop();
  }

  private initThreeScene(): void {
    const container = document.getElementById('canvas-container')!;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#bae6fd');
    this.scene.fog = new THREE.FogExp2('#bae6fd', 0.014);

    // Safe WebGL2 Renderer initialization (WIKI-01-04)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[WebGL2 Guard] Context lost — preserving state');
    });

    // Warm Minecraft Daylight & Pastel Sky Lighting
    const hemiLight = new THREE.HemisphereLight('#ffffff', '#38bdf8', 0.95);
    hemiLight.position.set(0, 25, 0);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#fffbeb', 1.45);
    sunLight.position.set(14, 24, 16);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 60;
    const d = 14;
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

    // Click any 3D tile on the island to inspect its stats
    this.renderer.domElement.addEventListener('click', (ev) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.cameraDirector.camera);

      const hits = this.raycaster.intersectObjects(this.islandBoard.root.children, false);
      for (const hit of hits) {
        if (typeof hit.object.userData?.tileIndex === 'number') {
          this.inspectTile(hit.object.userData.tileIndex);
          break;
        }
      }
    });
  }

  private bindUIEvents(): void {
    const btnRoll = document.getElementById('btn-roll-dice') as HTMLButtonElement;
    const btnEndTurn = document.getElementById('btn-end-turn') as HTMLButtonElement;
    const btnModeSelect = document.getElementById('btn-mode-select')!;
    const btnCameraMode = document.getElementById('btn-camera-mode')!;
    const btnSfx = document.getElementById('btn-sfx-toggle')!;
    const btnBgm = document.getElementById('btn-bgm-toggle')!;
    const btnBlockbench = document.getElementById('btn-blockbench-info')!;

    btnRoll.addEventListener('click', () => {
      if (!this.isBusy) {
        this.executeCurrentPlayerTurn();
      }
    });

    btnEndTurn.addEventListener('click', () => {
      this.hideActionModal();
      this.advanceToNextTurn();
    });

    btnCameraMode.addEventListener('click', () => {
      const mode = this.cameraDirector.cycleMode();
      const label =
        mode === 'AUTO_CINEMA'
          ? '🎥 Cam: Tự Động'
          : mode === 'OVERVIEW_LOCKED'
            ? '🎥 Cam: Toàn Cảnh'
            : '🎥 Cam: Bám Sát';
      btnCameraMode.textContent = label;
    });

    btnSfx.addEventListener('click', () => {
      const on = soundManager.toggleSfx();
      btnSfx.textContent = on ? '🔊 SFX: Bật' : '🔇 SFX: Tắt';
    });

    btnBgm.addEventListener('click', () => {
      const on = soundManager.toggleBgm();
      btnBgm.textContent = on ? '🎵 Nhạc: Bật' : '🎵 Nhạc: Tắt';
    });

    // Setup Modal
    const setupModal = document.getElementById('setup-modal')!;
    btnModeSelect.addEventListener('click', () => setupModal.classList.remove('hidden'));
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
        `✅ Đã kết nối phòng [${roomCode}]! Mở thêm tab trình duyệt cùng mã để chơi đa cửa sổ.`;
    });

    document.getElementById('btn-start-new-game')!.addEventListener('click', () => {
      setupModal.classList.add('hidden');
      this.startNewGame(this.selectedSetupMode, this.selectedHumanCount);
    });

    // Blockbench Modal
    const bbModal = document.getElementById('blockbench-modal')!;
    btnBlockbench.addEventListener('click', () => bbModal.classList.remove('hidden'));
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
    const humans = mode === 'SOLO_VS_AI' ? 1 : mode === 'ONLINE_ROOM' ? 4 : humanCount;
    this.engine.initGame(mode, humans, 1200);
    this.islandBoard.clearAllBuildings();
    this.syncAllCharactersToBoard();
    this.cameraDirector.returnToOverview();

    const modeBadge = document.getElementById('mode-badge-text')!;
    modeBadge.textContent =
      mode === 'SOLO_VS_AI'
        ? 'Chế độ: 1 Người + 3 Bot AI Thông Minh'
        : mode === 'PASS_AND_PLAY'
          ? `Chế độ: ${humans} Người Chung Máy (Pass & Play)`
          : `Chế độ: 4 Người Online (Phòng ${this.roomSync.getRoomCode()})`;

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
   * Full Turn Pipeline:
   * 1. Throw 3D Voxel Dice & wait for bounce physics
   * 2. Move character step-by-step with unique locomotion (Hop / Enderman Teleport / Creeper TNT Explosion)
   * 3. Dynamic Camera glides along with each step
   * 4. Resolve landing tile & present Floating Action Card (or execute Smart Bot AI decision)
   */
  private async executeCurrentPlayerTurn(): Promise<void> {
    if (this.isBusy || this.engine.getWinner()) return;
    this.isBusy = true;

    const player = this.engine.getCurrentPlayer();
    const playerIdx = this.engine.getCurrentPlayerIndex();
    const btnRoll = document.getElementById('btn-roll-dice') as HTMLButtonElement;
    btnRoll.disabled = true;

    // 1. Focus center courtyard & roll 3D physics dice
    this.cameraDirector.focusDiceRoll();
    const { d1, d2, total } = this.engine.rollDice();
    await this.dice3D.animateRoll(d1, d2);

    document.getElementById('dice-last-result')!.textContent = `🎲 ${d1} + ${d2} = ${total}`;
    this.renderHUD();

    // 2. Step-by-step locomotion across `total` tiles
    for (let step = 0; step < total; step++) {
      const fromPos = this.islandBoard.getTileStandPosition(player.position, playerIdx);
      const { newPosition, passedStart } = this.engine.stepPlayerOneTile(player.id);
      const toPos = this.islandBoard.getTileStandPosition(newPosition, playerIdx);

      this.cameraDirector.followCharacterStep(toPos);
      await this.characters3D.animateStepToTile(player.characterId, fromPos, toPos, step);

      if (passedStart) {
        soundManager.playCoinChime();
        this.renderHUD();
      }
    }

    // 3. Inspect landed tile & focus Action Camera
    const finalWorldPos = this.islandBoard.getTileStandPosition(player.position, playerIdx);
    this.cameraDirector.focusTileAction(finalWorldPos);
    this.inspectTile(player.position);

    const resolution = this.engine.resolveTileLanding(player.id);
    this.renderHUD();

    if (resolution.action === 'PAID_RENT' || resolution.action === 'PAID_ROYAL_TAX') {
      soundManager.playPayRent();
    } else if (resolution.action === 'CHEST_DRAWN') {
      soundManager.playCoinChime();
      this.syncAllCharactersToBoard();
    }

    // Check if someone won
    const winner = this.engine.getWinner();
    if (winner) {
      this.celebrateVictory(winner.name, winner.emoji);
      return;
    }

    // 4. Bot AI vs Human Interactive Choice
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

      // If Bot landed on an unowned property after teleport, evaluate buying it!
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
          <button id="act-btn-buy" class="action-btn action-btn-buy">🏠 Mua Đất (-${res.amount} Vàng)</button>
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
          this.inspectTile(res.tileIndex);
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
          Nâng cấp công trình lên <strong>${nextTier.icon} ${nextTier.name} (Cấp ${tileState.level + 1})</strong> để tăng mạnh tiền thuê đất!
        </p>
        <div class="action-btn-group">
          <button id="act-btn-upgrade" class="action-btn action-btn-upgrade">
            ⬆️ Nâng Cấp Nhà (-${res.amount} Vàng)
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
          this.inspectTile(res.tileIndex);
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
      const tileButtonsHtml = BOARD_TILES.filter((t) => t.index !== 21)
        .map(
          (t) =>
            `<button class="portal-tile-btn" data-target="${t.index}">#${t.index} ${t.icon} ${t.name.split(' ').slice(0, 2).join(' ')}</button>`
        )
        .join('');

      inner.innerHTML = `
        <span class="action-card-badge" style="background:#9333ea;color:#ffffff">🌌 Cổng Dịch Chuyển The End</span>
        <h3 class="action-card-title">Chọn Ô Bất Kỳ Để Bay Tới!</h3>
        <p class="action-card-desc">Nếu bay qua Ô Khởi Hành (#0) bạn vẫn được nhận <strong>+200 Vàng</strong>!</p>
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

          this.cameraDirector.focusTileAction(toPos);
          this.inspectTile(targetIdx);
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
            return `<button class="portal-tile-btn" data-fest="${st.index}">${cfg.icon} ${cfg.name} (Hiện: ${this.engine.calculateRent(st.index)}G)</button>`;
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

    // Default notification card (Paid Rent, Chest Drawn, Deserted Island, Start, etc.)
    inner.innerHTML = `
      <span class="action-card-badge" style="background:${tileCfg.colorHex};color:#0f172a">
        ${tileCfg.icon} Ô #${tileCfg.index} • ${tileCfg.name}
      </span>
      <h3 class="action-card-title">${
        res.action === 'PAID_RENT'
          ? `💸 Trả Tiền Thuê (-${res.amount} Vàng)`
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

    this.cameraDirector.returnToOverview();
    const { activePlayer } = this.engine.nextTurn();
    this.isBusy = false;
    this.renderHUD();

    if (this.engine.getMode() === 'ONLINE_ROOM') {
      this.roomSync.broadcastState(this.engine.serialize());
    }

    // If next player is a Bot AI, trigger their turn automatically after a short pause
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
      particleCount: 140,
      spread: 90,
      origin: { y: 0.55 }
    });

    const modal = document.getElementById('floating-action-modal')!;
    const inner = document.getElementById('action-card-inner')!;
    modal.classList.remove('hidden');
    inner.innerHTML = `
      <span class="action-card-badge" style="background:#fbbf24;color:#0f172a">🏆 NHÀ VÔ ĐỊCH ĐẢO NỔI</span>
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

  private inspectTile(tileIndex: number): void {
    const cfg = this.engine.getTileConfig(tileIndex);
    const st = this.engine.getTileState(tileIndex);
    const owner = st.ownerId ? this.engine.getPlayerById(st.ownerId) : null;
    const tier = BUILDING_TIER_NAMES[st.level] || BUILDING_TIER_NAMES[0];

    document.getElementById('inspector-color-bar')!.style.background = cfg.colorHex;
    document.getElementById('inspector-icon')!.textContent = cfg.icon;
    document.getElementById('inspector-title')!.textContent = `#${cfg.index} ${cfg.name}`;

    const body = document.getElementById('inspector-body')!;
    if (cfg.type === 'PROPERTY' || cfg.type === 'RAILROAD') {
      const currentRent = st.ownerId ? this.engine.calculateRent(tileIndex) : (cfg.rents?.[0] ?? 0);
      body.innerHTML = `
        <p class="inspector-desc">${cfg.description}</p>
        <div class="inspector-stat-grid">
          <div class="stat-pill">💰 Giá mua: ${cfg.price}G</div>
          <div class="stat-pill">💸 Tiền thuê: ${currentRent}G</div>
          <div class="stat-pill">🏗️ ${tier.icon} ${tier.name}</div>
          <div class="stat-pill">👤 Chủ: ${owner ? owner.name : 'Chưa có'}</div>
        </div>
      `;
    } else {
      body.innerHTML = `<p class="inspector-desc">${cfg.description}</p>`;
    }
  }

  private renderHUD(): void {
    const active = this.engine.getCurrentPlayer();
    const charCfg = CHARACTER_CONFIGS.find((c) => c.id === active.characterId)!;

    document.getElementById('round-counter')!.textContent = `VÒNG ${this.engine.getRound()}`;
    document.getElementById('active-player-banner')!.textContent =
      `Lượt của: ${active.emoji} ${active.name.toUpperCase()}`;

    document.getElementById('locomotion-hint')!.innerHTML =
      `✨ <strong>${charCfg.name}:</strong> ${charCfg.locomotionDescription}`;

    const btnRoll = document.getElementById('btn-roll-dice') as HTMLButtonElement;
    btnRoll.disabled = this.isBusy || active.isBot;
    document.getElementById('btn-roll-text')!.textContent = active.isBot
      ? `🤖 ${active.name} ĐANG ĐI...`
      : 'TUNG XÚC XẮC';

    // Render 4 Player Cards
    const sidebar = document.getElementById('players-sidebar')!;
    const allTiles = this.engine.getAllTileStates();

    sidebar.innerHTML = this.engine
      .getPlayers()
      .map((p) => {
        const isCurrent = p.id === active.id;
        const ownedTiles = allTiles.filter((t) => t.ownerId === p.id);
        const dotsHtml = ownedTiles
          .map((t) => {
            const c = this.engine.getTileConfig(t.index).colorHex;
            return `<span class="prop-dot" style="background:${c}" title="${this.engine.getTileConfig(t.index).name}"></span>`;
          })
          .join('');

        const moveLabel =
          p.locomotion === 'PARABOLA_HOP'
            ? 'Nhảy lò cò + Bụi trắng'
            : p.locomotion === 'TNT_EXPLOSION'
              ? 'Nổ TNT & Hồi sinh'
              : 'Dịch chuyển hạt tím';

        return `
          <div class="player-card ${isCurrent ? 'active-turn' : ''} ${p.bankrupt ? 'bankrupt' : ''}">
            <div class="p-card-top">
              <div class="p-identity">
                <div class="p-avatar" style="background:${p.color}">${p.emoji}</div>
                <div>
                  <div class="p-name">${p.name}</div>
                  <div class="p-locomotion-tag">${moveLabel}</div>
                </div>
              </div>
              <div class="p-gold">💰 ${p.gold}G</div>
            </div>
            <div class="p-card-bottom">
              <span>📍 Ô #${p.position} (${this.engine.getTileConfig(p.position).name.split(' ').slice(0, 2).join(' ')})</span>
              <span>🏠 ${ownedTiles.length} đất</span>
            </div>
            ${ownedTiles.length > 0 ? `<div class="p-props-dots" style="margin-top:6px">${dotsHtml}</div>` : ''}
          </div>
        `;
      })
      .join('');

    // Render Event Logs
    const logContainer = document.getElementById('event-log-list')!;
    logContainer.innerHTML = this.engine
      .getLogs()
      .slice(0, 14)
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
