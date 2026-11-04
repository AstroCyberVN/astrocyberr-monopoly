# 🎲 AstroCyberr Monopoly — Bản Thiết Kế Hệ Thống (3D Voxel Minecraft Chibi Monopoly)

> **Dự án**: `astrocyberr-monopoly` (`c:\Users\NHAT\Downloads\astrocyberr-monopoly`)
> **Phương án công nghệ**: **Phương án 1 (`Three.js + TypeScript + Vite + GSAP + WebAudio Synth`)**
> **Tích hợp công cụ ngoài**: `Blockbench` (`blockbench-models/*.bbmodel`) & `vercel-labs/agent-desktop`
> **Bộ kỹ năng áp dụng**: `brainstorming`, `/grill-me`, `agency-game-designer`, `agency-game-audio-engineer`, `agency-ui-designer`, `agency-ux-architect`, `agency-ai-engineer`, `agency-data-engineer`

---

## 1. Tầm Nhìn & Trải Nghiệm Cốt Lõi (Game Design Document — `agency-game-designer`)

**AstroCyberr Monopoly** là tựa game **Cờ Tỷ Phú 3D Voxel siêu dễ thương** lấy cảm hứng từ thế giới **Minecraft Chibi**, hỗ trợ từ **1 đến 4 người chơi** (1 Người + 3 Bot AI chiến thuật, 2–4 Người chung máy Pass & Play, hoặc Đồng bộ phòng chơi Online đa tab/WebRTC).

### 1.1. Sơ Đồ Bàn Cờ 3D Đảo Nổi 28 Ô (`8x8 Perimeter Ring`)
Bàn cờ là một **hòn đảo nổi 3D hình vuông** nằm giữa mặt nước xanh pastel dập dềnh sóng vỗ, chính giữa đảo là thảm cỏ xanh, cây sồi/anh đào vuông kiểu Minecraft, thác nước nhỏ và các đám mây vuông trôi lơ lửng.
Chu vi bàn cờ gồm **28 ô vuông** (`indices 0..27`, mỗi cạnh 8 ô tính cả góc = $4 \times 7 = 28$ ô):

- **4 Ô Góc Đặc Biệt (`0, 7, 14, 21`)**:
  - **Ô `0` — 🚩 Khởi Hành (`START`)**: Đi qua hoặc dừng lại nhận ngay **`+200 Vàng`**.
  - **Ô `7` — 🏝️ Đảo Hoang (`DESERTED_ISLAND`)**: Dừng tại đây phải **nghỉ 1 lượt** ngắm biển (hoặc trả `50 Vàng` thuê thuyền thoát đảo ngay).
  - **Ô `14` — 🎉 Lễ Hội Làng (`FESTIVAL`)**: Tổ chức đại tiệc! Người chơi được chọn **1 ô đất của mình để nhân đôi (`x2`) tiền thuê đất**ĩnh viễn trong ván đấu.
  - **Ô `21` — 🌌 Cổng Dịch Chuyển The End (`END_PORTAL`)**: Thiết kế chuẩn khung **End Portal Frame** + mắt Ender và mặt cổng tím phát sáng. Dừng tại đây được **chọn bay tức thời tới bất kỳ ô nào trên bàn cờ**!
- **16 Ô Đất Theo 8 Cụm Màu Biome Minecraft (`PROPERTY` — mỗi cụm 2 ô)**:
  - **Cụm 1 — Đồng Cỏ (`Plains` - `#84cc16`)**: Ô `1` (*Thung Lũng Cỏ Non*), Ô `2` (*Đồi Hoa Bồ Công Anh*)
  - **Cụm 2 — Rừng Gỗ Sồi (`Oak Forest` - `#22c55e`)**: Ô `4` (*Làng Thợ Mộc*), Ô `6` (*Rừng Sồi Cổ Thụ*)
  - **Cụm 3 — Đầm Lầy Đom Đóm (`Swamp` - `#14b8a6`)**: Ô `8` (*Đầm Lầy Slime*), Ô `9` (*Chòi Phù Thủy*)
  - **Cụm 4 — Sa Mạc Vàng (`Desert` - `#f59e0b`)**: Ô `11` (*Ốc Đảo Xương Rồng*), Ô `13` (*Kim Tự Tháp Cát*)
  - **Cụm 5 — Núi Tuyết Pha Lê (`Snowy Peaks` - `#38bdf8`)**: Ô `15` (*Đỉnh Băng Vĩnh Cửu*), Ô `16` (*Làng Tuyết Igloo*)
  - **Cụm 6 — Rừng Anh Đào (`Cherry Grove` - `#f472b6`)**: Ô `18` (*Đồi Hoa Anh Đào*), Ô `20` (*Suối Tiên Hồng*)
  - **Cụm 7 — Pháo Đài Nether (`Nether` - `#ef4444`)**: Ô `22` (*Rừng Nấm Đỏ Crimson*), Ô `23` (*Pháo Đài Blaze*)
  - **Cụm 8 — Thành Phố The End (`End City` - `#a855f7`)**: Ô `25` (*Đảo Đá End*), Ô `27` (*Tháp Rồng Ender*)
- **4 Ô Đường Sắt Minecart (`RAILROAD` — ở chính giữa 4 cạnh: `3, 10, 17, 24`)**:
  - *Ga Minecart Đông (`3`), Ga Minecart Nam (`10`), Ga Minecart Tây (`17`), Ga Minecart Bắc (`24`)*. Sở hữu `1/2/3/4` ga nhận tiền thuê tăng theo cấp số nhân (`50 / 100 / 200 / 400 Vàng`).
- **3 Ô Rương Kho Báu / Khí Vận Minecraft (`CHEST` — `5, 12, 19`)**:
  - Đặt mô hình **Rương Gỗ Minecraft 3D** có nắp mở ra kèm hiệu ứng hạt vàng, bốc ngẫu nhiên 1 trong 12 thẻ Khí Vận Minecraft (*Nhặt được Kim Cương `+150G`, Creeper nổ hỏng mái nhà `-60G`, Dân Làng tặng Ngọc Lục Bảo `+100G`, Cưỡi Elytra bay tới Ô Khởi Hành `+200G`, v.v.*).
- **1 Ô Thuế Hoàng Gia (`ROYAL_TAX` — `26`)**:
  - Nộp ngân khố Hoàng Gia **`120 Vàng`** (hoặc `10%` tổng tài sản).

### 1.2. Hệ Thống 4 Cấp Công Trình Mọc Nảy Lùn Phùn (`Building Progression`)
Khi người chơi mua đất hoặc nâng cấp trên 16 Ô Đất:
- **Cấp 1 (`Level 1`) — 🪵 Cọc Rào Gỗ (`Wooden Fence`)**: Hàng rào gỗ sồi cắm xung quanh ô đất.
- **Cấp 2 (`Level 2`) — 🏠 Nhà Gỗ Minecraft (`Oak Cottage`)**: Ngôi nhà gỗ mái dốc ấm cúng có cửa sổ phát sáng.
- **Cấp 3 (`Level 3`) — 🏡 Biệt Thự 2 Tầng (`Two-Story Villa`)**: Biệt thự đá/gỗ 2 tầng có ban công và ống khói.
- **Cấp 4 (`Level 4`) — 🏰 Lâu Đài Vương Miện (`Crown Castle`)**: Lâu đài 4 tháp canh kèm **Vương miện vàng xoay lơ lửng** trên đỉnh.
- **Hiệu ứng 3D**: Mỗi khi nâng cấp, công trình cũ thu nhỏ biến mất và công trình mới **mọc nảy lùn phùn từ mặt đất lên** (`Elastic.easeOut` scale từ `0.01 -> 1.25 -> 1.0`) kèm hạt bụi lấp lánh.
- **Thưởng Cụm Màu (`Monopoly Set Bonus`)**: Sở hữu trọn bộ 2 ô cùng màu giúp nhân **`1.5x`** tiền thuê cơ bản!

---

## 2. 4 Nhân Vật Minecraft Chibi 3D & Hiệu Ứng Di Chuyển Đặc Trưng

Tất cả 4 nhân vật được thiết kế theo tỉ lệ **Chibi dễ thương**: **Đầu vuông to `1.2x`** (`0.55 x 0.55 x 0.55`), **thân nhỏ gọn** (`0.34 x 0.38 x 0.20`), **tay chân ngắn mũm mĩm** gắn khớp xoay (`Pivot Group`) ở vai và hông, kèm texture Pixel Art vẽ trực tiếp bằng `CanvasTexture` sắc nét (`THREE.NearestFilter`) VÀ xuất sẵn bộ file gốc `.bbmodel` trong thư mục `blockbench-models/` để chỉnh sửa bằng **Blockbench**:

| Nhân vật | Ngoại hình Chibi Voxel | Hiệu ứng di chuyển từng ô đặc trưng (`Unique Step Locomotion`) |
| :--- | :--- | :--- |
| **1. `Steve`** | Đầu vuông tóc nâu, áo xanh cyan, quần tím xanh | **Đi bộ / Nhảy lò cò Parabol**: Nhảy theo đường cong Parabol sang ô tiếp theo, vung tay chân ngược chiều (`±0.65 rad`), chạm đất nhún dẹt **`Squash & Stretch`** (`scaleY: 0.72 -> 1.15 -> 1.0`) + bốc **hạt bụi trắng** dưới chân. |
| **2. `Alex`** | Đầu vuông tóc cam tết lệch, áo xanh lá, quần nâu | **Đi bộ / Nhảy lò cò Parabol uyển chuyển**: Tương tự Steve nhưng nhịp nhún nảy cao hơn một chút, vung tay chân ngược chiều + **`Squash & Stretch`** + bốc **hạt bụi trắng ánh hồng/lá** dưới chân. |
| **3. `Creeper`** | Đầu vuông xanh lá pixel Creeper đặc trưng, thân ngắn, 4 chân ngắn | **Phát Nổ TNT & Hồi Sinh (`TNT Explosion Step`)**: Trước mỗi bước, Creeper **phồng to người (`scale: 1.35x`) và nhấp nháy trắng** kèm tiếng xì ngòi nổ, sau đó **phát nổ BÙM như khối TNT** (tung hạt lửa cam/trắng/khói đen) biến mất tại ô cũ và **hồi sinh nảy lên tại ô tiếp theo**! |
| **4. `Enderman`** | Đầu vuông đen mắt tím phát sáng (`Emissive`), thân đen mảnh Chibi | **Dịch Chuyển Hạt Tím (`Ender Teleport Step`)**: Không đi bộ! Mỗi bước di chuyển, Enderman co nhẹ rồi **biến mất trong chớp tím**, để lại luồng **hạt cổng không gian màu tím (`#a855f7` / `#d8b4fe`)** tại ô cũ và **xuất hiện tức thời tại ô tiếp theo** kèm vòng xoáy hạt tím! |

---

## 3. Xúc Xắc 3D Vật Lý & Camera Điện Ảnh (`Dynamic Cinema Camera`)

1. **Xúc Xắc 3D Vật Lý (`Dice3D`)**:
   - Gồm 2 khối xúc xắc vuông bo góc màu kem/trắng với các chấm tròn pixel (chấm 1 và 4 màu đỏ nổi bật, các chấm khác màu đen đậm).
   - Khi bấm **🎲 Tung Xúc Xắc**, 2 viên xúc xắc bay vọt lên không trung giữa đảo, xoay 3 trục (`rx, ry, rz`), rơi chạm sân giữa đảo và **nảy 3 nhịp giảm dần độ cao** kèm tiếng *cộc-cộc* 8-bit trước khi ngửa đúng mặt số đã gieo.
2. **Camera Điện Ảnh (`CameraDirector`)**:
   - **Góc nhìn Toàn cảnh (`OVERVIEW`)**: Nhìn chéo Isometric bao quát toàn bộ đảo nổi và mặt nước, cho phép người dùng xoay/zoom nhẹ bằng chuột (`OrbitControls`).
   - **Góc nhìn Bám theo bước nhảy (`FOLLOW_PLAYER`)**: Ngay khi xúc xắc dừng, Camera tự động **lia mượt (`lerp`) bám theo nhân vật đang di chuyển từng ô một**.
   - **Góc nhìn Cận cảnh Hành động (`ACTION_FOCUS`)**: Khi nhân vật đáp xuống ô đích, Camera tiến nhẹ vào góc nhìn điện ảnh và hiển thị **Bảng lựa chọn nổi (`Floating Action Card`)**:
     - `🏠 Mua Đất (-Giá Vàng)`
     - `⬆️ Nâng Cấp Nhà (Cọc rào → Nhà gỗ → Biệt thự → Lâu đài)`
     - `💸 Tự Động Trả Tiền Thuê` (kèm hiệu ứng tiền bay từ người trả sang chủ đất)
     - `🌌 Chọn Ô Dịch Chuyển` (nếu vào Cổng The End) hoặc `🎉 Chọn Đất Nhân Đôi Tiền Thuê` (nếu vào Ô Lễ Hội).

---

## 4. Âm Thanh 8-Bit / Voxel Tự Sinh (`Zero-Asset WebAudio Synth` — `agency-game-audio-engineer`)

- Không phụ thuộc bất kỳ file `.mp3` hay `.ogg` ngoài nào (`0 KB` tải âm thanh):
  - `playDiceRoll()` & `playDiceBounce()`: Tiếng *cộc-cộc* gỗ vuông bằng `BiquadFilter` + xung tam giác tần số `180Hz -> 420Hz`.
  - `playStepBoing()`: Tiếng *boing* dễ thương (`260Hz -> 540Hz` sine/triangle pitch slide) cho `Steve` & `Alex`.
  - `playEndermanTeleport()`: Tiếng dịch chuyển không gian *voooo-zup* (`880Hz -> 190Hz` frequency sweep + detuned sawtooth) cho `Enderman`.
  - `playCreeperBoom()`: Tiếng xì ngòi nổ (`White Noise high-pass`) + tiếng nổ *BÙM* trầm ấm (`Low-pass noise + 95Hz -> 32Hz sub-drop`) cho `Creeper`.
  - `playCoinChime()`: Tiếng *ting-ting* nhận vàng (`B5 -> E6` crystal square wave).
  - `playBuildPop()`: Tiếng mọc nhà nảy lùn phùn (`C5 -> E5 -> G5 -> C6` arpeggio).
  - `playVictoryFireworks()`: Bản nhạc chiến thắng 8-bit + tiếng pháo hoa nổ giòn giã.
  - Có nút bật/tắt **🔊 Âm thanh SFX** và **🎵 Nhạc nền Chibi 8-Bit** ngay trên thanh HUD.

---

## 5. Kiến Trúc AI Bot, Đa Người Chơi & UI/UX (`agency-ai-engineer`, `agency-ui-designer`, `agency-ux-architect`, `agency-data-engineer`)

- **3 Chế Độ Chơi Linh Hoạt**:
  1. **🤖 1 Người + 3 Bot AI Thông Minh (`SOLO_VS_AI`)**: Bot AI (`Heuristic Utility Evaluator`) tự động tính toán:
     - Luôn giữ quỹ dự phòng an toàn (`Safety Reserve >= 150 Vàng`) trừ khi mua ô đó hoàn tất bộ màu Monopoly (`Set Completion`).
     - Ưu tiên nâng cấp ô đất có xác suất đi vào cao hoặc đang có Lễ Hội `x2`.
     - Khi vào **Cổng Dịch Chuyển The End**, Bot AI tự chấm điểm 28 ô để chọn bay tới ô đất hoàn tất bộ màu hoặc Ô Khởi Hành nhận `+200 Vàng`.
  2. **👨‍👩‍👧‍👦 2–4 Người Chung 1 Máy (`PASS_AND_PLAY`)**: Chơi luân phiên trên cùng màn hình, chọn số người chơi (`2, 3, 4`) và chọn nhân vật (`Steve`, `Alex`, `Creeper`, `Enderman`).
  3. **🌐 4 Người Chơi Online (`ONLINE_ROOM`)**: Đồng bộ trạng thái bàn cờ thời gian thực qua `BroadcastChannel` (test ngay lập tức giữa nhiều cửa sổ trình duyệt trên máy) kèm adapter sẵn sàng kết nối `Supabase Realtime / WebRTC Peer` theo Mã Phòng (`Room Code`).
- **Bảo vệ WebGL2 & Dual-Buffer (`WIKI-01-04`)**:
  - Khởi tạo `THREE.WebGLRenderer` an toàn, tự động xử lý `webglcontextlost`, giải phóng geometry/material sạch sẽ và cập nhật 60 FPS không gây giật DOM.
