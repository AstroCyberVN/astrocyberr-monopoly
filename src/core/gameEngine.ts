import {
  BOARD_SIZE,
  BOARD_TILES,
  BUILDING_TIER_NAMES,
  BoardColorGroup,
  CHARACTER_CONFIGS,
  CHEST_CARDS,
  CharacterId,
  ChestCard,
  GAME_RULES_CONFIG,
  TileConfig
} from './boardData';
import { gameEventBus } from './EventBus';

export type GameMode = 'SOLO_VS_AI' | 'PASS_AND_PLAY' | 'ONLINE_ROOM';

export interface PlayerState {
  id: string;
  characterId: CharacterId;
  name: string;
  color: string;
  emoji: string;
  gold: number;
  position: number;
  isBot: boolean;
  bankrupt: boolean;
  skipTurns: number;
  inJail?: boolean;
  jailTurns?: number;
  jailFreeCards?: number;
  consecutiveDoubles?: number;
}

export interface TileState {
  index: number;
  ownerId: string | null;
  level: number;
  festivalMultiplier: number;
  festivalTurnsLeft?: number;
  mortgaged?: boolean;
}

export type LandingActionType =
  | 'NONE'
  | 'CAN_BUY_PROPERTY'
  | 'CAN_UPGRADE_PROPERTY'
  | 'PAID_RENT'
  | 'PAID_ROYAL_TAX'
  | 'CHEST_DRAWN'
  | 'SKIP_TURN_SET'
  | 'JUST_VISITING_JAIL'
  | 'SENT_TO_JAIL'
  | 'CHOOSE_FESTIVAL_TILE'
  | 'CHOOSE_PORTAL_TARGET'
  | 'NETHER_PORTAL_READY';

export interface TileResolutionResult {
  action: LandingActionType;
  tileIndex: number;
  tileName: string;
  amount?: number;
  ownerId?: string;
  ownerName?: string;
  rentReason?: string;
  canAffordRent?: boolean;
  payerPrevGold?: number;
  ownerPrevGold?: number;
  chestCard?: ChestCard;
  movedFromTile?: number;
  movedToTile?: number;
  moveDirection?: 'FORWARD' | 'BACKWARD';
  sentToJailByCard?: boolean;
  message: string;
}

export interface ConfirmedRentPaymentResult {
  ok: boolean;
  paidAmount: number;
  rentAmount: number;
  ownerId: string;
  payerPrevGold: number;
  payerNewGold: number;
  ownerPrevGold: number;
  ownerNewGold: number;
  bankrupt: boolean;
}

export interface TradeProposal {
  fromPlayerId: string;
  toPlayerId: string;
  targetTileIndex: number;
  offeredTileIndex?: number;
  cashOffer: number;
}

export interface TradeResult {
  ok: boolean;
  accepted: boolean;
  reason: string;
}

export interface SerializedGameState {
  mode: GameMode;
  round: number;
  currentPlayerIndex: number;
  lastDiceTotal: number;
  players: PlayerState[];
  tiles: TileState[];
  logs: string[];
  winnerId: string | null;
}

export class GameEngine {
  private mode: GameMode = 'SOLO_VS_AI';
  private round = 1;
  private currentPlayerIndex = 0;
  private lastDiceTotal = 7;
  private lastRollWasDoubles = false;
  private players: PlayerState[] = [];
  private tiles: TileState[] = [];
  private logs: string[] = [];
  private winnerId: string | null = null;

  constructor(
    mode: GameMode = 'SOLO_VS_AI',
    humanCount = 1,
    initialGold = GAME_RULES_CONFIG.startingGold,
    primaryHumanCharacter?: CharacterId
  ) {
    this.initGame(mode, humanCount, initialGold, primaryHumanCharacter);
  }

  public initGame(
    mode: GameMode,
    humanCount = 1,
    initialGold = GAME_RULES_CONFIG.startingGold,
    primaryHumanCharacter?: CharacterId
  ): void {
    this.mode = mode;
    this.round = 1;
    this.currentPlayerIndex = 0;
    this.lastDiceTotal = 7;
    this.lastRollWasDoubles = false;
    this.winnerId = null;
    this.logs = [];

    const clampedHumans = Math.max(1, Math.min(4, humanCount));

    // Order CHARACTER_CONFIGS so `primaryHumanCharacter` (if chosen in the 3D Lobby) is slot 0 (Player 1)
    const orderedChars = [...CHARACTER_CONFIGS];
    if (primaryHumanCharacter) {
      const chosenIdx = orderedChars.findIndex((c) => c.id === primaryHumanCharacter);
      if (chosenIdx > 0) {
        const [chosen] = orderedChars.splice(chosenIdx, 1);
        orderedChars.unshift(chosen);
      }
    }

    this.players = orderedChars.map((cfg, idx) => {
      const isBot = mode === 'SOLO_VS_AI' ? idx >= 1 : idx >= clampedHumans;
      return {
        id: `p${idx + 1}`,
        characterId: cfg.id,
        name: isBot ? `${cfg.name} (AI)` : cfg.name,
        color: cfg.color,
        emoji: cfg.emoji,
        gold: initialGold,
        position: 0,
        isBot,
        bankrupt: false,
        skipTurns: 0,
        inJail: false,
        jailTurns: 0,
        jailFreeCards: 0,
        consecutiveDoubles: 0
      };
    });

    this.tiles = BOARD_TILES.map((t) => ({
      index: t.index,
      ownerId: null,
      level: 0,
      festivalMultiplier: 1,
      festivalTurnsLeft: 0,
      mortgaged: false
    }));

    this.addLog(
      `🌟 Khởi tranh Đảo Nổi Voxel 40 Ô! Mỗi tỷ phú khởi đầu với $${initialGold}.`
    );

    gameEventBus.emit('lobby:started', {
      mode,
      humanCount: clampedHumans,
      primaryCharacter: this.players[0].characterId
    });
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

  public getPlayerById(id: string): PlayerState {
    const found = this.players.find((p) => p.id === id);
    if (!found) {
      throw new Error(`Player not found: ${id}`);
    }
    return found;
  }

  public getCurrentPlayer(): PlayerState {
    return this.players[this.currentPlayerIndex];
  }

  public getCurrentPlayerIndex(): number {
    return this.currentPlayerIndex;
  }

  public getTileState(index: number): TileState {
    return this.tiles[((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE];
  }

  public getTileConfig(index: number): TileConfig {
    return BOARD_TILES[((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE];
  }

  public getAllTileStates(): TileState[] {
    return this.tiles;
  }

  public getLogs(): string[] {
    return this.logs;
  }

  public getWinner(): PlayerState | null {
    if (!this.winnerId) return null;
    return this.players.find((p) => p.id === this.winnerId) ?? null;
  }

  public addLog(msg: string): void {
    this.logs.unshift(`[Vòng ${this.round}] ${msg}`);
    if (this.logs.length > 60) {
      this.logs.pop();
    }
  }

  /**
   * Calculates a player's Total Net Worth (Gold + Owned Property Values + Building Upgrades - Mortgaged).
   */
  public calculatePlayerNetWorth(playerId: string): number {
    const player = this.getPlayerById(playerId);
    if (player.bankrupt) return 0;

    let totalAssets = player.gold;
    for (const st of this.tiles) {
      if (st.ownerId !== playerId) continue;
      const cfg = this.getTileConfig(st.index);
      const basePrice = cfg.price ?? 0;
      if (st.mortgaged) {
        totalAssets += Math.round(basePrice * (1 - GAME_RULES_CONFIG.mortgageRatePct / 100));
      } else {
        const upCost = this.getEffectiveUpgradeCost(playerId, st.index);
        const upgradesVal = Math.max(0, st.level - 1) * upCost;
        totalAssets += basePrice + upgradesVal;
      }
    }
    return totalAssets;
  }

  /**
   * Checks if `ownerId` owns EVERY tile belonging to `group` (Complete Monopoly Set -> +50% rent bonus!)
   */
  public ownsFullColorGroup(ownerId: string, group: BoardColorGroup): boolean {
    if (group === 'SPECIAL' || group === 'RAILROAD' || group === 'UTILITY') return false;
    const groupTiles = BOARD_TILES.filter((t) => t.type === 'PROPERTY' && t.group === group);
    if (groupTiles.length === 0) return false;
    return groupTiles.every((t) => this.getTileState(t.index).ownerId === ownerId);
  }

  /**
   * UX-02: Returns `{ ownedCount, totalCount, isMonopoly }` for a given player and color group
   */
  public getPlayerColorGroupOwnership(
    playerId: string,
    group: BoardColorGroup
  ): { ownedCount: number; totalCount: number; isMonopoly: boolean } {
    const groupTiles = BOARD_TILES.filter((t) => t.type === 'PROPERTY' && t.group === group);
    const totalCount = groupTiles.length;
    if (totalCount === 0) {
      return { ownedCount: 0, totalCount: 0, isMonopoly: false };
    }
    const ownedCount = groupTiles.filter(
      (t) => this.getTileState(t.index).ownerId === playerId
    ).length;
    return {
      ownedCount,
      totalCount,
      isMonopoly: ownedCount === totalCount
    };
  }

  /**
   * Character Passive 1: Steve gets -15% discount on all building upgrades
   */
  public getEffectiveUpgradeCost(playerId: string, tileIndex: number): number {
    const cfg = this.getTileConfig(tileIndex);
    const baseCost = cfg.upgradeCost ?? 0;
    const player = this.getPlayerById(playerId);
    if (player.characterId === 'steve') {
      return Math.round(baseCost * (1 - GAME_RULES_CONFIG.steveUpgradeDiscountPct / 100));
    }
    return baseCost;
  }

  /**
   * Character Passive 3: Creeper gets -20% discount on Royal / Luxury Tax tiles (#4 & #38)
   */
  public getEffectiveTaxAmount(playerId: string, baseTax: number): number {
    const player = this.getPlayerById(playerId);
    if (player.characterId === 'creeper') {
      return Math.round(baseTax * (1 - GAME_RULES_CONFIG.creeperTaxDiscountPct / 100));
    }
    return baseTax;
  }

  /**
   * Standard Monopoly Rule: Checks if `playerId` can upgrade `tileIndex` under the Even-Build Rule
   * (when owning a full color group, a tile cannot be upgraded more than 1 level ahead of its siblings).
   */
  public canUpgradePropertyEvenly(playerId: string, tileIndex: number): boolean {
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);
    if (cfg.type !== 'PROPERTY' || state.ownerId !== playerId || state.mortgaged) return false;
    if (state.level >= 4) return false;

    if (this.ownsFullColorGroup(playerId, cfg.group)) {
      const groupLevels = BOARD_TILES.filter(
        (t) => t.type === 'PROPERTY' && t.group === cfg.group
      ).map((t) => this.getTileState(t.index).level);
      const minLevel = Math.min(...groupLevels);
      return state.level <= minLevel;
    }
    return true;
  }

  /**
   * Standard Monopoly Rule: Mortgage a property for 50% of its total invested value.
   * Uses `getEffectiveUpgradeCost` so Steve's -15% upgrade discount cannot be exploited for free gold.
   */
  public getMortgageValue(tileIndex: number): number {
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);
    const basePrice = cfg.price ?? 0;
    const upCost = state.ownerId
      ? this.getEffectiveUpgradeCost(state.ownerId, tileIndex)
      : (cfg.upgradeCost ?? 0);
    const upgradesInvested = Math.max(0, state.level - 1) * upCost;
    return Math.round((basePrice + upgradesInvested) * (GAME_RULES_CONFIG.mortgageRatePct / 100));
  }

  public getUnmortgageCost(tileIndex: number): number {
    const cfg = this.getTileConfig(tileIndex);
    return Math.round((cfg.price ?? 0) * (GAME_RULES_CONFIG.unmortgageRatePct / 100));
  }

  public mortgageProperty(
    playerId: string,
    tileIndex: number
  ): { ok: boolean; payout: number; mortgageValue: number; reason?: string } {
    const player = this.getPlayerById(playerId);
    const state = this.getTileState(tileIndex);
    const cfg = this.getTileConfig(tileIndex);

    if (state.ownerId !== playerId) {
      return { ok: false, payout: 0, mortgageValue: 0, reason: 'NOT_OWNER' };
    }
    if (state.mortgaged) {
      return { ok: false, payout: 0, mortgageValue: 0, reason: 'ALREADY_MORTGAGED' };
    }

    const payout = this.getMortgageValue(tileIndex);
    state.mortgaged = true;
    state.level = Math.min(1, state.level);
    player.gold += payout;

    this.addLog(
      `${player.emoji} ${player.name} thế chấp ${cfg.name} cho Ngân hàng và nhận +$${payout} tiền mặt!`
    );
    return { ok: true, payout, mortgageValue: payout };
  }

  public unmortgageProperty(
    playerId: string,
    tileIndex: number
  ): { ok: boolean; cost: number; unmortgageCost: number; reason?: string } {
    const player = this.getPlayerById(playerId);
    const state = this.getTileState(tileIndex);
    const cfg = this.getTileConfig(tileIndex);

    if (state.ownerId !== playerId || !state.mortgaged) {
      return { ok: false, cost: 0, unmortgageCost: 0, reason: 'NOT_MORTGAGED' };
    }
    const cost = this.getUnmortgageCost(tileIndex);
    if (player.gold < cost) {
      return { ok: false, cost, unmortgageCost: cost, reason: 'INSUFFICIENT_GOLD' };
    }

    player.gold -= cost;
    state.mortgaged = false;
    this.addLog(
      `${player.emoji} ${player.name} chuộc lại giấy tờ ${cfg.name} với giá $${cost} (gồm 10% lãi Ngân hàng)!`
    );
    return { ok: true, cost, unmortgageCost: cost };
  }

  /**
   * Standard Monopoly Rule: Public Property Auction when a player passes on buying an unowned property!
   */
  public runPropertyAuction(
    tileIndex: number,
    manualHumanBids?: Record<string, number>
  ): { winnerId: string | null; winningBid: number; tileName: string } {
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);
    const basePrice = cfg.price ?? 100;

    let highestBidder: PlayerState | null = null;
    let highestBid = Math.max(20, Math.round(basePrice * 0.4));

    for (const p of this.players) {
      if (p.bankrupt) continue;
      let candidateBid = 0;

      if (!p.isBot && manualHumanBids && typeof manualHumanBids[p.id] === 'number') {
        candidateBid = manualHumanBids[p.id];
      } else if (p.isBot) {
        const groupSiblings = BOARD_TILES.filter(
          (t) => t.group === cfg.group && this.getTileState(t.index).ownerId === p.id
        ).length;
        const maxWilling = Math.round(basePrice * (groupSiblings > 0 ? 1.15 : 0.85));
        if (p.gold - 80 >= highestBid + 10 && highestBid + 15 <= maxWilling) {
          candidateBid = Math.min(p.gold - 60, maxWilling);
        }
      }

      if (candidateBid > highestBid && p.gold >= candidateBid) {
        highestBid = candidateBid;
        highestBidder = p;
      }
    }

    if (highestBidder) {
      highestBidder.gold -= highestBid;
      state.ownerId = highestBidder.id;
      state.level = 1;
      state.mortgaged = false;
      this.addLog(
        `🔨 ĐẤU GIÁ THÀNH CÔNG: ${highestBidder.emoji} ${highestBidder.name} thắng đấu giá ${cfg.name} với mức $${highestBid}!`
      );
      gameEventBus.emit('property:bought', {
        playerId: highestBidder.id,
        tileIndex,
        price: highestBid
      });
      return { winnerId: highestBidder.id, winningBid: highestBid, tileName: cfg.name };
    }

    this.addLog(`🔨 Không ai trả giá đủ cao cho ${cfg.name}, ô đất tiếp tục thuộc về Ngân hàng.`);
    return { winnerId: null, winningBid: 0, tileName: cfg.name };
  }

  /**
   * FEAT-01: Hostile Takeover / Buyout Cost (`160%` of base price + upgraded building value).
   * Creeper Passive Enhancement: Opponents attempting a Hostile Buyout on a property owned by `creeper`
   * must pay an extra `+15%` TNT Hazard Surcharge (`1.15x`).
   * Level 4 Voxel Castles are immune to buyout (`returns null`).
   */
  public getBuyoutCost(tileIndex: number): number | null {
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);
    if (cfg.type !== 'PROPERTY' || !state.ownerId || state.level >= 4) {
      return null;
    }
    const basePrice = cfg.price ?? 0;
    const upgradesValue = Math.max(0, state.level - 1) * (cfg.upgradeCost ?? 0);
    let cost = Math.round(
      (basePrice + upgradesValue) * (GAME_RULES_CONFIG.hostileBuyoutMultiplierPct / 100)
    );

    const currentOwner = this.getPlayerById(state.ownerId);
    if (currentOwner.characterId === 'creeper') {
      cost = Math.round(cost * 1.15);
    }
    return cost;
  }

  /**
   * FEAT-01: Executes a Hostile Property Buyout from the current owner after landing on their tile
   */
  public buyoutOpponentProperty(
    buyerId: string,
    tileIndex: number
  ): { ok: boolean; cost: number; prevOwnerId: string | null; reason?: string } {
    const buyer = this.getPlayerById(buyerId);
    const state = this.getTileState(tileIndex);
    const cfg = this.getTileConfig(tileIndex);
    const buyoutCost = this.getBuyoutCost(tileIndex);

    if (buyoutCost === null || !state.ownerId || state.ownerId === buyerId) {
      return { ok: false, cost: 0, prevOwnerId: state.ownerId, reason: 'CANNOT_BUYOUT' };
    }
    if (buyer.gold < buyoutCost) {
      return { ok: false, cost: buyoutCost, prevOwnerId: state.ownerId, reason: 'INSUFFICIENT_GOLD' };
    }

    const prevOwner = this.getPlayerById(state.ownerId);
    buyer.gold -= buyoutCost;
    prevOwner.gold += buyoutCost;
    state.ownerId = buyer.id;

    const creeperNote = prevOwner.characterId === 'creeper' ? ' (gồm +15% Phí Răn Đe TNT)' : '';
    this.addLog(
      `⚔️ THÔN TÍNH ĐỊA BÀN: ${buyer.emoji} ${buyer.name} chi $${buyoutCost}${creeperNote} mua đứt ${cfg.name} từ tay ${prevOwner.name}!`
    );
    return { ok: true, cost: buyoutCost, prevOwnerId: prevOwner.id };
  }

  /**
   * FEAT-v5.0: Player-to-Player & Player-to-Bot Property Trading (`proposePropertyTrade`).
   * Supports both object-style `proposePropertyTrade(proposal)` and shorthand
   * `proposePropertyTrade(fromPlayerId, targetTileIndex, cashOffer, offeredTileIndex)`.
   */
  public proposePropertyTrade(
    proposalOrFromId: TradeProposal | string,
    targetTileIndexArg?: number,
    cashOfferArg?: number,
    offeredTileIndexArg?: number
  ): TradeResult {
    let proposal: TradeProposal;
    if (typeof proposalOrFromId === 'string') {
      const tIdx = targetTileIndexArg ?? 0;
      const st = this.getTileState(tIdx);
      proposal = {
        fromPlayerId: proposalOrFromId,
        toPlayerId: st.ownerId ?? '',
        targetTileIndex: tIdx,
        cashOffer: cashOfferArg ?? 0,
        offeredTileIndex: offeredTileIndexArg
      };
    } else {
      proposal = proposalOrFromId;
    }

    const fromPlayer = this.getPlayerById(proposal.fromPlayerId);
    const toPlayer = this.getPlayerById(proposal.toPlayerId);
    if (fromPlayer.bankrupt || toPlayer.bankrupt || fromPlayer.id === toPlayer.id) {
      return { ok: false, accepted: false, reason: 'Người chơi không hợp lệ.' };
    }

    const targetState = this.getTileState(proposal.targetTileIndex);
    const targetCfg = this.getTileConfig(proposal.targetTileIndex);
    if (targetState.ownerId !== toPlayer.id) {
      return { ok: false, accepted: false, reason: 'Đối phương không sở hữu ô đất mục tiêu.' };
    }
    if (targetState.level >= 4) {
      return { ok: false, accepted: false, reason: 'Lâu Đài Voxel Cấp 4 không thể chuyển nhượng.' };
    }

    const cashOffer = Math.max(0, Math.round(proposal.cashOffer));
    if (fromPlayer.gold < cashOffer) {
      return { ok: false, accepted: false, reason: 'Bạn không đủ tiền mặt để đề nghị mức giá này.' };
    }

    let offeredTileValue = 0;
    let offeredCfg: TileConfig | null = null;
    let offeredState: TileState | null = null;
    if (typeof proposal.offeredTileIndex === 'number') {
      offeredState = this.getTileState(proposal.offeredTileIndex);
      offeredCfg = this.getTileConfig(proposal.offeredTileIndex);
      if (offeredState.ownerId !== fromPlayer.id) {
        return { ok: false, accepted: false, reason: 'Bạn không sở hữu ô đất đem ra trao đổi.' };
      }
      offeredTileValue =
        (offeredCfg.price ?? 0) +
        Math.max(0, offeredState.level - 1) * (offeredCfg.upgradeCost ?? 0);
    }

    const targetBaseValue =
      (targetCfg.price ?? 0) +
      Math.max(0, targetState.level - 1) * (targetCfg.upgradeCost ?? 0);

    // If target player is an AI Bot, evaluate fairness:
    // - Standard required value: 125% of targetBaseValue (or 155% if AI already owns Full Color Group!)
    if (toPlayer.isBot) {
      const botHasMonopoly = this.ownsFullColorGroup(toPlayer.id, targetCfg.group);
      const requiredMultiplier = botHasMonopoly ? 1.55 : 1.25;
      const minRequiredOffer = Math.round(targetBaseValue * requiredMultiplier);
      const totalOfferedValue = cashOffer + offeredTileValue;

      if (totalOfferedValue < minRequiredOffer) {
        this.addLog(
          `🤝 ${toPlayer.emoji} ${toPlayer.name} từ chối thương lượng mua ${targetCfg.name} (cần tối thiểu giá trị ~$${minRequiredOffer}).`
        );
        return {
          ok: true,
          accepted: false,
          reason: `${toPlayer.name} từ chối! Họ định giá ${targetCfg.name} tối thiểu $${minRequiredOffer} (Tổng đề nghị của bạn: $${totalOfferedValue}).`
        };
      }
    }

    // Execute trade
    fromPlayer.gold -= cashOffer;
    toPlayer.gold += cashOffer;
    targetState.ownerId = fromPlayer.id;

    if (offeredState && offeredCfg) {
      offeredState.ownerId = toPlayer.id;
      this.addLog(
        `🤝 THƯƠNG VỤ THÀNH CÔNG: ${fromPlayer.emoji} ${fromPlayer.name} đổi ${offeredCfg.name} + $${cashOffer} lấy ${targetCfg.name} của ${toPlayer.name}!`
      );
    } else {
      this.addLog(
        `🤝 THƯƠNG VỤ THÀNH CÔNG: ${fromPlayer.emoji} ${fromPlayer.name} mua thỏa thuận ${targetCfg.name} từ ${toPlayer.name} với giá $${cashOffer}!`
      );
    }

    gameEventBus.emit('property:traded', {
      fromPlayerId: fromPlayer.id,
      toPlayerId: toPlayer.id,
      targetTileIndex: proposal.targetTileIndex,
      offeredTileIndex: proposal.offeredTileIndex,
      cashOffer
    });
    gameEventBus.emit('PROPERTY_TRADED', {
      proposerId: fromPlayer.id,
      targetOwnerId: toPlayer.id,
      tileIndex: proposal.targetTileIndex,
      cashOffer
    });

    return {
      ok: true,
      accepted: true,
      reason: `Thương lượng thành công! Quyền sở hữu ${targetCfg.name} đã chuyển sang ${fromPlayer.name}.`
    };
  }

  /**
   * FEAT-02: Liquidation value (`75%` of total invested capital, respecting Steve's discount)
   * when selling a property back to the Bank
   */
  public getLiquidationValue(tileIndex: number): number {
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);
    const basePrice = cfg.price ?? 0;
    const upCost = state.ownerId
      ? this.getEffectiveUpgradeCost(state.ownerId, tileIndex)
      : (cfg.upgradeCost ?? 0);
    const upgradesValue = Math.max(0, state.level - 1) * upCost;
    return Math.round((basePrice + upgradesValue) * (GAME_RULES_CONFIG.liquidationRatePct / 100));
  }

  public getPlayerLiquidatableProperties(
    playerId: string
  ): Array<{ tileIndex: number; name: string; level: number; resaleValue: number }> {
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
      });
  }

  /**
   * FEAT-02: Sells a player's owned property back to the Bank for 75% cash to avoid bankruptcy
   */
  public liquidateProperty(
    playerId: string,
    tileIndex: number
  ): { ok: boolean; payout: number; tileName: string } {
    const player = this.getPlayerById(playerId);
    const state = this.getTileState(tileIndex);
    const cfg = this.getTileConfig(tileIndex);
    if (state.ownerId !== playerId) {
      return { ok: false, payout: 0, tileName: cfg.name };
    }

    const payout = this.getLiquidationValue(tileIndex);
    player.gold += payout;
    state.ownerId = null;
    state.level = 0;
    state.festivalMultiplier = 1;
    state.festivalTurnsLeft = 0;
    state.mortgaged = false;

    this.addLog(
      `🏦 THANH LÝ KHẨN CẤP: ${player.emoji} ${player.name} bán lại ${cfg.name} cho Ngân hàng thu về +$${payout}!`
    );
    return { ok: true, payout, tileName: cfg.name };
  }

  public rollDice(forcedValues?: [number, number]): {
    d1: number;
    d2: number;
    total: number;
    isDoubles: boolean;
    sentToJailByTripleDoubles?: boolean;
  } {
    const d1 = forcedValues ? forcedValues[0] : Math.floor(Math.random() * 6) + 1;
    const d2 = forcedValues ? forcedValues[1] : Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;
    const isDoubles = d1 === d2;
    this.lastDiceTotal = total;
    this.lastRollWasDoubles = isDoubles;

    const current = this.getCurrentPlayer();
    gameEventBus.emit('dice:rolled', {
      playerId: current.id,
      d1,
      d2,
      total,
      isDoubles
    });

    if (isDoubles) {
      current.consecutiveDoubles = (current.consecutiveDoubles ?? 0) + 1;
      if (current.consecutiveDoubles >= 3) {
        current.consecutiveDoubles = 0;
        this.lastRollWasDoubles = false;
        this.sendPlayerToJail(
          current.id,
          'Đổ trúng cặp đôi 3 lần liên tiếp (Luật Cờ Tỷ Phú Việt Nam)'
        );
        return { d1, d2, total, isDoubles, sentToJailByTripleDoubles: true };
      }
      this.addLog(
        `⚡ XÚC XẮC ĐÔI (${d1}-${d2})! ${current.emoji} ${current.name} sẽ được tung thêm 1 lượt nữa!`
      );
    } else {
      current.consecutiveDoubles = 0;
    }

    return { d1, d2, total, isDoubles };
  }

  /**
   * Sends a player directly to Tile #10 (Nhà Tù Chí Hòa) without collecting $200 Start bonus.
   * Enderman Passive: Triggers `+$50` Ender Crystal bonus when warped into Jail via Portal!
   */
  public sendPlayerToJail(playerId: string, reason: string): void {
    const player = this.getPlayerById(playerId);
    const fromTile = player.position;
    player.position = 10;
    player.inJail = true;
    player.jailTurns = 0;
    player.consecutiveDoubles = 0;
    this.lastRollWasDoubles = false;

    let endermanBonusMsg = '';
    if (player.characterId === 'enderman') {
      player.gold += GAME_RULES_CONFIG.endermanPortalBonus;
      endermanBonusMsg = ` (Nội tại Enderman +$${GAME_RULES_CONFIG.endermanPortalBonus} Tinh Thể Ender!)`;
    }

    this.addLog(
      `🚓 VÀO TÙ CHÍ HÒA (#10): ${player.emoji} ${player.name} bị áp giải thẳng vào Nhà Tù Chí Hòa do: ${reason}!${endermanBonusMsg}`
    );

    gameEventBus.emit('portal:teleported', {
      playerId: player.id,
      fromTile,
      toTile: 10,
      reason: 'PORTAL_30'
    });
  }

  /**
   * Resolves a player paying the $50 Jail fine at Tile #10 (Nhà Tù Chí Hòa) to leave Jail immediately.
   * Enderman Passive: Gains +$50 Ender Crystal bonus when escaping Jail!
   */
  public payJailFine(
    playerId: string,
    fineAmount = GAME_RULES_CONFIG.jailFineAmount
  ): { ok: boolean; remainingGold: number } {
    const player = this.getPlayerById(playerId);
    if (!player.inJail || player.gold < fineAmount) {
      return { ok: false, remainingGold: player.gold };
    }
    player.gold -= fineAmount;
    player.inJail = false;
    player.jailTurns = 0;

    let bonusNote = '';
    if (player.characterId === 'enderman') {
      player.gold += GAME_RULES_CONFIG.endermanPortalBonus;
      bonusNote = ` (Nội tại Enderman hoàn lại +$${GAME_RULES_CONFIG.endermanPortalBonus} khi thoát Tù!)`;
    }

    this.addLog(
      `🔓 ${player.emoji} ${player.name} nộp phạt $${fineAmount} tại Nhà Tù Chí Hòa (#10) và được tự do tung xúc xắc!${bonusNote}`
    );
    gameEventBus.emit('portal:teleported', {
      playerId: player.id,
      fromTile: 10,
      toTile: 10,
      reason: 'JAIL_ESCAPE'
    });
    return { ok: true, remainingGold: player.gold };
  }

  /**
   * Uses a "Thẻ Ra Tù Miễn Phí" (Get Out of Jail Free Card) to leave Jail immediately.
   * Enderman Passive: Gains +$50 Ender Crystal bonus when escaping Jail!
   */
  public useJailFreeCard(playerId: string): { ok: boolean; remainingCards: number } {
    const player = this.getPlayerById(playerId);
    if (!player.inJail || (player.jailFreeCards ?? 0) <= 0) {
      return { ok: false, remainingCards: player.jailFreeCards ?? 0 };
    }
    player.jailFreeCards = (player.jailFreeCards ?? 1) - 1;
    player.inJail = false;
    player.jailTurns = 0;

    let bonusNote = '';
    if (player.characterId === 'enderman') {
      player.gold += GAME_RULES_CONFIG.endermanPortalBonus;
      bonusNote = ` (Nội tại Enderman nhận +$${GAME_RULES_CONFIG.endermanPortalBonus} Tinh Thể Ender khi thoát Tù!)`;
    }

    this.addLog(
      `🕊️ ${player.emoji} ${player.name} sử dụng Thẻ Ra Tù Miễn Phí để bước ra khỏi Nhà Tù Chí Hòa (#10)!${bonusNote}`
    );
    gameEventBus.emit('portal:teleported', {
      playerId: player.id,
      fromTile: 10,
      toTile: 10,
      reason: 'JAIL_ESCAPE'
    });
    return { ok: true, remainingCards: player.jailFreeCards };
  }

  /**
   * Attempts to roll doubles while in Jail (#10 Nhà Tù Chí Hòa):
   * - If `d1 === d2`: Escapes Jail for free and moves `d1 + d2` tiles!
   * - If not doubles on 3rd turn in Jail: Automatically pays $50 bail and moves `d1 + d2` tiles!
   */
  public attemptRollDoublesInJail(
    playerId: string,
    forcedValues?: [number, number]
  ): {
    d1: number;
    d2: number;
    total: number;
    escaped: boolean;
    paidForcedFine: boolean;
  } {
    const player = this.getPlayerById(playerId);
    const d1 = forcedValues ? forcedValues[0] : Math.floor(Math.random() * 6) + 1;
    const d2 = forcedValues ? forcedValues[1] : Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;
    this.lastDiceTotal = total;
    this.lastRollWasDoubles = false;

    if (d1 === d2) {
      player.inJail = false;
      player.jailTurns = 0;
      let bonusNote = '';
      if (player.characterId === 'enderman') {
        player.gold += GAME_RULES_CONFIG.endermanPortalBonus;
        bonusNote = ` (+$${GAME_RULES_CONFIG.endermanPortalBonus} Nội tại Enderman!)`;
      }
      this.addLog(
        `🎲 THOÁT TÙ NGOẠN MỤC! ${player.emoji} ${player.name} đổ trúng cặp đôi (${d1}-${d2}) để ra khỏi Nhà Tù Chí Hòa miễn phí!${bonusNote}`
      );
      gameEventBus.emit('portal:teleported', {
        playerId: player.id,
        fromTile: 10,
        toTile: 10,
        reason: 'JAIL_ESCAPE'
      });
      return { d1, d2, total, escaped: true, paidForcedFine: false };
    }

    player.jailTurns = (player.jailTurns ?? 0) + 1;
    if (player.jailTurns >= 3) {
      const fine = Math.min(player.gold, GAME_RULES_CONFIG.jailFineAmount);
      player.gold -= fine;
      player.inJail = false;
      player.jailTurns = 0;
      let bonusNote = '';
      if (player.characterId === 'enderman') {
        player.gold += GAME_RULES_CONFIG.endermanPortalBonus;
        bonusNote = ` (+$${GAME_RULES_CONFIG.endermanPortalBonus} Nội tại Enderman!)`;
      }
      this.addLog(
        `⏳ Đã hết 3 lượt ở Nhà Tù Chí Hòa: ${player.emoji} ${player.name} nộp phạt $${fine} để ra tù và đi ${total} bước!${bonusNote}`
      );
      gameEventBus.emit('portal:teleported', {
        playerId: player.id,
        fromTile: 10,
        toTile: 10,
        reason: 'JAIL_ESCAPE'
      });
      return { d1, d2, total, escaped: true, paidForcedFine: true };
    }

    this.addLog(
      `🔒 ${player.emoji} ${player.name} đổ (${d1}-${d2}) chưa ra đôi — tiếp tục ở lại Nhà Tù Chí Hòa (Lượt ${player.jailTurns}/3).`
    );
    return { d1, d2, total, escaped: false, paidForcedFine: false };
  }

  public canTakeExtraDoublesTurn(): boolean {
    const current = this.getCurrentPlayer();
    return (
      this.lastRollWasDoubles &&
      !current.bankrupt &&
      !current.inJail &&
      current.skipTurns === 0 &&
      !this.winnerId
    );
  }

  public stepPlayerOneTile(playerId: string): {
    newPosition: number;
    passedStart: boolean;
  } {
    const player = this.getPlayerById(playerId);
    const nextPos = (player.position + 1) % BOARD_SIZE;
    const passedStart = nextPos === 0;
    player.position = nextPos;

    if (passedStart) {
      const bonus =
        player.characterId === 'alex'
          ? GAME_RULES_CONFIG.passStartReward + GAME_RULES_CONFIG.alexStartBonus
          : GAME_RULES_CONFIG.passStartReward;
      player.gold += bonus;
      this.addLog(
        `${player.emoji} ${player.name} đi qua Ô Xuất Phát (#0) và nhận +$${bonus}${
          player.characterId === 'alex'
            ? ` (Nội tại Alex +$${GAME_RULES_CONFIG.alexStartBonus})`
            : ''
        }!`
      );
    }

    return { newPosition: nextPos, passedStart };
  }

  public calculateRent(tileIndex: number): number {
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);
    if (!state.ownerId || state.mortgaged) return 0;

    if (cfg.type === 'PROPERTY') {
      const rents = cfg.rents ?? [25, 50, 120, 260];
      const tierIdx = Math.max(0, Math.min(rents.length - 1, state.level - 1));
      const monopolyBonus = this.ownsFullColorGroup(state.ownerId, cfg.group)
        ? GAME_RULES_CONFIG.monopolyBonusPct / 100
        : 1.0;
      return Math.round(rents[tierIdx] * state.festivalMultiplier * monopolyBonus);
    }

    if (cfg.type === 'RAILROAD') {
      const ownedRailroads = BOARD_TILES.filter(
        (t) => t.type === 'RAILROAD' && this.getTileState(t.index).ownerId === state.ownerId
      ).length;
      const rents = cfg.rents ?? [25, 50, 100, 200];
      const idx = Math.max(0, Math.min(rents.length - 1, ownedRailroads - 1));
      return rents[idx] * state.festivalMultiplier;
    }

    if (cfg.type === 'UTILITY') {
      const ownedUtilities = BOARD_TILES.filter(
        (t) => t.type === 'UTILITY' && this.getTileState(t.index).ownerId === state.ownerId
      ).length;
      const mult =
        ownedUtilities >= 2 ? (cfg.rents?.[1] ?? 10) : (cfg.rents?.[0] ?? 4);
      return this.lastDiceTotal * mult * state.festivalMultiplier;
    }

    return 0;
  }

  /**
   * Resolves landing on the current tile.
   * When `options.deferRentPayment === true`, landing on an opponent's owned property
   * returns the invoice details (`amount`, `rentReason`, `canAffordRent`) WITHOUT deducting gold yet,
   * so the UI can show the Rent Confirmation Modal first!
   */
  public resolveTileLanding(
    playerId: string,
    options?: { deferRentPayment?: boolean; forcedCardId?: string }
  ): TileResolutionResult {
    const player = this.getPlayerById(playerId);
    const tileIdx = player.position;
    const cfg = this.getTileConfig(tileIdx);
    const state = this.getTileState(tileIdx);

    if (cfg.type === 'START') {
      return {
        action: 'NONE',
        tileIndex: tileIdx,
        tileName: cfg.name,
        message: `${player.emoji} ${player.name} dừng chân tại ${cfg.name}.`
      };
    }

    if (cfg.type === 'PROPERTY' || cfg.type === 'RAILROAD' || cfg.type === 'UTILITY') {
      if (state.ownerId === null) {
        const price = cfg.price ?? 100;
        if (player.gold >= price) {
          return {
            action: 'CAN_BUY_PROPERTY',
            tileIndex: tileIdx,
            tileName: cfg.name,
            amount: price,
            message: `${cfg.name} đang trống! Giá mua: $${price}.`
          };
        }
        return {
          action: 'NONE',
          tileIndex: tileIdx,
          tileName: cfg.name,
          message: `${player.emoji} ${player.name} không đủ $${price} để mua ${cfg.name}.`
        };
      }

      if (state.ownerId === player.id) {
        if (cfg.type === 'PROPERTY' && state.level < 4 && !state.mortgaged) {
          const upCost = this.getEffectiveUpgradeCost(player.id, tileIdx);
          if (!this.canUpgradePropertyEvenly(player.id, tileIdx)) {
            return {
              action: 'NONE',
              tileIndex: tileIdx,
              tileName: cfg.name,
              message: `${player.emoji} ${player.name} cần nâng cấp đều các ô cùng màu trước khi nâng tiếp ${cfg.name} (Luật Xây Đều)!`
            };
          }
          if (player.gold >= upCost) {
            return {
              action: 'CAN_UPGRADE_PROPERTY',
              tileIndex: tileIdx,
              tileName: cfg.name,
              amount: upCost,
              message: `Nâng cấp ${cfg.name} lên ${BUILDING_TIER_NAMES[state.level + 1].name} với giá $${upCost}?`
            };
          }
        }
        return {
          action: 'NONE',
          tileIndex: tileIdx,
          tileName: cfg.name,
          message: `${player.emoji} ${player.name} kiểm tra lãnh địa ${cfg.name}.`
        };
      }

      if (state.mortgaged) {
        const owner = this.getPlayerById(state.ownerId);
        return {
          action: 'NONE',
          tileIndex: tileIdx,
          tileName: cfg.name,
          ownerId: owner.id,
          ownerName: owner.name,
          message: `${cfg.name} của ${owner.name} đang thế chấp Ngân hàng nên bạn được miễn 100% tiền thuê!`
        };
      }

      const owner = this.getPlayerById(state.ownerId);
      const rent = this.calculateRent(tileIdx);
      const reason =
        cfg.rentReason ??
        `sử dụng dịch vụ và đi qua lãnh địa ${cfg.name} thuộc quyền sở hữu của ${owner.name}`;
      const payerPrevGold = player.gold;
      const ownerPrevGold = owner.gold;
      const canAffordRent = player.gold >= rent;

      if (!options?.deferRentPayment) {
        this.executeConfirmedRentPayment(player.id, tileIdx);
      }

      return {
        action: 'PAID_RENT',
        tileIndex: tileIdx,
        tileName: cfg.name,
        amount: rent,
        ownerId: owner.id,
        ownerName: owner.name,
        rentReason: reason,
        canAffordRent,
        payerPrevGold,
        ownerPrevGold,
        message: `${player.emoji} ${player.name} đi vào đất của ${owner.name}! Vì ${reason} nên sẽ bị trừ $${rent}!`
      };
    }

    if (cfg.type === 'ROYAL_TAX') {
      const baseTax = cfg.price ?? 120;
      const tax =
        player.characterId === 'creeper'
          ? Math.round(baseTax * (1 - GAME_RULES_CONFIG.creeperTaxDiscountPct / 100))
          : baseTax;
      const payerPrevGold = player.gold;
      player.gold = Math.max(0, player.gold - tax);
      this.addLog(
        `👑 ${player.emoji} ${player.name} nộp $${tax} tại ${cfg.name}${
          player.characterId === 'creeper'
            ? ` (Nội tại Creeper -${GAME_RULES_CONFIG.creeperTaxDiscountPct}%)`
            : ''
        }.`
      );
      this.checkBankruptcy(player);
      return {
        action: 'PAID_ROYAL_TAX',
        tileIndex: tileIdx,
        tileName: cfg.name,
        amount: tax,
        payerPrevGold,
        message: `Đã nộp $${tax} vào Kho Bạc Thành Phố.`
      };
    }

    if (cfg.type === 'CHEST') {
      const isKhiVanTile = tileIdx === 2 || tileIdx === 17 || tileIdx === 33;
      const targetDeck = isKhiVanTile ? 'KHI_VAN' : 'CO_HOI';
      const deckCards = CHEST_CARDS.filter((c) => c.deck === targetDeck);
      const pool = deckCards.length > 0 ? deckCards : CHEST_CARDS;
      const forced = options?.forcedCardId
        ? CHEST_CARDS.find((c) => c.id === options.forcedCardId)
        : undefined;
      const card = forced ?? pool[Math.floor(Math.random() * pool.length)];

      const payerPrevGold = player.gold;
      const originTile = player.position;
      let totalGoldDelta = card.goldDelta;

      if (card.collectFromEachPlayer && card.collectFromEachPlayer > 0) {
        const perPlayer = card.collectFromEachPlayer;
        let collected = 0;
        for (const other of this.players) {
          if (other.id !== player.id && !other.bankrupt) {
            const take = Math.min(other.gold, perPlayer);
            other.gold -= take;
            collected += take;
          }
        }
        totalGoldDelta += collected;
      }

      if (totalGoldDelta >= 0) {
        player.gold += totalGoldDelta;
      } else {
        player.gold = Math.max(0, player.gold + totalGoldDelta);
      }

      let movedToTile: number | undefined;
      let moveDirection: 'FORWARD' | 'BACKWARD' | undefined;
      let sentToJailByCard = false;

      if (card.grantGetOutOfJailCard) {
        player.jailFreeCards = (player.jailFreeCards ?? 0) + 1;
      }

      if (card.goToJail) {
        sentToJailByCard = true;
        movedToTile = 10;
        this.sendPlayerToJail(player.id, `Thẻ ${card.title}`);
      } else if (typeof card.moveToTile === 'number') {
        movedToTile = ((card.moveToTile % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
        moveDirection = 'FORWARD';
        if (movedToTile < originTile && movedToTile !== 0) {
          const passBonus =
            player.characterId === 'alex'
              ? GAME_RULES_CONFIG.passStartReward + GAME_RULES_CONFIG.alexStartBonus
              : GAME_RULES_CONFIG.passStartReward;
          player.gold += passBonus;
          totalGoldDelta += passBonus;
          this.addLog(
            `✈️ ${player.emoji} ${player.name} bay qua Bến Nhà Rồng (#0) nhờ thẻ và nhận thêm +$${passBonus}!`
          );
        }
        player.position = movedToTile;
        if (player.characterId === 'enderman') {
          player.gold += GAME_RULES_CONFIG.endermanPortalBonus;
          totalGoldDelta += GAME_RULES_CONFIG.endermanPortalBonus;
          this.addLog(
            `🔮 Nội tại Enderman: +$${GAME_RULES_CONFIG.endermanPortalBonus} Tinh Thể Ender khi dịch chuyển qua Thẻ Rương!`
          );
        }
        gameEventBus.emit('portal:teleported', {
          playerId: player.id,
          fromTile: originTile,
          toTile: movedToTile,
          reason: 'CHEST_CARD'
        });
      } else if (typeof card.stepDelta === 'number' && card.stepDelta !== 0) {
        movedToTile = ((originTile + card.stepDelta) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
        moveDirection = card.stepDelta < 0 ? 'BACKWARD' : 'FORWARD';
        player.position = movedToTile;
        if (player.characterId === 'enderman') {
          player.gold += GAME_RULES_CONFIG.endermanPortalBonus;
          totalGoldDelta += GAME_RULES_CONFIG.endermanPortalBonus;
          this.addLog(
            `🔮 Nội tại Enderman: +$${GAME_RULES_CONFIG.endermanPortalBonus} Tinh Thể Ender khi dịch chuyển bước qua Thẻ Rương!`
          );
        }
        gameEventBus.emit('portal:teleported', {
          playerId: player.id,
          fromTile: originTile,
          toTile: movedToTile,
          reason: 'CHEST_CARD'
        });
      }

      this.addLog(`🎁 ${player.emoji} ${player.name} mở ${card.title}: ${card.description}`);
      this.checkBankruptcy(player);
      return {
        action: 'CHEST_DRAWN',
        tileIndex: tileIdx,
        tileName: cfg.name,
        amount: totalGoldDelta,
        payerPrevGold,
        chestCard: card,
        movedFromTile: originTile,
        movedToTile,
        moveDirection,
        sentToJailByCard,
        message: `${card.title} — ${card.description}`
      };
    }

    if (cfg.type === 'DESERTED_ISLAND') {
      // Standard Vietnamese Monopoly Rule: Landing on #10 by normal dice roll is "Thăm Tù" (Just Visiting — 0 turns lost!)
      this.addLog(
        `👀 ${player.emoji} ${player.name} ghé Thăm Tù tại ${cfg.name} (#10) — hoàn toàn tự do!`
      );
      return {
        action: 'JUST_VISITING_JAIL',
        tileIndex: tileIdx,
        tileName: cfg.name,
        message: `Bạn chỉ ghé Thăm Tù tại ${cfg.name} (#10) nên không bị giam và không mất lượt!`
      };
    }

    if (cfg.type === 'FESTIVAL') {
      return {
        action: 'CHOOSE_FESTIVAL_TILE',
        tileIndex: tileIdx,
        tileName: cfg.name,
        message: `🎉 Đại Tiệc & Cổng Lễ Hội (#20)! Bạn có thể chọn Nhân Đôi (x2) tiền thuê trong 3 vòng HOẶC Mở Cổng Dịch Chuyển tới bất kỳ ô nào!`
      };
    }

    if (cfg.type === 'NETHER_PORTAL') {
      return {
        action: 'NETHER_PORTAL_READY',
        tileIndex: tileIdx,
        tileName: cfg.name,
        message: `🟣 Cổng Địa Ngục Nether! Dịch chuyển ngẫu nhiên sang 1 điểm nóng kèm +$${GAME_RULES_CONFIG.netherWarpGoldBonus}!`
      };
    }

    if (cfg.type === 'END_PORTAL') {
      // Standard Vietnamese Monopoly Rule: Tile #30 sends player directly into #10 Jail (via End Portal vortex -> Sky Portal drop!)
      this.sendPlayerToJail(player.id, `Bước vào ${cfg.name} (#30)`);
      return {
        action: 'SENT_TO_JAIL',
        tileIndex: 10,
        tileName: cfg.name,
        movedFromTile: 30,
        movedToTile: 10,
        message: `🌌 Bạn bị hút vào Cổng The End (#30) và rơi thẳng từ bầu trời xuống Nhà Tù Chí Hòa (#10)!`
      };
    }

    return {
      action: 'NONE',
      tileIndex: tileIdx,
      tileName: cfg.name,
      message: `${player.name} dừng tại ${cfg.name}.`
    };
  }

  /**
   * Executes the confirmed rent transfer after the player clicks "Xác Nhận Thanh Toán" in the Rent Modal
   */
  public executeConfirmedRentPayment(
    payerId: string,
    tileIndex: number
  ): ConfirmedRentPaymentResult {
    const payer = this.getPlayerById(payerId);
    const state = this.getTileState(tileIndex);
    const cfg = this.getTileConfig(tileIndex);

    if (!state.ownerId || state.ownerId === payer.id) {
      return {
        ok: false,
        paidAmount: 0,
        rentAmount: 0,
        ownerId: payer.id,
        payerPrevGold: payer.gold,
        payerNewGold: payer.gold,
        ownerPrevGold: payer.gold,
        ownerNewGold: payer.gold,
        bankrupt: false
      };
    }

    const owner = this.getPlayerById(state.ownerId);
    const rent = this.calculateRent(tileIndex);
    const payerPrevGold = payer.gold;
    const ownerPrevGold = owner.gold;

    if (payer.gold >= rent) {
      payer.gold -= rent;
      owner.gold += rent;
      this.addLog(
        `💸 ${payer.emoji} ${payer.name} đã thanh toán $${rent} phí thuê tại ${cfg.name} cho ${owner.emoji} ${owner.name}.`
      );
      return {
        ok: true,
        paidAmount: rent,
        rentAmount: rent,
        ownerId: owner.id,
        payerPrevGold,
        payerNewGold: payer.gold,
        ownerPrevGold,
        ownerNewGold: owner.gold,
        bankrupt: false
      };
    }

    const paid = payer.gold;
    payer.gold = 0;
    owner.gold += paid;
    payer.bankrupt = true;

    for (const t of this.tiles) {
      if (t.ownerId === payer.id) {
        t.ownerId = null;
        t.level = 0;
        t.festivalMultiplier = 1;
        t.festivalTurnsLeft = 0;
        t.mortgaged = false;
      }
    }

    this.addLog(
      `💀 PHÁ SẢN! ${payer.emoji} ${payer.name} không đủ trả $${rent} tại ${cfg.name} (chỉ còn $${paid}) và chính thức bị loại khỏi cuộc đua!`
    );

    const alive = this.players.filter((p) => !p.bankrupt);
    if (alive.length === 1) {
      this.winnerId = alive[0].id;
      this.addLog(`🏆 CHIẾN THẮNG! ${alive[0].emoji} ${alive[0].name} thống trị Đảo Voxel!`);
    }

    return {
      ok: true,
      paidAmount: paid,
      rentAmount: rent,
      ownerId: owner.id,
      payerPrevGold,
      payerNewGold: 0,
      ownerPrevGold,
      ownerNewGold: owner.gold,
      bankrupt: true
    };
  }

  public buyProperty(playerId: string, tileIndex: number): { ok: boolean; reason?: string } {
    const player = this.getPlayerById(playerId);
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);

    if (cfg.type !== 'PROPERTY' && cfg.type !== 'RAILROAD' && cfg.type !== 'UTILITY') {
      return { ok: false, reason: 'NOT_BUYABLE' };
    }
    if (state.ownerId !== null) {
      return { ok: false, reason: 'ALREADY_OWNED' };
    }
    const price = cfg.price ?? 100;
    if (player.gold < price) {
      return { ok: false, reason: 'INSUFFICIENT_GOLD' };
    }

    player.gold -= price;
    state.ownerId = player.id;
    state.level = 1;

    this.addLog(
      `🏠 ${player.emoji} ${player.name} mua ${cfg.name} ($${price}) — dựng ${BUILDING_TIER_NAMES[1].name}!`
    );
    gameEventBus.emit('property:bought', {
      playerId: player.id,
      tileIndex,
      price
    });
    return { ok: true };
  }

  public upgradeProperty(
    playerId: string,
    tileIndex: number
  ): { ok: boolean; newLevel: number; reason?: string } {
    const player = this.getPlayerById(playerId);
    const cfg = this.getTileConfig(tileIndex);
    const state = this.getTileState(tileIndex);

    if (cfg.type !== 'PROPERTY' || state.ownerId !== player.id) {
      return { ok: false, newLevel: state.level, reason: 'NOT_OWNER' };
    }
    if (state.level >= 4) {
      return { ok: false, newLevel: state.level, reason: 'MAX_LEVEL' };
    }
    if (!this.canUpgradePropertyEvenly(player.id, tileIndex)) {
      return { ok: false, newLevel: state.level, reason: 'UNEVEN_BUILD' };
    }

    const upCost = this.getEffectiveUpgradeCost(player.id, tileIndex);
    if (player.gold < upCost) {
      return { ok: false, newLevel: state.level, reason: 'INSUFFICIENT_GOLD' };
    }

    player.gold -= upCost;
    state.level += 1;
    const tierInfo = BUILDING_TIER_NAMES[state.level];

    this.addLog(
      `⬆️ ${player.emoji} ${player.name} nâng cấp ${cfg.name} lên Cấp ${state.level}: ${tierInfo.icon} ${tierInfo.name}!`
    );
    gameEventBus.emit('property:upgraded', {
      playerId: player.id,
      tileIndex,
      level: state.level,
      cost: upCost
    });
    return { ok: true, newLevel: state.level };
  }

  /**
   * Applies a 2x Festival Rent Multiplier for 3 rounds (`festivalTurnsLeft = 3`).
   */
  public applyFestivalBoost(playerId: string, tileIndex: number): boolean {
    const state = this.getTileState(tileIndex);
    const cfg = this.getTileConfig(tileIndex);
    const player = this.getPlayerById(playerId);

    if (state.ownerId !== playerId) return false;
    state.festivalMultiplier = 2;
    state.festivalTurnsLeft = 3;
    this.addLog(
      `🎉 ${player.emoji} ${player.name} tổ chức Lễ Hội tại ${cfg.name} — Nhân đôi (x2) tiền thuê trong 3 vòng!`
    );
    gameEventBus.emit('festival:boosted', {
      playerId,
      tileIndex,
      multiplier: 2,
      turnsLeft: 3
    });
    return true;
  }

  public teleportFromEndPortal(
    playerId: string,
    targetTileIndex: number
  ): { ok: boolean; targetTileIndex: number; passedStart: boolean } {
    const player = this.getPlayerById(playerId);
    const fromTile = player.position;
    const clamped = ((targetTileIndex % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
    const passedStart = clamped < fromTile && fromTile !== 0;
    player.position = clamped;

    if (passedStart) {
      const startBonus =
        player.characterId === 'alex'
          ? GAME_RULES_CONFIG.passStartReward + GAME_RULES_CONFIG.alexStartBonus
          : GAME_RULES_CONFIG.passStartReward;
      player.gold += startBonus;
      this.addLog(
        `✈️ ${player.emoji} ${player.name} dịch chuyển qua Ô Xuất Phát (#0) và nhận +$${startBonus}!`
      );
    }

    if (player.characterId === 'enderman') {
      player.gold += GAME_RULES_CONFIG.endermanPortalBonus;
      this.addLog(
        `🔮 Nội tại Enderman: Nhận thêm +$${GAME_RULES_CONFIG.endermanPortalBonus} Tinh Thể Ender khi dịch chuyển!`
      );
    }

    const dest = this.getTileConfig(clamped);
    this.addLog(`🌌 ${player.emoji} ${player.name} dịch chuyển tới Ô #${clamped}: ${dest.name}!`);
    gameEventBus.emit('portal:teleported', {
      playerId,
      fromTile,
      toTile: clamped,
      reason: 'PORTAL_20'
    });
    return { ok: true, targetTileIndex: clamped, passedStart };
  }

  /**
   * Warps player through the Nether Obsidian Portal (1 Nether step = 8 Overworld steps) and awards `netherWarpGoldBonus`
   */
  public warpThroughNetherPortal(
    playerId: string,
    forcedNetherDie?: number
  ): {
    netherDie: number;
    overworldSteps: number;
    targetTileIndex: number;
    passedStart: boolean;
    bonusGold: number;
  } {
    const player = this.getPlayerById(playerId);
    const fromTile = player.position;
    const netherDie =
      typeof forcedNetherDie === 'number' && forcedNetherDie >= 1 && forcedNetherDie <= 6
        ? Math.round(forcedNetherDie)
        : Math.floor(Math.random() * 6) + 1;
    const overworldSteps = netherDie * 8;
    const rawDest = fromTile + overworldSteps;
    const passedStart = rawDest >= BOARD_SIZE;
    const picked = rawDest % BOARD_SIZE;

    player.position = picked;

    if (passedStart) {
      const startBonus =
        player.characterId === 'alex'
          ? GAME_RULES_CONFIG.passStartReward + GAME_RULES_CONFIG.alexStartBonus
          : GAME_RULES_CONFIG.passStartReward;
      player.gold += startBonus;
    }

    const bonus =
      player.characterId === 'enderman'
        ? GAME_RULES_CONFIG.netherWarpGoldBonus + GAME_RULES_CONFIG.endermanPortalBonus
        : GAME_RULES_CONFIG.netherWarpGoldBonus;
    player.gold += bonus;

    const dest = this.getTileConfig(picked);
    this.addLog(
      `🟣 ${player.emoji} ${player.name} bước qua Cổng Địa Ngục Nether (${netherDie} bước Nether = ${overworldSteps} bước Overworld) tới Ô #${picked} (${dest.name}) và nhận +$${bonus}!`
    );
    gameEventBus.emit('portal:teleported', {
      playerId,
      fromTile,
      toTile: picked,
      reason: 'NETHER_33'
    });
    return {
      netherDie,
      overworldSteps,
      targetTileIndex: picked,
      passedStart,
      bonusGold: bonus
    };
  }

  public nextTurn(): { activePlayer: PlayerState; skippedPlayer?: PlayerState } {
    let attempts = 0;
    let skippedPlayer: PlayerState | undefined;

    while (attempts < this.players.length * 2) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      if (this.currentPlayerIndex === 0) {
        this.round += 1;
        this.tickDownFestivalMultipliers();
      }

      const candidate = this.players[this.currentPlayerIndex];
      if (candidate.bankrupt) {
        attempts++;
        continue;
      }

      if (candidate.skipTurns > 0) {
        candidate.skipTurns -= 1;
        skippedPlayer = candidate;
        this.addLog(
          `⏳ ${candidate.emoji} ${candidate.name} đang bị giữ chân tại Đảo Hoang, bỏ qua lượt này.`
        );
        attempts++;
        continue;
      }

      gameEventBus.emit('turn:started', {
        round: this.round,
        playerId: candidate.id,
        playerName: candidate.name
      });
      return { activePlayer: candidate, skippedPlayer };
    }

    return { activePlayer: this.getCurrentPlayer() };
  }

  /**
   * Ticks down active Festival x2 multipliers by 1 round when a full round completes,
   * resetting `festivalMultiplier = 1` when `festivalTurnsLeft` reaches 0.
   */
  private tickDownFestivalMultipliers(): void {
    for (const st of this.tiles) {
      if (st.festivalMultiplier > 1 && typeof st.festivalTurnsLeft === 'number') {
        if (st.festivalTurnsLeft > 0) {
          st.festivalTurnsLeft -= 1;
          if (st.festivalTurnsLeft <= 0) {
            st.festivalMultiplier = 1;
            st.festivalTurnsLeft = 0;
            const cfg = this.getTileConfig(st.index);
            this.addLog(`🎪 Lễ hội tại ${cfg.name} đã khép lại sau 3 vòng (tiền thuê trở về x1).`);
          }
        }
      }
    }
  }

  /**
   * Checks if `player` has 0 gold and automatically liquidates their cheapest property using
   * dynamic `GAME_RULES_CONFIG.liquidationRatePct` and `getEffectiveUpgradeCost` (respecting Steve's discount).
   */
  private checkBankruptcy(player: PlayerState): void {
    if (player.gold > 0) return;

    while (player.gold <= 0) {
      const owned = this.tiles.filter((t) => t.ownerId === player.id);
      if (owned.length === 0) break;

      owned.sort(
        (a, b) =>
          (this.getTileConfig(a.index).price ?? 0) -
          (this.getTileConfig(b.index).price ?? 0)
      );
      const soldTile = owned[0];
      const payout = this.getLiquidationValue(soldTile.index);
      const cfg = this.getTileConfig(soldTile.index);

      player.gold += payout;
      soldTile.ownerId = null;
      soldTile.level = 0;
      soldTile.festivalMultiplier = 1;
      soldTile.festivalTurnsLeft = 0;
      soldTile.mortgaged = false;

      this.addLog(
        `🏦 Ngân hàng thanh lý khẩn cấp ${cfg.name} của ${player.emoji} ${player.name} thu về +$${payout} để tránh phá sản!`
      );
    }

    if (player.gold > 0) return;

    player.bankrupt = true;
    for (const t of this.tiles) {
      if (t.ownerId === player.id) {
        t.ownerId = null;
        t.level = 0;
        t.festivalMultiplier = 1;
        t.festivalTurnsLeft = 0;
        t.mortgaged = false;
      }
    }
    this.addLog(`💀 ${player.emoji} ${player.name} đã phá sản! Toàn bộ tài sản hoàn về Ngân hàng.`);

    const alive = this.players.filter((p) => !p.bankrupt);
    if (alive.length === 1) {
      this.winnerId = alive[0].id;
      this.addLog(`🏆 CHIẾN THẮNG! ${alive[0].emoji} ${alive[0].name} thống trị Đảo Voxel!`);
    }
  }

  public serialize(): SerializedGameState {
    return {
      mode: this.mode,
      round: this.round,
      currentPlayerIndex: this.currentPlayerIndex,
      lastDiceTotal: this.lastDiceTotal,
      players: this.players.map((p) => ({ ...p })),
      tiles: this.tiles.map((t) => ({ ...t })),
      logs: [...this.logs],
      winnerId: this.winnerId
    };
  }

  public hydrate(snapshot: SerializedGameState): void {
    this.mode = snapshot.mode;
    this.round = snapshot.round;
    this.currentPlayerIndex = snapshot.currentPlayerIndex;
    this.lastDiceTotal = snapshot.lastDiceTotal;
    this.players = snapshot.players.map((p) => ({ ...p }));
    this.tiles = snapshot.tiles.map((t) => ({ ...t }));
    this.logs = [...snapshot.logs];
    this.winnerId = snapshot.winnerId;
  }
}
