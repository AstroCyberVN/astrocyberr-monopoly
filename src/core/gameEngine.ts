import {
  BOARD_SIZE,
  BOARD_TILES,
  BUILDING_TIER_NAMES,
  CHARACTER_CONFIGS,
  CHEST_CARDS,
  CharacterId,
  ChestCard,
  ColorGroupId,
  GAME_RULES_CONFIG,
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
  inJail?: boolean;
  jailFreeCards?: number;
  bankrupt: boolean;
}

export interface TileState {
  index: number;
  ownerId: string | null;
  level: number;
  festivalMultiplier: number;
  mortgaged?: boolean;
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
    | 'JUST_VISITING_JAIL'
    | 'SENT_TO_JAIL'
    | 'CHOOSE_FESTIVAL_TILE'
    | 'CHOOSE_PORTAL_TARGET'
    | 'NETHER_PORTAL_READY'
    | 'PAID_ROYAL_TAX'
    | 'INSUFFICIENT_GOLD';
  tileIndex: number;
  tileName: string;
  amount?: number;
  ownerId?: string;
  ownerName?: string;
  rentReason?: string;
  canAffordRent?: boolean;
  buyoutCost?: number | null;
  canBuyoutAfterRent?: boolean;
  payerPrevGold?: number;
  ownerPrevGold?: number;
  chestCard?: ChestCard;
  movedFromTile?: number;
  movedToTile?: number;
  moveDirection?: 'FORWARD' | 'BACKWARD';
  sentToJailByCard?: boolean;
  message: string;
}

export interface LiquidatablePropertyInfo {
  tileIndex: number;
  name: string;
  level: number;
  resaleValue: number;
}

export interface ConfirmedRentPaymentResult {
  bankrupt: boolean;
  paidAmount: number;
  rentRequired: number;
  payerPrevGold: number;
  payerNewGold: number;
  ownerPrevGold: number;
  ownerNewGold: number;
  ownerId: string;
  ownerName: string;
  rentReason: string;
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
  private consecutiveDoubles = 0;
  private players: PlayerState[] = [];
  private tiles: TileState[] = [];
  private lastDice: [number, number] | null = null;
  private winnerId: string | null;
  private logs: string[] = [];

  constructor(mode: GameMode = 'SOLO_VS_AI', humanCount = 1, initialGold = 1500) {
    this.mode = mode;
    this.winnerId = null;
    this.initGame(mode, humanCount, initialGold);
  }

  public initGame(mode: GameMode, humanCount = 1, initialGold = 1500): void {
    this.mode = mode;
    this.round = 1;
    this.currentPlayerIndex = 0;
    this.consecutiveDoubles = 0;
    this.lastDice = null;
    this.winnerId = null;
    this.logs = [];

    const effectiveHumans =
      mode === 'SOLO_VS_AI' ? 1 : mode === 'ONLINE_ROOM' ? 4 : Math.max(1, Math.min(4, humanCount));

    this.players = CHARACTER_CONFIGS.map((cfg, idx) => {
      const isBot = idx >= effectiveHumans;
      return {
        id: `p${idx + 1}`,
        name: isBot ? `${cfg.name} (AI)` : cfg.name,
        characterId: cfg.id,
        locomotion: cfg.locomotion,
        color: cfg.primaryColor,
        emoji: cfg.emoji,
        isBot,
        gold: initialGold,
        position: 0,
        skipTurns: 0,
        inJail: false,
        jailFreeCards: 0,
        bankrupt: false
      };
    });

    this.tiles = BOARD_TILES.map((t) => ({
      index: t.index,
      ownerId: null,
      level: 0,
      festivalMultiplier: 1,
      mortgaged: false
    }));

    this.addLog(`🎮 Bắt đầu ván mới (${mode}) trên Bản Đồ 40 Ô! Mỗi người nhận $${initialGold}.`);
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
    return BOARD_TILES[((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE];
  }

  public getTileState(index: number): TileState {
    return this.tiles[((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE];
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
    if (this.logs.length > 60) {
      this.logs.pop();
    }
  }

  public sendPlayerToJail(playerId: string, reason = 'Vi phạm quy định đô thị'): void {
    const player = this.getPlayerById(playerId);
    player.position = 10;
    player.inJail = true;
    player.skipTurns = 0;
    this.consecutiveDoubles = 0;
    this.addLog(
      `🚓 VÀO TÙ! ${player.emoji} ${player.name} bị chuyển thẳng vào #10 Nhà Tù Chí Hòa (${reason})!`
    );
  }

  public payJailFine(playerId: string, fineAmount = 50): { ok: boolean; reason?: string } {
    const player = this.getPlayerById(playerId);
    if (!player.inJail) {
      return { ok: false, reason: 'Người chơi hiện không ở trong tù.' };
    }
    if (player.gold < fineAmount) {
      return { ok: false, reason: `Không đủ $${fineAmount} để nộp phạt bảo lãnh ra tù.` };
    }
    player.gold -= fineAmount;
    player.inJail = false;
    player.skipTurns = 0;
    this.addLog(
      `💸 BẢO LÃNH RA TÙ! ${player.emoji} ${player.name} nộp phạt -$${fineAmount} và rời Nhà Tù Chí Hòa ngay lập tức!`
    );
    return { ok: true };
  }

  public useJailFreeCard(playerId: string): { ok: boolean; reason?: string } {
    const player = this.getPlayerById(playerId);
    if (!player.inJail) {
      return { ok: false, reason: 'Người chơi hiện không ở trong tù.' };
    }
    const cards = player.jailFreeCards ?? 0;
    if (cards <= 0) {
      return { ok: false, reason: 'Bạn không có Thẻ Ra Tù Miễn Phí.' };
    }
    player.jailFreeCards = cards - 1;
    player.inJail = false;
    player.skipTurns = 0;
    this.addLog(
      `🕊️ THẺ RA TÙ MIỄN PHÍ! ${player.emoji} ${player.name} xuất trình Thẻ Ân Xá và rời Nhà Tù Chí Hòa miễn phí!`
    );
    return { ok: true };
  }

  public attemptRollDoublesInJail(
    playerId: string,
    forced?: [number, number]
  ): { d1: number; d2: number; total: number; escaped: boolean } {
    const player = this.getPlayerById(playerId);
    const d1 = forced ? forced[0] : Math.floor(Math.random() * 6) + 1;
    const d2 = forced ? forced[1] : Math.floor(Math.random() * 6) + 1;
    this.lastDice = [d1, d2];
    const escaped = d1 === d2;
    this.consecutiveDoubles = 0;

    if (escaped) {
      player.inJail = false;
      player.skipTurns = 0;
      this.addLog(
        `🎲 ĐỔ ĐÔI THOÁT TÙ! ${player.emoji} ${player.name} tung được cặp đôi (${d1}+${d2} = ${d1 + d2}) và được trả tự do khỏi Nhà Tù Chí Hòa!`
      );
    } else {
      // Served 1 full turn in jail; released for the next round
      player.inJail = false;
      player.skipTurns = 0;
      this.addLog(
        `🔒 CHƯA ĐỔ ĐÔI! ${player.emoji} ${player.name} tung ${d1}+${d2} (Không phải cặp đôi) — Chấp hành án tại Nhà Tù Chí Hòa lượt này.`
      );
    }

    return { d1, d2, total: d1 + d2, escaped };
  }

  public rollDice(forced?: [number, number]): {
    d1: number;
    d2: number;
    total: number;
    isDoubles: boolean;
    sentToJailByTripleDoubles?: boolean;
  } {
    const d1 = forced ? forced[0] : Math.floor(Math.random() * 6) + 1;
    const d2 = forced ? forced[1] : Math.floor(Math.random() * 6) + 1;
    this.lastDice = [d1, d2];
    const isDoubles = d1 === d2;
    const p = this.getCurrentPlayer();

    if (isDoubles) {
      this.consecutiveDoubles += 1;
      if (this.consecutiveDoubles >= 3) {
        this.sendPlayerToJail(p.id, `Đổ đôi 3 lần liên tiếp (${d1}+${d2})`);
        return {
          d1,
          d2,
          total: d1 + d2,
          isDoubles,
          sentToJailByTripleDoubles: true
        };
      }
      this.addLog(
        `✨ ĐỔ ĐÔI (${this.consecutiveDoubles}/2)! ${p.emoji} ${p.name} tung được ${d1} + ${d2} = ${d1 + d2} bước (Thưởng thêm lượt)!`
      );
    } else {
      this.consecutiveDoubles = 0;
      this.addLog(`🎲 ${p.emoji} ${p.name} tung xúc xắc: ${d1} + ${d2} = ${d1 + d2} bước!`);
    }

    return { d1, d2, total: d1 + d2, isDoubles, sentToJailByTripleDoubles: false };
  }

  public canTakeExtraDoublesTurn(): boolean {
    const p = this.getCurrentPlayer();
    return (
      !p.bankrupt &&
      !p.inJail &&
      p.skipTurns === 0 &&
      this.consecutiveDoubles > 0 &&
      this.consecutiveDoubles <= 2
    );
  }

  public getStartBonus(player: PlayerState): number {
    // FEAT-03: Alex's passive ("Nhà Thám Hiểm") grants extra bonus when passing Start
    return player.characterId === 'alex'
      ? GAME_RULES_CONFIG.alexStartBonus
      : GAME_RULES_CONFIG.startBonus;
  }

  public getEffectiveUpgradeCost(playerId: string, tileIndex: number): number {
    const player = this.getPlayerById(playerId);
    const cfg = this.getTileConfig(tileIndex);
    const baseCost = cfg.upgradeCost ?? 80;
    // FEAT-03: Steve's passive ("Thợ Xây Lành Nghề") reduces building upgrade cost
    const factor = 1 - GAME_RULES_CONFIG.steveUpgradeDiscountPct / 100;
    return player.characterId === 'steve' ? Math.round(baseCost * factor) : baseCost;
  }

  public getEffectiveTaxAmount(playerId: string, baseTax: number): number {
    const player = this.getPlayerById(playerId);
    // FEAT-03: Creeper's passive ("Giáp Thuốc Nổ") reduces Royal/Luxury Tax
    const factor = 1 - GAME_RULES_CONFIG.creeperTaxDiscountPct / 100;
    return player.characterId === 'creeper' ? Math.round(baseTax * factor) : baseTax;
  }

  public stepPlayerOneTile(playerId: string): {
    oldPosition: number;
    newPosition: number;
    passedStart: boolean;
  } {
    const player = this.getPlayerById(playerId);
    const oldPosition = player.position;
    const newPosition = (oldPosition + 1) % BOARD_SIZE;
    player.position = newPosition;

    const passedStart = newPosition === 0;
    if (passedStart) {
      const bonus = this.getStartBonus(player);
      player.gold += bonus;
      this.addLog(
        `🚩 ${player.emoji} ${player.name} đi qua Đại Lộ Khởi Hành và nhận +$${bonus}${
          player.characterId === 'alex' ? ' (Nội tại Alex +$40)' : ''
        }!`
      );
    }

    return { oldPosition, newPosition, passedStart };
  }

  public getPlayerColorGroupOwnership(
    ownerId: string,
    colorGroup: ColorGroupId
  ): { ownedCount: number; totalCount: number; isMonopoly: boolean } {
    const groupTiles = BOARD_TILES.filter(
      (t) => t.type === 'PROPERTY' && t.colorGroup === colorGroup
    );
    const ownedCount = groupTiles.filter((t) => this.tiles[t.index].ownerId === ownerId).length;
    return {
      ownedCount,
      totalCount: groupTiles.length,
      isMonopoly: groupTiles.length > 0 && ownedCount === groupTiles.length
    };
  }

  public ownsFullColorGroup(ownerId: string, colorGroup?: ColorGroupId): boolean {
    if (!colorGroup) return false;
    const groupTiles = BOARD_TILES.filter(
      (t) => t.type === 'PROPERTY' && t.colorGroup === colorGroup
    );
    return groupTiles.length > 0 && groupTiles.every((t) => this.tiles[t.index].ownerId === ownerId);
  }

  public countOwnedRailroads(ownerId: string): number {
    return BOARD_TILES.filter(
      (t) =>
        t.type === 'RAILROAD' &&
        this.tiles[t.index].ownerId === ownerId &&
        !this.tiles[t.index].mortgaged
    ).length;
  }

  public countOwnedUtilities(ownerId: string): number {
    return BOARD_TILES.filter(
      (t) =>
        t.type === 'UTILITY' &&
        this.tiles[t.index].ownerId === ownerId &&
        !this.tiles[t.index].mortgaged
    ).length;
  }

  public getLastDiceTotal(): number {
    return this.lastDice ? this.lastDice[0] + this.lastDice[1] : 7;
  }

  public calculateRent(tileIndex: number): number {
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);
    if (!state.ownerId || state.mortgaged || !cfg.rents) return 0;

    if (cfg.type === 'RAILROAD') {
      const count = Math.max(1, Math.min(4, this.countOwnedRailroads(state.ownerId)));
      return cfg.rents[count - 1] * state.festivalMultiplier;
    }

    if (cfg.type === 'UTILITY') {
      const count = Math.max(1, Math.min(2, this.countOwnedUtilities(state.ownerId)));
      const factorOrFlat = cfg.rents[count - 1] ?? (count >= 2 ? 10 : 4);
      // Wikipedia Monopoly rule: Utility rent = Dice Total × 4 (1 owned) or × 10 (both owned)
      if (factorOrFlat <= 25) {
        return this.getLastDiceTotal() * factorOrFlat * state.festivalMultiplier;
      }
      return factorOrFlat * state.festivalMultiplier;
    }

    const levelIdx = Math.max(0, Math.min(3, state.level - 1));
    let rent = cfg.rents[levelIdx];

    if (this.ownsFullColorGroup(state.ownerId, cfg.colorGroup)) {
      rent = Math.round(rent * 1.5);
    }

    rent = Math.round(rent * state.festivalMultiplier);
    return rent;
  }

  public getFormattedRentReason(tileIndex: number): string {
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);
    const baseReason = cfg.rentReason || `dừng chân tại khu vực [${cfg.name}]`;
    if (cfg.type === 'UTILITY' && state.ownerId) {
      const count = Math.max(1, Math.min(2, this.countOwnedUtilities(state.ownerId)));
      const mult = cfg.rents?.[count - 1] ?? (count >= 2 ? 10 : 4);
      const diceSum = this.getLastDiceTotal();
      return `${baseReason} (Sở hữu ${count}/2 Công ty Tiện Ích: Xúc xắc ${diceSum} × ${mult})`;
    }
    if (cfg.type === 'RAILROAD' && state.ownerId) {
      const count = Math.max(1, Math.min(4, this.countOwnedRailroads(state.ownerId)));
      return `${baseReason} (Chủ ga sở hữu ${count}/4 Tuyến Đường Sắt)`;
    }
    if (cfg.type === 'PROPERTY' && state.level > 0) {
      const tier = BUILDING_TIER_NAMES[state.level] || BUILDING_TIER_NAMES[1];
      return `${baseReason} (Công trình: ${tier.icon} ${tier.name} Cấp ${state.level}${
        state.festivalMultiplier > 1 ? ` • Lễ Hội x${state.festivalMultiplier}` : ''
      })`;
    }
    return baseReason;
  }

  public buyProperty(
    playerId: string,
    tileIndex = this.getPlayerById(playerId).position
  ): {
    ok: boolean;
    reason?: string;
  } {
    const player = this.getPlayerById(playerId);
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);

    if (cfg.type !== 'PROPERTY' && cfg.type !== 'RAILROAD' && cfg.type !== 'UTILITY') {
      return { ok: false, reason: 'Ô này không phải là tài sản có thể mua.' };
    }
    if (state.ownerId !== null) {
      return { ok: false, reason: 'Ô này đã có chủ sở hữu.' };
    }
    const price = cfg.price ?? 100;
    if (player.gold < price) {
      return { ok: false, reason: 'Không đủ $ để mua ô này.' };
    }

    player.gold -= price;
    state.ownerId = player.id;
    state.level = 1;
    this.addLog(`🏠 ${player.emoji} ${player.name} đã mua [${cfg.name}] với giá $${price}!`);
    return { ok: true };
  }

  /**
   * Wikipedia Monopoly "Even Building" rule:
   * When a player owns a full color group (or multiple tiles in the same color group),
   * buildings must be constructed evenly across the group (difference <= 1 level).
   */
  public canUpgradePropertyEvenly(
    playerId: string,
    tileIndex: number
  ): { allowed: boolean; reason?: string } {
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);
    if (cfg.type !== 'PROPERTY') {
      return { allowed: false, reason: 'Chỉ có thể nâng cấp nhà trên Ô Đất.' };
    }
    if (state.ownerId !== playerId) {
      return { allowed: false, reason: 'Bạn không phải chủ sở hữu ô đất này.' };
    }
    if (state.mortgaged) {
      return { allowed: false, reason: 'Ô đất đang thế chấp, hãy giải chấp trước khi xây nhà.' };
    }
    if (state.level >= 4) {
      return { allowed: false, reason: 'Công trình đã đạt cấp tối đa (Lâu Đài Vương Miện).' };
    }

    if (cfg.colorGroup && this.ownsFullColorGroup(playerId, cfg.colorGroup)) {
      const groupTiles = BOARD_TILES.filter(
        (t) => t.type === 'PROPERTY' && t.colorGroup === cfg.colorGroup
      );
      if (groupTiles.some((t) => this.tiles[t.index].mortgaged)) {
        return {
          allowed: false,
          reason: 'Có ô đất cùng cụm màu đang thế chấp, không thể nâng cấp nhà!'
        };
      }
      const minLevel = Math.min(...groupTiles.map((t) => this.tiles[t.index].level));
      if (state.level > minLevel) {
        return {
          allowed: false,
          reason: `Luật Xây Nhà Đồng Đều (Even Building): Phải nâng cấp các ô cùng màu đang ở Cấp ${minLevel} trước!`
        };
      }
    }

    return { allowed: true };
  }

  public upgradeProperty(
    playerId: string,
    tileIndex = this.getPlayerById(playerId).position
  ): { ok: boolean; newLevel: number; reason?: string } {
    const player = this.getPlayerById(playerId);
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);

    const evenCheck = this.canUpgradePropertyEvenly(playerId, tileIndex);
    if (!evenCheck.allowed) {
      return { ok: false, newLevel: state.level, reason: evenCheck.reason };
    }

    const cost = this.getEffectiveUpgradeCost(playerId, tileIndex);
    if (player.gold < cost) {
      return { ok: false, newLevel: state.level, reason: 'Không đủ $ để nâng cấp công trình.' };
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
      `⬆️ ${player.emoji} ${player.name} nâng cấp [${cfg.name}] lên Cấp ${state.level} (${tierLabel}) (-$${cost}${
        player.characterId === 'steve' ? ` • Nội tại Steve -${GAME_RULES_CONFIG.steveUpgradeDiscountPct}%` : ''
      })!`
    );
    return { ok: true, newLevel: state.level };
  }

  /**
   * Wikipedia Monopoly Mortgage (50% of purchase price) & Unmortgage (55% = 50% + 10% interest)
   */
  public getMortgageValue(tileIndex: number): number {
    const cfg = this.getTileConfig(tileIndex);
    return Math.round((cfg.price ?? 100) * 0.5);
  }

  public getUnmortgageCost(tileIndex: number): number {
    return Math.round(this.getMortgageValue(tileIndex) * 1.1);
  }

  public mortgageProperty(
    playerId: string,
    tileIndex: number
  ): { ok: boolean; mortgageValue: number; newGold: number; reason?: string } {
    const player = this.getPlayerById(playerId);
    const state = this.getTileState(tileIndex);
    const cfg = this.getTileConfig(tileIndex);

    if (state.ownerId !== playerId) {
      return { ok: false, mortgageValue: 0, newGold: player.gold, reason: 'Không phải đất của bạn.' };
    }
    if (state.mortgaged) {
      return { ok: false, mortgageValue: 0, newGold: player.gold, reason: 'Ô này đã được thế chấp.' };
    }

    const upgradeRefund =
      cfg.type === 'PROPERTY' && state.level > 1
        ? Math.round((state.level - 1) * (cfg.upgradeCost ?? 50) * 0.5)
        : 0;
    const mortgageValue = this.getMortgageValue(tileIndex) + upgradeRefund;

    state.level = 1;
    state.mortgaged = true;
    player.gold += mortgageValue;

    this.addLog(
      `📜 THẾ CHẤP! ${player.emoji} ${player.name} thế chấp [${cfg.name}] cho Ngân Hàng nhận +$${mortgageValue} (Tạm ngưng thu tiền thuê).`
    );
    return { ok: true, mortgageValue, newGold: player.gold };
  }

  public unmortgageProperty(
    playerId: string,
    tileIndex: number
  ): { ok: boolean; unmortgageCost: number; newGold: number; reason?: string } {
    const player = this.getPlayerById(playerId);
    const state = this.getTileState(tileIndex);
    const cfg = this.getTileConfig(tileIndex);

    if (state.ownerId !== playerId || !state.mortgaged) {
      return {
        ok: false,
        unmortgageCost: 0,
        newGold: player.gold,
        reason: 'Ô đất không ở trạng thái thế chấp.'
      };
    }

    const cost = this.getUnmortgageCost(tileIndex);
    if (player.gold < cost) {
      return {
        ok: false,
        unmortgageCost: cost,
        newGold: player.gold,
        reason: 'Không đủ $ để giải chấp (gồm 10% lãi ngân hàng).'
      };
    }

    player.gold -= cost;
    state.mortgaged = false;
    this.addLog(
      `🔓 GIẢI CHẤP! ${player.emoji} ${player.name} thanh toán -$${cost} (gồm 10% lãi) để chuộc lại [${cfg.name}]!`
    );
    return { ok: true, unmortgageCost: cost, newGold: player.gold };
  }

  /**
   * Wikipedia Monopoly Public Auction when a player declines to buy an unowned property!
   */
  public runPropertyAuction(
    tileIndex: number,
    humanBids?: Record<string, number>
  ): {
    winnerId: string | null;
    winnerName?: string;
    winningBid: number;
  } {
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);
    if (state.ownerId !== null) {
      return { winnerId: null, winningBid: 0 };
    }

    const listPrice = cfg.price ?? 100;
    let bestBidder: PlayerState | null = null;
    let highestBid = 0;

    for (const p of this.players) {
      if (p.bankrupt || p.gold < 20) continue;

      let candidateBid = 0;
      if (humanBids && typeof humanBids[p.id] === 'number') {
        candidateBid = Math.min(p.gold, Math.floor(humanBids[p.id]));
      } else if (p.isBot) {
        const ownsSameGroup =
          cfg.colorGroup &&
          BOARD_TILES.some(
            (t) => t.colorGroup === cfg.colorGroup && this.tiles[t.index].ownerId === p.id
          );
        const valuationFactor = ownsSameGroup ? 0.95 : 0.75;
        const maxWilling = Math.min(p.gold - 40, Math.round(listPrice * valuationFactor));
        if (maxWilling >= 20) {
          candidateBid = maxWilling;
        }
      }

      if (candidateBid > highestBid && candidateBid <= p.gold) {
        highestBid = candidateBid;
        bestBidder = p;
      }
    }

    if (!bestBidder || highestBid < 10) {
      this.addLog(`🔨 Phiên đấu giá [${cfg.name}] kết thúc mà không có ai trả giá.`);
      return { winnerId: null, winningBid: 0 };
    }

    bestBidder.gold -= highestBid;
    state.ownerId = bestBidder.id;
    state.level = 1;
    state.mortgaged = false;

    this.addLog(
      `🔨 ĐẤU GIÁ THÀNH CÔNG! ${bestBidder.emoji} ${bestBidder.name} đấu giá thắng [${cfg.name}] với mức $${highestBid} (Giá gốc $${listPrice})!`
    );

    return {
      winnerId: bestBidder.id,
      winnerName: bestBidder.name,
      winningBid: highestBid
    };
  }

  /**
   * FEAT-01: Hostile Takeover / Buyout calculation.
   * Properties at Level 4 (Castle) cannot be bought out!
   */
  public getBuyoutCost(tileIndex: number): number | null {
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);
    if (!state.ownerId) return null;
    if (cfg.type !== 'PROPERTY' && cfg.type !== 'RAILROAD' && cfg.type !== 'UTILITY') {
      return null;
    }
    if (cfg.type === 'PROPERTY' && state.level >= 4) {
      return null; // Crown Castles are immune to Hostile Takeover
    }
    const basePrice = cfg.price ?? 100;
    const investedUpgrades =
      cfg.type === 'PROPERTY' ? Math.max(0, state.level - 1) * (cfg.upgradeCost ?? 80) : 0;
    return Math.round((basePrice + investedUpgrades) * GAME_RULES_CONFIG.buyoutMultiplier);
  }

  public buyoutOpponentProperty(
    buyerId: string,
    tileIndex = this.getPlayerById(buyerId).position
  ): {
    ok: boolean;
    buyoutCost: number;
    previousOwnerId: string;
    previousOwnerName: string;
    reason?: string;
  } {
    const buyer = this.getPlayerById(buyerId);
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);
    if (!state.ownerId || state.ownerId === buyer.id) {
      return {
        ok: false,
        buyoutCost: 0,
        previousOwnerId: '',
        previousOwnerName: '',
        reason: 'Ô đất này không thuộc sở hữu đối thủ.'
      };
    }

    const buyoutCost = this.getBuyoutCost(tileIndex);
    if (buyoutCost === null) {
      return {
        ok: false,
        buyoutCost: 0,
        previousOwnerId: state.ownerId,
        previousOwnerName: '',
        reason: 'Lâu Đài Vương Miện (Cấp 4) bất khả xâm phạm, không thể mua đứt!'
      };
    }

    if (buyer.gold < buyoutCost) {
      return {
        ok: false,
        buyoutCost,
        previousOwnerId: state.ownerId,
        previousOwnerName: '',
        reason: 'Không đủ $ để thôn tính ô đất này.'
      };
    }

    const previousOwner = this.getPlayerById(state.ownerId);
    buyer.gold -= buyoutCost;
    previousOwner.gold += buyoutCost;
    state.ownerId = buyer.id;

    this.addLog(
      `⚔️ THÔN TÍNH! ${buyer.emoji} ${buyer.name} chi $${buyoutCost} mua đứt [${cfg.name}] từ tay ${previousOwner.emoji} ${previousOwner.name}!`
    );

    return {
      ok: true,
      buyoutCost,
      previousOwnerId: previousOwner.id,
      previousOwnerName: previousOwner.name
    };
  }

  /**
   * FEAT-02: Emergency Property Liquidation (75% of base price + upgrades)
   */
  public getLiquidationValue(tileIndex: number): number {
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);
    const basePrice = cfg.price ?? 100;
    const upgradeTotal =
      cfg.type === 'PROPERTY' ? Math.max(0, state.level - 1) * (cfg.upgradeCost ?? 60) : 0;
    return Math.round(
      (basePrice + upgradeTotal) * (GAME_RULES_CONFIG.liquidationRatePct / 100)
    );
  }

  public getPlayerLiquidatableProperties(playerId: string): LiquidatablePropertyInfo[] {
    return this.tiles
      .filter((t) => t.ownerId === playerId)
      .map((t) => {
        const cfg = this.getTileConfig(t.index);
        return {
          tileIndex: t.index,
          name: cfg.name,
          level: t.level,
          resaleValue: this.getLiquidationValue(t.index)
        };
      })
      .sort((a, b) => a.resaleValue - b.resaleValue);
  }

  public liquidateProperty(
    playerId: string,
    tileIndex: number
  ): { ok: boolean; resaleValue: number; newGold: number } {
    const player = this.getPlayerById(playerId);
    const state = this.getTileState(tileIndex);
    const cfg = this.getTileConfig(tileIndex);
    if (state.ownerId !== playerId) {
      return { ok: false, resaleValue: 0, newGold: player.gold };
    }

    const resaleValue = this.getLiquidationValue(tileIndex);
    player.gold += resaleValue;
    state.ownerId = null;
    state.level = 0;
    state.festivalMultiplier = 1;

    this.addLog(
      `🏦 ${player.emoji} ${player.name} thanh lý khẩn cấp [${cfg.name}] thu về +$${resaleValue} (75% giá trị)!`
    );

    return { ok: true, resaleValue, newGold: player.gold };
  }

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

  public teleportFromEndPortal(
    playerId: string,
    targetTileIndex: number
  ): { ok: boolean; passedStart: boolean } {
    const player = this.getPlayerById(playerId);
    const target = ((targetTileIndex % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
    const oldPos = player.position;

    const passedStart = target !== oldPos && (target === 0 || target < oldPos);
    player.position = target;

    const enderBonus =
      player.characterId === 'enderman' ? GAME_RULES_CONFIG.endermanPortalBonus : 0;
    if (enderBonus > 0) {
      player.gold += enderBonus;
    }

    if (passedStart) {
      const startBonus = this.getStartBonus(player);
      player.gold += startBonus;
      this.addLog(
        `🌌 ${player.emoji} ${player.name} bay qua Cổng The End tới [${this.getTileConfig(target).name}] (Qua Khởi Hành +$${startBonus}${
          enderBonus > 0 ? ` • Nội tại Enderman +$${enderBonus}` : ''
        })!`
      );
    } else {
      this.addLog(
        `🌌 ${player.emoji} ${player.name} bay qua Cổng The End tới [${this.getTileConfig(target).name}]${
          enderBonus > 0 ? ` (Nội tại Enderman +$${enderBonus})` : ''
        }!`
      );
    }

    return { ok: true, passedStart };
  }

  public warpThroughNetherPortal(
    playerId: string,
    forcedNetherDie?: number
  ): {
    netherDie: number;
    overworldSteps: number;
    targetTileIndex: number;
    passedStart: boolean;
  } {
    const player = this.getPlayerById(playerId);
    const netherDie = forcedNetherDie ?? Math.floor(Math.random() * 5) + 1; // 1..5 Nether steps -> 8..40 Overworld steps
    const overworldSteps = netherDie * 8;
    const oldPos = player.position;
    const target = (oldPos + overworldSteps) % BOARD_SIZE;

    const passedStart = oldPos + overworldSteps >= BOARD_SIZE;
    player.position = target;
    const enderBonus =
      player.characterId === 'enderman' ? GAME_RULES_CONFIG.endermanPortalBonus : 0;
    player.gold += 120 + enderBonus; // Piglin Bastion Gold Bonus (+ Enderman Passive)

    if (passedStart) {
      const startBonus = this.getStartBonus(player);
      player.gold += startBonus;
      this.addLog(
        `🟣 ${player.emoji} ${player.name} bước qua Cổng Nether (${netherDie} bước Nether = ${overworldSteps} bước Overworld) tới [${this.getTileConfig(target).name}] (+$120 Vàng Piglin & +$${startBonus} Qua Khởi Hành${
          enderBonus > 0 ? ` • Nội tại Enderman +$${enderBonus}` : ''
        })!`
      );
    } else {
      this.addLog(
        `🟣 ${player.emoji} ${player.name} bước qua Cổng Nether (${netherDie} bước Nether = ${overworldSteps} bước Overworld) tới [${this.getTileConfig(target).name}] (+$120 Vàng Piglin${
          enderBonus > 0 ? ` • Nội tại Enderman +$${enderBonus}` : ''
        })!`
      );
    }

    return {
      netherDie,
      overworldSteps,
      targetTileIndex: target,
      passedStart
    };
  }

  /**
   * Executes the confirmed rent payment (or direct bankruptcy elimination if player.gold < rent)
   * after the player presses [Space] on the rent notification modal!
   */
  public executeConfirmedRentPayment(
    playerId: string,
    tileIndex = this.getPlayerById(playerId).position
  ): ConfirmedRentPaymentResult {
    const player = this.getPlayerById(playerId);
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);
    const owner = state.ownerId ? this.getPlayerById(state.ownerId) : player;

    const rentRequired = this.calculateRent(tileIndex);
    const rentReason = this.getFormattedRentReason(tileIndex);
    const payerPrevGold = player.gold;
    const ownerPrevGold = owner.gold;

    if (player.gold >= rentRequired) {
      player.gold -= rentRequired;
      owner.gold += rentRequired;
      this.addLog(
        `💸 ${player.emoji} ${player.name} đã thanh toán $${rentRequired} tại [${cfg.name}] cho ${owner.emoji} ${owner.name} (Lý do: ${rentReason})!`
      );

      return {
        bankrupt: false,
        paidAmount: rentRequired,
        rentRequired,
        payerPrevGold,
        payerNewGold: player.gold,
        ownerPrevGold,
        ownerNewGold: owner.gold,
        ownerId: owner.id,
        ownerName: owner.name,
        rentReason
      };
    }

    // Direct Bankruptcy: player does not have enough gold to pay the rent!
    const paidAmount = Math.max(0, player.gold);
    owner.gold += paidAmount;
    player.gold = 0;
    player.bankrupt = true;
    player.skipTurns = 0;

    // Release all properties owned by the bankrupt player back to unowned free land
    for (const t of this.tiles) {
      if (t.ownerId === player.id) {
        t.ownerId = null;
        t.level = 0;
        t.festivalMultiplier = 1;
      }
    }

    this.addLog(
      `💀 PHÁ SẢN! ${player.emoji} ${player.name} không đủ tiền trả $${rentRequired} tại [${cfg.name}] của ${owner.emoji} ${owner.name} và chính thức bị loại khỏi đường đua!`
    );

    this.checkVictoryAfterElimination();

    return {
      bankrupt: true,
      paidAmount,
      rentRequired,
      payerPrevGold,
      payerNewGold: 0,
      ownerPrevGold,
      ownerNewGold: owner.gold,
      ownerId: owner.id,
      ownerName: owner.name,
      rentReason
    };
  }

  public checkVictoryAfterElimination(): void {
    const activePlayers = this.players.filter((p) => !p.bankrupt);
    if (activePlayers.length === 1) {
      this.winnerId = activePlayers[0].id;
      this.addLog(
        `🏆 CHIẾN THẮNG! ${activePlayers[0].emoji} ${activePlayers[0].name} trở thành Tỷ Phú Độc Tôn trên Đảo Nổi!`
      );
    }
  }

  public resolveTileLanding(
    playerId: string,
    options?: { deferRentPayment?: boolean; forcedCardId?: string }
  ): TileResolutionResult {
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
          message: `${player.name} dừng ngay tại ${cfg.name}! Nhận nguồn năng lượng thịnh vượng.`
        };

      case 'PROPERTY':
      case 'RAILROAD':
      case 'UTILITY': {
        if (state.ownerId === null) {
          const price = cfg.price ?? 100;
          if (player.gold >= price) {
            return {
              action: 'CAN_BUY_PROPERTY',
              tileIndex,
              tileName: cfg.name,
              amount: price,
              message: `[${cfg.name}] đang còn trống! Mua ngay với giá $${price}?`
            };
          }
          return {
            action: 'INSUFFICIENT_GOLD',
            tileIndex,
            tileName: cfg.name,
            amount: price,
            message: `[${cfg.name}] có giá $${price} nhưng bạn chỉ còn $${player.gold}.`
          };
        }

        if (state.ownerId === player.id) {
          if (cfg.type === 'PROPERTY' && state.level < 4) {
            const evenCheck = this.canUpgradePropertyEvenly(player.id, tileIndex);
            const upCost = this.getEffectiveUpgradeCost(player.id, tileIndex);
            if (evenCheck.allowed && player.gold >= upCost) {
              return {
                action: 'CAN_UPGRADE_PROPERTY',
                tileIndex,
                tileName: cfg.name,
                amount: upCost,
                message: `Chào mừng về lãnh địa! Nâng cấp [${cfg.name}] lên Cấp ${state.level + 1} với $${upCost}${
                  player.characterId === 'steve'
                    ? ` (Đã giảm ${GAME_RULES_CONFIG.steveUpgradeDiscountPct}% nội tại Steve)`
                    : ''
                }?`
              };
            }
            if (!evenCheck.allowed && evenCheck.reason) {
              return {
                action: 'MAX_LEVEL_OWNED',
                tileIndex,
                tileName: cfg.name,
                message: evenCheck.reason
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

        const owner = this.getPlayerById(state.ownerId);
        if (state.mortgaged) {
          this.addLog(
            `📜 ${player.emoji} ${player.name} dừng tại [${cfg.name}] của ${owner.name}, nhưng ô đất đang Thế Chấp nên được miễn tiền thuê!`
          );
          return {
            action: 'MAX_LEVEL_OWNED',
            tileIndex,
            tileName: cfg.name,
            message: `Ô [${cfg.name}] của ${owner.name} đang Thế Chấp Ngân Hàng nên được miễn thu tiền thuê!`
          };
        }
        const rent = this.calculateRent(tileIndex);
        const rentReason = this.getFormattedRentReason(tileIndex);
        const canAffordRent = player.gold >= rent;
        const buyoutCost = this.getBuyoutCost(tileIndex);
        const canBuyoutAfterRent =
          buyoutCost !== null && player.gold >= rent + buyoutCost;
        const payerPrevGold = player.gold;
        const ownerPrevGold = owner.gold;

        if (!options?.deferRentPayment) {
          player.gold -= rent;
          owner.gold += rent;
          this.addLog(
            `💸 ${player.emoji} ${player.name} trả $${rent} tiền thuê tại [${cfg.name}] cho ${owner.emoji} ${owner.name}!`
          );
          this.checkBankruptcy(player, owner.id);
        }

        return {
          action: 'PAID_RENT',
          tileIndex,
          tileName: cfg.name,
          amount: rent,
          ownerId: owner.id,
          ownerName: owner.name,
          rentReason,
          canAffordRent,
          buyoutCost,
          canBuyoutAfterRent,
          payerPrevGold,
          ownerPrevGold,
          message: canAffordRent
            ? `Bạn đã đi vào đất [${cfg.name}] của ${owner.name}. Vì ${rentReason} nên sẽ phải trả $${rent}!`
            : `Bạn đã đi vào đất [${cfg.name}] của ${owner.name}. Vì ${rentReason} nên phải trả $${rent}, nhưng bạn chỉ còn $${player.gold} — Không đủ tiền mặt!`
        };
      }

      case 'CHEST': {
        const isKhiVanTile = tileIndex === 2 || tileIndex === 17 || tileIndex === 33;
        const desiredDeck: 'KHI_VAN' | 'CO_HOI' = isKhiVanTile ? 'KHI_VAN' : 'CO_HOI';
        const deckLabel = desiredDeck === 'KHI_VAN' ? 'Khí Vận' : 'Cơ Hội';

        const forcedCard = options?.forcedCardId
          ? CHEST_CARDS.find((c) => c.id === options.forcedCardId)
          : undefined;
        const deckPool = CHEST_CARDS.filter((c) => c.deck === desiredDeck);
        const pool = deckPool.length > 0 ? deckPool : CHEST_CARDS;
        const card = forcedCard ?? pool[Math.floor(Math.random() * pool.length)];

        const prevGold = player.gold;
        let effectiveGoldDelta = 0;

        if (card.collectFromEachPlayer && card.collectFromEachPlayer > 0) {
          for (const other of this.players) {
            if (other.id === player.id || other.bankrupt) continue;
            const collected = Math.min(other.gold, card.collectFromEachPlayer);
            other.gold -= collected;
            player.gold += collected;
            effectiveGoldDelta += collected;
          }
        } else if (card.goldDelta) {
          player.gold += card.goldDelta;
          effectiveGoldDelta += card.goldDelta;
        }

        if (card.grantGetOutOfJailCard) {
          player.jailFreeCards = (player.jailFreeCards ?? 0) + 1;
        }

        const oldPos = player.position;
        let movedFromTile: number | undefined;
        let movedToTile: number | undefined;
        let moveDirection: 'FORWARD' | 'BACKWARD' | undefined;
        let sentToJailByCard: boolean | undefined;

        if (card.goToJail) {
          this.sendPlayerToJail(player.id, `Thẻ ${deckLabel}: ${card.title}`);
          movedFromTile = oldPos;
          movedToTile = 10;
          sentToJailByCard = true;
        } else if (typeof card.moveToTile === 'number') {
          const target = ((card.moveToTile % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
          if (target !== 0 && target < oldPos) {
            const bonus = this.getStartBonus(player);
            player.gold += bonus;
            effectiveGoldDelta += bonus;
            this.addLog(
              `🚩 ${player.emoji} ${player.name} bay qua Đại Lộ Khởi Hành và nhận +$${bonus}!`
            );
          }
          player.position = target;
          movedFromTile = oldPos;
          movedToTile = target;
          moveDirection = 'FORWARD';
        } else if (typeof card.stepDelta === 'number' && card.stepDelta !== 0) {
          const rawPos = player.position + card.stepDelta;
          if (card.stepDelta > 0 && rawPos >= BOARD_SIZE) {
            const bonus = this.getStartBonus(player);
            player.gold += bonus;
            effectiveGoldDelta += bonus;
          }
          const target = ((rawPos % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
          player.position = target;
          movedFromTile = oldPos;
          movedToTile = target;
          moveDirection = card.stepDelta >= 0 ? 'FORWARD' : 'BACKWARD';
        }

        this.addLog(
          `${desiredDeck === 'KHI_VAN' ? '🧧' : '⚡'} ${player.emoji} ${player.name} rút thẻ [${deckLabel}]: ${card.title}`
        );
        this.checkBankruptcy(player, null);
        return {
          action: 'CHEST_DRAWN',
          tileIndex,
          tileName: cfg.name,
          amount: effectiveGoldDelta,
          payerPrevGold: prevGold,
          chestCard: card,
          movedFromTile,
          movedToTile,
          moveDirection,
          sentToJailByCard,
          message: `[${deckLabel}] ${card.title} — ${card.description}`
        };
      }

      case 'DESERTED_ISLAND': {
        // Vietnamese Monopoly Rule (#10): Walking onto #10 is "Thăm Tù" (Just Visiting) — no turn penalty!
        player.inJail = false;
        player.skipTurns = 0;
        this.addLog(
          `👀 THĂM TÙ! ${player.emoji} ${player.name} ghé thăm bên ngoài [${cfg.name}] — Hoàn toàn tự do, không mất lượt!`
        );
        return {
          action: 'JUST_VISITING_JAIL',
          tileIndex,
          tileName: cfg.name,
          message: `👀 ${player.name} chỉ đang Ghé Thăm Tù tại [${cfg.name}] — Hoàn toàn tự do và không bị mất lượt!`
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
              : `🎉 Đại Tiệc Lễ Hội! Bạn được nhận +$80 tiền thưởng lễ hội!`,
          amount: ownedTiles.length === 0 ? 80 : undefined
        };
      }

      case 'END_PORTAL': {
        // Vietnamese Monopoly Rule (#30): "Đi Thẳng Vào Tù" sends player directly to #10 Jail (Ở Tù)
        this.sendPlayerToJail(player.id, `Bước vào ô #30 [${cfg.name}]`);
        return {
          action: 'SENT_TO_JAIL',
          tileIndex,
          tileName: cfg.name,
          movedFromTile: tileIndex,
          movedToTile: 10,
          message: `🌀 ${player.name} bước vào Cổng Không Gian The End tại [${cfg.name}], bị hút xoáy xuống hố đen và rơi từ Cổng Không Gian trên bầu trời thẳng xuống #10 Nhà Tù Chí Hòa!`
        };
      }

      case 'NETHER_PORTAL': {
        return {
          action: 'NETHER_PORTAL_READY',
          tileIndex,
          tileName: cfg.name,
          amount: 120,
          message: `🟣 Cổng Obsidian Nether đang xoáy tím rực! Bước qua cổng để nhảy vọt xuyên chiều không gian (1 bước Nether = 8 bước Overworld) và nhận +$120 Vàng Piglin!`
        };
      }

      case 'ROYAL_TAX': {
        const baseTax = cfg.price ?? 120;
        const tax = this.getEffectiveTaxAmount(player.id, baseTax);
        const prevGold = player.gold;
        player.gold -= tax;
        this.addLog(
          `🏛️ ${player.emoji} ${player.name} nộp ${cfg.name} -$${tax}${
            player.characterId === 'creeper' ? ' (Nội tại Creeper -20%)' : ''
          }.`
        );
        this.checkBankruptcy(player, null);
        return {
          action: 'PAID_ROYAL_TAX',
          tileIndex,
          tileName: cfg.name,
          amount: tax,
          rentReason: cfg.rentReason || `nộp ${cfg.name} theo quy định đô thị`,
          payerPrevGold: prevGold,
          message: `Vì ${cfg.rentReason || `quy định ${cfg.name}`}, bạn phải nộp -$${tax}${
            player.characterId === 'creeper' ? ' (Đã giảm 20% nội tại Creeper)' : ''
          } vào Kho Bạc Thành Phố!`
        };
      }
    }
  }

  /**
   * Emergency 75% property liquidation when a player's gold drops below 0
   */
  private checkBankruptcy(player: PlayerState, creditorId: string | null): void {
    if (player.gold >= 0) return;

    const ownedTiles = this.tiles
      .filter((t) => t.ownerId === player.id)
      .sort((a, b) => this.calculateRent(a.index) - this.calculateRent(b.index));

    for (const tileState of ownedTiles) {
      if (player.gold >= 0) break;
      const cfg = this.getTileConfig(tileState.index);
      const basePrice = cfg.price ?? 100;
      const upgradeTotal = Math.max(0, tileState.level - 1) * (cfg.upgradeCost ?? 60);
      const resaleValue = Math.round((basePrice + upgradeTotal) * 0.75);

      player.gold += resaleValue;
      tileState.ownerId = null;
      tileState.level = 0;
      tileState.festivalMultiplier = 1;

      this.addLog(
        `🏦 ${player.emoji} ${player.name} bán khẩn cấp [${cfg.name}] thu về +$${resaleValue} (75% giá trị) để trả nợ!`
      );
    }

    if (player.gold >= 0) {
      return;
    }

    player.bankrupt = true;
    player.gold = 0;
    player.skipTurns = 0;
    this.addLog(`💀 ${player.emoji} ${player.name} đã chính thức phá sản và rời khỏi đường đua!`);

    for (const t of this.tiles) {
      if (t.ownerId === player.id) {
        if (creditorId) {
          t.ownerId = null;
          t.level = 0;
          t.festivalMultiplier = 1;
        } else {
          t.ownerId = null;
          t.level = 0;
          t.festivalMultiplier = 1;
        }
      }
    }

    this.checkVictoryAfterElimination();
  }

  public nextTurn(): { activePlayer: PlayerState; skippedPlayer?: PlayerState; extraTurn?: boolean } {
    if (this.canTakeExtraDoublesTurn()) {
      const current = this.getCurrentPlayer();
      return { activePlayer: current, extraTurn: true };
    }

    this.consecutiveDoubles = 0;
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
          `🏝️ ${candidate.emoji} ${candidate.name} đang bị tạm giữ tại Đảo Cách Ly (Bỏ qua lượt này).`
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
