export type TileType =
  | 'START'
  | 'PROPERTY'
  | 'CHEST'
  | 'DESERTED_ISLAND'
  | 'FESTIVAL'
  | 'END_PORTAL'
  | 'ROYAL_TAX'
  | 'RAILROAD';

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
    locomotionDescription: 'Nhảy lò cò đường cong Parabol, vung tay chân ngược chiều + Squash & Stretch + Hạt bụi trắng',
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
    locomotionDescription: 'Nhảy lò cò Parabol uyển chuyển, vung tay chân ngược chiều + Squash & Stretch + Bụi trắng ánh lá',
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
    locomotionDescription: 'Phồng người nhấp nháy rồi phát nổ BÙM như TNT (lửa + khói) và hồi sinh ngay tại ô tiếp theo!',
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
    locomotionDescription: 'Dịch chuyển tức thời từng ô kèm hiệu ứng vòng xoáy hạt tím (End Portal Particles) xung quanh!',
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
  description: string;
  /** 3D Grid coordinates on the 8x8 perimeter (-3.5 to +3.5) */
  gridX: number;
  gridZ: number;
}

/**
 * Helper to compute 3D perimeter coordinates for 28 tiles (indices 0..27)
 * Side 0 (Bottom, z = +3.5): x from +3.5 down to -3.5 (indices 0..7)
 * Side 1 (Left,   x = -3.5): z from +2.5 down to -3.5 (indices 8..14)
 * Side 2 (Top,    z = -3.5): x from -2.5 up to +3.5   (indices 15..21)
 * Side 3 (Right,  x = +3.5): z from -2.5 up to +2.5   (indices 22..27)
 */
export function getPerimeterGridCoords(index: number): { gridX: number; gridZ: number } {
  const i = ((index % 28) + 28) % 28;
  if (i <= 7) {
    return { gridX: 3.5 - i, gridZ: 3.5 };
  }
  if (i <= 14) {
    return { gridX: -3.5, gridZ: 3.5 - (i - 7) };
  }
  if (i <= 21) {
    return { gridX: -3.5 + (i - 14), gridZ: -3.5 };
  }
  return { gridX: 3.5, gridZ: -3.5 + (i - 21) };
}

const RAW_TILES: Omit<TileConfig, 'gridX' | 'gridZ'>[] = [
  // Side 1: Bottom (0..6)
  {
    index: 0,
    name: 'Ô Khởi Hành',
    type: 'START',
    icon: '🚩',
    colorHex: '#fbbf24',
    description: 'Đi qua hoặc dừng lại nhận ngay +200 Vàng!'
  },
  {
    index: 1,
    name: 'Thung Lũng Cỏ Non',
    type: 'PROPERTY',
    icon: '🌾',
    colorGroup: 'PLAINS',
    colorHex: '#84cc16',
    price: 100,
    upgradeCost: 60,
    rents: [30, 70, 150, 280],
    description: 'Cụm Đồng Cỏ (Plains) • Đất màu mỡ dễ xây Cọc rào & Nhà gỗ.'
  },
  {
    index: 2,
    name: 'Đồi Hoa Bồ Công Anh',
    type: 'PROPERTY',
    icon: '🌼',
    colorGroup: 'PLAINS',
    colorHex: '#84cc16',
    price: 120,
    upgradeCost: 60,
    rents: [35, 80, 170, 320],
    description: 'Cụm Đồng Cỏ (Plains) • Sở hữu đủ 2 ô Đồng Cỏ tăng 1.5x tiền thuê!'
  },
  {
    index: 3,
    name: 'Ga Minecart Đông',
    type: 'RAILROAD',
    icon: '🛤️',
    colorHex: '#78716c',
    price: 160,
    rents: [50, 100, 200, 400],
    description: 'Đường Sắt Minecart • Sở hữu 1/2/3/4 ga nhận 50/100/200/400 Vàng!'
  },
  {
    index: 4,
    name: 'Làng Thợ Mộc',
    type: 'PROPERTY',
    icon: '🪓',
    colorGroup: 'OAK_FOREST',
    colorHex: '#22c55e',
    price: 140,
    upgradeCost: 80,
    rents: [45, 100, 210, 380],
    description: 'Cụm Rừng Gỗ Sồi (Oak Forest) • Nguồn gỗ dồi dào cho công trình.'
  },
  {
    index: 5,
    name: 'Rương Kho Báu Sồi',
    type: 'CHEST',
    icon: '🧰',
    colorHex: '#d97706',
    description: 'Khí Vận Minecraft • Mở rương nhận ngẫu nhiên báu vật hoặc thử thách!'
  },
  {
    index: 6,
    name: 'Rừng Sồi Cổ Thụ',
    type: 'PROPERTY',
    icon: '🌳',
    colorGroup: 'OAK_FOREST',
    colorHex: '#22c55e',
    price: 160,
    upgradeCost: 80,
    rents: [50, 115, 240, 430],
    description: 'Cụm Rừng Gỗ Sồi (Oak Forest) • Cây sồi khổng lồ giữa đảo.'
  },

  // Side 2: Left (7..13)
  {
    index: 7,
    name: 'Đảo Hoang',
    type: 'DESERTED_ISLAND',
    icon: '🏝️',
    colorHex: '#0ea5e9',
    description: 'Mắc kẹt trên Đảo Hoang! Phải nghỉ 1 lượt để chờ thuyền cứu hộ.'
  },
  {
    index: 8,
    name: 'Đầm Lầy Slime',
    type: 'PROPERTY',
    icon: '🟢',
    colorGroup: 'SWAMP',
    colorHex: '#14b8a6',
    price: 180,
    upgradeCost: 100,
    rents: [60, 130, 270, 480],
    description: 'Cụm Đầm Lầy (Swamp) • Vùng đất nảy tưng tưng của Slime.'
  },
  {
    index: 9,
    name: 'Chòi Phù Thủy',
    type: 'PROPERTY',
    icon: '🧪',
    colorGroup: 'SWAMP',
    colorHex: '#14b8a6',
    price: 200,
    upgradeCost: 100,
    rents: [65, 145, 300, 520],
    description: 'Cụm Đầm Lầy (Swamp) • Nơi nấu thuốc phép thuật bí ẩn.'
  },
  {
    index: 10,
    name: 'Ga Minecart Nam',
    type: 'RAILROAD',
    icon: '🛤️',
    colorHex: '#78716c',
    price: 160,
    rents: [50, 100, 200, 400],
    description: 'Đường Sắt Minecart • Sở hữu 1/2/3/4 ga nhận 50/100/200/400 Vàng!'
  },
  {
    index: 11,
    name: 'Ốc Đảo Xương Rồng',
    type: 'PROPERTY',
    icon: '🌵',
    colorGroup: 'DESERT',
    colorHex: '#f59e0b',
    price: 220,
    upgradeCost: 120,
    rents: [75, 165, 340, 600],
    description: 'Cụm Sa Mạc Vàng (Desert) • Cát vàng rực rỡ bên bờ biển.'
  },
  {
    index: 12,
    name: 'Rương Kho Báu Cát',
    type: 'CHEST',
    icon: '🧰',
    colorHex: '#d97706',
    description: 'Khí Vận Minecraft • Mở rương cổ đại ẩn giấu dưới lớp cát!'
  },
  {
    index: 13,
    name: 'Kim Tự Tháp Cát',
    type: 'PROPERTY',
    icon: '🏜️',
    colorGroup: 'DESERT',
    colorHex: '#f59e0b',
    price: 240,
    upgradeCost: 120,
    rents: [85, 185, 380, 660],
    description: 'Cụm Sa Mạc Vàng (Desert) • Đền thờ cổ chứa đầy vàng bạc.'
  },

  // Side 3: Top (14..20)
  {
    index: 14,
    name: 'Ô Lễ Hội',
    type: 'FESTIVAL',
    icon: '🎉',
    colorHex: '#ec4899',
    description: 'Tổ chức Đại Tiệc Làng! Chọn 1 ô đất của bạn để NHÂN ĐÔI (x2) tiền thuê!'
  },
  {
    index: 15,
    name: 'Đỉnh Băng Vĩnh Cửu',
    type: 'PROPERTY',
    icon: '🧊',
    colorGroup: 'SNOWY_PEAKS',
    colorHex: '#38bdf8',
    price: 260,
    upgradeCost: 140,
    rents: [90, 200, 420, 720],
    description: 'Cụm Núi Tuyết (Snowy Peaks) • Băng tuyết lấp lánh dưới nắng.'
  },
  {
    index: 16,
    name: 'Làng Tuyết Igloo',
    type: 'PROPERTY',
    icon: '⛄',
    colorGroup: 'SNOWY_PEAKS',
    colorHex: '#38bdf8',
    price: 280,
    upgradeCost: 140,
    rents: [100, 220, 450, 780],
    description: 'Cụm Núi Tuyết (Snowy Peaks) • Những túp lều tuyết ấm áp.'
  },
  {
    index: 17,
    name: 'Ga Minecart Tây',
    type: 'RAILROAD',
    icon: '🛤️',
    colorHex: '#78716c',
    price: 160,
    rents: [50, 100, 200, 400],
    description: 'Đường Sắt Minecart • Sở hữu 1/2/3/4 ga nhận 50/100/200/400 Vàng!'
  },
  {
    index: 18,
    name: 'Đồi Hoa Anh Đào',
    type: 'PROPERTY',
    icon: '🌸',
    colorGroup: 'CHERRY_GROVE',
    colorHex: '#f472b6',
    price: 300,
    upgradeCost: 160,
    rents: [110, 240, 500, 860],
    description: 'Cụm Rừng Anh Đào (Cherry Grove) • Cánh hoa hồng rơi lãng mạn.'
  },
  {
    index: 19,
    name: 'Rương Kho Báu Hồng',
    type: 'CHEST',
    icon: '🧰',
    colorHex: '#d97706',
    description: 'Khí Vận Minecraft • Mở rương báu vật giữa rừng hoa anh đào!'
  },
  {
    index: 20,
    name: 'Suối Tiên Anh Đào',
    type: 'PROPERTY',
    icon: '⛩️',
    colorGroup: 'CHERRY_GROVE',
    colorHex: '#f472b6',
    price: 320,
    upgradeCost: 160,
    rents: [120, 260, 540, 920],
    description: 'Cụm Rừng Anh Đào (Cherry Grove) • Khu nghỉ dưỡng đắt giá.'
  },

  // Side 4: Right (21..27)
  {
    index: 21,
    name: 'Cổng Dịch Chuyển The End',
    type: 'END_PORTAL',
    icon: '🌌',
    colorHex: '#9333ea',
    description: 'Cổng The End huyền thoại! Cho phép bạn BAY TỨC THỜI tới bất kỳ ô nào trên bàn cờ!'
  },
  {
    index: 22,
    name: 'Rừng Nấm Đỏ Crimson',
    type: 'PROPERTY',
    icon: '🍄',
    colorGroup: 'NETHER',
    colorHex: '#ef4444',
    price: 350,
    upgradeCost: 180,
    rents: [135, 290, 600, 1020],
    description: 'Cụm Pháo Đài Nether (Nether) • Vùng đất rực lửa lợi nhuận cao.'
  },
  {
    index: 23,
    name: 'Pháo Đài Blaze',
    type: 'PROPERTY',
    icon: '🔥',
    colorGroup: 'NETHER',
    colorHex: '#ef4444',
    price: 380,
    upgradeCost: 180,
    rents: [150, 320, 660, 1120],
    description: 'Cụm Pháo Đài Nether (Nether) • Thành trì bất khả xâm phạm.'
  },
  {
    index: 24,
    name: 'Ga Minecart Bắc',
    type: 'RAILROAD',
    icon: '🛤️',
    colorHex: '#78716c',
    price: 160,
    rents: [50, 100, 200, 400],
    description: 'Đường Sắt Minecart • Sở hữu 1/2/3/4 ga nhận 50/100/200/400 Vàng!'
  },
  {
    index: 25,
    name: 'Đảo Đá End',
    type: 'PROPERTY',
    icon: '🪐',
    colorGroup: 'END_CITY',
    colorHex: '#a855f7',
    price: 420,
    upgradeCost: 220,
    rents: [170, 370, 760, 1280],
    description: 'Cụm Thành Phố The End (End City) • Quần đảo lơ lửng ngoài không gian.'
  },
  {
    index: 26,
    name: 'Ô Thuế Hoàng Gia',
    type: 'ROYAL_TAX',
    icon: '👑',
    colorHex: '#eab308',
    description: 'Đóng Thuế Hoàng Gia 120 Vàng vào ngân khố đảo nổi!'
  },
  {
    index: 27,
    name: 'Tháp Rồng Ender',
    type: 'PROPERTY',
    icon: '🐉',
    colorGroup: 'END_CITY',
    colorHex: '#a855f7',
    price: 460,
    upgradeCost: 220,
    rents: [200, 430, 880, 1500],
    description: 'Cụm Thành Phố The End (End City) • Ô đất đắt giá và quyền lực nhất bàn cờ!'
  }
];

export const BOARD_TILES: TileConfig[] = RAW_TILES.map((tile) => ({
  ...tile,
  ...getPerimeterGridCoords(tile.index)
}));

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
    title: '💎 Đào Trúng Mỏ Kim Cương!',
    description: 'Bạn vừa đập vỡ tầng đá sâu và nhặt được viên Kim Cương lấp lánh! Nhận +180 Vàng.',
    goldDelta: 180
  },
  {
    id: 'emerald_trade',
    title: '💚 Giao Dịch Với Dân Làng!',
    description: 'Dân làng Hmmm rất thích nông sản của bạn và thưởng +120 Vàng.',
    goldDelta: 120
  },
  {
    id: 'golden_apple',
    title: '🍎 Nhặt Được Táo Vàng Enchant!',
    description: 'Sức mạnh tràn đầy! Nhận +150 Vàng từ Rương Kho Báu.',
    goldDelta: 150
  },
  {
    id: 'creeper_roof',
    title: '💥 Creeper Nổ Hỏng Hàng Rào!',
    description: 'Một chú Creeper đi lạc làm bay mất góc mái nhà. Tốn -70 Vàng sửa chữa.',
    goldDelta: -70
  },
  {
    id: 'elytra_start',
    title: '🪽 Lượn Cánh Elytra Về Ô Khởi Hành!',
    description: 'Bay thẳng về Ô Khởi Hành (Ô 0) và nhận ngay +200 Vàng!',
    moveToTile: 0,
    goldDelta: 200
  },
  {
    id: 'totem_undying',
    title: '🗿 Totem Bất Tử Ban Phước!',
    description: 'Thần hộ mệnh trao tặng bạn +140 Vàng dự phòng.',
    goldDelta: 140
  },
  {
    id: 'zombie_siege',
    title: '🧟 Đêm Trăng Máu Zombie!',
    description: 'Thuê Iron Golem bảo vệ ngôi làng tốn -60 Vàng.',
    goldDelta: -60
  },
  {
    id: 'netherite_ingot',
    title: '🔥 Đúc Thành Công Phôi Netherite!',
    description: 'Bán phôi Netherite quý hiếm thu về +200 Vàng!',
    goldDelta: 200
  }
];
