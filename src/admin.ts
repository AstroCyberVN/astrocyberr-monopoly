import './styles/admin.css';
import {
  BOARD_SIZE,
  BOARD_TILES,
  BoardColorGroup,
  CHARACTER_CONFIGS,
  CHEST_CARDS,
  ChestDeckType,
  GAME_RULES_CONFIG,
  TileType
} from './core/boardData';
import {
  applyCloudConfigToMemory,
  fetchAndApplyMonopolyCloudConfig,
  isAuthorizedAdminEmail,
  isSupabaseConfigured,
  MonopolyCloudConfigRow,
  resetMonopolyConfigToFactoryDefault,
  saveMonopolyCloudConfig,
  subscribeMonopolyCloudConfigRealtime,
  supabase
} from './lib/supabaseConfigSync';
import { escapeHtml, sanitizeColorHex } from './utils/security';

class MonopolyAdminStudio {
  private selectedTileIndex = 0;
  private currentUserEmail: string | null = null;
  private searchQuery = '';
  private typeFilter = 'ALL';

  constructor() {
    this.initAuthFlow();
    this.bindDashboardEvents();
  }

  private async initAuthFlow(): Promise<void> {
    const btnLogin = document.getElementById('btn-google-login')!;
    const btnAuthSignout = document.getElementById('btn-auth-signout')!;

    btnLogin.addEventListener('click', async () => {
      if (!supabase) {
        this.showToast(
          'Đang chạy chế độ Cục bộ (Offline Admin) vì chưa cấu hình VITE_SUPABASE_URL trong .env.',
          false
        );
        this.currentUserEmail = 'local-admin@astrocyberr.dev';
        await this.enterAuthorizedDashboard();
        return;
      }
      const redirectTo = `${window.location.origin}/admin/`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
      if (error) {
        this.showAuthError(`Lỗi khởi tạo Google OAuth: ${error.message}`);
      }
    });

    btnAuthSignout.addEventListener('click', async () => {
      if (supabase) {
        await supabase.auth.signOut();
      }
      window.location.reload();
    });

    if (!isSupabaseConfigured || !supabase) {
      // Allow local offline admin editing when .env is not configured in local dev
      this.currentUserEmail = 'local-admin@astrocyberr.dev';
      await this.enterAuthorizedDashboard();
      return;
    }

    const {
      data: { session }
    } = await supabase.auth.getSession();

    await this.evaluateSession(session?.user?.email ?? null);

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      await this.evaluateSession(newSession?.user?.email ?? null);
    });
  }

  private async evaluateSession(email: string | null): Promise<void> {
    const authScreen = document.getElementById('admin-auth-screen')!;
    const dashboard = document.getElementById('admin-dashboard')!;
    const loadingEl = document.getElementById('admin-auth-loading')!;
    const errorEl = document.getElementById('admin-auth-error')!;
    const btnLogin = document.getElementById('btn-google-login')!;
    const btnAuthSignout = document.getElementById('btn-auth-signout')!;

    loadingEl.classList.add('hidden');

    if (!email) {
      authScreen.classList.remove('hidden');
      dashboard.classList.add('hidden');
      errorEl.classList.add('hidden');
      btnLogin.classList.remove('hidden');
      btnAuthSignout.classList.add('hidden');
      return;
    }

    if (!isAuthorizedAdminEmail(email)) {
      authScreen.classList.remove('hidden');
      dashboard.classList.add('hidden');
      btnLogin.classList.add('hidden');
      btnAuthSignout.classList.remove('hidden');
      this.showAuthError(
        `⛔ Tài khoản "${escapeHtml(email)}" chưa được cấp quyền truy cập Bảng Quản Trị Đám Mây.`
      );
      return;
    }

    this.currentUserEmail = email;
    await this.enterAuthorizedDashboard();
  }

  private async enterAuthorizedDashboard(): Promise<void> {
    const authScreen = document.getElementById('admin-auth-screen')!;
    const dashboard = document.getElementById('admin-dashboard')!;

    authScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.getElementById('admin-user-email')!.textContent = `🟢 Quản trị viên: ${this.currentUserEmail}`;

    const cloudRow = await fetchAndApplyMonopolyCloudConfig();
    if (cloudRow?.updated_at) {
      const timeStr = new Date(cloudRow.updated_at).toLocaleString('vi-VN');
      document.getElementById('admin-last-sync')!.textContent =
        `☁️ Đồng bộ lần cuối: ${timeStr} (${cloudRow.updated_by || 'System'})`;
    } else {
      document.getElementById('admin-last-sync')!.textContent = isSupabaseConfigured
        ? '☁️ Đang dùng cấu hình mặc định (Bấm Lưu để khởi tạo bản ghi Supabase)'
        : '💻 Chế độ Cục Bộ (Offline Studio)';
    }

    this.renderAllSections();

    subscribeMonopolyCloudConfigRealtime((updatedRow) => {
      if (updatedRow.updated_at) {
        const t = new Date(updatedRow.updated_at).toLocaleString('vi-VN');
        document.getElementById('admin-last-sync')!.textContent =
          `☁️ Vừa cập nhật Realtime: ${t} (${updatedRow.updated_by || 'Admin'})`;
      }
      this.renderAllSections();
    });
  }

  private showAuthError(msg: string): void {
    const errorEl = document.getElementById('admin-auth-error')!;
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }

  private showToast(msg: string, isError = false): void {
    const toast = document.getElementById('admin-toast')!;
    toast.textContent = msg;
    toast.classList.toggle('error', isError);
    toast.classList.remove('hidden');
    window.setTimeout(() => {
      toast.classList.add('hidden');
    }, 4200);
  }

  private renderAllSections(): void {
    this.renderTilesSidebarList();
    this.loadSelectedTileIntoForm(this.selectedTileIndex);
    this.loadRulesIntoForm();
    this.renderCharactersAndCardsForms();
  }

  private renderTilesSidebarList(): void {
    const listEl = document.getElementById('tiles-grid-list')!;
    const q = this.searchQuery.trim().toLowerCase();

    const filtered = BOARD_TILES.filter((tile) => {
      const matchQuery =
        !q ||
        tile.name.toLowerCase().includes(q) ||
        `#${tile.index}`.includes(q) ||
        String(tile.index) === q;

      if (!matchQuery) return false;
      if (this.typeFilter === 'ALL') return true;
      if (this.typeFilter === 'SPECIAL') {
        return (
          tile.type === 'START' ||
          tile.type === 'DESERTED_ISLAND' ||
          tile.type === 'FESTIVAL' ||
          tile.type === 'END_PORTAL' ||
          tile.type === 'NETHER_PORTAL'
        );
      }
      return tile.type === this.typeFilter;
    });

    listEl.innerHTML = filtered
      .map((t) => {
        const isSelected = t.index === this.selectedTileIndex;
        const safeColor = sanitizeColorHex(t.colorHex);
        const safeIcon = escapeHtml(t.icon);
        const safeName = escapeHtml(t.name);
        const safeGroup = escapeHtml(t.group);
        const safeType = escapeHtml(t.type);
        const priceLabel =
          typeof t.price === 'number'
            ? t.type === 'ROYAL_TAX'
              ? `-$${t.price}`
              : `$${t.price}`
            : safeType;

        return `
          <button
            type="button"
            class="tile-list-item ${isSelected ? 'active' : ''}"
            data-tile-idx="${t.index}"
          >
            <div class="tile-item-left">
              <span class="tile-color-dot" style="background:${safeColor}"></span>
              <div>
                <div class="tile-item-title">#${t.index} ${safeIcon} ${safeName}</div>
                <div class="tile-item-sub">${safeGroup} • ${safeType}</div>
              </div>
            </div>
            <span class="tile-item-price">${escapeHtml(priceLabel)}</span>
          </button>
        `;
      })
      .join('');

    listEl.querySelectorAll<HTMLButtonElement>('.tile-list-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.saveCurrentTileFormToMemory();
        this.selectedTileIndex = Number(btn.dataset.tileIdx || 0);
        this.renderTilesSidebarList();
        this.loadSelectedTileIntoForm(this.selectedTileIndex);
      });
    });
  }

  private loadSelectedTileIntoForm(index: number): void {
    const idx = ((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
    this.selectedTileIndex = idx;
    const tile = BOARD_TILES[idx];

    document.getElementById('editor-tile-badge')!.textContent =
      `Ô #${tile.index} • Tọa độ 3D (${tile.gridX}, ${tile.gridZ})`;
    document.getElementById('editor-tile-heading')!.textContent = `${tile.icon} ${tile.name}`;

    (document.getElementById('field-tile-name') as HTMLInputElement).value = tile.name;
    (document.getElementById('field-tile-icon') as HTMLInputElement).value = tile.icon;
    (document.getElementById('field-tile-type') as HTMLSelectElement).value = tile.type;
    (document.getElementById('field-tile-group') as HTMLSelectElement).value = tile.group;
    (document.getElementById('field-tile-color') as HTMLInputElement).value = tile.colorHex;
    (document.getElementById('field-tile-color-picker') as HTMLInputElement).value =
      sanitizeColorHex(tile.colorHex, '#10b981');

    (document.getElementById('field-tile-price') as HTMLInputElement).value =
      typeof tile.price === 'number' ? String(tile.price) : '';
    (document.getElementById('field-tile-upgrade') as HTMLInputElement).value =
      typeof tile.upgradeCost === 'number' ? String(tile.upgradeCost) : '';
    (document.getElementById('field-tile-rents') as HTMLInputElement).value = tile.rents
      ? tile.rents.join(', ')
      : '';
    (document.getElementById('field-tile-reason') as HTMLInputElement).value =
      tile.rentReason ?? '';
    (document.getElementById('field-tile-desc') as HTMLTextAreaElement).value = tile.description;
  }

  private saveCurrentTileFormToMemory(): void {
    const tile = BOARD_TILES[this.selectedTileIndex];
    if (!tile) return;

    const nameVal = (document.getElementById('field-tile-name') as HTMLInputElement).value.trim();
    const iconVal = (document.getElementById('field-tile-icon') as HTMLInputElement).value.trim();
    const typeVal = (document.getElementById('field-tile-type') as HTMLSelectElement)
      .value as TileType;
    const groupVal = (document.getElementById('field-tile-group') as HTMLSelectElement)
      .value as BoardColorGroup;
    const colorVal = sanitizeColorHex(
      (document.getElementById('field-tile-color') as HTMLInputElement).value.trim(),
      tile.colorHex
    );
    const priceRaw = (document.getElementById('field-tile-price') as HTMLInputElement).value.trim();
    const upgradeRaw = (
      document.getElementById('field-tile-upgrade') as HTMLInputElement
    ).value.trim();
    const rentsRaw = (document.getElementById('field-tile-rents') as HTMLInputElement).value.trim();
    const reasonVal = (
      document.getElementById('field-tile-reason') as HTMLInputElement
    ).value.trim();
    const descVal = (
      document.getElementById('field-tile-desc') as HTMLTextAreaElement
    ).value.trim();

    if (nameVal) tile.name = nameVal;
    if (iconVal) tile.icon = iconVal;
    tile.type = typeVal;
    tile.group = groupVal;
    tile.colorGroup =
      groupVal !== 'SPECIAL' && groupVal !== 'RAILROAD' && groupVal !== 'UTILITY'
        ? groupVal
        : undefined;
    tile.colorHex = colorVal;

    tile.price = priceRaw !== '' && !Number.isNaN(Number(priceRaw)) ? Number(priceRaw) : undefined;
    tile.upgradeCost =
      upgradeRaw !== '' && !Number.isNaN(Number(upgradeRaw)) ? Number(upgradeRaw) : undefined;

    if (rentsRaw !== '') {
      const parsedRents = rentsRaw
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n) && n >= 0);
      tile.rents = parsedRents.length > 0 ? parsedRents : undefined;
    } else {
      tile.rents = undefined;
    }

    tile.rentReason = reasonVal || undefined;
    if (descVal) tile.description = descVal;
  }

  private loadRulesIntoForm(): void {
    const r = GAME_RULES_CONFIG;
    (document.getElementById('rule-starting-gold') as HTMLInputElement).value = String(
      r.startingGold
    );
    (document.getElementById('rule-pass-start') as HTMLInputElement).value = String(
      r.passStartReward
    );
    (document.getElementById('rule-jail-fine') as HTMLInputElement).value = String(
      r.jailFineAmount
    );
    (document.getElementById('rule-mortgage-pct') as HTMLInputElement).value = String(
      r.mortgageRatePct
    );
    (document.getElementById('rule-unmortgage-pct') as HTMLInputElement).value = String(
      r.unmortgageRatePct
    );
    (document.getElementById('rule-liquidation-pct') as HTMLInputElement).value = String(
      r.liquidationRatePct
    );
    (document.getElementById('rule-monopoly-pct') as HTMLInputElement).value = String(
      r.monopolyBonusPct
    );
    (document.getElementById('rule-buyout-pct') as HTMLInputElement).value = String(
      r.hostileBuyoutMultiplierPct
    );
    (document.getElementById('rule-nether-bonus') as HTMLInputElement).value = String(
      r.netherWarpGoldBonus
    );
    (document.getElementById('rule-festival-bonus') as HTMLInputElement).value = String(
      r.festivalNoPropertyGoldBonus
    );
    (document.getElementById('rule-steve-discount') as HTMLInputElement).value = String(
      r.steveUpgradeDiscountPct
    );
    (document.getElementById('rule-alex-bonus') as HTMLInputElement).value = String(
      r.alexStartBonus
    );
    (document.getElementById('rule-creeper-discount') as HTMLInputElement).value = String(
      r.creeperTaxDiscountPct
    );
    (document.getElementById('rule-enderman-bonus') as HTMLInputElement).value = String(
      r.endermanPortalBonus
    );
  }

  private saveRulesFormToMemory(): void {
    const num = (id: string, fallback: number): number => {
      const val = Number((document.getElementById(id) as HTMLInputElement)?.value);
      return Number.isNaN(val) ? fallback : val;
    };

    GAME_RULES_CONFIG.startingGold = num('rule-starting-gold', 1500);
    GAME_RULES_CONFIG.passStartReward = num('rule-pass-start', 200);
    GAME_RULES_CONFIG.jailFineAmount = num('rule-jail-fine', 50);
    GAME_RULES_CONFIG.mortgageRatePct = num('rule-mortgage-pct', 50);
    GAME_RULES_CONFIG.unmortgageRatePct = num('rule-unmortgage-pct', 55);
    GAME_RULES_CONFIG.liquidationRatePct = num('rule-liquidation-pct', 75);
    GAME_RULES_CONFIG.monopolyBonusPct = num('rule-monopoly-pct', 150);
    GAME_RULES_CONFIG.hostileBuyoutMultiplierPct = num('rule-buyout-pct', 160);
    GAME_RULES_CONFIG.netherWarpGoldBonus = num('rule-nether-bonus', 120);
    GAME_RULES_CONFIG.festivalNoPropertyGoldBonus = num('rule-festival-bonus', 80);
    GAME_RULES_CONFIG.steveUpgradeDiscountPct = num('rule-steve-discount', 15);
    GAME_RULES_CONFIG.alexStartBonus = num('rule-alex-bonus', 60);
    GAME_RULES_CONFIG.creeperTaxDiscountPct = num('rule-creeper-discount', 20);
    GAME_RULES_CONFIG.endermanPortalBonus = num('rule-enderman-bonus', 50);
  }

  private renderCharactersAndCardsForms(): void {
    const charsContainer = document.getElementById('characters-editor-list')!;
    charsContainer.innerHTML = CHARACTER_CONFIGS.map(
      (c, idx) => `
      <div class="char-editor-card">
        <h4>${escapeHtml(c.emoji)} Nhân vật #${idx + 1}: ${escapeHtml(c.id.toUpperCase())}</h4>
        <div class="admin-field">
          <label>Tên nhân vật</label>
          <input type="text" class="admin-input" data-char-idx="${idx}" data-char-field="name" value="${escapeHtml(c.name)}" />
        </div>
        <div class="admin-field">
          <label>Danh hiệu</label>
          <input type="text" class="admin-input" data-char-idx="${idx}" data-char-field="title" value="${escapeHtml(c.title)}" />
        </div>
        <div class="admin-field">
          <label>Biểu tượng (Emoji)</label>
          <input type="text" class="admin-input" data-char-idx="${idx}" data-char-field="emoji" value="${escapeHtml(c.emoji)}" />
        </div>
        <div class="admin-field">
          <label>Màu chủ đạo (Hex)</label>
          <input type="text" class="admin-input" data-char-idx="${idx}" data-char-field="color" value="${escapeHtml(c.color)}" />
        </div>
        <div class="admin-field">
          <label>Tên Kỹ Năng Nội Tại</label>
          <input type="text" class="admin-input" data-char-idx="${idx}" data-char-field="passiveName" value="${escapeHtml(c.passiveName)}" />
        </div>
        <div class="admin-field">
          <label>Mô tả Kỹ Năng Nội Tại</label>
          <textarea rows="2" class="admin-input" data-char-idx="${idx}" data-char-field="passiveDescription">${escapeHtml(c.passiveDescription)}</textarea>
        </div>
      </div>
    `
    ).join('');

    const cardsContainer = document.getElementById('chest-cards-editor-list')!;
    cardsContainer.innerHTML = CHEST_CARDS.map(
      (card, idx) => `
      <div class="chest-editor-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <h4>${card.deck === 'KHI_VAN' ? '🧧 Khí Vận' : '⚡ Cơ Hội'} #${idx + 1} (${escapeHtml(card.id)})</h4>
          <select class="admin-input" style="width:140px;padding:4px 8px;font-size:11.5px" data-card-idx="${idx}" data-card-field="deck">
            <option value="KHI_VAN" ${card.deck === 'KHI_VAN' ? 'selected' : ''}>🧧 Bộ Khí Vận</option>
            <option value="CO_HOI" ${card.deck === 'CO_HOI' ? 'selected' : ''}>⚡ Bộ Cơ Hội</option>
          </select>
        </div>
        <div class="admin-field">
          <label>Tiêu đề thẻ</label>
          <input type="text" class="admin-input" data-card-idx="${idx}" data-card-field="title" value="${escapeHtml(card.title)}" />
        </div>
        <div class="admin-field">
          <label>Nội dung mô tả</label>
          <textarea rows="2" class="admin-input" data-card-idx="${idx}" data-card-field="description">${escapeHtml(card.description)}</textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div class="admin-field">
            <label>Thay đổi Vàng (+/- $)</label>
            <input type="number" step="10" class="admin-input" data-card-idx="${idx}" data-card-field="goldDelta" value="${card.goldDelta}" />
          </div>
          <div class="admin-field">
            <label>Bay tới Ô # (0-39)</label>
            <input type="number" min="0" max="39" placeholder="Để trống nếu không" class="admin-input" data-card-idx="${idx}" data-card-field="moveToTile" value="${typeof card.moveToTile === 'number' ? card.moveToTile : ''}" />
          </div>
          <div class="admin-field">
            <label>Tiến/Lùi Bước (+/-)</label>
            <input type="number" min="-15" max="15" placeholder="VD: -3" class="admin-input" data-card-idx="${idx}" data-card-field="stepDelta" value="${typeof card.stepDelta === 'number' ? card.stepDelta : ''}" />
          </div>
          <div class="admin-field">
            <label>Thu mỗi đối thủ ($)</label>
            <input type="number" min="0" step="10" placeholder="VD: 40" class="admin-input" data-card-idx="${idx}" data-card-field="collectFromEachPlayer" value="${typeof card.collectFromEachPlayer === 'number' ? card.collectFromEachPlayer : ''}" />
          </div>
        </div>
        <div style="display:flex;gap:14px;margin-top:6px;font-size:12px;color:#cbd5e1">
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
            <input type="checkbox" data-card-idx="${idx}" data-card-field="goToJail" ${card.goToJail ? 'checked' : ''} />
            <span>🚓 Vào Tù (#10)</span>
          </label>
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
            <input type="checkbox" data-card-idx="${idx}" data-card-field="grantGetOutOfJailCard" ${card.grantGetOutOfJailCard ? 'checked' : ''} />
            <span>🕊️ Tặng Thẻ Ra Tù</span>
          </label>
        </div>
      </div>
    `
    ).join('');
  }

  private saveCharactersAndCardsToMemory(): void {
    document
      .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-char-idx]')
      .forEach((el) => {
        const idx = Number(el.dataset.charIdx);
        const field = el.dataset.charField as keyof (typeof CHARACTER_CONFIGS)[number];
        if (CHARACTER_CONFIGS[idx] && field && field !== 'id') {
          CHARACTER_CONFIGS[idx][field] = el.value.trim();
        }
      });

    document
      .querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-card-idx]')
      .forEach((el) => {
        const idx = Number(el.dataset.cardIdx);
        const field = el.dataset.cardField;
        const card = CHEST_CARDS[idx];
        if (!card || !field) return;

        if (field === 'deck') {
          card.deck = (el.value === 'KHI_VAN' ? 'KHI_VAN' : 'CO_HOI') as ChestDeckType;
        } else if (field === 'title') {
          card.title = el.value.trim();
        } else if (field === 'description') {
          card.description = el.value.trim();
        } else if (field === 'goldDelta') {
          card.goldDelta = Number(el.value) || 0;
        } else if (field === 'moveToTile') {
          const v = el.value.trim();
          card.moveToTile = v !== '' && !Number.isNaN(Number(v)) ? Number(v) : undefined;
        } else if (field === 'stepDelta') {
          const v = el.value.trim();
          card.stepDelta =
            v !== '' && !Number.isNaN(Number(v)) && Number(v) !== 0 ? Number(v) : undefined;
        } else if (field === 'collectFromEachPlayer') {
          const v = el.value.trim();
          card.collectFromEachPlayer =
            v !== '' && !Number.isNaN(Number(v)) && Number(v) > 0 ? Number(v) : undefined;
        } else if (field === 'goToJail' && el instanceof HTMLInputElement) {
          card.goToJail = el.checked;
        } else if (field === 'grantGetOutOfJailCard' && el instanceof HTMLInputElement) {
          card.grantGetOutOfJailCard = el.checked;
        }
      });
  }

  private async persistEverythingToSupabase(): Promise<void> {
    this.saveCurrentTileFormToMemory();
    this.saveRulesFormToMemory();
    this.saveCharactersAndCardsToMemory();
    this.renderTilesSidebarList();
    this.loadSelectedTileIntoForm(this.selectedTileIndex);

    const res = await saveMonopolyCloudConfig(this.currentUserEmail);
    if (!res.ok) {
      this.showToast(`⚠️ ${res.error}`, true);
      return;
    }

    const timeStr = new Date(res.updatedAt || Date.now()).toLocaleString('vi-VN');
    document.getElementById('admin-last-sync')!.textContent =
      `☁️ Đã lưu lúc: ${timeStr} (${this.currentUserEmail})`;
    this.showToast(
      '✅ Đã lưu toàn bộ 40 Ô Cờ, Luật Chơi, 4 Nhân Vật & 15 Thẻ Rương lên Supabase! Bàn cờ 3D đã tự động đồng bộ.'
    );
  }

  private bindDashboardEvents(): void {
    // Tab switching
    document.querySelectorAll<HTMLButtonElement>('.admin-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.admin-tab-panel').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.dataset.tab!;
        document.getElementById(targetId)?.classList.add('active');
      });
    });

    // Search & Filter 40 Tiles
    const searchInput = document.getElementById('tile-search-input') as HTMLInputElement;
    const typeFilter = document.getElementById('tile-type-filter') as HTMLSelectElement;

    searchInput.addEventListener('input', () => {
      this.searchQuery = searchInput.value;
      this.renderTilesSidebarList();
    });

    typeFilter.addEventListener('change', () => {
      this.typeFilter = typeFilter.value;
      this.renderTilesSidebarList();
    });

    // Prev / Next Tile buttons
    document.getElementById('btn-prev-tile')!.addEventListener('click', () => {
      this.saveCurrentTileFormToMemory();
      this.selectedTileIndex = (this.selectedTileIndex - 1 + BOARD_SIZE) % BOARD_SIZE;
      this.renderTilesSidebarList();
      this.loadSelectedTileIntoForm(this.selectedTileIndex);
    });

    document.getElementById('btn-next-tile')!.addEventListener('click', () => {
      this.saveCurrentTileFormToMemory();
      this.selectedTileIndex = (this.selectedTileIndex + 1) % BOARD_SIZE;
      this.renderTilesSidebarList();
      this.loadSelectedTileIntoForm(this.selectedTileIndex);
    });

    // Color picker sync
    const colorPicker = document.getElementById('field-tile-color-picker') as HTMLInputElement;
    const colorInput = document.getElementById('field-tile-color') as HTMLInputElement;
    colorPicker.addEventListener('input', () => {
      colorInput.value = colorPicker.value;
    });
    colorInput.addEventListener('input', () => {
      if (/^#[0-9a-fA-F]{6}$/.test(colorInput.value.trim())) {
        colorPicker.value = colorInput.value.trim();
      }
    });

    // Save buttons
    document.getElementById('btn-apply-tile')!.addEventListener('click', () => {
      this.persistEverythingToSupabase();
    });
    document.getElementById('btn-save-rules')!.addEventListener('click', () => {
      this.persistEverythingToSupabase();
    });
    document.getElementById('btn-save-chars')!.addEventListener('click', () => {
      this.persistEverythingToSupabase();
    });
    document.getElementById('btn-save-all-cloud')!.addEventListener('click', () => {
      this.persistEverythingToSupabase();
    });

    // Reload from Cloud
    document.getElementById('btn-reload-cloud')!.addEventListener('click', async () => {
      const row = await fetchAndApplyMonopolyCloudConfig();
      this.renderAllSections();
      if (row) {
        this.showToast('🔄 Đã tải lại cấu hình mới nhất từ Supabase Cloud!');
      } else {
        this.showToast('⚠️ Không tìm thấy bản ghi đám mây hoặc đang ở chế độ Cục bộ.', true);
      }
    });

    // Factory Reset Button
    document.getElementById('btn-factory-reset')!.addEventListener('click', async () => {
      resetMonopolyConfigToFactoryDefault();
      this.renderAllSections();
      if (isSupabaseConfigured) {
        await saveMonopolyCloudConfig(this.currentUserEmail);
      }
      this.showToast(
        '♻️ Đã khôi phục toàn bộ 40 Ô Cờ Sài Gòn Voxel, Luật Chơi, 4 Nhân Vật & 15 Thẻ Rương về Mặc Định Gốc!'
      );
    });

    // Export JSON
    document.getElementById('btn-export-json')!.addEventListener('click', () => {
      this.saveCurrentTileFormToMemory();
      this.saveRulesFormToMemory();
      this.saveCharactersAndCardsToMemory();

      const payload = {
        version: '5.0.0',
        exportedAt: new Date().toISOString(),
        exportedBy: this.currentUserEmail,
        tiles_config: BOARD_TILES,
        rules_config: GAME_RULES_CONFIG,
        characters_config: CHARACTER_CONFIGS,
        chest_cards_config: CHEST_CARDS
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `astrocyberr-monopoly-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('📥 Đã xuất file cấu hình JSON thành công!');
    });

    // Import JSON (with strict schema validation via `applyCloudConfigToMemory`)
    const importInput = document.getElementById('input-import-json') as HTMLInputElement;
    importInput.addEventListener('change', async () => {
      const file = importInput.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as Partial<MonopolyCloudConfigRow>;
        applyCloudConfigToMemory(parsed);
        this.renderAllSections();
        this.showToast(
          '📤 Đã nhập và kiểm tra an toàn cấu hình JSON! Bấm "LƯU LÊN SUPABASE" để áp dụng lên đám mây.'
        );
      } catch (err) {
        this.showToast(`❌ File JSON không hợp lệ: ${(err as Error).message}`, true);
      } finally {
        importInput.value = '';
      }
    });

    // Logout
    document.getElementById('btn-logout')!.addEventListener('click', async () => {
      if (supabase) {
        await supabase.auth.signOut();
      }
      window.location.reload();
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MonopolyAdminStudio();
});
