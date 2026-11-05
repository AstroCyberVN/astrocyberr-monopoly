import { BOARD_TILES } from './boardData';
import { GameEngine } from './gameEngine';

export interface BotDecision {
  type:
    | 'BUY_PROPERTY'
    | 'UPGRADE_PROPERTY'
    | 'BUYOUT_OPPONENT'
    | 'FESTIVAL_BOOST'
    | 'TELEPORT_TARGET'
    | 'NETHER_WARP'
    | 'SKIP_ACTION';
  tileIndex: number;
}

export function chooseBotAction(engine: GameEngine, botId: string): BotDecision {
  const bot = engine.getPlayerById(botId);
  const pos = bot.position;
  const cfg = engine.getTileConfig(pos);
  const state = engine.getTileState(pos);

  // 1. Buy unowned Property / Railroad / Utility if safe cash buffer remains
  if (
    (cfg.type === 'PROPERTY' || cfg.type === 'RAILROAD' || cfg.type === 'UTILITY') &&
    state.ownerId === null
  ) {
    const price = cfg.price ?? 100;
    const safetyBuffer = 80;
    if (bot.gold - price >= safetyBuffer) {
      return { type: 'BUY_PROPERTY', tileIndex: pos };
    }
    return { type: 'SKIP_ACTION', tileIndex: pos };
  }

  // 2. Upgrade own property (respecting Steve's -15% discount & Even-Build Rule!)
  if (cfg.type === 'PROPERTY' && state.ownerId === bot.id && state.level < 4 && !state.mortgaged) {
    const upCost = engine.getEffectiveUpgradeCost(bot.id, pos);
    if (engine.canUpgradePropertyEvenly(bot.id, pos) && bot.gold - upCost >= 90) {
      return { type: 'UPGRADE_PROPERTY', tileIndex: pos };
    }
    return { type: 'SKIP_ACTION', tileIndex: pos };
  }

  // 3. Strategic Hostile Buyout when landing on an opponent's property that completes or advances a color group!
  if (cfg.type === 'PROPERTY' && state.ownerId !== null && state.ownerId !== bot.id) {
    const buyoutCost = engine.getBuyoutCost(pos);
    if (buyoutCost !== null && bot.gold - buyoutCost >= 180) {
      const ownInGroup = engine.getPlayerColorGroupOwnership(bot.id, cfg.group);
      if (ownInGroup.ownedCount >= 1) {
        return { type: 'BUYOUT_OPPONENT', tileIndex: pos };
      }
    }
  }

  // 4. Festival Tile (#20): Either teleport to an unowned tile that completes a Monopoly color group,
  //    or apply 2x Festival Boost (3 rounds) to the highest-rent owned property!
  if (cfg.type === 'FESTIVAL') {
    const unownedCompletingSet = BOARD_TILES.filter((t) => {
      if (t.type !== 'PROPERTY' || engine.getTileState(t.index).ownerId !== null) return false;
      const own = engine.getPlayerColorGroupOwnership(bot.id, t.group);
      return own.totalCount > 1 && own.ownedCount === own.totalCount - 1 && bot.gold >= (t.price ?? 150) + 80;
    });

    if (unownedCompletingSet.length > 0) {
      return { type: 'TELEPORT_TARGET', tileIndex: unownedCompletingSet[0].index };
    }

    const ownedTiles = engine
      .getAllTileStates()
      .filter((t) => t.ownerId === bot.id)
      .sort((a, b) => engine.calculateRent(b.index) - engine.calculateRent(a.index));

    if (ownedTiles.length > 0) {
      return { type: 'FESTIVAL_BOOST', tileIndex: ownedTiles[0].index };
    }
    return { type: 'SKIP_ACTION', tileIndex: pos };
  }

  if (cfg.type === 'NETHER_PORTAL') {
    return { type: 'NETHER_WARP', tileIndex: pos };
  }

  if (cfg.type === 'END_PORTAL') {
    const unowned = BOARD_TILES.filter(
      (t) =>
        (t.type === 'PROPERTY' || t.type === 'RAILROAD') &&
        engine.getTileState(t.index).ownerId === null &&
        (t.price ?? 100) <= bot.gold - 80
    ).sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

    if (unowned.length > 0) {
      return { type: 'TELEPORT_TARGET', tileIndex: unowned[0].index };
    }
    return { type: 'TELEPORT_TARGET', tileIndex: 0 };
  }

  return { type: 'SKIP_ACTION', tileIndex: pos };
}
