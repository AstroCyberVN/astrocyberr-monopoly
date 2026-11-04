export const BOARD_SIZE = 40;

export type TileType =
  | 'START'
  | 'PROPERTY'
  | 'CHEST'
  | 'DESERTED_ISLAND'
  | 'FESTIVAL'
  | 'END_PORTAL'
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
  PLAINS: 'Đồng Cỏ Xanh (Plains)',
  OAK_FOREST: 'Rừng Gỗ Sồi (Oak Forest)',
  SWAMP: 'Đầm Lầy Đom Đóm (Swamp)',
  DESERT: 'Sa Mạc Cát Vàng (Desert)',
  SNOWY_PEAKS: 'Đỉnh Tuyết Vĩnh Cửu (Snowy Peaks)',
  CHERRY_GROVE: 'Thung Lũng Anh Đào (Cherry Grove)',
  NETHER: 'Pháo Đài Lửa Đỏ (Nether)',
  END_CITY: 'Thành Phố Không Gian (The End)'
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

const RAW_TILES_40: Omit<TileConfig, 'gridX' | 'gridZ' | 'side' | 'outwardRotationY'>[] = [
  // ======================== SIDE 0: BOTTOM (0..9) ========================
  {
    index: 0,
    name: 'Ô Khởi Hành',
    type: 'START',
    icon: '🚩',
    colorHex: '#10b981',
    description: 'Đi qua hoặc dừng lại nhận ngay +$200 từ Ngân Khố Đảo Nổi!'
  },
  {
    index: 1,
    name: 'Thung Lũng Cỏ Non',
    type: 'PROPERTY',
    icon: '🌾',
    colorGroup: 'PLAINS',
    colorHex: '#84cc16',
    price: 60,
    upgradeCost: 50,
    rents: [20, 60, 140, 260],
    description: 'Đồng cỏ xanh mướt dễ xây Cọc rào và Nhà gỗ khởi nghiệp.'
  },
  {
    index: 2,
    name: 'Rương Kho Báu Thợ Mỏ',
    type: 'CHEST',
    icon: '🧰',
    colorHex: '#f59e0b',
    description: 'Mở Rương Kho Báu Minecraft để nhận thưởng $ hoặc thẻ phép thuật!'
  },
  {
    index: 3,
    name: 'Đồi Hoa Hướng Dương',
    type: 'PROPERTY',
    icon: '🌻',
    colorGroup: 'PLAINS',
    colorHex: '#84cc16',
    price: 70,
    upgradeCost: 50,
    rents: [25, 70, 160, 290],
    description: 'Cánh đồng hoa rực nắng thu hút thương nhân dân làng.'
  },
  {
    index: 4,
    name: 'Trại Cừu Lông Trắng',
    type: 'PROPERTY',
    icon: '🐑',
    colorGroup: 'PLAINS',
    colorHex: '#84cc16',
    price: 80,
    upgradeCost: 50,
    rents: [30, 80, 180, 320],
    description: 'Sở hữu đủ 3 ô Đồng Cỏ giúp tăng 1.5x tiền thuê toàn cụm!'
  },
  {
    index: 5,
    name: 'Ga Minecart Nam',
    type: 'RAILROAD',
    icon: '🛤️',
    colorHex: '#64748b',
    price: 160,
    rents: [50, 100, 200, 400],
    description: 'Tuyến đường sắt xe mỏ phía Nam • Sở hữu 1/2/3/4 ga nhận $50/$100/$200/$400.'
  },
  {
    index: 6,
    name: 'Làng Thợ Mộc Sồi',
    type: 'PROPERTY',
    icon: '🪓',
    colorGroup: 'OAK_FOREST',
    colorHex: '#22c55e',
    price: 100,
    upgradeCost: 60,
    rents: [35, 90, 200, 360],
    description: 'Xưởng chế tác gỗ sồi nổi tiếng nhất quần đảo.'
  },
  {
    index: 7,
    name: 'Thuế Thương Gia',
    type: 'ROYAL_TAX',
    icon: '💎',
    colorHex: '#eab308',
    price: 100,
    description: 'Đóng phí bảo trì cầu cảng và đường ray đảo nổi -$100.'
  },
  {
    index: 8,
    name: 'Vườn Táo Đỏ Ngọt',
    type: 'PROPERTY',
    icon: '🍎',
    colorGroup: 'OAK_FOREST',
    colorHex: '#22c55e',
    price: 110,
    upgradeCost: 60,
    rents: [40, 100, 220, 390],
    description: 'Khu vườn rợp bóng cây sồi chuyên thu hoạch táo vàng.'
  },
  {
    index: 9,
    name: 'Rừng Sồi Cổ Thụ',
    type: 'PROPERTY',
    icon: '🌳',
    colorGroup: 'OAK_FOREST',
    colorHex: '#22c55e',
    price: 120,
    upgradeCost: 60,
    rents: [45, 110, 240, 420],
    description: 'Cây đại thụ ngàn năm ở rìa phía Tây Nam hòn đảo.'
  },

  // ======================== SIDE 1: LEFT (10..19) ========================
  {
    index: 10,
    name: 'Đảo Hoang',
    type: 'DESERTED_ISLAND',
    icon: '🏝️',
    colorHex: '#0ea5e9',
    description: 'Mắc kẹt trên Đảo Hoang! Phải nghỉ 1 lượt để chờ thuyền cứu hộ.'
  },
  {
    index: 11,
    name: 'Đầm Lầy Slime Xanh',
    type: 'PROPERTY',
    icon: '🟢',
    colorGroup: 'SWAMP',
    colorHex: '#14b8a6',
    price: 140,
    upgradeCost: 80,
    rents: [50, 125, 270, 470],
    description: 'Vùng đầm lầy nảy tưng tưng giàu tài nguyên Slimeball.'
  },
  {
    index: 12,
    name: 'Rương Kho Báu Đầm Lầy',
    type: 'CHEST',
    icon: '🧰',
    colorHex: '#f59e0b',
    description: 'Khí Vận Minecraft • Mở rương gỗ cổ dưới gốc cây đước!'
  },
  {
    index: 13,
    name: 'Rừng Đước Đom Đóm',
    type: 'PROPERTY',
    icon: '🐸',
    colorGroup: 'SWAMP',
    colorHex: '#14b8a6',
    price: 150,
    upgradeCost: 80,
    rents: [55, 135, 290, 500],
    description: 'Khu sinh thái ếch và đom đóm lung linh về đêm.'
  },
  {
    index: 14,
    name: 'Chòi Phù Thủy Bí Ẩn',
    type: 'PROPERTY',
    icon: '🧪',
    colorGroup: 'SWAMP',
    colorHex: '#14b8a6',
    price: 160,
    upgradeCost: 80,
    rents: [60, 150, 320, 540],
    description: 'Nơi luyện thuốc tăng tốc và hồi phục của Phù Thủy.'
  },
  {
    index: 15,
    name: 'Ga Minecart Tây',
    type: 'RAILROAD',
    icon: '🛤️',
    colorHex: '#64748b',
    price: 160,
    rents: [50, 100, 200, 400],
    description: 'Tuyến đường sắt xe mỏ phía Tây • Sở hữu 1/2/3/4 ga nhận $50/$100/$200/$400.'
  },
  {
    index: 16,
    name: 'Ốc Đảo Xương Rồng',
    type: 'PROPERTY',
    icon: '🌵',
    colorGroup: 'DESERT',
    colorHex: '#f59e0b',
    price: 180,
    upgradeCost: 100,
    rents: [70, 170, 360, 600],
    description: 'Trạm dừng chân mát lành giữa biển cát vàng.'
  },
  {
    index: 17,
    name: 'Trạm Đá Đỏ Redstone',
    type: 'UTILITY',
    icon: '⚡',
    colorHex: '#ef4444',
    price: 150,
    rents: [60, 140, 260, 420],
    description: 'Nhà máy điện Redstone cung cấp năng lượng cho toàn bộ bàn cờ!'
  },
  {
    index: 18,
    name: 'Thị Trấn Đá Cát',
    type: 'PROPERTY',
    icon: '🏺',
    colorGroup: 'DESERT',
    colorHex: '#f59e0b',
    price: 190,
    upgradeCost: 100,
    rents: [75, 185, 390, 650],
    description: 'Khu chợ gốm cổ và ngọc lục bảo nhộn nhịp.'
  },
  {
    index: 19,
    name: 'Kim Tự Tháp Vàng',
    type: 'PROPERTY',
    icon: '🏜️',
    colorGroup: 'DESERT',
    colorHex: '#f59e0b',
    price: 200,
    upgradeCost: 100,
    rents: [85, 200, 420, 700],
    description: 'Ngôi đền sa mạc cổ đại ẩn chứa kho báu Pharaoh.'
  },

  // ======================== SIDE 2: TOP (20..29) ========================
  {
    index: 20,
    name: 'Ô Lễ Hội Làng',
    type: 'FESTIVAL',
    icon: '🎉',
    colorHex: '#ec4899',
    description: 'Đại Tiệc Lễ Hội! Chọn 1 ô đất của bạn để NHÂN ĐÔI (x2) tiền thuê!'
  },
  {
    index: 21,
    name: 'Sông Băng Pha Lê',
    type: 'PROPERTY',
    icon: '🧊',
    colorGroup: 'SNOWY_PEAKS',
    colorHex: '#38bdf8',
    price: 220,
    upgradeCost: 120,
    rents: [90, 220, 460, 760],
    description: 'Dòng sông băng vĩnh cửu phản chiếu ánh cực quang.'
  },
  {
    index: 22,
    name: 'Rương Kho Báu Băng Giá',
    type: 'CHEST',
    icon: '🧰',
    colorHex: '#f59e0b',
    description: 'Khí Vận Minecraft • Mở rương báu vật đóng băng trên đỉnh núi!'
  },
  {
    index: 23,
    name: 'Làng Tuyết Igloo',
    type: 'PROPERTY',
    icon: '⛄',
    colorGroup: 'SNOWY_PEAKS',
    colorHex: '#38bdf8',
    price: 230,
    upgradeCost: 120,
    rents: [95, 235, 490, 810],
    description: 'Ngôi làng người tuyết ấm cúng giữa bão tuyết trắng.'
  },
  {
    index: 24,
    name: 'Đỉnh Núi Băng Vương',
    type: 'PROPERTY',
    icon: '🏔️',
    colorGroup: 'SNOWY_PEAKS',
    colorHex: '#38bdf8',
    price: 240,
    upgradeCost: 120,
    rents: [105, 250, 520, 860],
    description: 'Đỉnh núi cao nhất phía Bắc với tầm nhìn toàn cảnh.'
  },
  {
    index: 25,
    name: 'Ga Minecart Bắc',
    type: 'RAILROAD',
    icon: '🛤️',
    colorHex: '#64748b',
    price: 160,
    rents: [50, 100, 200, 400],
    description: 'Tuyến đường sắt xe mỏ phía Bắc • Sở hữu 1/2/3/4 ga nhận $50/$100/$200/$400.'
  },
  {
    index: 26,
    name: 'Đồi Hoa Anh Đào',
    type: 'PROPERTY',
    icon: '🌸',
    colorGroup: 'CHERRY_GROVE',
    colorHex: '#f472b6',
    price: 260,
    upgradeCost: 140,
    rents: [115, 270, 560, 920],
    description: 'Rừng hoa Sakura hồng phấn rơi lãng mạn quanh năm.'
  },
  {
    index: 27,
    name: 'Lầu Trà Hoa Hồng',
    type: 'PROPERTY',
    icon: '🍵',
    colorGroup: 'CHERRY_GROVE',
    colorHex: '#f472b6',
    price: 270,
    upgradeCost: 140,
    rents: [120, 285, 590, 970],
    description: 'Điểm thưởng trà cao cấp của giới quý tộc đảo nổi.'
  },
  {
    index: 28,
    name: 'Tháp Ánh Sáng Beacon',
    type: 'UTILITY',
    icon: '🔮',
    colorHex: '#38bdf8',
    price: 150,
    rents: [60, 140, 260, 420],
    description: 'Tháp Hải Đăng Kim Cương chiếu sáng và ban phước toàn đảo!'
  },
  {
    index: 29,
    name: 'Suối Tiên Anh Đào',
    type: 'PROPERTY',
    icon: '⛩️',
    colorGroup: 'CHERRY_GROVE',
    colorHex: '#f472b6',
    price: 280,
    upgradeCost: 140,
    rents: [130, 300, 630, 1040],
    description: 'Khu nghỉ dưỡng suối nước nóng đắt khách bậc nhất.'
  },

  // ======================== SIDE 3: RIGHT (30..39) ========================
  {
    index: 30,
    name: 'Cổng Dịch Chuyển The End',
    type: 'END_PORTAL',
    icon: '🌌',
    colorHex: '#9333ea',
    description: 'Cổng Không Gian The End! Cho phép bạn BAY TỨC THỜI tới bất kỳ ô nào trên 40 ô!'
  },
  {
    index: 31,
    name: 'Rừng Nấm Đỏ Crimson',
    type: 'PROPERTY',
    icon: '🍄',
    colorGroup: 'NETHER',
    colorHex: '#ef4444',
    price: 300,
    upgradeCost: 160,
    rents: [140, 330, 680, 1120],
    description: 'Khu rừng nấm rực lửa mang lại lợi nhuận khổng lồ.'
  },
  {
    index: 32,
    name: 'Thành Cổ Đá Đen Bastion',
    type: 'PROPERTY',
    icon: '🐷',
    colorGroup: 'NETHER',
    colorHex: '#ef4444',
    price: 320,
    upgradeCost: 160,
    rents: [150, 350, 720, 1180],
    description: 'Kho vàng bí mật của tộc Piglin giữa lòng dung nham.'
  },
  {
    index: 33,
    name: 'Rương Kho Báu Cổ Đại',
    type: 'CHEST',
    icon: '🧰',
    colorHex: '#f59e0b',
    description: 'Khí Vận Minecraft • Mở rương báu vật tối thượng của thế giới ngầm!'
  },
  {
    index: 34,
    name: 'Pháo Đài Lửa Blaze',
    type: 'PROPERTY',
    icon: '🔥',
    colorGroup: 'NETHER',
    colorHex: '#ef4444',
    price: 340,
    upgradeCost: 160,
    rents: [165, 380, 780, 1260],
    description: 'Pháo đài đá Nether kiên cố canh giữ que lửa Blaze Rod.'
  },
  {
    index: 35,
    name: 'Ga Minecart Đông',
    type: 'RAILROAD',
    icon: '🛤️',
    colorHex: '#64748b',
    price: 160,
    rents: [50, 100, 200, 400],
    description: 'Tuyến đường sắt xe mỏ phía Đông • Sở hữu 1/2/3/4 ga nhận $50/$100/$200/$400.'
  },
  {
    index: 36,
    name: 'Thuế Hoàng Gia',
    type: 'ROYAL_TAX',
    icon: '👑',
    colorHex: '#eab308',
    price: 150,
    description: 'Nộp Thuế Hoàng Gia -$150 vào ngân khố Lâu Đài Trung Tâm!'
  },
  {
    index: 37,
    name: 'Quần Đảo Đá End',
    type: 'PROPERTY',
    icon: '🪐',
    colorGroup: 'END_CITY',
    colorHex: '#a855f7',
    price: 380,
    upgradeCost: 200,
    rents: [185, 420, 860, 1400],
    description: 'Vùng đất lơ lửng ngoài không gian đầy hoa Chorus.'
  },
  {
    index: 38,
    name: 'Chiến Hạm Bay Elytra',
    type: 'PROPERTY',
    icon: '🛸',
    colorGroup: 'END_CITY',
    colorHex: '#a855f7',
    price: 410,
    upgradeCost: 200,
    rents: [200, 460, 940, 1520],
    description: 'Con tàu bay huyền thoại cất giữ đôi cánh Elytra vô giá.'
  },
  {
    index: 39,
    name: 'Tháp Rồng Ender Tối Thượng',
    type: 'PROPERTY',
    icon: '🐉',
    colorGroup: 'END_CITY',
    colorHex: '#a855f7',
    price: 450,
    upgradeCost: 200,
    rents: [230, 520, 1080, 1750],
    description: 'Ô đất quyền lực và đắt giá nhất toàn bộ 40 ô trên bản đồ!'
  }
];

export const BOARD_TILES: TileConfig[] = RAW_TILES_40.map((tile) => ({
  ...tile,
  ...getPerimeterGridCoords40(tile.index)
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
    description: 'Bạn vừa đập vỡ tầng đá sâu và nhặt được Kim Cương lấp lánh! Nhận +$180.',
    goldDelta: 180
  },
  {
    id: 'emerald_trade',
    title: '💚 Giao Dịch Ngọc Lục Bảo!',
    description: 'Dân làng Hmmm rất thích nông sản của bạn và thưởng +$120.',
    goldDelta: 120
  },
  {
    id: 'golden_apple',
    title: '🍎 Nhặt Được Táo Vàng Enchant!',
    description: 'Sức mạnh tràn đầy! Nhận +$150 từ Rương Kho Báu.',
    goldDelta: 150
  },
  {
    id: 'creeper_roof',
    title: '💥 Creeper Nổ Hỏng Hàng Rào!',
    description: 'Một chú Creeper đi lạc làm bay mất góc mái nhà. Tốn -$70 sửa chữa.',
    goldDelta: -70
  },
  {
    id: 'elytra_start',
    title: '🪽 Lượn Cánh Elytra Về Ô Khởi Hành!',
    description: 'Bay thẳng về Ô Khởi Hành (#0) và nhận ngay +$200!',
    moveToTile: 0,
    goldDelta: 200
  },
  {
    id: 'totem_undying',
    title: '🗿 Totem Bất Tử Ban Phước!',
    description: 'Thần hộ mệnh trao tặng bạn +$140 dự phòng.',
    goldDelta: 140
  },
  {
    id: 'zombie_siege',
    title: '🧟 Đêm Trăng Máu Zombie!',
    description: 'Thuê Iron Golem bảo vệ ngôi làng tốn -$60.',
    goldDelta: -60
  },
  {
    id: 'netherite_ingot',
    title: '🔥 Đúc Thành Công Phôi Netherite!',
    description: 'Bán phôi Netherite quý hiếm thu về +$200!',
    goldDelta: 200
  }
];
