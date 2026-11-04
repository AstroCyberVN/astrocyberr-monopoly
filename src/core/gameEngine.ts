import {
  BOARD_TILES,
  CHARACTER_CONFIGS,
  CHEST_CARDS,
  CharacterId,
  ChestCard,
  ColorGroupId,
  LocomotionType,
  TileConfig
} from './boardData';

export type GameMode = 'SOLO_VS_AI' | 'PASS_AND_PLAY' | 'ONLINE_ROOM';

export interface PlayerState {
  id: string;
  name: string;
  characterId: CharacterId;
  locomotion: LocomotionType;
  color: string;
  emoji: string;
  isBot: boolean;
  gold: number;
  position: number;
  skipTurns: number;
  bankrupt: boolean;
}

export interface TileState {
  index: number;
  ownerId: string | null;
  /** 0 = unowned, 1 = Wooden Fence, 2 = Oak Cottage, 3 = 2-Story Villa, 4 = Crown Castle */
  level: number;
  festivalMultiplier: number;
}

export interface TileResolutionResult {
  action:
    | 'START_LANDED'
    | 'CAN_BUY_PROPERTY'
    | 'CAN_UPGRADE_PROPERTY'
    | 'MAX_LEVEL_OWNED'
    | 'PAID_RENT'
    | 'CHEST_DRAWN'
    | 'SKIP_TURN_SET'
    | 'CHOOSE_FESTIVAL_TILE'
    | 'CHOOSE_PORTAL_TARGET'
    | 'PAID_ROYAL_TAX'
    | 'INSUFFICIENT_GOLD';
  tileIndex: number;
  tileName: string;
  amount?: number;
  ownerId?: string;
  ownerName?: string;
  chestCard?: ChestCard;
  message: string;
}

export interface SerializedGameState {
  mode: GameMode;
  round: number;
  currentPlayerIndex: number;
  players: PlayerState[];
  tiles: TileState[];
  lastDice: [number, number] | null;
  winnerId: string | null;
  logs: string[];
}

export class GameEngine {
  private mode: GameMode;
  private round = 1;
  private currentPlayerIndex = 0;
  private players: PlayerState[] = [];
  private tiles: TileState[] = [];
  private lastDice: [number, number] | null = null;
  private winnerId: string | null = null;
  private logs: string[] = [];

  constructor(mode: GameMode = 'SOLO_VS_AI', humanCount = 1, initialGold = 1200) {
    this.mode = mode;
    this.initGame(mode, humanCount, initialGold);
  }

  public initGame(mode: GameMode, humanCount = 1, initialGold = 1200): void {
    this.mode = mode;
    this.round = 1;
    this.currentPlayerIndex = 0;
    this.lastDice = null;
    this.winnerId = null;
    this.logs = [];

    const effectiveHumans =
      mode === 'SOLO_VS_AI' ? 1 : mode === 'ONLINE_ROOM' ? 4 : Math.max(1, Math.min(4, humanCount));

    this.players = CHARACTER_CONFIGS.map((cfg, idx) => {
      const isBot = idx >= effectiveHumans;
      return {
        id: `p${idx + 1}`,
        name: isBot ? `${cfg.name} (Bot AI)` : cfg.name,
        characterId: cfg.id,
        locomotion: cfg.locomotion,
        color: cfg.primaryColor,
        emoji: cfg.emoji,
        isBot,
        gold: initialGold,
        position: 0,
        skipTurns: 0,
        bankrupt: false
      };
    });

    this.tiles = BOARD_TILES.map((t) => ({
      index: t.index,
      ownerId: null,
      level: 0,
      festivalMultiplier: 1
    }));

    this.addLog(`🎮 Bắt đầu ván mới (${mode}) trên Đảo Nổi 28 Ô! Mỗi người nhận ${initialGold} Vàng.`);
  }

  public getMode(): GameMode {
    return this.mode;
  }

  public getRound(): number {
    return this.round;
  }

  public getPlayers(): PlayerState[] {
    return this.players;
  }

  public getPlayerById(playerId: string): PlayerState {
    const found = this.players.find((p) => p.id === playerId);
    if (!found) {
      throw new Error(`Player not found: ${playerId}`);
    }
    return found;
  }

  public getCurrentPlayer(): PlayerState {
    return this.players[this.currentPlayerIndex];
  }

  public getCurrentPlayerIndex(): number {
    return this.currentPlayerIndex;
  }

  public getTileConfig(index: number): TileConfig {
    return BOARD_TILES[((index % 28) + 28) % 28];
  }

  public getTileState(index: number): TileState {
    return this.tiles[((index % 28) + 28) % 28];
  }

  public getAllTileStates(): TileState[] {
    return this.tiles;
  }

  public getWinner(): PlayerState | null {
    if (!this.winnerId) return null;
    return this.players.find((p) => p.id === this.winnerId) || null;
  }

  public getLogs(): string[] {
    return this.logs;
  }

  public addLog(entry: string): void {
    this.logs.unshift(entry);
    if (this.logs.length > 40) {
      this.logs.pop();
    }
  }

  public rollDice(forced?: [number, number]): { d1: number; d2: number; total: number } {
    const d1 = forced ? forced[0] : Math.floor(Math.random() * 6) + 1;
    const d2 = forced ? forced[1] : Math.floor(Math.random() * 6) + 1;
    this.lastDice = [d1, d2];
    const p = this.getCurrentPlayer();
    this.addLog(`🎲 ${p.emoji} ${p.name} tung xúc xắc được ${d1} + ${d2} = ${d1 + d2} bước!`);
    return { d1, d2, total: d1 + d2 };
  }

  /**
   * Advances a player by 1 tile around the 28-tile island perimeter.
   * Awards +200 Gold immediately whenever the player steps onto Tile 0 (Start).
   */
  public stepPlayerOneTile(playerId: string): {
    oldPosition: number;
    newPosition: number;
    passedStart: boolean;
  } {
    const player = this.getPlayerById(playerId);
    const oldPosition = player.position;
    const newPosition = (oldPosition + 1) % 28;
    player.position = newPosition;

    const passedStart = newPosition === 0;
    if (passedStart) {
      player.gold += 200;
      this.addLog(`🚩 ${player.emoji} ${player.name} đi qua Ô Khởi Hành và nhận +200 Vàng!`);
    }

    return { oldPosition, newPosition, passedStart };
  }

  /**
   * Checks if an owner owns all properties of a given color group (Monopoly Set)
   */
  public ownsFullColorGroup(ownerId: string, colorGroup?: ColorGroupId): boolean {
    if (!colorGroup) return false;
    const groupTiles = BOARD_TILES.filter((t) => t.type === 'PROPERTY' && t.colorGroup === colorGroup);
    return groupTiles.length > 0 && groupTiles.every((t) => this.tiles[t.index].ownerId === ownerId);
  }

  /**
   * Counts how many Minecart Railroads a player owns (1..4)
   */
  public countOwnedRailroads(ownerId: string): number {
    return BOARD_TILES.filter(
      (t) => t.type === 'RAILROAD' && this.tiles[t.index].ownerId === ownerId
    ).length;
  }

  /**
   * Calculates current rent of a tile including building level, Monopoly set 1.5x bonus, and Festival 2x multiplier
   */
  public calculateRent(tileIndex: number): number {
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);
    if (!state.ownerId || !cfg.rents) return 0;

    if (cfg.type === 'RAILROAD') {
      const count = Math.max(1, Math.min(4, this.countOwnedRailroads(state.ownerId)));
      return cfg.rents[count - 1] * state.festivalMultiplier;
    }

    const levelIdx = Math.max(0, Math.min(3, state.level - 1));
    let rent = cfg.rents[levelIdx];

    if (this.ownsFullColorGroup(state.ownerId, cfg.colorGroup)) {
      rent = Math.round(rent * 1.5);
    }

    rent = Math.round(rent * state.festivalMultiplier);
    return rent;
  }

  /**
   * Buys an unowned PROPERTY or RAILROAD tile (sets level = 1: Wooden Fence)
   */
  public buyProperty(playerId: string, tileIndex = this.getPlayerById(playerId).position): {
    ok: boolean;
    reason?: string;
  } {
    const player = this.getPlayerById(playerId);
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);

    if (cfg.type !== 'PROPERTY' && cfg.type !== 'RAILROAD') {
      return { ok: false, reason: 'Ô này không phải là đất hoặc ga tàu để mua.' };
    }
    if (state.ownerId !== null) {
      return { ok: false, reason: 'Ô đất này đã có chủ sở hữu.' };
    }
    const price = cfg.price ?? 100;
    if (player.gold < price) {
      return { ok: false, reason: 'Không đủ Vàng để mua ô đất này.' };
    }

    player.gold -= price;
    state.ownerId = player.id;
    state.level = 1; // Level 1: Cọc Rào Gỗ
    this.addLog(
      `🏠 ${player.emoji} ${player.name} đã mua [${cfg.name}] với giá ${price} Vàng (Mọc Cọc Rào Gỗ)!`
    );
    return { ok: true };
  }

  /**
   * Upgrades an owned PROPERTY tile up to Level 4 (1: Fence -> 2: Cottage -> 3: Villa -> 4: Castle)
   */
  public upgradeProperty(
    playerId: string,
    tileIndex = this.getPlayerById(playerId).position
  ): { ok: boolean; newLevel: number; reason?: string } {
    const player = this.getPlayerById(playerId);
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);

    if (cfg.type !== 'PROPERTY') {
      return { ok: false, newLevel: state.level, reason: 'Chỉ có thể nâng cấp nhà trên Ô Đất.' };
    }
    if (state.ownerId !== player.id) {
      return { ok: false, newLevel: state.level, reason: 'Bạn không phải chủ sở hữu ô đất này.' };
    }
    if (state.level >= 4) {
      return { ok: false, newLevel: state.level, reason: 'Công trình đã đạt cấp tối đa (Lâu Đài Vương Miện).' };
    }

    const cost = cfg.upgradeCost ?? 80;
    if (player.gold < cost) {
      return { ok: false, newLevel: state.level, reason: 'Không đủ Vàng để nâng cấp công trình.' };
    }

    player.gold -= cost;
    state.level += 1;
    const tierLabel =
      state.level === 2
        ? 'Nhà Gỗ Minecraft'
        : state.level === 3
          ? 'Biệt Thự 2 Tầng'
          : 'Lâu Đài Vương Miện';

    this.addLog(
      `⬆️ ${player.emoji} ${player.name} nâng cấp [${cfg.name}] lên Cấp ${state.level} (${tierLabel}) (-${cost} Vàng)!`
    );
    return { ok: true, newLevel: state.level };
  }

  /**
   * Applies Festival 2x Rent Multiplier to an owned property
   */
  public applyFestivalBoost(playerId: string, tileIndex: number): { ok: boolean } {
    const state = this.getTileState(tileIndex);
    const cfg = this.getTileConfig(tileIndex);
    const player = this.getPlayerById(playerId);
    if (state.ownerId !== playerId) {
      return { ok: false };
    }
    state.festivalMultiplier = 2;
    this.addLog(
      `🎉 ${player.emoji} ${player.name} tổ chức Lễ Hội tại [${cfg.name}] — Nhân đôi (x2) tiền thuê!`
    );
    return { ok: true };
  }

  /**
   * Teleports player from The End Portal (Tile 21) to any chosen target tile on the board.
   * Awards +200 Gold if the forward path passes or lands on Tile 0 (Start).
   */
  public teleportFromEndPortal(
    playerId: string,
    targetTileIndex: number
  ): { ok: boolean; passedStart: boolean } {
    const player = this.getPlayerById(playerId);
    const target = ((targetTileIndex % 28) + 28) % 28;
    const oldPos = player.position;

    // Moving forward from oldPos (e.g. 21) to target wraps past 0 if target < oldPos
    const passedStart = target !== oldPos && (target === 0 || target < oldPos);
    player.position = target;

    if (passedStart) {
      player.gold += 200;
      this.addLog(
        `🌌 ${player.emoji} ${player.name} bay qua Cổng The End tới [${this.getTileConfig(target).name}] (Qua Khởi Hành +200 Vàng)!`
      );
    } else {
      this.addLog(
        `🌌 ${player.emoji} ${player.name} bay qua Cổng The End tới [${this.getTileConfig(target).name}]!`
      );
    }

    return { ok: true, passedStart };
  }

  /**
   * Resolves what happens when a player lands on their current tile
   */
  public resolveTileLanding(playerId: string): TileResolutionResult {
    const player = this.getPlayerById(playerId);
    const tileIndex = player.position;
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);

    switch (cfg.type) {
      case 'START':
        return {
          action: 'START_LANDED',
          tileIndex,
          tileName: cfg.name,
          message: `${player.name} dừng ngay tại Ô Khởi Hành! Không khí lễ hội tràn ngập đảo nổi.`
        };

      case 'PROPERTY':
      case 'RAILROAD': {
        if (state.ownerId === null) {
          const price = cfg.price ?? 100;
          if (player.gold >= price) {
            return {
              action: 'CAN_BUY_PROPERTY',
              tileIndex,
              tileName: cfg.name,
              amount: price,
              message: `[${cfg.name}] đang còn trống! Mua ngay với giá ${price} Vàng?`
            };
          }
          return {
            action: 'INSUFFICIENT_GOLD',
            tileIndex,
            tileName: cfg.name,
            amount: price,
            message: `[${cfg.name}] có giá ${price} Vàng nhưng bạn chỉ còn ${player.gold} Vàng.`
          };
        }

        if (state.ownerId === player.id) {
          if (cfg.type === 'PROPERTY' && state.level < 4) {
            const upCost = cfg.upgradeCost ?? 80;
            if (player.gold >= upCost) {
              return {
                action: 'CAN_UPGRADE_PROPERTY',
                tileIndex,
                tileName: cfg.name,
                amount: upCost,
                message: `Chào mừng về nhà! Nâng cấp [${cfg.name}] lên Cấp ${state.level + 1} với ${upCost} Vàng?`
              };
            }
          }
          return {
            action: 'MAX_LEVEL_OWNED',
            tileIndex,
            tileName: cfg.name,
            message: `${player.name} đang nghỉ ngơi tại lãnh địa [${cfg.name}] của mình.`
          };
        }

        // Owned by another player -> Pay Rent automatically
        const owner = this.getPlayerById(state.ownerId);
        const rent = this.calculateRent(tileIndex);
        player.gold -= rent;
        owner.gold += rent;
        this.addLog(
          `💸 ${player.emoji} ${player.name} trả ${rent} Vàng tiền thuê tại [${cfg.name}] cho ${owner.emoji} ${owner.name}!`
        );
        this.checkBankruptcy(player, owner.id);
        return {
          action: 'PAID_RENT',
          tileIndex,
          tileName: cfg.name,
          amount: rent,
          ownerId: owner.id,
          ownerName: owner.name,
          message: `Đã trả ${rent} Vàng tiền thuê đất cho ${owner.name}!`
        };
      }

      case 'CHEST': {
        const card = CHEST_CARDS[Math.floor(Math.random() * CHEST_CARDS.length)];
        if (card.goldDelta) {
          player.gold += card.goldDelta;
        }
        if (typeof card.moveToTile === 'number') {
          player.position = card.moveToTile;
        }
        this.addLog(`🧰 ${player.emoji} ${player.name} mở Rương Kho Báu: ${card.title}`);
        this.checkBankruptcy(player, null);
        return {
          action: 'CHEST_DRAWN',
          tileIndex,
          tileName: cfg.name,
          amount: card.goldDelta,
          chestCard: card,
          message: `${card.title} — ${card.description}`
        };
      }

      case 'DESERTED_ISLAND': {
        player.skipTurns = 1;
        this.addLog(`🏝️ ${player.emoji} ${player.name} lạc vào Đảo Hoang! Phải nghỉ 1 lượt tiếp theo.`);
        return {
          action: 'SKIP_TURN_SET',
          tileIndex,
          tileName: cfg.name,
          message: `${player.name} bị kẹt trên Đảo Hoang và phải nghỉ 1 lượt kế tiếp!`
        };
      }

      case 'FESTIVAL': {
        const ownedTiles = this.tiles.filter((t) => t.ownerId === player.id);
        return {
          action: 'CHOOSE_FESTIVAL_TILE',
          tileIndex,
          tileName: cfg.name,
          message:
            ownedTiles.length > 0
              ? `🎉 Đại Tiệc Lễ Hội! Chọn 1 ô đất của bạn để NHÂN ĐÔI (x2) tiền thuê!`
              : `🎉 Đại Tiệc Lễ Hội! Bạn được nhận +80 Vàng tiền thưởng lễ hội!`,
          amount: ownedTiles.length === 0 ? 80 : undefined
        };
      }

      case 'END_PORTAL': {
        return {
          action: 'CHOOSE_PORTAL_TARGET',
          tileIndex,
          tileName: cfg.name,
          message: `🌌 Cổng Dịch Chuyển The End đã mở! Hãy chọn bất kỳ ô nào trên bàn cờ để bay tới!`
        };
      }

      case 'ROYAL_TAX': {
        const tax = 120;
        player.gold -= tax;
        this.addLog(`👑 ${player.emoji} ${player.name} nộp Thuế Hoàng Gia -${tax} Vàng.`);
        this.checkBankruptcy(player, null);
        return {
          action: 'PAID_ROYAL_TAX',
          tileIndex,
          tileName: cfg.name,
          amount: tax,
          message: `Bạn đã nộp ${tax} Vàng vào Ngân Khố Hoàng Gia!`
        };
      }
    }
  }

  private checkBankruptcy(player: PlayerState, creditorId: string | null): void {
    if (player.gold >= 0) return;

    player.bankrupt = true;
    player.gold = 0;
    this.addLog(`💀 ${player.emoji} ${player.name} đã phá sản!`);

    for (const t of this.tiles) {
      if (t.ownerId === player.id) {
        if (creditorId) {
          t.ownerId = creditorId;
        } else {
          t.ownerId = null;
          t.level = 0;
          t.festivalMultiplier = 1;
        }
      }
    }

    const activePlayers = this.players.filter((p) => !p.bankrupt);
    if (activePlayers.length === 1) {
      this.winnerId = activePlayers[0].id;
      this.addLog(
        `🏆 CHIẾN THẮNG! ${activePlayers[0].emoji} ${activePlayers[0].name} trở thành Tỷ Phú Đảo Nổi Minecraft!`
      );
    }
  }

  /**
   * Advances to the next active player's turn. Automatically consumes skipTurns on Deserted Island.
   */
  public nextTurn(): { activePlayer: PlayerState; skippedPlayer?: PlayerState } {
    const total = this.players.length;
    let skippedPlayer: PlayerState | undefined;

    for (let step = 0; step < total * 2; step++) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % total;
      if (this.currentPlayerIndex === 0) {
        this.round += 1;
      }

      const candidate = this.players[this.currentPlayerIndex];
      if (candidate.bankrupt) continue;

      if (candidate.skipTurns > 0) {
        candidate.skipTurns -= 1;
        skippedPlayer = candidate;
        this.addLog(
          `🏝️ ${candidate.emoji} ${candidate.name} đang nghỉ mát trên Đảo Hoang (Bỏ qua lượt này).`
        );
        continue;
      }

      return { activePlayer: candidate, skippedPlayer };
    }

    return { activePlayer: this.getCurrentPlayer(), skippedPlayer };
  }

  public serialize(): SerializedGameState {
    return {
      mode: this.mode,
      round: this.round,
      currentPlayerIndex: this.currentPlayerIndex,
      players: structuredClone(this.players),
      tiles: structuredClone(this.tiles),
      lastDice: this.lastDice ? [...this.lastDice] : null,
      winnerId: this.winnerId,
      logs: [...this.logs]
    };
  }

  public hydrate(snapshot: SerializedGameState): void {
    this.mode = snapshot.mode;
    this.round = snapshot.round;
    this.currentPlayerIndex = snapshot.currentPlayerIndex;
    this.players = structuredClone(snapshot.players);
    this.tiles = structuredClone(snapshot.tiles);
    this.lastDice = snapshot.lastDice ? [...snapshot.lastDice] : null;
    this.winnerId = snapshot.winnerId;
    this.logs = [...snapshot.logs];
  }
}
