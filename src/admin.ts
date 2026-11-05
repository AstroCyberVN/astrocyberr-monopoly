import './styles/admin.css';
import {
  BOARD_SIZE,
  BOARD_TILES,
  CHARACTER_CONFIGS,
  CHEST_CARDS,
  ColorGroupId,
  DEFAULT_GAME_RULES_CONFIG,
  GAME_RULES_CONFIG,
  TileType,
  getExportableTilesSpecArray,
  resetBoardTilesToDefault,
  updateBoardTileConfigInPlace
} from './core/boardData';
import {
  ALLOWED_ADMIN_EMAILS,
  MonopolyCloudRow,
  applyCloudConfigToRuntime,
  fetchAndApplyMonopolyCloudConfig,
  isAuthorizedAdminEmail,
  saveMonopolyCloudConfigToSupabase,
  subscribeMonopolyCloudConfigRealtime,
  supabase
} from './lib/supabaseConfigSync';

const INITIAL_CHARACTERS_SNAPSHOT = CHARACTER_CONFIGS.map((c) => ({ ...c }));
const INITIAL_CHEST_CARDS_SNAPSHOT = CHEST_CARDS.map((c) => ({ ...c }));

class MonopolyAdminConsole {
  private selectedTileIndex = 0;
  private tileSearchQuery = '';
  private tileTypeFilter = 'ALL';
  private toastTimer: number | null = null;
  private activeAdminEmail: string | null = null;
  private isHandlingAuth = false;
  private unsubscribeRealtime: (() => void) | null = null;

  constructor() {
    this.bindAuthEvents();
    this.bindDashboardEvents();
    this.initAuthSessionCheck();
  }

  private showAuthError(message: string): void {
    const errEl = document.getElementById('admin-auth-error')!;
    errEl.textContent = message;
    errEl.classList.remove('hidden');
  }

  private hideAuthError(): void {
    const errEl = document.getElementById('admin-auth-error')!;
    errEl.textContent = '';
    errEl.classList.add('hidden');
  }

  private showToast(message: string, isError = false): void {
    const toast = document.getElementById('admin-toast')!;
    toast.textContent = message;
    toast.classList.toggle('error', isError);
    toast.classList.remove('hidden');
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
    }
    this.toastTimer = window.setTimeout(() => {
      toast.classList.add('hidden');
    }, 4500);
  }

  private bindAuthEvents(): void {
    const btnGoogle = document.getElementById('btn-google-login')!;
    btnGoogle.addEventListener('click', async () => {
      this.hideAuthError();
      const redirectUrl = `${window.location.origin}/admin`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
      if (error) {
        this.showAuthError(`❌ Không thể khởi tạo Google OAuth: ${error.message}`);
      }
    });

    const btnSignOut = document.getElementById('btn-sign-out')!;
    btnSignOut.addEventListener('click', async () => {
      await supabase.auth.signOut();
      this.switchToAuthScreen();
    });
  }

  private async initAuthSessionCheck(): Promise<void> {
    const loadingEl = document.getElementById('admin-auth-loading')!;
    const btnGoogle = document.getElementById('btn-google-login')!;

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      loadingEl.classList.add('hidden');
      btnGoogle.classList.remove('hidden');

      if (newSession?.user) {
        await this.handleAuthenticatedUser(newSession.user.email ?? '');
      } else {
        this.switchToAuthScreen();
      }
    });
  }

  private async handleAuthenticatedUser(rawEmail: string): Promise<void> {
    const email = rawEmail.trim().toLowerCase();

    if (this.activeAdminEmail === email || this.isHandlingAuth) {
      return;
    }
    this.isHandlingAuth = true;

    try {
      if (!isAuthorizedAdminEmail(email)) {
        await supabase.auth.signOut();
        this.switchToAuthScreen();
        this.showAuthError(
          `⛔ Tài khoản "${rawEmail || 'Không xác định'}" không có quyền quản trị! Chỉ ${ALLOWED_ADMIN_EMAILS.join(' và ')} được phép truy cập /admin.`
        );
        return;
      }

      // Double-check against Supabase monopoly_admins table (RLS verified)
      const { data: adminRow, error: adminErr } = await supabase
        .from('monopoly_admins')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (adminErr || !adminRow) {
        await supabase.auth.signOut();
        this.switchToAuthScreen();
        this.showAuthError(
          `⛔ Tài khoản "${email}" bị từ chối bởi chính sách bảo mật PostgreSQL RLS!`
        );
        return;
      }

      this.activeAdminEmail = email;
      this.hideAuthError();
      document.getElementById('admin-auth-screen')!.classList.add('hidden');
      document.getElementById('admin-dashboard')!.classList.remove('hidden');
      document.getElementById('admin-user-email')!.textContent = `🟢 Admin: ${email}`;

      await this.loadCloudConfigAndRenderAll();

      if (this.unsubscribeRealtime) {
        this.unsubscribeRealtime();
      }
      this.unsubscribeRealtime = subscribeMonopolyCloudConfigRealtime((cloud) => {
        this.updateSyncBadge(cloud);
        this.renderAllTabs();
      });
    } finally {
      this.isHandlingAuth = false;
    }
  }

  private switchToAuthScreen(): void {
    this.activeAdminEmail = null;
    if (this.unsubscribeRealtime) {
      this.unsubscribeRealtime();
      this.unsubscribeRealtime = null;
    }
    document.getElementById('admin-dashboard')!.classList.add('hidden');
    document.getElementById('admin-auth-screen')!.classList.remove('hidden');
    document.getElementById('admin-auth-loading')!.classList.add('hidden');
    document.getElementById('btn-google-login')!.classList.remove('hidden');
  }

  private updateSyncBadge(cloud: MonopolyCloudRow | null): void {
    const badge = document.getElementById('admin-sync-status')!;
    if (!cloud || !cloud.updated_at) {
      badge.textContent = '☁️ Đang dùng cấu hình mặc định (Chưa có bản lưu trên mây)';
      return;
    }
    const timeStr = new Date(cloud.updated_at).toLocaleString('vi-VN');
    badge.textContent = `☁️ Đồng bộ lúc ${timeStr}${cloud.updated_by ? ` bởi ${cloud.updated_by}` : ''}`;
  }

  private async loadCloudConfigAndRenderAll(): Promise<void> {
    const cloud = await fetchAndApplyMonopolyCloudConfig();
    this.updateSyncBadge(cloud);
    this.renderAllTabs();
  }

  private renderAllTabs(): void {
    this.renderTilesSidebarList();
    this.loadTileIntoDetailForm(this.selectedTileIndex);
    this.renderRulesForm();
    this.renderCharactersAndChestCards();
  }

  private bindDashboardEvents(): void {
    // Tab switching
    document.querySelectorAll<HTMLButtonElement>('.admin-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.tab;
        if (!targetId) return;
        document.querySelectorAll('.admin-tab-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.admin-tab-panel').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(targetId)?.classList.add('active');
      });
    });

    // Tile filter & search
    const searchInput = document.getElementById('tile-search-input') as HTMLInputElement;
    const typeFilter = document.getElementById('tile-type-filter') as HTMLSelectElement;

    searchInput.addEventListener('input', () => {
      this.tileSearchQuery = searchInput.value.trim().toLowerCase();
      this.renderTilesSidebarList();
    });

    typeFilter.addEventListener('change', () => {
      this.tileTypeFilter = typeFilter.value;
      this.renderTilesSidebarList();
    });

    // Prev / Next Tile buttons
    document.getElementById('btn-prev-tile')!.addEventListener('click', () => {
      this.collectCurrentTileFormIntoRuntime();
      this.selectedTileIndex = (this.selectedTileIndex - 1 + BOARD_SIZE) % BOARD_SIZE;
      this.renderTilesSidebarList();
      this.loadTileIntoDetailForm(this.selectedTileIndex);
    });

    document.getElementById('btn-next-tile')!.addEventListener('click', () => {
      this.collectCurrentTileFormIntoRuntime();
      this.selectedTileIndex = (this.selectedTileIndex + 1) % BOARD_SIZE;
      this.renderTilesSidebarList();
      this.loadTileIntoDetailForm(this.selectedTileIndex);
    });

    // Color picker sync
    const colorPicker = document.getElementById('field-tile-color-picker') as HTMLInputElement;
    const colorText = document.getElementById('field-tile-color') as HTMLInputElement;

    colorPicker.addEventListener('input', () => {
      colorText.value = colorPicker.value;
    });
    colorText.addEventListener('input', () => {
      if (/^#[0-9a-fA-F]{6}$/.test(colorText.value.trim())) {
        colorPicker.value = colorText.value.trim();
      }
    });

    // Save & Sync buttons
    const triggerFullCloudSave = async () => {
      this.collectCurrentTileFormIntoRuntime();
      this.collectRulesFormIntoRuntime();
      this.collectCharactersAndCardsIntoRuntime();
      this.renderTilesSidebarList();

      const btn = document.getElementById('btn-save-supabase') as HTMLButtonElement;
      const origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '⏳ Đang đồng bộ lên Supabase...';

      const res = await saveMonopolyCloudConfigToSupabase();
      btn.disabled = false;
      btn.textContent = origText;

      if (res.ok) {
        this.showToast(
          '✅ Đã lưu và phát sóng trực tiếp (Realtime) lên Supabase! Bàn cờ 3D ở trang chính đã được cập nhật.'
        );
        const cloud = await fetchAndApplyMonopolyCloudConfig();
        this.updateSyncBadge(cloud);
      } else {
        this.showToast(`❌ Lỗi lưu lên Supabase: ${res.error}`, true);
      }
    };

    document
      .getElementById('btn-save-supabase')!
      .addEventListener('click', triggerFullCloudSave);
    document
      .getElementById('btn-apply-tile-and-sync')!
      .addEventListener('click', triggerFullCloudSave);
    document
      .getElementById('btn-save-rules-supabase')!
      .addEventListener('click', triggerFullCloudSave);
    document
      .getElementById('btn-save-chars-cards-supabase')!
      .addEventListener('click', triggerFullCloudSave);

    // Export full JSON
    document.getElementById('btn-export-json')!.addEventListener('click', () => {
      this.collectCurrentTileFormIntoRuntime();
      this.collectRulesFormIntoRuntime();
      this.collectCharactersAndCardsIntoRuntime();

      const payload = {
        exportedAt: new Date().toISOString(),
        tiles_json: getExportableTilesSpecArray(),
        rules_json: { ...GAME_RULES_CONFIG },
        characters_json: CHARACTER_CONFIGS.map((c) => ({ ...c })),
        chest_cards_json: CHEST_CARDS.map((c) => ({ ...c }))
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'astrocyberr-monopoly-config.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.showToast('📥 Đã xuất file astrocyberr-monopoly-config.json thành công!');
    });

    // Import JSON file
    const importInput = document.getElementById('input-import-json') as HTMLInputElement;
    importInput.addEventListener('change', async () => {
      const file = importInput.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (Array.isArray(parsed)) {
          // Support importing raw 40-tile array directly
          applyCloudConfigToRuntime({ tiles_json: parsed });
        } else if (parsed && typeof parsed === 'object') {
          applyCloudConfigToRuntime({
            tiles_json: Array.isArray(parsed.tiles_json) ? parsed.tiles_json : undefined,
            rules_json: parsed.rules_json,
            characters_json: Array.isArray(parsed.characters_json)
              ? parsed.characters_json
              : undefined,
            chest_cards_json: Array.isArray(parsed.chest_cards_json)
              ? parsed.chest_cards_json
              : undefined
          });
        }

        this.renderAllTabs();
        this.showToast(
          '📤 Đã nạp file JSON vào bảng quản trị! Bấm "Lưu & Đồng Bộ Lên Supabase" để áp dụng lên đám mây.'
        );
      } catch (err) {
        this.showToast(`❌ File JSON không hợp lệ: ${(err as Error).message}`, true);
      } finally {
        importInput.value = '';
      }
    });

    // Reset all to defaults
    document.getElementById('btn-reset-defaults')!.addEventListener('click', async () => {
      if (
        !window.confirm(
          'Bạn có chắc chắn muốn khôi phục toàn bộ 40 Ô Cờ, Luật Kinh Tế, Nhân Vật & Rương về mặc định và đồng bộ lên Supabase?'
        )
      ) {
        return;
      }

      resetBoardTilesToDefault();
      Object.assign(GAME_RULES_CONFIG, DEFAULT_GAME_RULES_CONFIG);
      INITIAL_CHARACTERS_SNAPSHOT.forEach((snap, idx) => {
        Object.assign(CHARACTER_CONFIGS[idx], snap);
      });
      CHEST_CARDS.splice(
        0,
        CHEST_CARDS.length,
        ...INITIAL_CHEST_CARDS_SNAPSHOT.map((c) => ({ ...c }))
      );

      this.renderAllTabs();
      const res = await saveMonopolyCloudConfigToSupabase();
      if (res.ok) {
        this.showToast('🔄 Đã khôi phục mặc định và đồng bộ lên Supabase!');
      } else {
        this.showToast(`❌ Lỗi khi lưu mặc định lên Supabase: ${res.error}`, true);
      }
    });
  }

  private renderTilesSidebarList(): void {
    const container = document.getElementById('tiles-grid-list')!;
    const filtered = BOARD_TILES.filter((t) => {
      if (this.tileTypeFilter !== 'ALL' && t.type !== this.tileTypeFilter) {
        return false;
      }
      if (!this.tileSearchQuery) return true;
      const q = this.tileSearchQuery;
      return (
        t.name.toLowerCase().includes(q) ||
        `#${t.index}`.includes(q) ||
        `${t.index}` === q ||
        t.type.toLowerCase().includes(q)
      );
    });

    container.innerHTML = filtered
      .map((t) => {
        const isActive = t.index === this.selectedTileIndex;
        const priceBadge =
          typeof t.price === 'number' && t.price > 0 ? `$${t.price}` : t.type;
        return `
          <button
            type="button"
            class="tile-list-item ${isActive ? 'active' : ''}"
            data-tile-idx="${t.index}"
          >
            <div class="tile-item-left">
              <span class="tile-color-dot" style="background:${t.colorHex}"></span>
              <div>
                <div class="tile-item-title">#${t.index} ${t.icon} ${t.name}</div>
                <div class="tile-item-sub">${t.type}${t.colorGroup ? ` • ${t.colorGroup}` : ''}</div>
              </div>
            </div>
            <span class="tile-item-price">${priceBadge}</span>
          </button>
        `;
      })
      .join('');

    container.querySelectorAll<HTMLButtonElement>('.tile-list-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.collectCurrentTileFormIntoRuntime();
        this.selectedTileIndex = Number(btn.dataset.tileIdx);
        this.renderTilesSidebarList();
        this.loadTileIntoDetailForm(this.selectedTileIndex);
      });
    });
  }

  private loadTileIntoDetailForm(idx: number): void {
    const t = BOARD_TILES[idx];
    if (!t) return;

    document.getElementById('editor-tile-badge')!.textContent =
      `Ô #${t.index} • ${t.type}${t.colorGroup ? ` (${t.colorGroup})` : ''}`;
    document.getElementById('editor-tile-heading')!.textContent = `${t.icon} ${t.name}`;

    (document.getElementById('field-tile-name') as HTMLInputElement).value = t.name;
    (document.getElementById('field-tile-icon') as HTMLInputElement).value = t.icon;
    (document.getElementById('field-tile-type') as HTMLSelectElement).value = t.type;
    (document.getElementById('field-tile-group') as HTMLSelectElement).value =
      t.colorGroup ?? '';
    (document.getElementById('field-tile-color') as HTMLInputElement).value = t.colorHex;
    if (/^#[0-9a-fA-F]{6}$/.test(t.colorHex)) {
      (document.getElementById('field-tile-color-picker') as HTMLInputElement).value =
        t.colorHex;
    }

    (document.getElementById('field-tile-price') as HTMLInputElement).value =
      typeof t.price === 'number' ? `${t.price}` : '';
    (document.getElementById('field-tile-upgrade') as HTMLInputElement).value =
      typeof t.upgradeCost === 'number' ? `${t.upgradeCost}` : '';

    (document.getElementById('field-rent-0') as HTMLInputElement).value = t.rents
      ? `${t.rents[0]}`
      : '';
    (document.getElementById('field-rent-1') as HTMLInputElement).value = t.rents
      ? `${t.rents[1]}`
      : '';
    (document.getElementById('field-rent-2') as HTMLInputElement).value = t.rents
      ? `${t.rents[2]}`
      : '';
    (document.getElementById('field-rent-3') as HTMLInputElement).value = t.rents
      ? `${t.rents[3]}`
      : '';

    (document.getElementById('field-tile-reason') as HTMLInputElement).value =
      t.rentReason ?? '';
    (document.getElementById('field-tile-desc') as HTMLTextAreaElement).value =
      t.description;
  }

  private collectCurrentTileFormIntoRuntime(): void {
    const idx = this.selectedTileIndex;
    const current = BOARD_TILES[idx];
    if (!current) return;

    const name = (document.getElementById('field-tile-name') as HTMLInputElement).value.trim();
    const icon = (document.getElementById('field-tile-icon') as HTMLInputElement).value.trim();
    const type = (document.getElementById('field-tile-type') as HTMLSelectElement)
      .value as TileType;
    const groupRaw = (document.getElementById('field-tile-group') as HTMLSelectElement).value;
    const colorHex = (document.getElementById('field-tile-color') as HTMLInputElement).value.trim();
    const priceRaw = (document.getElementById('field-tile-price') as HTMLInputElement).value;
    const upgradeRaw = (document.getElementById('field-tile-upgrade') as HTMLInputElement).value;

    const r0 = Number((document.getElementById('field-rent-0') as HTMLInputElement).value);
    const r1 = Number((document.getElementById('field-rent-1') as HTMLInputElement).value);
    const r2 = Number((document.getElementById('field-rent-2') as HTMLInputElement).value);
    const r3 = Number((document.getElementById('field-rent-3') as HTMLInputElement).value);

    const rentReason = (document.getElementById('field-tile-reason') as HTMLInputElement).value.trim();
    const description = (
      document.getElementById('field-tile-desc') as HTMLTextAreaElement
    ).value.trim();

    const hasRents = !Number.isNaN(r0) && r0 > 0;

    current.type = type;
    current.colorGroup = groupRaw ? (groupRaw as ColorGroupId) : undefined;

    updateBoardTileConfigInPlace(idx, {
      name: name || current.name,
      icon: icon || current.icon,
      colorHex: colorHex || current.colorHex,
      price: priceRaw !== '' ? Number(priceRaw) : undefined,
      upgradeCost: upgradeRaw !== '' ? Number(upgradeRaw) : undefined,
      rents: hasRents ? [r0, r1 || r0, r2 || r1 || r0, r3 || r2 || r0] : undefined,
      rentReason: rentReason || undefined,
      description: description || current.description
    });
  }

  private renderRulesForm(): void {
    (document.getElementById('rule-initial-gold') as HTMLInputElement).value =
      `${GAME_RULES_CONFIG.initialGold}`;
    (document.getElementById('rule-start-bonus') as HTMLInputElement).value =
      `${GAME_RULES_CONFIG.startBonus}`;
    (document.getElementById('rule-alex-bonus') as HTMLInputElement).value =
      `${GAME_RULES_CONFIG.alexStartBonus}`;
    (document.getElementById('rule-steve-discount') as HTMLInputElement).value =
      `${GAME_RULES_CONFIG.steveUpgradeDiscountPct}`;
    (document.getElementById('rule-creeper-discount') as HTMLInputElement).value =
      `${GAME_RULES_CONFIG.creeperTaxDiscountPct}`;
    (document.getElementById('rule-enderman-bonus') as HTMLInputElement).value =
      `${GAME_RULES_CONFIG.endermanPortalBonus}`;
    (document.getElementById('rule-liquidation-rate') as HTMLInputElement).value =
      `${GAME_RULES_CONFIG.liquidationRatePct}`;
    (document.getElementById('rule-buyout-mult') as HTMLInputElement).value =
      `${GAME_RULES_CONFIG.buyoutMultiplier}`;
  }

  private collectRulesFormIntoRuntime(): void {
    const num = (id: string, fallback: number) => {
      const v = Number((document.getElementById(id) as HTMLInputElement).value);
      return Number.isFinite(v) && v >= 0 ? v : fallback;
    };

    GAME_RULES_CONFIG.initialGold = num('rule-initial-gold', 1500);
    GAME_RULES_CONFIG.startBonus = num('rule-start-bonus', 200);
    GAME_RULES_CONFIG.alexStartBonus = num('rule-alex-bonus', 240);
    GAME_RULES_CONFIG.steveUpgradeDiscountPct = num('rule-steve-discount', 15);
    GAME_RULES_CONFIG.creeperTaxDiscountPct = num('rule-creeper-discount', 20);
    GAME_RULES_CONFIG.endermanPortalBonus = num('rule-enderman-bonus', 50);
    GAME_RULES_CONFIG.liquidationRatePct = num('rule-liquidation-rate', 75);
    GAME_RULES_CONFIG.buyoutMultiplier = num('rule-buyout-mult', 1.8);
  }

  private renderCharactersAndChestCards(): void {
    const charsContainer = document.getElementById('characters-editor-grid')!;
    charsContainer.innerHTML = CHARACTER_CONFIGS.map(
      (c, i) => `
        <div class="entity-editor-card" data-char-idx="${i}">
          <div class="entity-card-header">
            <span>${c.emoji} Nhân Vật #${i + 1}: ${c.id.toUpperCase()}</span>
            <span style="color:${c.primaryColor}">${c.locomotion}</span>
          </div>
          <div class="admin-field">
            <label>Tên Hiển Thị</label>
            <input type="text" class="admin-input char-name" value="${c.name}" />
          </div>
          <div class="admin-field">
            <label>Danh Hiệu (` +
        '`title`' +
        `)</label>
            <input type="text" class="admin-input char-title" value="${c.title}" />
          </div>
          <div class="admin-field">
            <label>Tên Kỹ Năng Nội Tại (` +
        '`passiveName`' +
        `)</label>
            <input type="text" class="admin-input char-passive-name" value="${c.passiveName}" />
          </div>
          <div class="admin-field">
            <label>Mô Tả Nội Tại (` +
        '`passiveDescription`' +
        `)</label>
            <textarea rows="2" class="admin-input char-passive-desc">${c.passiveDescription}</textarea>
          </div>
        </div>
      `
    ).join('');

    const cardsContainer = document.getElementById('chest-cards-editor-grid')!;
    cardsContainer.innerHTML = CHEST_CARDS.map((card, i) => {
      const gDelta = card.goldDelta ?? 0;
      return `
        <div class="entity-editor-card" data-card-idx="${i}">
          <div class="entity-card-header">
            <span>🧰 Thẻ Rương #${i + 1} (${card.id})</span>
            <span>${gDelta >= 0 ? `+$${gDelta}` : `-$${Math.abs(gDelta)}`}</span>
          </div>
          <div class="admin-field">
            <label>Tiêu Đề Thẻ (\`title\`)</label>
            <input type="text" class="admin-input card-title" value="${card.title}" />
          </div>
          <div class="admin-field">
            <label>Nội Dung Sự Kiện (\`description\`)</label>
            <textarea rows="2" class="admin-input card-desc">${card.description}</textarea>
          </div>
          <div class="admin-form-grid">
            <div class="admin-field">
              <label>Thưởng / Phạt Tiền $ (\`goldDelta\`)</label>
              <input type="number" class="admin-input card-gold" value="${gDelta}" step="10" />
            </div>
            <div class="admin-field">
              <label>Bay Tới Ô # (\`moveToTile\` - Để trống nếu không)</label>
              <input type="number" class="admin-input card-move" value="${
                typeof card.moveToTile === 'number' ? card.moveToTile : ''
              }" min="0" max="39" />
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  private collectCharactersAndCardsIntoRuntime(): void {
    document
      .querySelectorAll<HTMLElement>('#characters-editor-grid .entity-editor-card')
      .forEach((cardEl) => {
        const idx = Number(cardEl.dataset.charIdx);
        const cfg = CHARACTER_CONFIGS[idx];
        if (!cfg) return;
        cfg.name =
          (cardEl.querySelector('.char-name') as HTMLInputElement)?.value.trim() || cfg.name;
        cfg.title =
          (cardEl.querySelector('.char-title') as HTMLInputElement)?.value.trim() || cfg.title;
        cfg.passiveName =
          (cardEl.querySelector('.char-passive-name') as HTMLInputElement)?.value.trim() ||
          cfg.passiveName;
        cfg.passiveDescription =
          (cardEl.querySelector('.char-passive-desc') as HTMLTextAreaElement)?.value.trim() ||
          cfg.passiveDescription;
      });

    document
      .querySelectorAll<HTMLElement>('#chest-cards-editor-grid .entity-editor-card')
      .forEach((cardEl) => {
        const idx = Number(cardEl.dataset.cardIdx);
        const card = CHEST_CARDS[idx];
        if (!card) return;
        card.title =
          (cardEl.querySelector('.card-title') as HTMLInputElement)?.value.trim() || card.title;
        card.description =
          (cardEl.querySelector('.card-desc') as HTMLTextAreaElement)?.value.trim() ||
          card.description;
        const goldVal = Number((cardEl.querySelector('.card-gold') as HTMLInputElement)?.value);
        if (Number.isFinite(goldVal)) {
          card.goldDelta = goldVal;
        }
        const moveRaw = (cardEl.querySelector('.card-move') as HTMLInputElement)?.value.trim();
        card.moveToTile = moveRaw !== '' ? Number(moveRaw) : undefined;
      });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MonopolyAdminConsole();
});
