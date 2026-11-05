import { ColorGroupId, TileType } from '../core/boardData';

/**
 * Cấu hình 40 ô vuông chuẩn Monopoly Quốc Tế (Wikipedia Standard 40-Tile Layout + Minecraft Voxel):
 * - 22 Ô Đất (PROPERTY) chia thành 8 cụm màu chuẩn (2 - 3 - 3 - 3 - 3 - 3 - 3 - 2):
 *   1. PLAINS (Brown - #92400e): Ô #1 ($60), #3 ($60) — Giá xây nhà $50
 *   2. OAK_FOREST (Light Blue - #38bdf8): Ô #6 ($100), #8 ($100), #9 ($120) — Giá xây nhà $50
 *   3. SWAMP (Pink - #ec4899): Ô #11 ($140), #13 ($140), #14 ($160) — Giá xây nhà $100
 *   4. DESERT (Orange - #f97316): Ô #16 ($180), #18 ($180), #19 ($200) — Giá xây nhà $100
 *   5. SNOWY_PEAKS (Red - #ef4444): Ô #21 ($220), #23 ($220), #24 ($240) — Giá xây nhà $150
 *   6. CHERRY_GROVE (Yellow - #eab308): Ô #26 ($260), #27 ($260), #29 ($280) — Giá xây nhà $150
 *   7. NETHER (Green - #22c55e): Ô #31 ($300), #32 ($300), #34 ($320) — Giá xây nhà $200
 *   8. END_CITY (Dark Blue - #6366f1): Ô #37 ($350), #39 ($400) — Giá xây nhà $200
 * - 4 Tuyến Đường Sắt (RAILROAD): Ô #5, #15, #25, #35 ($200 — Thuê $25 / $50 / $100 / $200 theo số ga sở hữu)
 * - 2 Công Ty Tiện Ích (UTILITY): Ô #12 Điện Lực, #28 Thủy Cục ($150 — Thuê = Điểm Xúc Xắc × 4 hoặc × 10)
 * - 6 Ô Rương Cộng Đồng & Khí Vận (CHEST): Ô #2, #7, #17, #22, #33, #36
 * - 2 Ô Thuế (ROYAL_TAX): Ô #4 Thuế Thu Nhập ($200), Ô #38 Thuế Xa Xỉ ($100)
 * - 4 Ô Góc: Ô #0 GO (+$200), Ô #10 Đảo Cách Ly (Jail), Ô #20 Lễ Hội (Free Parking), Ô #30 Cổng The End
 */
export interface RawTileConfigItem {
  index: number;
  name: string;
  type: TileType;
  icon: string;
  colorGroup?: ColorGroupId;
  colorHex: string;
  price?: number;
  upgradeCost?: number;
  rents?: [number, number, number, number];
  rentReason?: string;
  description: string;
}

export const TILES_CONFIG_40: RawTileConfigItem[] = [
  // ======================== CẠNH NAM (Ô #0 .. #9 | Giá nâng cấp nhà: $50) ========================
  {
    index: 0,
    name: 'Đại Lộ Khởi Hành (GO)',
    type: 'START',
    icon: '🚩',
    colorHex: '#10b981',
    description: 'Đi qua hoặc dừng lại nhận ngay +$200 trợ cấp kiến thiết Đô Thị Voxel!'
  },
  {
    index: 1,
    name: 'Phố Cổ Đất Nung (Mediterranean)',
    type: 'PROPERTY',
    icon: '🧱',
    colorGroup: 'PLAINS',
    colorHex: '#92400e',
    price: 60,
    upgradeCost: 50,
    rents: [10, 30, 90, 250],
    rentReason: 'dừng chân tham quan và mua sắm tại khu phố gốm Đất Nung cổ kính',
    description: 'Cụm Nâu (1/2) • Giá $60 • Nâng cấp $50 (Mediterranean Avenue).'
  },
  {
    index: 2,
    name: 'Quỹ Cộng Đồng Dân Làng',
    type: 'CHEST',
    icon: '🧰',
    colorHex: '#f59e0b',
    description: 'Mở Rương Quỹ Cộng Đồng (Community Chest) để nhận thưởng $ hoặc sự kiện bất ngờ!'
  },
  {
    index: 3,
    name: 'Hẻm Chợ Đêm Đá Cuội (Baltic)',
    type: 'PROPERTY',
    icon: '🏮',
    colorGroup: 'PLAINS',
    colorHex: '#92400e',
    price: 60,
    upgradeCost: 50,
    rents: [20, 60, 180, 450],
    rentReason: 'thưởng thức ẩm thực đường phố và thuê sạp hàng tại Chợ Đêm Đá Cuội',
    description: 'Cụm Nâu (2/2) • Giá $60 • Nâng cấp $50 (Baltic Avenue).'
  },
  {
    index: 4,
    name: 'Thuế Thu Nhập Đô Thị (Income Tax)',
    type: 'ROYAL_TAX',
    icon: '🏛️',
    colorHex: '#eab308',
    price: 200,
    rentReason: 'khai báo thuế thu nhập cá nhân định kỳ tại Tòa Thị Chính Thành Phố',
    description: 'Nộp Thuế Thu Nhập (Income Tax) -$200 vào ngân sách thành phố.'
  },
  {
    index: 5,
    name: 'Ga Đường Sắt Reading',
    type: 'RAILROAD',
    icon: '🚂',
    colorHex: '#64748b',
    price: 200,
    rents: [25, 50, 100, 200],
    rentReason: 'mua vé tàu điện cao tốc Minecart tại Ga Đường Sắt Reading',
    description: 'Tuyến Đường Sắt 1/4 • Sở hữu 1/2/3/4 ga thu $25/$50/$100/$200.'
  },
  {
    index: 6,
    name: 'Phố Đèn Lồng Glowstone (Oriental)',
    type: 'PROPERTY',
    icon: '💡',
    colorGroup: 'OAK_FOREST',
    colorHex: '#38bdf8',
    price: 100,
    upgradeCost: 50,
    rents: [30, 90, 270, 550],
    rentReason: 'check-in và sử dụng dịch vụ chiếu sáng tại Phố Đèn Lồng Glowstone',
    description: 'Cụm Xanh Lam Nhạt (1/3) • Giá $100 • Nâng cấp $50 (Oriental Avenue).'
  },
  {
    index: 7,
    name: 'Trạm Cơ Hội Redstone (Chance)',
    type: 'CHEST',
    icon: '🎲',
    colorHex: '#f59e0b',
    description: 'Rút thẻ Cơ Hội (Chance) để thử vận may tài chính hoặc dịch chuyển nhanh!'
  },
  {
    index: 8,
    name: 'Đại Lộ Học Viện Vermont',
    type: 'PROPERTY',
    icon: '📐',
    colorGroup: 'OAK_FOREST',
    colorHex: '#38bdf8',
    price: 100,
    upgradeCost: 50,
    rents: [30, 90, 270, 550],
    rentReason: 'mua vé tham quan triển lãm quy hoạch đô thị tại Học Viện Vermont',
    description: 'Cụm Xanh Lam Nhạt (2/3) • Giá $100 • Nâng cấp $50 (Vermont Avenue).'
  },
  {
    index: 9,
    name: 'Quảng Trường Tháp Đồng Hồ (Connecticut)',
    type: 'PROPERTY',
    icon: '🕰️',
    colorGroup: 'OAK_FOREST',
    colorHex: '#38bdf8',
    price: 120,
    upgradeCost: 50,
    rents: [40, 100, 300, 600],
    rentReason: 'đỗ xe và lên đài ngắm cảnh tại Quảng Trường Tháp Đồng Hồ Connecticut',
    description: 'Cụm Xanh Lam Nhạt (3/3) • Giá $120 • Nâng cấp $50 (Connecticut Avenue).'
  },

  // ======================== CẠNH TÂY (Ô #10 .. #19 | Giá nâng cấp nhà: $100) ========================
  {
    index: 10,
    name: 'Đảo Cách Ly (Jail)',
    type: 'DESERTED_ISLAND',
    icon: '🏝️',
    colorHex: '#0ea5e9',
    description: 'Tạm giữ tại Đảo Cách Ly (Jail)! Nghỉ 1 lượt (hoặc bị chuyển tới khi đổ đôi 3 lần liên tiếp).'
  },
  {
    index: 11,
    name: 'Phố Điện Ảnh St. Charles',
    type: 'PROPERTY',
    icon: '🎬',
    colorGroup: 'SWAMP',
    colorHex: '#ec4899',
    price: 140,
    upgradeCost: 100,
    rents: [50, 150, 450, 750],
    rentReason: 'mua vé VIP xem công chiếu phim 3D tại Rạp Đại Nhạc Kịch St. Charles',
    description: 'Cụm Hồng (1/3) • Giá $140 • Nâng cấp $100 (St. Charles Place).'
  },
  {
    index: 12,
    name: 'Công Ty Điện Lực Redstone (Electric Co.)',
    type: 'UTILITY',
    icon: '⚡',
    colorHex: '#ef4444',
    price: 150,
    rents: [4, 10, 10, 10],
    rentReason: 'thanh toán hóa đơn điện năng Redstone tính theo chỉ số xúc xắc',
    description: 'Công Ty Tiện Ích 1/2 • Sở hữu 1 công ty thu 4× xúc xắc, sở hữu cả 2 thu 10× xúc xắc!'
  },
  {
    index: 13,
    name: 'Phố Triển Lãm Nghệ Thuật (States)',
    type: 'PROPERTY',
    icon: '🎨',
    colorGroup: 'SWAMP',
    colorHex: '#ec4899',
    price: 140,
    upgradeCost: 100,
    rents: [50, 150, 450, 750],
    rentReason: 'tham quan bảo tàng điêu khắc khối Voxel đương đại tại States Avenue',
    description: 'Cụm Hồng (2/3) • Giá $140 • Nâng cấp $100 (States Avenue).'
  },
  {
    index: 14,
    name: 'Đại Lộ Nhạc Hội Virginia',
    type: 'PROPERTY',
    icon: '🎸',
    colorGroup: 'SWAMP',
    colorHex: '#ec4899',
    price: 160,
    upgradeCost: 100,
    rents: [60, 180, 500, 900],
    rentReason: 'thuê khu vực Lounge thưởng thức đại nhạc hội Note Block tại Virginia',
    description: 'Cụm Hồng (3/3) • Giá $160 • Nâng cấp $100 (Virginia Avenue).'
  },
  {
    index: 15,
    name: 'Ga Đường Sắt Pennsylvania',
    type: 'RAILROAD',
    icon: '🚝',
    colorHex: '#64748b',
    price: 200,
    rents: [25, 50, 100, 200],
    rentReason: 'di chuyển bằng tàu điện trên cao tại Ga Đường Sắt Pennsylvania',
    description: 'Tuyến Đường Sắt 2/4 • Sở hữu 1/2/3/4 ga thu $25/$50/$100/$200.'
  },
  {
    index: 16,
    name: 'Tổ Hợp Cà Phê St. James',
    type: 'PROPERTY',
    icon: '☕',
    colorGroup: 'DESERT',
    colorHex: '#f97316',
    price: 180,
    upgradeCost: 100,
    rents: [70, 200, 550, 950],
    rentReason: 'thưởng thức cà phê hạt Cacao rang xay thượng hạng tại St. James Place',
    description: 'Cụm Cam (1/3) • Giá $180 • Nâng cấp $100 (St. James Place).'
  },
  {
    index: 17,
    name: 'Quỹ Đầu Tư Cộng Đồng',
    type: 'CHEST',
    icon: '🧰',
    colorHex: '#f59e0b',
    description: 'Mở Rương Quỹ Cộng Đồng (Community Chest) để nhận cổ tức hoặc tài trợ thương mại!'
  },
  {
    index: 18,
    name: 'Phố Khởi Nghiệp Tennessee',
    type: 'PROPERTY',
    icon: '💼',
    colorGroup: 'DESERT',
    colorHex: '#f97316',
    price: 180,
    upgradeCost: 100,
    rents: [70, 200, 550, 950],
    rentReason: 'thuê văn phòng Co-working Space và phòng họp tại Tháp Tennessee',
    description: 'Cụm Cam (2/3) • Giá $180 • Nâng cấp $100 (Tennessee Avenue).'
  },
  {
    index: 19,
    name: 'Quảng Trường New York',
    type: 'PROPERTY',
    icon: '🏙️',
    colorGroup: 'DESERT',
    colorHex: '#f97316',
    price: 200,
    upgradeCost: 100,
    rents: [80, 220, 600, 1000],
    rentReason: 'thuê màn hình LED quảng cáo thương hiệu tại Quảng Trường New York',
    description: 'Cụm Cam (3/3) • Giá $200 • Nâng cấp $100 (New York Avenue).'
  },

  // ======================== CẠNH BẮC (Ô #20 .. #29 | Giá nâng cấp nhà: $150) ========================
  {
    index: 20,
    name: 'Quảng Trường Lễ Hội (Free Parking)',
    type: 'FESTIVAL',
    icon: '🎉',
    colorHex: '#ec4899',
    description: 'Trạm Dừng Lễ Hội (Free Parking)! Chọn 1 ô đất của bạn để NHÂN ĐÔI (x2) tiền thuê!'
  },
  {
    index: 21,
    name: 'Đại Lộ Thể Thao Kentucky',
    type: 'PROPERTY',
    icon: '🏟️',
    colorGroup: 'SNOWY_PEAKS',
    colorHex: '#ef4444',
    price: 220,
    upgradeCost: 150,
    rents: [90, 250, 700, 1050],
    rentReason: 'mua vé khán đài hạng Nhất xem chung kết thể thao tại Sân Vận Động Kentucky',
    description: 'Cụm Đỏ (1/3) • Giá $220 • Nâng cấp $150 (Kentucky Avenue).'
  },
  {
    index: 22,
    name: 'Trạm Cơ Hội Phương Bắc (Chance)',
    type: 'CHEST',
    icon: '🎰',
    colorHex: '#f59e0b',
    description: 'Mở thẻ Cơ Hội (Chance) để đón sóng đầu tư bất động sản!'
  },
  {
    index: 23,
    name: 'Phố Ẩm Thực Indiana',
    type: 'PROPERTY',
    icon: '🍽️',
    colorGroup: 'SNOWY_PEAKS',
    colorHex: '#ef4444',
    price: 220,
    upgradeCost: 150,
    rents: [90, 250, 700, 1050],
    rentReason: 'dùng tiệc tối Michelin với Táo Vàng Enchant tại nhà hàng Indiana',
    description: 'Cụm Đỏ (2/3) • Giá $220 • Nâng cấp $150 (Indiana Avenue).'
  },
  {
    index: 24,
    name: 'Tháp Truyền Hình Illinois',
    type: 'PROPERTY',
    icon: '📡',
    colorGroup: 'SNOWY_PEAKS',
    colorHex: '#ef4444',
    price: 240,
    upgradeCost: 150,
    rents: [100, 300, 750, 1100],
    rentReason: 'lên tầng thượng Skydeck ngắm toàn cảnh đảo nổi từ Tháp Truyền Hình Illinois',
    description: 'Cụm Đỏ (3/3) • Giá $240 • Nâng cấp $150 (Illinois Avenue).'
  },
  {
    index: 25,
    name: 'Ga Đường Sắt B. & O.',
    type: 'RAILROAD',
    icon: '🚄',
    colorHex: '#64748b',
    price: 200,
    rents: [25, 50, 100, 200],
    rentReason: 'mua vé tàu tốc hành liên quận tại Ga Đường Sắt B. & O.',
    description: 'Tuyến Đường Sắt 3/4 • Sở hữu 1/2/3/4 ga thu $25/$50/$100/$200.'
  },
  {
    index: 26,
    name: 'Bến Du Thuyền Atlantic',
    type: 'PROPERTY',
    icon: '🛥️',
    colorGroup: 'CHERRY_GROVE',
    colorHex: '#eab308',
    price: 260,
    upgradeCost: 150,
    rents: [110, 330, 800, 1150],
    rentReason: 'neo đậu du thuyền cá nhân và sử dụng dịch vụ CLB Bến Cảng Atlantic',
    description: 'Cụm Vàng (1/3) • Giá $260 • Nâng cấp $150 (Atlantic Avenue).'
  },
  {
    index: 27,
    name: 'Khu Nghỉ Dưỡng Ventnor',
    type: 'PROPERTY',
    icon: '🏖️',
    colorGroup: 'CHERRY_GROVE',
    colorHex: '#eab308',
    price: 260,
    upgradeCost: 150,
    rents: [110, 330, 800, 1150],
    rentReason: 'nghỉ dưỡng cuối tuần tại khu Resort biển cao cấp Ventnor',
    description: 'Cụm Vàng (2/3) • Giá $260 • Nâng cấp $150 (Ventnor Avenue).'
  },
  {
    index: 28,
    name: 'Thủy Cục Đô Thị (Water Works)',
    type: 'UTILITY',
    icon: '💧',
    colorHex: '#38bdf8',
    price: 150,
    rents: [4, 10, 10, 10],
    rentReason: 'đóng phí sử dụng nước sạch đô thị tính theo chỉ số xúc xắc',
    description: 'Công Ty Tiện Ích 2/2 • Sở hữu 1 công ty thu 4× xúc xắc, sở hữu cả 2 thu 10× xúc xắc!'
  },
  {
    index: 29,
    name: 'Vườn Sinh Thái Marvin Gardens',
    type: 'PROPERTY',
    icon: '🌸',
    colorGroup: 'CHERRY_GROVE',
    colorHex: '#eab308',
    price: 280,
    upgradeCost: 150,
    rents: [120, 360, 850, 1200],
    rentReason: 'tham quan khu vườn vòm kính hoa Anh Đào Sakura tại Marvin Gardens',
    description: 'Cụm Vàng (3/3) • Giá $280 • Nâng cấp $150 (Marvin Gardens).'
  },

  // ======================== CẠNH ĐÔNG (Ô #30 .. #39 | Giá nâng cấp nhà: $200) ========================
  {
    index: 30,
    name: 'Cổng Dịch Chuyển The End',
    type: 'END_PORTAL',
    icon: '🌌',
    colorHex: '#9333ea',
    description: 'Cổng Không Gian 12 Khung End Portal! Bay tức thời tới bất kỳ ô nào trên bàn cờ!'
  },
  {
    index: 31,
    name: 'Đại Lộ Thái Bình Dương (Pacific)',
    type: 'PROPERTY',
    icon: '🌴',
    colorGroup: 'NETHER',
    colorHex: '#22c55e',
    price: 300,
    upgradeCost: 200,
    rents: [130, 390, 900, 1275],
    rentReason: 'thuê mặt bằng thương mại quốc tế tại Đại Lộ Thái Bình Dương',
    description: 'Cụm Xanh Lá (1/3) • Giá $300 • Nâng cấp $200 (Pacific Avenue).'
  },
  {
    index: 32,
    name: 'Sàn Giao Dịch North Carolina',
    type: 'PROPERTY',
    icon: '📈',
    colorGroup: 'NETHER',
    colorHex: '#22c55e',
    price: 300,
    upgradeCost: 200,
    rents: [130, 390, 900, 1275],
    rentReason: 'thanh toán phí môi giới chứng khoán và lưu ký Vàng tại Sàn North Carolina',
    description: 'Cụm Xanh Lá (2/3) • Giá $300 • Nâng cấp $200 (North Carolina Avenue).'
  },
  {
    index: 33,
    name: 'Quỹ Cộng Đồng Hoàng Gia',
    type: 'CHEST',
    icon: '🧰',
    colorHex: '#f59e0b',
    description: 'Mở Rương Quỹ Cộng Đồng (Community Chest) khu Thượng Lưu để nhận cổ tức lớn!'
  },
  {
    index: 34,
    name: 'Tháp Ngân Hàng Pennsylvania',
    type: 'PROPERTY',
    icon: '🏦',
    colorGroup: 'NETHER',
    colorHex: '#22c55e',
    price: 320,
    upgradeCost: 200,
    rents: [150, 450, 1000, 1400],
    rentReason: 'thuê hầm két sắt bảo mật Kim Cương & Netherite tại Ngân Hàng Pennsylvania',
    description: 'Cụm Xanh Lá (3/3) • Giá $320 • Nâng cấp $200 (Pennsylvania Avenue).'
  },
  {
    index: 35,
    name: 'Ga Tàu Cao Tốc Short Line',
    type: 'RAILROAD',
    icon: '🚅',
    colorHex: '#64748b',
    price: 200,
    rents: [25, 50, 100, 200],
    rentReason: 'mua vé khoang hạng Nhất trên tuyến Tàu Đệm Từ Short Line',
    description: 'Tuyến Đường Sắt 4/4 • Sở hữu 1/2/3/4 ga thu $25/$50/$100/$200.'
  },
  {
    index: 36,
    name: 'Trạm Cơ Hội Thượng Lưu (Chance)',
    type: 'CHEST',
    icon: '🎲',
    colorHex: '#f59e0b',
    description: 'Rút thẻ Cơ Hội (Chance) khu Thượng Lưu với phần thưởng và biến động lớn!'
  },
  {
    index: 37,
    name: 'Đồi Dinh Thự Park Place',
    type: 'PROPERTY',
    icon: '🏰',
    colorGroup: 'END_CITY',
    colorHex: '#6366f1',
    price: 350,
    upgradeCost: 200,
    rents: [175, 500, 1100, 1500],
    rentReason: 'lưu trú tại khu dinh thự tỷ phú biệt lập trên Đồi Park Place',
    description: 'Cụm Xanh Đậm (1/2) • Giá $350 • Nâng cấp $200 (Park Place).'
  },
  {
    index: 38,
    name: 'Thuế Xa Xỉ Phẩm (Luxury Tax)',
    type: 'ROYAL_TAX',
    icon: '💎',
    colorHex: '#eab308',
    price: 100,
    rentReason: 'đóng thuế tiêu thụ đặc biệt cho siêu xe Minecart và cánh Elytra mạ vàng',
    description: 'Nộp Thuế Xa Xỉ Phẩm (Luxury Tax) -$100 vào Kho Bạc Thành Phố.'
  },
  {
    index: 39,
    name: 'Đại Lộ Kim Cương Boardwalk',
    type: 'PROPERTY',
    icon: '👑',
    colorGroup: 'END_CITY',
    colorHex: '#6366f1',
    price: 400,
    upgradeCost: 200,
    rents: [200, 600, 1400, 2000],
    rentReason: 'nghỉ dưỡng tại Penthouse Hoàng Gia đắt giá nhất thành phố trên Đại Lộ Boardwalk',
    description: 'Cụm Xanh Đậm (2/2) • Giá $400 • Nâng cấp $200 (Boardwalk)!'
  }
];
