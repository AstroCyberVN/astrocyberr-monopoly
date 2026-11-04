import { ColorGroupId, TileType } from '../core/boardData';

/**
 * Cấu hình từng ô vuông trên bàn cờ 40 ô (Real Monopoly Standard + Modern City x Minecraft Voxel).
 * Bạn có thể tự chỉnh sửa trực tiếp bất kỳ thông số nào dưới đây:
 * - name: Tên ô hiển thị trên mặt ô 3D và Popup
 * - type: Loại ô ('START' | 'PROPERTY' | 'CHEST' | 'DESERTED_ISLAND' | 'FESTIVAL' | 'END_PORTAL' | 'NETHER_PORTAL' | 'ROYAL_TAX' | 'RAILROAD' | 'UTILITY')
 * - icon: Biểu tượng Emoji
 * - colorGroup: Nhóm màu (dành cho ô PROPERTY)
 * - colorHex: Mã màu chủ đạo của ô
 * - price: Giá mua ô đất / bến tàu / công ty (hoặc mức thuế đối với ROYAL_TAX)
 * - upgradeCost: Chi phí nâng cấp mỗi cấp công trình (Cấp 1 -> 4)
 * - rents: Bảng giá thuê 4 cấp [Cấp 1, Cấp 2, Cấp 3, Cấp 4] (hoặc sở hữu 1..4 ga tàu)
 * - rentReason: Lý do phải trả tiền khi người chơi khác đi vào ô đất này (<lí do> hiển thị trong bảng Xác nhận thanh toán)
 * - description: Mô tả ngắn hiển thị ở cuối Popup
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
  // ======================== CẠNH NAM (Ô #0 .. #9) ========================
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
    name: 'Phố Cổ Đất Nung',
    type: 'PROPERTY',
    icon: '🧱',
    colorGroup: 'PLAINS',
    colorHex: '#84cc16',
    price: 60,
    upgradeCost: 50,
    rents: [20, 60, 180, 320],
    rentReason: 'dừng chân tham quan và mua sắm tại khu phố gốm Đất Nung cổ kính',
    description: 'Khu phố khởi nghiệp giá mềm lấy cảm hứng từ Mediterranean Avenue.'
  },
  {
    index: 2,
    name: 'Quỹ Cộng Đồng Dân Làng',
    type: 'CHEST',
    icon: '🧰',
    colorHex: '#f59e0b',
    description: 'Mở Rương Quỹ Cộng Đồng Thành Phố để nhận thưởng $ hoặc sự kiện bất ngờ!'
  },
  {
    index: 3,
    name: 'Hẻm Chợ Đêm Đá Cuội',
    type: 'PROPERTY',
    icon: '🏮',
    colorGroup: 'PLAINS',
    colorHex: '#84cc16',
    price: 60,
    upgradeCost: 50,
    rents: [25, 80, 220, 400],
    rentReason: 'thưởng thức ẩm thực đường phố và thuê sạp hàng tại Chợ Đêm Đá Cuội',
    description: 'Khu chợ đêm sầm uất bậc nhất quận Phố Cổ (Baltic Avenue).'
  },
  {
    index: 4,
    name: 'Thuế Thu Nhập Đô Thị',
    type: 'ROYAL_TAX',
    icon: '🏛️',
    colorHex: '#eab308',
    price: 200,
    rentReason: 'khai báo thuế thu nhập cá nhân định kỳ tại Tòa Thị Chính Thành Phố',
    description: 'Nộp Thuế Thu Nhập Đô Thị -$200 vào ngân sách phát triển thành phố.'
  },
  {
    index: 5,
    name: 'Ga Metro Nam (Reading)',
    type: 'RAILROAD',
    icon: '🚆',
    colorHex: '#64748b',
    price: 200,
    rents: [50, 100, 200, 400],
    rentReason: 'mua vé tàu điện cao tốc Minecart tại Ga Metro Nam',
    description: 'Tuyến Metro tốc hành phía Nam • Sở hữu 1/2/3/4 ga thu $50/$100/$200/$400.'
  },
  {
    index: 6,
    name: 'Phố Đèn Lồng Glowstone',
    type: 'PROPERTY',
    icon: '💡',
    colorGroup: 'OAK_FOREST',
    colorHex: '#22c55e',
    price: 100,
    upgradeCost: 50,
    rents: [30, 90, 270, 450],
    rentReason: 'check-in và sử dụng dịch vụ chiếu sáng tại Phố Đèn Lồng Glowstone',
    description: 'Con phố rực rỡ ánh đèn pha lê suốt đêm (Oriental Avenue).'
  },
  {
    index: 7,
    name: 'Trạm Cơ Hội Redstone',
    type: 'CHEST',
    icon: '🎲',
    colorHex: '#f59e0b',
    description: 'Rút thẻ Cơ Hội Đô Thị để thử vận may tài chính hoặc dịch chuyển nhanh!'
  },
  {
    index: 8,
    name: 'Đại Lộ Học Viện Kiến Trúc',
    type: 'PROPERTY',
    icon: '📐',
    colorGroup: 'OAK_FOREST',
    colorHex: '#22c55e',
    price: 100,
    upgradeCost: 50,
    rents: [30, 90, 270, 450],
    rentReason: 'mua vé tham quan triển lãm quy hoạch đô thị tại Học Viện Kiến Trúc',
    description: 'Trung tâm thiết kế các công trình Voxel hiện đại (Vermont Avenue).'
  },
  {
    index: 9,
    name: 'Quảng Trường Tháp Đồng Hồ',
    type: 'PROPERTY',
    icon: '🕰️',
    colorGroup: 'OAK_FOREST',
    colorHex: '#22c55e',
    price: 120,
    upgradeCost: 50,
    rents: [40, 100, 300, 500],
    rentReason: 'đỗ xe và lên đài ngắm cảnh tại Quảng Trường Tháp Đồng Hồ',
    description: 'Biểu tượng kiến trúc cổ điển giao thoa hiện đại (Connecticut Avenue).'
  },

  // ======================== CẠNH TÂY (Ô #10 .. #19) ========================
  {
    index: 10,
    name: 'Đảo Cách Ly (Trại Giam)',
    type: 'DESERTED_ISLAND',
    icon: '🏝️',
    colorHex: '#0ea5e9',
    description: 'Tạm giữ tại Đảo Cách Ly! Phải nghỉ 1 lượt để hoàn tất thủ tục hải quan.'
  },
  {
    index: 11,
    name: 'Phố Điện Ảnh St. Charles',
    type: 'PROPERTY',
    icon: '🎬',
    colorGroup: 'SWAMP',
    colorHex: '#14b8a6',
    price: 140,
    upgradeCost: 100,
    rents: [50, 150, 450, 625],
    rentReason: 'mua vé VIP xem công chiếu phim 3D tại Rạp Đại Nhạc Kịch St. Charles',
    description: 'Khu phố giải trí và rạp chiếu phim sầm uất (St. Charles Place).'
  },
  {
    index: 12,
    name: 'Tập Đoàn Điện Lực Redstone',
    type: 'UTILITY',
    icon: '⚡',
    colorHex: '#ef4444',
    price: 150,
    rents: [60, 150, 260, 400],
    rentReason: 'thanh toán hóa đơn tiêu thụ điện năng cao áp từ Lưới Điện Redstone',
    description: 'Nhà máy cung cấp năng lượng Redstone cho toàn bộ thành phố (Electric Company).'
  },
  {
    index: 13,
    name: 'Phố Triển Lãm Nghệ Thuật',
    type: 'PROPERTY',
    icon: '🎨',
    colorGroup: 'SWAMP',
    colorHex: '#14b8a6',
    price: 140,
    upgradeCost: 100,
    rents: [50, 150, 450, 625],
    rentReason: 'tham quan bảo tàng điêu khắc khối Voxel đương đại',
    description: 'Tụ điểm văn hóa nghệ thuật của giới trẻ thành phố (States Avenue).'
  },
  {
    index: 14,
    name: 'Đại Lộ Nhạc Hội Virginia',
    type: 'PROPERTY',
    icon: '🎸',
    colorGroup: 'SWAMP',
    colorHex: '#14b8a6',
    price: 160,
    upgradeCost: 100,
    rents: [60, 180, 500, 700],
    rentReason: 'thuê khu vực Lounge thưởng thức đại nhạc hội Note Block tại Virginia',
    description: 'Sân khấu âm nhạc ngoài trời sôi động suốt ngày đêm (Virginia Avenue).'
  },
  {
    index: 15,
    name: 'Ga Metro Tây (Pennsylvania)',
    type: 'RAILROAD',
    icon: '🚝',
    colorHex: '#64748b',
    price: 200,
    rents: [50, 100, 200, 400],
    rentReason: 'di chuyển bằng tàu điện trên cao tại Ga Metro Tây',
    description: 'Tuyến tàu điện xuyên tâm phía Tây • Sở hữu 1/2/3/4 ga thu $50/$100/$200/$400.'
  },
  {
    index: 16,
    name: 'Tổ Hợp Cà Phê St. James',
    type: 'PROPERTY',
    icon: '☕',
    colorGroup: 'DESERT',
    colorHex: '#f59e0b',
    price: 180,
    upgradeCost: 100,
    rents: [70, 200, 550, 750],
    rentReason: 'thưởng thức cà phê hạt Cacao rang xay thượng hạng tại St. James Lounge',
    description: 'Chuỗi cửa hàng cà phê và làm việc sang trọng (St. James Place).'
  },
  {
    index: 17,
    name: 'Quỹ Đầu Tư Đô Thị',
    type: 'CHEST',
    icon: '🧰',
    colorHex: '#f59e0b',
    description: 'Mở Rương Quỹ Đầu Tư Đô Thị để nhận cổ tức hoặc tài trợ thương mại!'
  },
  {
    index: 18,
    name: 'Phố Khởi Nghiệp Tennessee',
    type: 'PROPERTY',
    icon: '💼',
    colorGroup: 'DESERT',
    colorHex: '#f59e0b',
    price: 180,
    upgradeCost: 100,
    rents: [70, 200, 550, 750],
    rentReason: 'thuê văn phòng Co-working Space và phòng họp tại Tháp Tennessee',
    description: 'Thung lũng công nghệ và vườn ươm doanh nghiệp trẻ (Tennessee Avenue).'
  },
  {
    index: 19,
    name: 'Quảng Trường New York',
    type: 'PROPERTY',
    icon: '🏙️',
    colorGroup: 'DESERT',
    colorHex: '#f59e0b',
    price: 200,
    upgradeCost: 100,
    rents: [80, 220, 600, 800],
    rentReason: 'thuê màn hình LED quảng cáo thương hiệu tại Quảng Trường Thời Đại New York',
    description: 'Giao lộ thương mại đắt giá bậc nhất khu vực phía Tây (New York Avenue).'
  },

  // ======================== CẠNH BẮC (Ô #20 .. #29) ========================
  {
    index: 20,
    name: 'Quảng Trường Lễ Hội (Free Parking)',
    type: 'FESTIVAL',
    icon: '🎉',
    colorHex: '#ec4899',
    description: 'Đại Tiệc Lễ Hội Thành Phố! Chọn 1 ô đất của bạn để NHÂN ĐÔI (x2) tiền thuê!'
  },
  {
    index: 21,
    name: 'Đại Lộ Thể Thao Kentucky',
    type: 'PROPERTY',
    icon: '🏟️',
    colorGroup: 'SNOWY_PEAKS',
    colorHex: '#38bdf8',
    price: 220,
    upgradeCost: 150,
    rents: [90, 250, 700, 875],
    rentReason: 'mua vé kháng đài hạng Nhất xem chung kết thể thao tại Sân Vận Động Kentucky',
    description: 'Tổ hợp đấu trường thể thao hiện đại sức chứa vạn người (Kentucky Avenue).'
  },
  {
    index: 22,
    name: 'Trạm Cơ Hội Thương Thương',
    type: 'CHEST',
    icon: '🎰',
    colorHex: '#f59e0b',
    description: 'Mở thẻ Cơ Hội Thương Trường để đón sóng đầu tư bất động sản!'
  },
  {
    index: 23,
    name: 'Phố Ẩm Thực Indiana',
    type: 'PROPERTY',
    icon: '🍽️',
    colorGroup: 'SNOWY_PEAKS',
    colorHex: '#38bdf8',
    price: 220,
    upgradeCost: 150,
    rents: [90, 250, 700, 875],
    rentReason: 'dùng tiệc tối Michelin với Táo Vàng Enchant tại nhà hàng Indiana',
    description: 'Thiên đường ẩm thực 5 sao của giới thượng lưu (Indiana Avenue).'
  },
  {
    index: 24,
    name: 'Tháp Truyền Hình Illinois',
    type: 'PROPERTY',
    icon: '📡',
    colorGroup: 'SNOWY_PEAKS',
    colorHex: '#38bdf8',
    price: 240,
    upgradeCost: 150,
    rents: [100, 300, 750, 925],
    rentReason: 'lên tầng thượng Skydeck ngắm toàn cảnh đảo nổi từ Tháp Truyền Hình Illinois',
    description: 'Tòa tháp truyền thông cao nhất phía Bắc thành phố (Illinois Avenue).'
  },
  {
    index: 25,
    name: 'Ga Metro Bắc (B. & O.)',
    type: 'RAILROAD',
    icon: '🚄',
    colorHex: '#64748b',
    price: 200,
    rents: [50, 100, 200, 400],
    rentReason: 'mua vé tàu tốc hành liên quận tại Ga Metro Bắc',
    description: 'Tuyến đường sắt huyết mạch phía Bắc • Sở hữu 1/2/3/4 ga thu $50/$100/$200/$400.'
  },
  {
    index: 26,
    name: 'Bến Du Thuyền Atlantic',
    type: 'PROPERTY',
    icon: '🛥️',
    colorGroup: 'CHERRY_GROVE',
    colorHex: '#f472b6',
    price: 260,
    upgradeCost: 150,
    rents: [110, 330, 800, 975],
    rentReason: 'neo đậu du thuyền cá nhân và sử dụng dịch vụ CLB Bến Cảng Atlantic',
    description: 'Bến cảng du thuyền hạng sang bên bờ biển xanh (Atlantic Avenue).'
  },
  {
    index: 27,
    name: 'Khu Nghỉ Dưỡng Ventnor',
    type: 'PROPERTY',
    icon: '🏖️',
    colorGroup: 'CHERRY_GROVE',
    colorHex: '#f472b6',
    price: 260,
    upgradeCost: 150,
    rents: [110, 330, 800, 975],
    rentReason: 'nghỉ dưỡng cuối tuần tại khu Resort biển cao cấp Ventnor',
    description: 'Quần thể biệt thự biển và hồ bơi vô cực (Ventnor Avenue).'
  },
  {
    index: 28,
    name: 'Thủy Cục & Tháp Beacon',
    type: 'UTILITY',
    icon: '🔮',
    colorHex: '#38bdf8',
    price: 150,
    rents: [60, 150, 260, 400],
    rentReason: 'đóng phí sử dụng nước sạch và hào quang tăng tốc từ Tháp Ánh Sáng Beacon',
    description: 'Tổ hợp cấp nước đô thị kết hợp Tháp Hải Đăng Kim Cương (Water Works).'
  },
  {
    index: 29,
    name: 'Vườn Sinh Thái Marvin Gardens',
    type: 'PROPERTY',
    icon: '🌸',
    colorGroup: 'CHERRY_GROVE',
    colorHex: '#f472b6',
    price: 280,
    upgradeCost: 150,
    rents: [120, 360, 850, 1025],
    rentReason: 'tham quan khu vườn vòm kính hoa Anh Đào Sakura tại Marvin Gardens',
    description: 'Khu đô thị sinh thái xanh mát đắt khách bậc nhất (Marvin Gardens).'
  },

  // ======================== CẠNH ĐÔNG (Ô #30 .. #39) ========================
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
    colorHex: '#ef4444',
    price: 300,
    upgradeCost: 200,
    rents: [130, 390, 900, 1100],
    rentReason: 'thuê mặt bằng thương mại quốc tế tại Đại Lộ Thái Bình Dương',
    description: 'Trục đại lộ thương mại ven biển sầm uất (Pacific Avenue).'
  },
  {
    index: 32,
    name: 'Sàn Giao Dịch North Carolina',
    type: 'PROPERTY',
    icon: '📈',
    colorGroup: 'NETHER',
    colorHex: '#ef4444',
    price: 300,
    upgradeCost: 200,
    rents: [130, 390, 900, 1100],
    rentReason: 'thanh toán phí môi giới chứng khoán và lưu ký Vàng tại Sàn North Carolina',
    description: 'Trung tâm tài chính và giao dịch kim loại quý (North Carolina Avenue).'
  },
  {
    index: 33,
    name: 'Cổng Cao Tốc Nether',
    type: 'NETHER_PORTAL',
    icon: '🟣',
    colorHex: '#a855f7',
    description: 'Cổng Obsidian Nether! Nhảy vọt xuyên chiều không gian (1 bước Nether = 8 bước Overworld) kèm +$120!'
  },
  {
    index: 34,
    name: 'Tháp Ngân Hàng Pennsylvania',
    type: 'PROPERTY',
    icon: '🏦',
    colorGroup: 'NETHER',
    colorHex: '#ef4444',
    price: 320,
    upgradeCost: 200,
    rents: [150, 450, 1000, 1200],
    rentReason: 'thuê hầm két sắt bảo mật Kim Cương & Netherite tại Ngân Hàng Pennsylvania',
    description: 'Trụ sở ngân hàng trung ương kiên cố bậc nhất (Pennsylvania Avenue).'
  },
  {
    index: 35,
    name: 'Ga Tàu Siêu Tốc Đông (Short Line)',
    type: 'RAILROAD',
    icon: '🚅',
    colorHex: '#64748b',
    price: 200,
    rents: [50, 100, 200, 400],
    rentReason: 'mua vé khoang hạng Nhất trên tuyến Tàu Đệm Từ Siêu Tốc phía Đông',
    description: 'Tuyến tàu siêu tốc kết nối khu Thượng Lưu • Sở hữu 1/2/3/4 ga thu $50/$100/$200/$400.'
  },
  {
    index: 36,
    name: 'Thuế Xa Xỉ Phẩm (Luxury Tax)',
    type: 'ROYAL_TAX',
    icon: '💎',
    colorHex: '#eab308',
    price: 100,
    rentReason: 'đóng thuế tiêu thụ đặc biệt cho siêu xe Minecart và cánh Elytra mạ vàng',
    description: 'Nộp Thuế Xa Xỉ Phẩm -$100 vào Kho Bạc Thành Phố.'
  },
  {
    index: 37,
    name: 'Đồi Dinh Thự Park Place',
    type: 'PROPERTY',
    icon: '🏰',
    colorGroup: 'END_CITY',
    colorHex: '#a855f7',
    price: 350,
    upgradeCost: 200,
    rents: [175, 500, 1100, 1300],
    rentReason: 'lưu trú tại khu dinh thự tỷ phú biệt lập trên Đồi Park Place',
    description: 'Khu dinh thự siêu sang dành riêng cho giới tài phiệt (Park Place).'
  },
  {
    index: 38,
    name: 'Cảng Vũ Trụ Elytra Skyport',
    type: 'PROPERTY',
    icon: '🚀',
    colorHex: '#a855f7',
    colorGroup: 'END_CITY',
    price: 380,
    upgradeCost: 200,
    rents: [185, 550, 1200, 1400],
    rentReason: 'sử dụng đường băng cất hạ cánh chuyên cơ riêng tại Cảng Vũ Trụ Elytra',
    description: 'Tổ hợp sân bay quốc tế và trạm phóng tàu không gian hiện đại.'
  },
  {
    index: 39,
    name: 'Đại Lộ Kim Cương Boardwalk',
    type: 'PROPERTY',
    icon: '👑',
    colorGroup: 'END_CITY',
    colorHex: '#a855f7',
    price: 400,
    upgradeCost: 200,
    rents: [200, 600, 1400, 1700],
    rentReason: 'nghỉ dưỡng tại Penthouse Hoàng Gia đắt giá nhất thành phố trên Đại Lộ Boardwalk',
    description: 'Bất động sản quyền lực và đắt giá nhất toàn bộ bàn cờ 40 ô (Boardwalk)!'
  }
];
