import { BOARD_TILES } from './boardData';
import { GameEngine } from './gameEngine';

export interface BotDecision {
  type:
    | 'BUY_PROPERTY'
    | 'UPGRADE_PROPERTY'
    | 'FESTIVAL_BOOST'
    | 'TELEPORT_TARGET'
    | 'NETHER_WARP'
    | 'SKIP_ACTION';
  tileIndex: number;
  reason: string;
}

const SAFETY_CASH_RESERVE = 150;

export function chooseBotAction(engine: GameEngine, botPlayerId: string): BotDecision {
  const bot = engine.getPlayerById(botPlayerId);
  const pos = bot.position;
  const cfg = engine.getTileConfig(pos);
  const state = engine.getTileState(pos);

  // 1. Unowned Property, Railroad, or Utility
  if (
    (cfg.type === 'PROPERTY' || cfg.type === 'RAILROAD' || cfg.type === 'UTILITY') &&
    state.ownerId === null
  ) {
    const price = cfg.price ?? 100;
    if (bot.gold >= price) {
      const groupTiles = cfg.colorGroup
        ? BOARD_TILES.filter((t) => t.colorGroup === cfg.colorGroup)
        : [];
      const ownedInGroup = groupTiles.filter(
        (t) => engine.getTileState(t.index).ownerId === bot.id
      ).length;
      const completesColorSet = groupTiles.length > 0 && ownedInGroup === groupTiles.length - 1;

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

  // 4. The End Portal (Tile 30) -> Teleport to set-completing unowned tile or Start (0)
  if (cfg.type === 'END_PORTAL') {
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
            reason: `Bay tới [${tile.name}] để gom bộ màu!`
          };
        }
      }
    }

    const affordableUnowned = BOARD_TILES.find(
      (t) =>
        (t.type === 'PROPERTY' || t.type === 'RAILROAD' || t.type === 'UTILITY') &&
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
      reason: 'Bay về Ô Khởi Hành để nhận +$200'
    };
  }

  // 5. Nether Portal (Tile 33) -> Warp through the Nether Dimension (+120$ Piglin Gold + x8 Overworld steps)
  if (cfg.type === 'NETHER_PORTAL') {
    return {
      type: 'NETHER_WARP',
      tileIndex: pos,
      reason: 'Bước qua Cổng Nether để nhận +$120 Vàng Piglin và nhảy vọt x8 bước!'
    };
  }

  return {
    type: 'SKIP_ACTION',
    tileIndex: pos,
    reason: 'Giữ $ dự phòng an toàn'
  };
}
