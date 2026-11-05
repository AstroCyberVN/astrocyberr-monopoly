import { RawTileConfigItem, TILES_CONFIG_40 } from '../config/tilesConfig';

export const BOARD_SIZE = 40;

export type TileType =
  | 'START'
  | 'PROPERTY'
  | 'CHEST'
  | 'DESERTED_ISLAND'
  | 'FESTIVAL'
  | 'END_PORTAL'
  | 'NETHER_PORTAL'
  | 'ROYAL_TAX'
  | 'RAILROAD'
  | 'UTILITY';

export type ColorGroupId =
  | 'PLAINS'
  | 'OAK_FOREST'
  | 'SWAMP'
  | 'DESERT'
  | 'SNOWY_PEAKS'
  | 'CHERRY_GROVE'
  | 'NETHER'
  | 'END_CITY';

export type CharacterId = 'steve' | 'alex' | 'creeper' | 'enderman';

export type LocomotionType = 'PARABOLA_HOP' | 'TNT_EXPLOSION' | 'ENDER_TELEPORT';

export interface MonopolyRulesConfig {
  initialGold: number;
  startBonus: number;
  alexStartBonus: number;
  steveUpgradeDiscountPct: number;
  creeperTaxDiscountPct: number;
  endermanPortalBonus: number;
  liquidationRatePct: number;
  buyoutMultiplier: number;
}

export const GAME_RULES_CONFIG: MonopolyRulesConfig = {
  initialGold: 1500,
  startBonus: 200,
  alexStartBonus: 240,
  steveUpgradeDiscountPct: 15,
  creeperTaxDiscountPct: 20,
  endermanPortalBonus: 50,
  liquidationRatePct: 75,
  buyoutMultiplier: 1.8
};

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  title: string;
  locomotion: LocomotionType;
  locomotionDescription: string;
  passiveName: string;
  passiveDescription: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  emoji: string;
}

export const CHARACTER_CONFIGS: CharacterConfig[] = [
  {
    id: 'steve',
    name: 'Steve',
    title: 'Thợ Mỏ Chibi',
    locomotion: 'PARABOLA_HOP',
    locomotionDescription: 'Nhảy lò cò Parabol + Squash & Stretch + Hạt bụi trắng',
    passiveName: '🔨 Thợ Xây Lành Nghề',
    passiveDescription: 'Giảm 15% chi phí nâng cấp công trình trên mọi ô đất.',
    primaryColor: '#06b6d4',
    secondaryColor: '#3b82f6',
    accentColor: '#fde047',
    emoji: '🧑🏽'
  },
  {
    id: 'alex',
    name: 'Alex',
    title: 'Kiến Trúc Sư Chibi',
    locomotion: 'PARABOLA_HOP',
    locomotionDescription: 'Nhảy lò cò Parabol + Squash & Stretch + Bụi trắng ánh lá',
    passiveName: '🧭 Nhà Thám Hiểm',
    passiveDescription: 'Nhận thêm +$40 thưởng năng lượng mỗi khi đi qua Ô Khởi Hành (+$240).',
    primaryColor: '#22c55e',
    secondaryColor: '#f97316',
    accentColor: '#86efac',
    emoji: '👩🦰'
  },
  {
    id: 'creeper',
    name: 'Creeper',
    title: 'Quái Vật TNT Chibi',
    locomotion: 'TNT_EXPLOSION',
    locomotionDescription: 'Phồng người nhấp nháy rồi nổ BÙM như TNT và hồi sinh tại ô tiếp theo!',
    passiveName: '🧨 Giáp Thuốc Nổ',
    passiveDescription: 'Giảm 20% mức phí nộp tại Ô Thuế Hoàng Gia & Thuế Xa Xỉ.',
    primaryColor: '#4ade80',
    secondaryColor: '#166534',
    accentColor: '#ef4444',
    emoji: '🧨'
  },
  {
    id: 'enderman',
    name: 'Enderman',
    title: 'Lữ Khách Không Gian',
    locomotion: 'ENDER_TELEPORT',
    locomotionDescription: 'Dịch chuyển tức thời từng ô kèm hiệu ứng vòng xoáy hạt tím!',
    passiveName: '🔮 Bậc Thầy Không Gian',
    passiveDescription: 'Nhận thêm +$50 Tinh Thể Ender mỗi khi bay qua Cổng The End hoặc Nether.',
    primaryColor: '#a855f7',
    secondaryColor: '#18181b',
    accentColor: '#d8b4fe',
    emoji: '🔮'
  }
];

export const BUILDING_TIER_NAMES: Record<number, { name: string; icon: string }> = {
  0: { name: 'Đất Trống', icon: '🌱' },
  1: { name: 'Cọc Rào Gỗ', icon: '🪵' },
  2: { name: 'Nhà Gỗ Minecraft', icon: '🏠' },
  3: { name: 'Biệt Thự 2 Tầng', icon: '🏡' },
  4: { name: 'Lâu Đài Vương Miện', icon: '🏰' }
};

export const COLOR_GROUP_LABELS: Record<ColorGroupId, string> = {
  PLAINS: 'Cụm Nâu (Phú Lâm - Nhà Bè)',
  OAK_FOREST: 'Cụm Xanh Lam (Khánh Hội - Thị Nghè)',
  SWAMP: 'Cụm Hồng (Tân Định - Bến Thành)',
  DESERT: 'Cụm Cam (Gia Định - Chợ Lớn)',
  SNOWY_PEAKS: 'Cụm Đỏ (Thủ Đức - Gò Vấp)',
  CHERRY_GROVE: 'Cụm Vàng (Vũng Tàu - Đà Lạt - Nha Trang)',
  NETHER: 'Cụm Xanh Lá (Lê Lợi - Nguyễn Huệ - Đồng Khởi)',
  END_CITY: 'Cụm Tím Đậm (Tân Sơn Nhất - Dinh Độc Lập)'
};

export const COLOR_GROUP_ORDER: { id: ColorGroupId; hex: string; label: string }[] = [
  { id: 'PLAINS', hex: '#92400e', label: 'Cụm Nâu (Phú Lâm - Nhà Bè)' },
  { id: 'OAK_FOREST', hex: '#38bdf8', label: 'Cụm Xanh Lam (Khánh Hội - Thị Nghè)' },
  { id: 'SWAMP', hex: '#ec4899', label: 'Cụm Hồng (Tân Định - Bến Thành)' },
  { id: 'DESERT', hex: '#f97316', label: 'Cụm Cam (Gia Định - Chợ Lớn)' },
  { id: 'SNOWY_PEAKS', hex: '#ef4444', label: 'Cụm Đỏ (Thủ Đức - Gò Vấp)' },
  { id: 'CHERRY_GROVE', hex: '#eab308', label: 'Cụm Vàng (Vũng Tàu - Đà Lạt - Nha Trang)' },
  { id: 'NETHER', hex: '#22c55e', label: 'Cụm Xanh Lá (Lê Lợi - Nguyễn Huệ - Đồng Khởi)' },
  { id: 'END_CITY', hex: '#6366f1', label: 'Cụm Tím Đậm (Tân Sơn Nhất - Dinh Độc Lập)' }
];

export interface TileConfig {
  index: number;
  name: string;
  type: TileType;
  icon: string;
  colorGroup?: ColorGroupId;
  colorHex: string;
  price?: number;
  upgradeCost?: number;
  /** Rent for levels 1..4 (Fence, Cottage, Villa, Castle) */
  rents?: [number, number, number, number];
  /** Reason displayed when another player lands here and must pay rent/tax */
  rentReason?: string;
  description: string;
  /** 3D Grid coordinates on the 11x11 perimeter (-5 to +5) */
  gridX: number;
  gridZ: number;
  /** Side index: 0=Bottom(+Z), 1=Left(-X), 2=Top(-Z), 3=Right(+X) */
  side: 0 | 1 | 2 | 3;
  /** Rotation around Y axis so text and 3D slanted models face OUTWARD from the board */
  outwardRotationY: number;
}

/**
 * Computes 3D perimeter coordinates and outward-facing rotation for 40 tiles (indices 0..39)
 * on an 11x11 ring (grid -5 to +5):
 * - Side 0 (Bottom, z = +5): x from +5 down to -5 (indices 0..10) -> outward normal +Z (rotY = 0)
 * - Side 1 (Left,   x = -5): z from +4 down to -5 (indices 11..20) -> outward normal -X (rotY = -PI/2)
 * - Side 2 (Top,    z = -5): x from -4 up to +5   (indices 21..30) -> outward normal -Z (rotY = PI)
 * - Side 3 (Right,  x = +5): z from -4 up to +4   (indices 31..39) -> outward normal +X (rotY = PI/2)
 */
export function getPerimeterGridCoords40(index: number): {
  gridX: number;
  gridZ: number;
  side: 0 | 1 | 2 | 3;
  outwardRotationY: number;
} {
  const i = ((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  if (i <= 10) {
    return {
      gridX: 5 - i,
      gridZ: 5,
      side: 0,
      outwardRotationY: 0
    };
  }
  if (i <= 20) {
    return {
      gridX: -5,
      gridZ: 5 - (i - 10),
      side: 1,
      outwardRotationY: -Math.PI / 2
    };
  }
  if (i <= 30) {
    return {
      gridX: -5 + (i - 20),
      gridZ: -5,
      side: 2,
      outwardRotationY: Math.PI
    };
  }
  return {
    gridX: 5,
    gridZ: -5 + (i - 30),
    side: 3,
    outwardRotationY: Math.PI / 2
  };
}

export const BOARD_TILES: TileConfig[] = TILES_CONFIG_40.map((tile) => ({
  ...tile,
  ...getPerimeterGridCoords40(tile.index)
}));

export function updateBoardTileConfigInPlace(
  tileIndex: number,
  patch: Partial<RawTileConfigItem>
): TileConfig {
  const idx = ((tileIndex % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  const current = BOARD_TILES[idx];
  const updated: TileConfig = {
    ...current,
    ...patch,
    index: idx,
    ...getPerimeterGridCoords40(idx)
  };
  BOARD_TILES[idx] = updated;
  return updated;
}

export function getExportableTilesSpecArray(): RawTileConfigItem[] {
  return BOARD_TILES.map((t) => {
    const spec: RawTileConfigItem = {
      index: t.index,
      name: t.name,
      type: t.type,
      icon: t.icon,
      colorHex: t.colorHex,
      description: t.description
    };
    if (t.colorGroup) spec.colorGroup = t.colorGroup;
    if (typeof t.price === 'number') spec.price = t.price;
    if (typeof t.upgradeCost === 'number') spec.upgradeCost = t.upgradeCost;
    if (t.rents) spec.rents = [...t.rents] as [number, number, number, number];
    if (t.rentReason) spec.rentReason = t.rentReason;
    return spec;
  });
}

export interface ChestCard {
  id: string;
  deck?: 'KHI_VAN' | 'CO_HOI';
  title: string;
  description: string;
  goldDelta?: number;
  moveToTile?: number;
  stepDelta?: number;
  goToJail?: boolean;
  grantGetOutOfJailCard?: boolean;
  collectFromEachPlayer?: number;
}

export const CHEST_CARDS: ChestCard[] = [
  // ======================== BỘ THẺ KHÍ VẬN (Ô #2, #17, #33) ========================
  {
    id: 'kv_lottery',
    deck: 'KHI_VAN',
    title: '🧧 Trúng Số Kiến Thiết Miền Nam!',
    description: 'Vé số kiến thiết của bạn trúng giải đặc biệt! Nhận ngay +$200 từ Ngân hàng.',
    goldDelta: 200
  },
  {
    id: 'kv_birthday',
    deck: 'KHI_VAN',
    title: '🎂 Tiệc Mừng Sinh Nhật!',
    description: 'Hôm nay là sinh nhật bạn! Thu $25 tiền mừng từ mỗi người chơi khác đang thi đấu.',
    collectFromEachPlayer: 25
  },
  {
    id: 'kv_tax_refund',
    deck: 'KHI_VAN',
    title: '💵 Hoàn Thuế Lợi Tức!',
    description: 'Kho bạc hoàn trả khoản thuế nộp dư trong năm. Nhận +$120.',
    goldDelta: 120
  },
  {
    id: 'kv_jail_free',
    deck: 'KHI_VAN',
    title: '🕊️ Thẻ Ân Xá Ra Tù Miễn Phí!',
    description: 'Cất giữ thẻ này để sử dụng khi bị giam tại Nhà Tù Chí Hòa (#10) mà không tốn tiền phạt!',
    grantGetOutOfJailCard: true,
    goldDelta: 0
  },
  {
    id: 'kv_hospital',
    deck: 'KHI_VAN',
    title: '🏥 Chi Phí Chăm Sóc Y Tế!',
    description: 'Đóng phí kiểm tra sức khỏe định kỳ tại bệnh viện -$60.',
    goldDelta: -60
  },
  {
    id: 'kv_inheritance',
    deck: 'KHI_VAN',
    title: '📜 Thừa Kế Thương Hội Sài Gòn!',
    description: 'Nhận cổ tức thừa kế từ thương hội gia tộc +$150.',
    goldDelta: 150
  },

  // ======================== BỘ THẺ CƠ HỘI (Ô #7, #22, #36) ========================
  {
    id: 'ch_go_start',
    deck: 'CO_HOI',
    title: '🚩 Tiến Về Bến Nhà Rồng (Khởi Hành)!',
    description: 'Đi thẳng về Ô Khởi Hành (#0) và lĩnh ngay +$200 tiền lương!',
    moveToTile: 0,
    goldDelta: 200
  },
  {
    id: 'ch_forward_3',
    deck: 'CO_HOI',
    title: '⏩ Đường Thông Thoáng — Tiến 3 Bước!',
    description: 'Tuyến đường đại lộ thông thoáng, tiến thêm 3 ô cờ ngay lập tức!',
    stepDelta: 3,
    goldDelta: 0
  },
  {
    id: 'ch_back_3',
    deck: 'CO_HOI',
    title: '⏪ Kẹt Xe Giờ Cao Điểm — Lùi 3 Bước!',
    description: 'Giao thông ùn tắc tại ngã tư, lùi lại 3 ô cờ!',
    stepDelta: -3,
    goldDelta: 0
  },
  {
    id: 'ch_go_to_jail',
    deck: 'CO_HOI',
    title: '🚓 Lệnh Bắt Giam Khẩn Cấp!',
    description: 'Đi thẳng vào Nhà Tù Chí Hòa (#10)! Không được nhận lương khi qua Khởi Hành.',
    goToJail: true,
    goldDelta: 0
  },
  {
    id: 'ch_jail_free',
    deck: 'CO_HOI',
    title: '🔑 Giấy Bảo Lãnh Ra Tù Miễn Phí!',
    description: 'Cất giữ giấy bảo lãnh này để thoát khỏi Nhà Tù Chí Hòa (#10) miễn phí bất cứ lúc nào!',
    grantGetOutOfJailCard: true,
    goldDelta: 0
  },
  {
    id: 'ch_speed_fine',
    deck: 'CO_HOI',
    title: '🚦 Phạt Vi Phạm Luật Giao Thông!',
    description: 'Đóng phạt hành chính vượt tốc độ trong nội đô -$50.',
    goldDelta: -50
  }
];
