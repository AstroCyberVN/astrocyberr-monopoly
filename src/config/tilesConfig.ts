import { ColorGroupId, TileType } from '../core/boardData';

/**
 * Cấu hình 40 ô vuông chuẩn Cờ Tỷ Phú Bản Việt Nam (Sài Gòn - Việt Nam + Luật Quốc Tế):
 * - 22 Ô Đất (PROPERTY) chia thành 8 cụm màu chuẩn (2 - 3 - 3 - 3 - 3 - 3 - 3 - 2):
 *   1. PLAINS (Cụm Nâu - #92400e): #1 Phú Lâm ($60), #3 Nhà Bè ($60) — Nâng cấp $50
 *   2. OAK_FOREST (Cụm Xanh Lam - #38bdf8): #6 Khánh Hội ($100), #8 Bà Chiểu ($100), #9 Thị Nghè ($120) — Nâng cấp $50
 *   3. SWAMP (Cụm Hồng - #ec4899): #11 Tân Định ($140), #13 Bến Thành ($140), #14 Hòa Hưng ($160) — Nâng cấp $100
 *   4. DESERT (Cụm Cam - #f97316): #16 Gia Định ($180), #18 Chợ Lớn ($180), #19 Phú Nhuận ($200) — Nâng cấp $100
 *   5. SNOWY_PEAKS (Cụm Đỏ - #ef4444): #21 Thủ Đức ($220), #23 Tân Bình ($220), #24 Gò Vấp ($240) — Nâng cấp $150
 *   6. CHERRY_GROVE (Cụm Vàng - #eab308): #26 Vũng Tàu ($260), #27 Đà Lạt ($260), #29 Nha Trang ($280) — Nâng cấp $150
 *   7. NETHER (Cụm Xanh Lá - #22c55e): #31 Lê Lợi ($300), #32 Nguyễn Huệ ($300), #34 Đồng Khởi ($320) — Nâng cấp $200
 *   8. END_CITY (Cụm Tím Đậm - #6366f1): #37 Tân Sơn Nhất ($350), #39 Dinh Độc Lập ($400) — Nâng cấp $200
 * - 4 Bến Xe / Ga Tàu (RAILROAD): #5 Bến Xe Miền Tây, #15 Bến Xe Chợ Lớn, #25 Bến Xe Miền Đông, #35 Ga Sài Gòn ($200)
 * - 2 Công Ty Dịch Vụ (UTILITY): #12 Công Ty Điện Lực, #28 Công Ty Thủy Cục ($150)
 * - 3 Ô Khí Vận (#2, #17, #33) & 3 Ô Cơ Hội (#7, #22, #36)
 * - 2 Ô Thuế (ROYAL_TAX): #4 Thuế Lợi Tức ($200), #38 Thuế Xa Xỉ ($100)
 * - 4 Ô Góc: #0 Khởi Hành (+$200), #10 Thăm Tù / Nhà Tù Chí Hòa, #20 Bãi Đậu Xe Miễn Phí, #30 Đi Thẳng Vào Tù
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
    name: 'Khởi Hành (Bến Nhà Rồng)',
    type: 'START',
    icon: '🚩',
    colorHex: '#10b981',
    description: 'Đi qua hoặc dừng chân tại Bến Nhà Rồng nhận ngay +$200 tiền lương từ Ngân hàng!'
  },
  {
    index: 1,
    name: 'Phú Lâm',
    type: 'PROPERTY',
    icon: '🌾',
    colorGroup: 'PLAINS',
    colorHex: '#92400e',
    price: 60,
    upgradeCost: 50,
    rents: [10, 30, 90, 250],
    rentReason: 'dừng chân nghỉ ngơi và mua sắm tại khu cư xá Phú Lâm',
    description: 'Cụm Nâu (1/2) • Giá mua $60 • Xây nhà $50.'
  },
  {
    index: 2,
    name: 'Khí Vận',
    type: 'CHEST',
    icon: '🧧',
    colorHex: '#f59e0b',
    description: 'Rút 1 thẻ Khí Vận để nhận phần thưởng may mắn hoặc thực hiện mệnh lệnh!'
  },
  {
    index: 3,
    name: 'Nhà Bè',
    type: 'PROPERTY',
    icon: '🛶',
    colorGroup: 'PLAINS',
    colorHex: '#92400e',
    price: 60,
    upgradeCost: 50,
    rents: [20, 60, 180, 450],
    rentReason: 'thuê bến bãi và tham quan thương cảng sông nước Nhà Bè',
    description: 'Cụm Nâu (2/2) • Giá mua $60 • Xây nhà $50.'
  },
  {
    index: 4,
    name: 'Thuế Lợi Tức',
    type: 'ROYAL_TAX',
    icon: '🏛️',
    colorHex: '#eab308',
    price: 200,
    rentReason: 'đóng thuế lợi tức kinh doanh định kỳ vào Kho bạc Ngân hàng',
    description: 'Nộp Thuế Lợi Tức -$200 vào Ngân hàng.'
  },
  {
    index: 5,
    name: 'Bến Xe Miền Tây',
    type: 'RAILROAD',
    icon: '🚌',
    colorHex: '#64748b',
    price: 200,
    rents: [25, 50, 100, 200],
    rentReason: 'mua vé xe khách tốc hành tại Bến Xe Miền Tây',
    description: 'Bến Xe 1/4 • Sở hữu 1/2/3/4 bến thu $25/$50/$100/$200.'
  },
  {
    index: 6,
    name: 'Khánh Hội',
    type: 'PROPERTY',
    icon: '⚓',
    colorGroup: 'OAK_FOREST',
    colorHex: '#38bdf8',
    price: 100,
    upgradeCost: 50,
    rents: [30, 90, 270, 550],
    rentReason: 'lưu kho hàng hóa và qua cầu cảng Khánh Hội',
    description: 'Cụm Xanh Lam (1/3) • Giá mua $100 • Xây nhà $50.'
  },
  {
    index: 7,
    name: 'Cơ Hội',
    type: 'CHEST',
    icon: '🎲',
    colorHex: '#f97316',
    description: 'Rút 1 thẻ Cơ Hội (Tiến/lùi bước, thẻ Ra Tù Miễn Phí hoặc vận may bất ngờ)!'
  },
  {
    index: 8,
    name: 'Bà Chiểu',
    type: 'PROPERTY',
    icon: '🏮',
    colorGroup: 'OAK_FOREST',
    colorHex: '#38bdf8',
    price: 100,
    upgradeCost: 50,
    rents: [30, 90, 270, 550],
    rentReason: 'mua sắm vải vóc và ẩm thực đêm tại khu Chợ Bà Chiểu',
    description: 'Cụm Xanh Lam (2/3) • Giá mua $100 • Xây nhà $50.'
  },
  {
    index: 9,
    name: 'Thị Nghè',
    type: 'PROPERTY',
    icon: '🌉',
    colorGroup: 'OAK_FOREST',
    colorHex: '#38bdf8',
    price: 120,
    upgradeCost: 50,
    rents: [40, 100, 300, 600],
    rentReason: 'dạo phố ven kênh và thưởng thức đặc sản tại Thị Nghè',
    description: 'Cụm Xanh Lam (3/3) • Giá mua $120 • Xây nhà $50.'
  },

  // ======================== CẠNH TÂY (Ô #10 .. #19 | Giá nâng cấp nhà: $100) ========================
  {
    index: 10,
    name: 'Thăm Tù / Nhà Tù Chí Hòa',
    type: 'DESERTED_ISLAND',
    icon: '🚓',
    colorHex: '#0ea5e9',
    description: 'Đi bộ vào đây chỉ là Thăm Tù (không mất lượt). Nếu bị bắt giam từ ô #30 hoặc Đổ đôi 3 lần, bạn có thể Nộp phạt $50, Dùng thẻ Ra Tù hoặc Đổ đôi để thoát!'
  },
  {
    index: 11,
    name: 'Tân Định',
    type: 'PROPERTY',
    icon: '🌸',
    colorGroup: 'SWAMP',
    colorHex: '#ec4899',
    price: 140,
    upgradeCost: 100,
    rents: [50, 150, 450, 750],
    rentReason: 'tham quan nhà thờ hồng và khu phố sầm uất Tân Định',
    description: 'Cụm Hồng (1/3) • Giá mua $140 • Xây nhà $100.'
  },
  {
    index: 12,
    name: 'Công Ty Điện Lực',
    type: 'UTILITY',
    icon: '⚡',
    colorHex: '#ef4444',
    price: 150,
    rents: [4, 10, 10, 10],
    rentReason: 'thanh toán hóa đơn tiền điện tính theo tổng điểm xúc xắc vừa gieo',
    description: 'Công Ty Dịch Vụ 1/2 • Sở hữu 1 công ty thu 4× xúc xắc, sở hữu cả 2 thu 10× xúc xắc!'
  },
  {
    index: 13,
    name: 'Bến Thành',
    type: 'PROPERTY',
    icon: '🏛️',
    colorGroup: 'SWAMP',
    colorHex: '#ec4899',
    price: 140,
    upgradeCost: 100,
    rents: [50, 150, 450, 750],
    rentReason: 'thuê sạp thương mại trung tâm tại Chợ Bến Thành',
    description: 'Cụm Hồng (2/3) • Giá mua $140 • Xây nhà $100.'
  },
  {
    index: 14,
    name: 'Hòa Hưng',
    type: 'PROPERTY',
    icon: '🚉',
    colorGroup: 'SWAMP',
    colorHex: '#ec4899',
    price: 160,
    upgradeCost: 100,
    rents: [60, 180, 500, 900],
    rentReason: 'nghỉ chân tại khu phố thương mại sầm uất Hòa Hưng',
    description: 'Cụm Hồng (3/3) • Giá mua $160 • Xây nhà $100.'
  },
  {
    index: 15,
    name: 'Bến Xe Chợ Lớn',
    type: 'RAILROAD',
    icon: '🚌',
    colorHex: '#64748b',
    price: 200,
    rents: [25, 50, 100, 200],
    rentReason: 'di chuyển qua trạm trung chuyển Bến Xe Chợ Lớn',
    description: 'Bến Xe 2/4 • Sở hữu 1/2/3/4 bến thu $25/$50/$100/$200.'
  },
  {
    index: 16,
    name: 'Gia Định',
    type: 'PROPERTY',
    icon: '🏯',
    colorGroup: 'DESERT',
    colorHex: '#f97316',
    price: 180,
    upgradeCost: 100,
    rents: [70, 200, 550, 950],
    rentReason: 'tham quan khu di tích và phố thương mại Gia Định',
    description: 'Cụm Cam (1/3) • Giá mua $180 • Xây nhà $100.'
  },
  {
    index: 17,
    name: 'Khí Vận',
    type: 'CHEST',
    icon: '🧧',
    colorHex: '#f59e0b',
    description: 'Rút 1 thẻ Khí Vận để nhận phần thưởng may mắn hoặc thực hiện mệnh lệnh!'
  },
  {
    index: 18,
    name: 'Chợ Lớn',
    type: 'PROPERTY',
    icon: '🏮',
    colorGroup: 'DESERT',
    colorHex: '#f97316',
    price: 180,
    upgradeCost: 100,
    rents: [70, 200, 550, 950],
    rentReason: 'giao thương sỉ lẻ tại khu phố cổ Chợ Bình Tây - Chợ Lớn',
    description: 'Cụm Cam (2/3) • Giá mua $180 • Xây nhà $100.'
  },
  {
    index: 19,
    name: 'Phú Nhuận',
    type: 'PROPERTY',
    icon: '☕',
    colorGroup: 'DESERT',
    colorHex: '#f97316',
    price: 200,
    upgradeCost: 100,
    rents: [80, 220, 600, 1000],
    rentReason: 'thưởng thức cà phê sân vườn và dịch vụ cao cấp tại Phú Nhuận',
    description: 'Cụm Cam (3/3) • Giá mua $200 • Xây nhà $100.'
  },

  // ======================== CẠNH BẮC (Ô #20 .. #29 | Giá nâng cấp nhà: $150) ========================
  {
    index: 20,
    name: 'Bãi Đậu Xe Miễn Phí (Lễ Hội)',
    type: 'FESTIVAL',
    icon: '🎉',
    colorHex: '#ec4899',
    description: 'Bãi Đậu Xe Miễn Phí (Free Parking)! Dừng chân an toàn và được chọn 1 ô đất để NHÂN ĐÔI (x2) tiền thuê!'
  },
  {
    index: 21,
    name: 'Thủ Đức',
    type: 'PROPERTY',
    icon: '🏙️',
    colorGroup: 'SNOWY_PEAKS',
    colorHex: '#ef4444',
    price: 220,
    upgradeCost: 150,
    rents: [90, 250, 700, 1050],
    rentReason: 'thuê mặt bằng tại khu Đô Thị Sáng Tạo & Đại Học Quốc Gia Thủ Đức',
    description: 'Cụm Đỏ (1/3) • Giá mua $220 • Xây nhà $150.'
  },
  {
    index: 22,
    name: 'Cơ Hội',
    type: 'CHEST',
    icon: '🎲',
    colorHex: '#f97316',
    description: 'Rút 1 thẻ Cơ Hội (Tiến/lùi bước, thẻ Ra Tù Miễn Phí hoặc vận may bất ngờ)!'
  },
  {
    index: 23,
    name: 'Tân Bình',
    type: 'PROPERTY',
    icon: '✈️',
    colorGroup: 'SNOWY_PEAKS',
    colorHex: '#ef4444',
    price: 220,
    upgradeCost: 150,
    rents: [90, 250, 700, 1050],
    rentReason: 'sử dụng dịch vụ kho vận và trung tâm triển lãm Tân Bình',
    description: 'Cụm Đỏ (2/3) • Giá mua $220 • Xây nhà $150.'
  },
  {
    index: 24,
    name: 'Gò Vấp',
    type: 'PROPERTY',
    icon: '🌳',
    colorGroup: 'SNOWY_PEAKS',
    colorHex: '#ef4444',
    price: 240,
    upgradeCost: 150,
    rents: [100, 300, 750, 1100],
    rentReason: 'vui chơi giải trí và mua sắm tại đại lộ trung tâm Gò Vấp',
    description: 'Cụm Đỏ (3/3) • Giá mua $240 • Xây nhà $150.'
  },
  {
    index: 25,
    name: 'Bến Xe Miền Đông',
    type: 'RAILROAD',
    icon: '🚌',
    colorHex: '#64748b',
    price: 200,
    rents: [25, 50, 100, 200],
    rentReason: 'mua vé xe liên tỉnh tại Bến Xe Miền Đông',
    description: 'Bến Xe 3/4 • Sở hữu 1/2/3/4 bến thu $25/$50/$100/$200.'
  },
  {
    index: 26,
    name: 'Vũng Tàu',
    type: 'PROPERTY',
    icon: '🏖️',
    colorGroup: 'CHERRY_GROVE',
    colorHex: '#eab308',
    price: 260,
    upgradeCost: 150,
    rents: [110, 330, 800, 1150],
    rentReason: 'nghỉ dưỡng biệt thự biển Bãi Sau tại TP. Vũng Tàu',
    description: 'Cụm Vàng (1/3) • Giá mua $260 • Xây nhà $150.'
  },
  {
    index: 27,
    name: 'Đà Lạt',
    type: 'PROPERTY',
    icon: '🌲',
    colorGroup: 'CHERRY_GROVE',
    colorHex: '#eab308',
    price: 260,
    upgradeCost: 150,
    rents: [110, 330, 800, 1150],
    rentReason: 'nghỉ dưỡng tại dinh thự đồi thông và hồ Xuân Hương Đà Lạt',
    description: 'Cụm Vàng (2/3) • Giá mua $260 • Xây nhà $150.'
  },
  {
    index: 28,
    name: 'Công Ty Thủy Cục (Cấp Nước)',
    type: 'UTILITY',
    icon: '💧',
    colorHex: '#38bdf8',
    price: 150,
    rents: [4, 10, 10, 10],
    rentReason: 'thanh toán hóa đơn nước sạch Thủy Cục tính theo tổng điểm xúc xắc',
    description: 'Công Ty Dịch Vụ 2/2 • Sở hữu 1 công ty thu 4× xúc xắc, sở hữu cả 2 thu 10× xúc xắc!'
  },
  {
    index: 29,
    name: 'Nha Trang',
    type: 'PROPERTY',
    icon: '🏝️',
    colorGroup: 'CHERRY_GROVE',
    colorHex: '#eab308',
    price: 280,
    upgradeCost: 150,
    rents: [120, 360, 850, 1200],
    rentReason: 'nghỉ dưỡng Resort 5 sao và du thuyền vịnh biển Nha Trang',
    description: 'Cụm Vàng (3/3) • Giá mua $280 • Xây nhà $150.'
  },

  // ======================== CẠNH ĐÔNG (Ô #30 .. #39 | Giá nâng cấp nhà: $200) ========================
  {
    index: 30,
    name: 'Đi Thẳng Vào Tù',
    type: 'END_PORTAL',
    icon: '🚨',
    colorHex: '#9333ea',
    description: 'Lệnh Bắt Giam! Rơi vào ô này phải đi thẳng vào Nhà Tù Chí Hòa (#10), không được nhận tiền lương Khởi Hành!'
  },
  {
    index: 31,
    name: 'Đại Lộ Lê Lợi',
    type: 'PROPERTY',
    icon: '🏛️',
    colorGroup: 'NETHER',
    colorHex: '#22c55e',
    price: 300,
    upgradeCost: 200,
    rents: [130, 390, 900, 1275],
    rentReason: 'thuê mặt bằng thương mại hạng A trên trục Đại Lộ Lê Lợi',
    description: 'Cụm Xanh Lá (1/3) • Giá mua $300 • Xây nhà $200.'
  },
  {
    index: 32,
    name: 'Phố Đi Bộ Nguyễn Huệ',
    type: 'PROPERTY',
    icon: '⛲',
    colorGroup: 'NETHER',
    colorHex: '#22c55e',
    price: 300,
    upgradeCost: 200,
    rents: [130, 390, 900, 1275],
    rentReason: 'tổ chức sự kiện và thuê sảnh cao ốc tại Phố Đi Bộ Nguyễn Huệ',
    description: 'Cụm Xanh Lá (2/3) • Giá mua $300 • Xây nhà $200.'
  },
  {
    index: 33,
    name: 'Khí Vận',
    type: 'CHEST',
    icon: '🧧',
    colorHex: '#f59e0b',
    description: 'Rút 1 thẻ Khí Vận để nhận phần thưởng may mắn hoặc thực hiện mệnh lệnh!'
  },
  {
    index: 34,
    name: 'Đường Đồng Khởi',
    type: 'PROPERTY',
    icon: '💎',
    colorGroup: 'NETHER',
    colorHex: '#22c55e',
    price: 320,
    upgradeCost: 200,
    rents: [150, 450, 1000, 1400],
    rentReason: 'lưu trú khách sạn 5 sao Continental và mua sắm xa xỉ trên Đường Đồng Khởi',
    description: 'Cụm Xanh Lá (3/3) • Giá mua $320 • Xây nhà $200.'
  },
  {
    index: 35,
    name: 'Ga Sài Gòn',
    type: 'RAILROAD',
    icon: '🚆',
    colorHex: '#64748b',
    price: 200,
    rents: [25, 50, 100, 200],
    rentReason: 'mua vé tàu hỏa tốc hành Bắc - Nam tại Ga Sài Gòn',
    description: 'Bến Xe / Ga Tàu 4/4 • Sở hữu 1/2/3/4 bến thu $25/$50/$100/$200.'
  },
  {
    index: 36,
    name: 'Cơ Hội',
    type: 'CHEST',
    icon: '🎲',
    colorHex: '#f97316',
    description: 'Rút 1 thẻ Cơ Hội (Tiến/lùi bước, thẻ Ra Tù Miễn Phí hoặc vận may bất ngờ)!'
  },
  {
    index: 37,
    name: 'Sân Bay Tân Sơn Nhất',
    type: 'PROPERTY',
    icon: '🛫',
    colorGroup: 'END_CITY',
    colorHex: '#6366f1',
    price: 350,
    upgradeCost: 200,
    rents: [175, 500, 1100, 1500],
    rentReason: 'sử dụng phòng chờ Thương Gia VIP và bãi đỗ chuyên cơ tại Sân Bay Tân Sơn Nhất',
    description: 'Cụm Tím Đậm (1/2) • Giá mua $350 • Xây nhà $200.'
  },
  {
    index: 38,
    name: 'Thuế Xa Xỉ',
    type: 'ROYAL_TAX',
    icon: '💎',
    colorHex: '#eab308',
    price: 100,
    rentReason: 'đóng thuế tiêu thụ đặc biệt cho tài sản xa xỉ vào Ngân hàng',
    description: 'Nộp Thuế Xa Xỉ -$100 vào Kho bạc Ngân hàng.'
  },
  {
    index: 39,
    name: 'Dinh Độc Lập (Đại Lộ Bến Nghé)',
    type: 'PROPERTY',
    icon: '👑',
    colorGroup: 'END_CITY',
    colorHex: '#6366f1',
    price: 400,
    upgradeCost: 200,
    rents: [200, 600, 1400, 2000],
    rentReason: 'tham quan và tổ chức đại tiệc thượng lưu tại khu vực Dinh Độc Lập - Bến Nghé',
    description: 'Cụm Tím Đậm (2/2) • Giá mua $400 • Xây nhà $200 • Khu đất đắt giá nhất bàn cờ!'
  }
];
