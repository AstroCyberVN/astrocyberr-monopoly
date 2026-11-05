import { TILES_CONFIG_40 } from '../config/tilesConfig';

export type TileType =
  | 'START'
  | 'PROPERTY'
  | 'RAILROAD'
  | 'UTILITY'
  | 'CHEST'
  | 'ROYAL_TAX'
  | 'DESERTED_ISLAND'
  | 'FESTIVAL'
  | 'END_PORTAL'
  | 'NETHER_PORTAL';

export type BoardColorGroup =
  | 'PLAINS'
  | 'OAK_FOREST'
  | 'BIRCH'
  | 'SWAMP'
  | 'CHERRY'
  | 'DESERT'
  | 'SNOWY_PEAKS'
  | 'REDSTONE'
  | 'CHERRY_GROVE'
  | 'TAIGA'
  | 'NETHER'
  | 'END_CITY'
  | 'END'
  | 'RAILROAD'
  | 'UTILITY'
  | 'SPECIAL';

export type ColorGroupId = BoardColorGroup;

export type CharacterId = 'steve' | 'alex' | 'creeper' | 'enderman';

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  title: string;
  color: string;
  accentColor: string;
  emoji: string;
  passiveName: string;
  passiveDescription: string;
}

export const CHARACTER_CONFIGS: CharacterConfig[] = [
  {
    id: 'steve',
    name: 'Steve',
    title: 'Thợ Mỏ Chibi',
    color: '#06b6d4',
    accentColor: '#3b82f6',
    emoji: '⛏️',
    passiveName: '🔨 Bậc Thầy Xây Dựng',
    passiveDescription: 'Giảm 15% chi phí nâng cấp công trình trên mọi ô đất (áp dụng đồng nhất cho Thế chấp & Thanh lý).'
  },
  {
    id: 'alex',
    name: 'Alex',
    title: 'Nữ Thám Hiểm Chibi',
    color: '#22c55e',
    accentColor: '#f97316',
    emoji: '🏹',
    passiveName: '👟 Bước Chân Thần Tốc',
    passiveDescription: 'Nhận thêm +$40 mỗi lần đi qua hoặc dừng tại Ô Xuất Phát (#0 Bến Nhà Rồng, tổng +$240).'
  },
  {
    id: 'creeper',
    name: 'Creeper',
    title: 'Bé Nổ Tí Hon',
    color: '#4ade80',
    accentColor: '#15803d',
    emoji: '🧨',
    passiveName: '💥 Kháng Thuế & Bẫy TNT',
    passiveDescription: 'Giảm 20% tiền nộp tại các ô Thuế (#4 & #38) và khiến đối thủ phải trả thêm +15% Phí Răn Đe TNT khi muốn Mua Đứt (Buyout) đất của Creeper.'
  },
  {
    id: 'enderman',
    name: 'Enderman',
    title: 'Lữ Khách Không Gian',
    color: '#a855f7',
    accentColor: '#d8b4fe',
    emoji: '🔮',
    passiveName: '🌌 Dịch Chuyển Hư Không',
    passiveDescription: 'Nhận +$50 Tinh Thể Ender mỗi khi dịch chuyển qua Cổng (#20, #30, #33), bay theo Thẻ Rương hoặc thoát khỏi Nhà Tù Chí Hòa (#10).'
  }
];

export interface TileConfig {
  index: number;
  name: string;
  type: TileType;
  group: BoardColorGroup;
  colorGroup?: BoardColorGroup;
  colorHex: string;
  icon: string;
  price?: number;
  upgradeCost?: number;
  rents?: number[];
  /**
   * Lý do tại sao người chơi đi vào ô đất này phải trả tiền cho chủ sở hữu!
   */
  rentReason?: string;
  description: string;
  gridX: number;
  gridZ: number;
  outwardRotationY: number;
}

export const BOARD_SIZE = 40;

export function getTileGridCoord40(index: number): {
  gridX: number;
  gridZ: number;
  outwardRotationY: number;
} {
  const i = ((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  if (i <= 10) {
    return {
      gridX: 5 - i,
      gridZ: 5,
      outwardRotationY: 0
    };
  }
  if (i <= 20) {
    return {
      gridX: -5,
      gridZ: 5 - (i - 10),
      outwardRotationY: -Math.PI / 2
    };
  }
  if (i <= 30) {
    return {
      gridX: -5 + (i - 20),
      gridZ: -5,
      outwardRotationY: Math.PI
    };
  }
  return {
    gridX: 5,
    gridZ: -5 + (i - 30),
    outwardRotationY: Math.PI / 2
  };
}

export const BUILDING_TIER_NAMES: Record<number, { name: string; icon: string }> = {
  0: { name: 'Đất Trống', icon: '🌱' },
  1: { name: 'Cọc Rào Gỗ', icon: '🪵' },
  2: { name: 'Nhà Gỗ Sồi', icon: '🏠' },
  3: { name: 'Biệt Thự Đá', icon: '🏡' },
  4: { name: 'Lâu Đài Voxel', icon: '🏰' }
};

/**
 * 8 Color Groups + 2 Special Infrastructure Groups in "Sài Gòn Voxel Cyber-Craft" theme
 */
export const COLOR_GROUP_ORDER: Array<{
  id: BoardColorGroup;
  label: string;
  fullLabel: string;
  hex: string;
}> = [
  {
    id: 'PLAINS',
    label: 'Nâu (Phú Lâm)',
    fullLabel: 'PLAINS — Cụm Nâu (Phú Lâm - Nhà Bè)',
    hex: '#92400e'
  },
  {
    id: 'OAK_FOREST',
    label: 'Xanh Lam (Khánh Hội)',
    fullLabel: 'OAK_FOREST — Cụm Xanh Lam (Khánh Hội - Bà Chiểu - Thị Nghè)',
    hex: '#38bdf8'
  },
  {
    id: 'SWAMP',
    label: 'Hồng (Bến Thành)',
    fullLabel: 'SWAMP — Cụm Hồng (Tân Định - Bến Thành - Hòa Hưng)',
    hex: '#ec4899'
  },
  {
    id: 'DESERT',
    label: 'Cam (Chợ Lớn)',
    fullLabel: 'DESERT — Cụm Cam (Gia Định - Chợ Lớn - Phú Nhuận)',
    hex: '#f97316'
  },
  {
    id: 'SNOWY_PEAKS',
    label: 'Đỏ (Thủ Đức)',
    fullLabel: 'SNOWY_PEAKS — Cụm Đỏ (Thủ Đức - Tân Bình - Gò Vấp)',
    hex: '#ef4444'
  },
  {
    id: 'CHERRY_GROVE',
    label: 'Vàng (Vũng Tàu - Đà Lạt)',
    fullLabel: 'CHERRY_GROVE — Cụm Vàng (Vũng Tàu - Đà Lạt - Nha Trang)',
    hex: '#eab308'
  },
  {
    id: 'NETHER',
    label: 'Xanh Lá (Nguyễn Huệ)',
    fullLabel: 'NETHER — Cụm Xanh Lá (Lê Lợi - Nguyễn Huệ - Đồng Khởi)',
    hex: '#22c55e'
  },
  {
    id: 'END_CITY',
    label: 'Tím Đậm (Dinh Độc Lập)',
    fullLabel: 'END_CITY — Cụm Tím Đậm (Tân Sơn Nhất - Dinh Độc Lập)',
    hex: '#6366f1'
  }
];

export const BOARD_TILES: TileConfig[] = TILES_CONFIG_40.map((tile) => {
  const grp: BoardColorGroup =
    tile.colorGroup ??
    (tile.type === 'RAILROAD'
      ? 'RAILROAD'
      : tile.type === 'UTILITY'
        ? 'UTILITY'
        : 'SPECIAL');
  return {
    ...tile,
    group: grp,
    colorGroup: tile.colorGroup,
    rents: tile.rents ? [...tile.rents] : undefined,
    ...getTileGridCoord40(tile.index)
  };
});

export type ChestDeckType = 'KHI_VAN' | 'CO_HOI';

export interface ChestCard {
  id: string;
  deck: ChestDeckType;
  title: string;
  description: string;
  goldDelta: number;
  moveToTile?: number;
  stepDelta?: number;
  goToJail?: boolean;
  grantGetOutOfJailCard?: boolean;
  collectFromEachPlayer?: number;
}

/**
 * Editable Global Game Rules & Character Passive Multipliers (persisted to Supabase `monopoly_config`)
 */
export interface GameRulesConfig {
  startingGold: number;
  passStartReward: number;
  jailFineAmount: number;
  mortgageRatePct: number;
  unmortgageRatePct: number;
  liquidationRatePct: number;
  monopolyBonusPct: number;
  hostileBuyoutMultiplierPct: number;
  netherWarpGoldBonus: number;
  festivalNoPropertyGoldBonus: number;
  steveUpgradeDiscountPct: number;
  alexStartBonus: number;
  creeperTaxDiscountPct: number;
  endermanPortalBonus: number;
}

export const GAME_RULES_CONFIG: GameRulesConfig = {
  startingGold: 1500,
  passStartReward: 200,
  jailFineAmount: 50,
  mortgageRatePct: 50,
  unmortgageRatePct: 55,
  liquidationRatePct: 75,
  monopolyBonusPct: 150,
  hostileBuyoutMultiplierPct: 160,
  netherWarpGoldBonus: 120,
  festivalNoPropertyGoldBonus: 80,
  steveUpgradeDiscountPct: 15,
  alexStartBonus: 40,
  creeperTaxDiscountPct: 20,
  endermanPortalBonus: 50
};

/**
 * Bộ 15 thẻ Khí Vận & Cơ Hội chuẩn Cờ Tỷ Phú Bản Việt Nam (Wikipedia)
 */
export const CHEST_CARDS: ChestCard[] = [
  // ================= BỘ THẺ KHÍ VẬN (COMMUNITY CHEST — Ô #2, #17, #33) =================
  {
    id: 'kv_start',
    deck: 'KHI_VAN',
    title: '🧧 Khí Vận: Tiến Về Bến Nhà Rồng (#0)',
    description: 'Xuôi dòng sông Sài Gòn về Bến Nhà Rồng (#0) và lĩnh ngay +$200 tiền lương!',
    goldDelta: 200,
    moveToTile: 0
  },
  {
    id: 'kv_birthday',
    deck: 'KHI_VAN',
    title: '🧧 Khí Vận: Mừng Sinh Nhật Tỷ Phú',
    description: 'Mừng tuổi mới thịnh vượng! Mỗi đối thủ đang chơi tặng quà mừng cho bạn $25!',
    goldDelta: 0,
    collectFromEachPlayer: 25
  },
  {
    id: 'kv_dinh_doc_lap',
    deck: 'KHI_VAN',
    title: '🧧 Khí Vận: Hội Nghị Dinh Độc Lập (#39)',
    description: 'Được mời dự đại tiệc thượng lưu tại Dinh Độc Lập (#39) — tiến thẳng tới Ô #39!',
    goldDelta: 0,
    moveToTile: 39
  },
  {
    id: 'kv_tax_refund',
    deck: 'KHI_VAN',
    title: '🧧 Khí Vận: Hoàn Thuế Thương Gia',
    description: 'Sổ sách minh bạch, Kho bạc thành phố hoàn trả cho bạn +$100 tiền thuế!',
    goldDelta: 100
  },
  {
    id: 'kv_jail_free',
    deck: 'KHI_VAN',
    title: '🕊️ Khí Vận: Thẻ Ân Xá Ra Tù Miễn Phí',
    description: 'Bạn nhận được 1 Thẻ Ra Tù Miễn Phí (tự động lưu giữ để thoát Nhà Tù Chí Hòa #10) và +$40!',
    goldDelta: 40,
    grantGetOutOfJailCard: true
  },
  {
    id: 'kv_hospital_fee',
    deck: 'KHI_VAN',
    title: '🧧 Khí Vận: Tu Bổ Dinh Thự Cổ',
    description: 'Trùng tu mái ngói và cổng rào các khu phố cổ, bạn chi trả -$70.',
    goldDelta: -70
  },
  {
    id: 'kv_go_to_jail',
    deck: 'KHI_VAN',
    title: '🚓 Khí Vận: Lệnh Triệu Tập Khẩn Cấp!',
    description: 'Vi phạm quy chế đấu thầu đô thị! Đi thẳng vào Nhà Tù Chí Hòa (#10), không qua Bến Nhà Rồng!',
    goldDelta: 0,
    goToJail: true
  },

  // ================= BỘ THẺ CƠ HỘI (CHANCE — Ô #7, #22, #36) =================
  {
    id: 'ch_forward_3',
    deck: 'CO_HOI',
    title: '⚡ Cơ Hội: Tiến Lên 3 Bước',
    description: 'Đón làn sóng đầu tư hạ tầng mới, bạn tiến thẳng lên phía trước 3 ô trên bàn cờ!',
    goldDelta: 0,
    stepDelta: 3
  },
  {
    id: 'ch_back_3',
    deck: 'CO_HOI',
    title: '⚡ Cơ Hội: Lùi Lại 3 Bước',
    description: 'Đường phố kẹt xe giờ cao điểm, bạn phải lùi ngược lại 3 ô trên bàn cờ!',
    goldDelta: 0,
    stepDelta: -3
  },
  {
    id: 'ch_ben_thanh',
    deck: 'CO_HOI',
    title: '⚡ Cơ Hội: Chuyến Tàu Về Sân Bay Tân Sơn Nhất (#37)',
    description: 'Tiến thẳng tới Sân Bay Tân Sơn Nhất (#37) để mở rộng thương vụ hàng không (+$50 lộ phí)!',
    goldDelta: 50,
    moveToTile: 37
  },
  {
    id: 'ch_ga_hoa_hung',
    deck: 'CO_HOI',
    title: '⚡ Cơ Hội: Khởi Hành Tới Bến Xe Miền Tây (#5)',
    description: 'Đáp chuyến xe tốc hành về Bến Xe Miền Tây (#5) và nhận +$80!',
    goldDelta: 80,
    moveToTile: 5
  },
  {
    id: 'ch_festival_fly',
    deck: 'CO_HOI',
    title: '⚡ Cơ Hội: Trẩy Hội Phố Đi Bộ (#20)',
    description: 'Bay thẳng tới Bãi Đậu Xe & Đại Tiệc Lễ Hội (#20) và nhận +$100 quỹ lễ hội!',
    goldDelta: 100,
    moveToTile: 20
  },
  {
    id: 'ch_speed_fine',
    deck: 'CO_HOI',
    title: '⚡ Cơ Hội: Phạt Quá Tốc Độ Đại Lộ',
    description: 'Phóng nhanh qua đại lộ Đông Tây, bạn nộp phạt hành chính -$60.',
    goldDelta: -60
  },
  {
    id: 'ch_lottery_win',
    deck: 'CO_HOI',
    title: '⚡ Cơ Hội: Trúng Số Kiến Thiết Sài Gòn',
    description: 'Tấm vé số kiến thiết mang lại giải độc đắc +$180 tiền mặt!',
    goldDelta: 180
  },
  {
    id: 'ch_go_to_jail',
    deck: 'CO_HOI',
    title: '🚓 Cơ Hội: Bị Áp Giải Vào Nhà Tù Chí Hòa!',
    description: 'Bị bắt quả tang thao túng giá đất! Bị hút vào Cổng The End và rơi thẳng xuống Nhà Tù Chí Hòa (#10)!',
    goldDelta: 0,
    goToJail: true
  }
];

/**
 * Immutable Factory Default Snapshots for instant 1-Click Factory Reset in `/admin`
 */
export const FACTORY_TILES_40: TileConfig[] = BOARD_TILES.map((t) => ({
  ...t,
  rents: t.rents ? [...t.rents] : undefined
}));

export const FACTORY_RULES_CONFIG: GameRulesConfig = { ...GAME_RULES_CONFIG };

export const FACTORY_CHARACTER_CONFIGS: CharacterConfig[] = CHARACTER_CONFIGS.map((c) => ({
  ...c
}));

export const FACTORY_CHEST_CARDS: ChestCard[] = CHEST_CARDS.map((c) => ({ ...c }));

/**
 * Steady-state Markov chain landing probabilities (%) for the 40-tile Monopoly board
 * (accounting for Jail #10 concentration, End Portal #30 -> #10, and Chest card warps).
 */
const MARKOV_LANDING_PROB_40: number[] = [
  3.09, 2.13, 1.88, 2.16, 2.33, 2.96, 2.26, 2.04, 2.32, 2.30,
  5.89, 2.68, 2.61, 2.37, 2.46, 2.92, 2.79, 2.59, 2.93, 3.08,
  2.88, 2.83, 2.25, 2.74, 3.18, 3.06, 2.71, 2.68, 2.81, 2.58,
  0.00, 2.68, 2.62, 2.37, 2.50, 2.43, 1.96, 2.19, 2.17, 2.63
];

export interface TileAnalytics {
  landingProbabilityPct: number;
  markovProbabilityPct: number;
  baseRoiPct: number;
  maxRoiPct: number;
  breaksEvenInHits: number;
  strategicTier: 'S' | 'A' | 'B' | 'C';
}

/**
 * Computes quantitative real-estate analytics (Markov landing probability %, Base ROI %, Max ROI %)
 * for Smart Nudges in the Buy/Upgrade Modal and Bottom-Left Tile Inspector.
 */
export function getTileAnalytics(tileIndex: number): TileAnalytics {
  const idx = ((tileIndex % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  const tile = BOARD_TILES[idx];
  const prob = MARKOV_LANDING_PROB_40[idx] ?? 2.5;
  const price = Math.max(1, tile.price ?? 100);
  const baseRent = tile.rents?.[0] ?? Math.round(price * 0.12);
  const maxRent = tile.rents?.[tile.rents.length - 1] ?? baseRent * 4;

  const baseRoiPct = Math.round((baseRent / price) * 100);
  const maxRoiPct = Math.round((maxRent / price) * 100);
  const breaksEvenInHits = Math.max(1, Math.ceil(price / Math.max(1, baseRent)));

  let strategicTier: 'S' | 'A' | 'B' | 'C' = 'B';
  if (prob >= 2.85 || tile.type === 'RAILROAD' || idx === 37 || idx === 39) {
    strategicTier = 'S';
  } else if (prob >= 2.55 || baseRoiPct >= 14) {
    strategicTier = 'A';
  } else if (prob < 2.2) {
    strategicTier = 'C';
  }

  return {
    landingProbabilityPct: prob,
    markovProbabilityPct: prob,
    baseRoiPct,
    maxRoiPct,
    breaksEvenInHits,
    strategicTier
  };
}
