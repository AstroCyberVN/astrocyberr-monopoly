import { BOARD_TILES } from './boardData';
import { GameEngine } from './gameEngine';

export interface BotDecision {
  type:
    | 'BUY_PROPERTY'
    | 'UPGRADE_PROPERTY'
    | 'FESTIVAL_BOOST'
    | 'TELEPORT_TARGET'
    | 'SKIP_ACTION';
  tileIndex: number;
  reason: string;
}

const SAFETY_CASH_RESERVE = 140;

/**
 * Heuristic AI evaluator for Bot players:
 * - Prioritizes completing a 2-tile Monopoly color set even with lower cash reserve
 * - Buys unowned properties/railroads when gold - price >= SAFETY_CASH_RESERVE
 * - Upgrades owned properties when gold - upgradeCost >= SAFETY_CASH_RESERVE
 * - Selects the highest-rent owned property for Festival 2x boost
 * - Selects the highest-value unowned/set-completing tile (or Start) for The End Portal
 */
export function chooseBotAction(engine: GameEngine, botPlayerId: string): BotDecision {
  const bot = engine.getPlayerById(botPlayerId);
  const pos = bot.position;
  const cfg = engine.getTileConfig(pos);
  const state = engine.getTileState(pos);

  // 1. Unowned Property or Railroad
  if ((cfg.type === 'PROPERTY' || cfg.type === 'RAILROAD') && state.ownerId === null) {
    const price = cfg.price ?? 100;
    if (bot.gold >= price) {
      const completesColorSet =
        cfg.colorGroup &&
        BOARD_TILES.some(
          (t) =>
            t.index !== pos &&
            t.colorGroup === cfg.colorGroup &&
            engine.getTileState(t.index).ownerId === bot.id
        );

      if (completesColorSet || bot.gold - price >= SAFETY_CASH_RESERVE) {
        return {
          type: 'BUY_PROPERTY',
          tileIndex: pos,
          reason: completesColorSet
            ? 'Hoàn tất bộ màu Monopoly (x1.5 tiền thuê)'
            : 'Đủ ngân sách an toàn để đầu tư bất động sản'
        };
      }
    }
  }

  // 2. Owned Property -> Upgrade check
  if (cfg.type === 'PROPERTY' && state.ownerId === bot.id && state.level < 4) {
    const cost = cfg.upgradeCost ?? 80;
    if (bot.gold - cost >= SAFETY_CASH_RESERVE) {
      return {
        type: 'UPGRADE_PROPERTY',
        tileIndex: pos,
        reason: 'Nâng cấp công trình để tăng tiền thuê'
      };
    }
  }

  // 3. Festival Tile -> Boost best owned property
  if (cfg.type === 'FESTIVAL') {
    const owned = engine
      .getAllTileStates()
      .filter((t) => t.ownerId === bot.id)
      .sort((a, b) => engine.calculateRent(b.index) - engine.calculateRent(a.index));

    if (owned.length > 0) {
      return {
        type: 'FESTIVAL_BOOST',
        tileIndex: owned[0].index,
        reason: 'Tổ chức Lễ Hội x2 trên ô đất có giá trị cao nhất'
      };
    }
  }

  // 4. The End Portal -> Teleport to set-completing unowned tile or Start (0)
  if (cfg.type === 'END_PORTAL') {
    // Look for an unowned property that completes a color set for this bot
    for (const tile of BOARD_TILES) {
      if (tile.type === 'PROPERTY' && engine.getTileState(tile.index).ownerId === null) {
        const price = tile.price ?? 100;
        const siblingOwned = BOARD_TILES.some(
          (other) =>
            other.index !== tile.index &&
            other.colorGroup === tile.colorGroup &&
            engine.getTileState(other.index).ownerId === bot.id
        );
        if (siblingOwned && bot.gold >= price) {
          return {
            type: 'TELEPORT_TARGET',
            tileIndex: tile.index,
            reason: `Bay tới [${tile.name}] để gom trọn bộ màu!`
          };
        }
      }
    }

    // Otherwise, if affordable, pick an unowned railroad or property in front of Start
    const affordableUnowned = BOARD_TILES.find(
      (t) =>
        (t.type === 'PROPERTY' || t.type === 'RAILROAD') &&
        engine.getTileState(t.index).ownerId === null &&
        bot.gold >= (t.price ?? 100) + SAFETY_CASH_RESERVE
    );

    if (affordableUnowned) {
      return {
        type: 'TELEPORT_TARGET',
        tileIndex: affordableUnowned.index,
        reason: `Bay tới mua [${affordableUnowned.name}]`
      };
    }

    return {
      type: 'TELEPORT_TARGET',
      tileIndex: 0,
      reason: 'Bay về Ô Khởi Hành để nhận +200 Vàng'
    };
  }

  return {
    type: 'SKIP_ACTION',
    tileIndex: pos,
    reason: 'Giữ vàng dự phòng an toàn'
  };
}
