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
  PLAINS: 'Quận Phố Cổ (Brickstone)',
  OAK_FOREST: 'Quận Ánh Sáng & Kiến Trúc',
  SWAMP: 'Quận Giải Trí & Nghệ Thuật',
  DESERT: 'Quận Khởi Nghiệp & Tài Chính',
  SNOWY_PEAKS: 'Quận Truyền Thông & Thể Thao',
  CHERRY_GROVE: 'Quận Nghỉ Dưỡng Bến Cảng',
  NETHER: 'Quận Ngân Hàng Quốc Tế',
  END_CITY: 'Đại Lộ Tỷ Phú Thượng Lưu'
};

export const COLOR_GROUP_ORDER: { id: ColorGroupId; hex: string; label: string }[] = [
  { id: 'PLAINS', hex: '#a16207', label: 'Quận Phố Cổ' },
  { id: 'OAK_FOREST', hex: '#38bdf8', label: 'Quận Ánh Sáng' },
  { id: 'SWAMP', hex: '#ec4899', label: 'Quận Giải Trí' },
  { id: 'DESERT', hex: '#f97316', label: 'Quận Khởi Nghiệp' },
  { id: 'SNOWY_PEAKS', hex: '#ef4444', label: 'Quận Thể Thao' },
  { id: 'CHERRY_GROVE', hex: '#eab308', label: 'Quận Bến Cảng' },
  { id: 'NETHER', hex: '#22c55e', label: 'Quận Ngân Hàng' },
  { id: 'END_CITY', hex: '#6366f1', label: 'Đại Lộ Thượng Lưu' }
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

const CUSTOM_TILES_STORAGE_KEY = 'astrocyberr_custom_tiles_v1';

function loadMergedTileSpecs(): RawTileConfigItem[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return TILES_CONFIG_40.map((t) => structuredClone(t));
  }
  try {
    const raw = window.localStorage.getItem(CUSTOM_TILES_STORAGE_KEY);
    if (!raw) return TILES_CONFIG_40.map((t) => structuredClone(t));
    const parsed = JSON.parse(raw) as RawTileConfigItem[];
    if (!Array.isArray(parsed) || parsed.length !== BOARD_SIZE) {
      return TILES_CONFIG_40.map((t) => structuredClone(t));
    }
    return TILES_CONFIG_40.map((base, idx) => ({
      ...base,
      ...parsed[idx],
      index: idx
    }));
  } catch {
    return TILES_CONFIG_40.map((t) => structuredClone(t));
  }
}

export const BOARD_TILES: TileConfig[] = loadMergedTileSpecs().map((tile) => ({
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

  if (typeof window !== 'undefined' && window.localStorage) {
    const specs = getExportableTilesSpecArray();
    window.localStorage.setItem(CUSTOM_TILES_STORAGE_KEY, JSON.stringify(specs));
  }
  return updated;
}

export function resetBoardTilesToDefault(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(CUSTOM_TILES_STORAGE_KEY);
  }
  TILES_CONFIG_40.forEach((base, idx) => {
    BOARD_TILES[idx] = {
      ...structuredClone(base),
      ...getPerimeterGridCoords40(idx)
    };
  });
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
  title: string;
  description: string;
  goldDelta?: number;
  moveToTile?: number;
}

export const CHEST_CARDS: ChestCard[] = [
  {
    id: 'diamond_vein',
    title: '💎 Cổ Tức Tập Đoàn Kim Cương!',
    description: 'Khoản đầu tư mỏ Kim Cương Đô Thị sinh lời vượt bậc! Nhận +$180.',
    goldDelta: 180
  },
  {
    id: 'emerald_trade',
    title: '💚 Thưởng Thương Mại Ngọc Lục Bảo!',
    description: 'Hợp đồng xuất khẩu nông sản Voxel thành công rực rỡ. Nhận +$120.',
    goldDelta: 120
  },
  {
    id: 'golden_apple',
    title: '🍎 Giải Thưởng Ẩm Thực Táo Vàng!',
    description: 'Chuỗi nhà hàng của bạn đạt danh hiệu 5 sao! Nhận +$150.',
    goldDelta: 150
  },
  {
    id: 'creeper_roof',
    title: '💥 Sự Cố Nổ Trạm Biến Áp Creeper!',
    description: 'Một chú Creeper đi lạc làm hỏng mặt tiền tòa nhà. Tốn -$70 bảo trì.',
    goldDelta: -70
  },
  {
    id: 'elytra_start',
    title: '🪽 Chuyên Cơ Elytra Đưa Về Đại Lộ GO!',
    description: 'Bay thẳng về Đại Lộ Khởi Hành (#0) và nhận ngay +$200!',
    moveToTile: 0,
    goldDelta: 200
  },
  {
    id: 'totem_undying',
    title: '🗿 Bảo Hiểm Totem Bất Tử Chi Trả!',
    description: 'Quỹ bảo hiểm thành phố hoàn trả cho bạn +$140.',
    goldDelta: 140
  },
  {
    id: 'zombie_siege',
    title: '🧟 Phí An Ninh Vệ Sĩ Iron Golem!',
    description: 'Thuê đội tuần tra Iron Golem bảo vệ khu phố ban đêm tốn -$60.',
    goldDelta: -60
  },
  {
    id: 'netherite_ingot',
    title: '🔥 Trúng Thầu Khoáng Sản Netherite!',
    description: 'Bán lô hợp kim Netherite siêu cứng cho Cảng Vũ Trụ thu về +$200!',
    goldDelta: 200
  }
];
