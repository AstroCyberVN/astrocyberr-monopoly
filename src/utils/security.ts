import {
  BoardColorGroup,
  CharacterConfig,
  CharacterId,
  ChestCard,
  GameRulesConfig,
  TileConfig,
  TileType
} from '../core/boardData';

/**
 * Escapes untrusted strings before interpolating into HTML templates (`innerHTML`)
 * to prevent DOM-based Cross-Site Scripting (XSS) from imported JSON or Cloud configs.
 */
export function escapeHtml(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes a hex color string to ensure it cannot break CSS `style="..."` attributes.
 */
export function sanitizeColorHex(raw: unknown, fallback = '#10b981'): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

const VALID_TILE_TYPES = new Set<TileType>([
  'START',
  'PROPERTY',
  'RAILROAD',
  'UTILITY',
  'CHEST',
  'ROYAL_TAX',
  'DESERTED_ISLAND',
  'FESTIVAL',
  'END_PORTAL',
  'NETHER_PORTAL'
]);

const VALID_COLOR_GROUPS = new Set<BoardColorGroup>([
  'PLAINS',
  'OAK_FOREST',
  'BIRCH',
  'SWAMP',
  'CHERRY',
  'DESERT',
  'SNOWY_PEAKS',
  'REDSTONE',
  'CHERRY_GROVE',
  'TAIGA',
  'NETHER',
  'END_CITY',
  'END',
  'RAILROAD',
  'UTILITY',
  'SPECIAL'
]);

const VALID_CHAR_IDS = new Set<CharacterId>(['steve', 'alex', 'creeper', 'enderman']);

/**
 * Validates and sanitizes an incoming 40-tile configuration array against schema & bounds.
 */
export function validateTileConfigArray(
  input: unknown,
  fallbackTiles: TileConfig[]
): TileConfig[] {
  if (!Array.isArray(input) || input.length !== fallbackTiles.length) {
    return fallbackTiles;
  }

  return fallbackTiles.map((fb, idx) => {
    const item = input[idx] as Partial<TileConfig> | undefined;
    if (!item || typeof item !== 'object') return { ...fb };

    const safeType =
      item.type && VALID_TILE_TYPES.has(item.type) ? item.type : fb.type;
    const safeGroup =
      item.group && VALID_COLOR_GROUPS.has(item.group) ? item.group : fb.group;

    const safePrice =
      typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0
        ? Math.min(50000, Math.round(item.price))
        : fb.price;

    const safeUpgradeCost =
      typeof item.upgradeCost === 'number' &&
      Number.isFinite(item.upgradeCost) &&
      item.upgradeCost >= 0
        ? Math.min(50000, Math.round(item.upgradeCost))
        : fb.upgradeCost;

    let safeRents = fb.rents ? [...fb.rents] : undefined;
    if (Array.isArray(item.rents) && item.rents.length > 0) {
      const cleaned = item.rents
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n >= 0)
        .map((n) => Math.min(100000, Math.round(n)));
      if (cleaned.length > 0) {
        safeRents = cleaned;
      }
    }

    return {
      ...fb,
      name:
        typeof item.name === 'string' && item.name.trim().length > 0
          ? item.name.trim().slice(0, 64)
          : fb.name,
      type: safeType,
      group: safeGroup,
      colorGroup: safeGroup !== 'SPECIAL' && safeGroup !== 'RAILROAD' && safeGroup !== 'UTILITY' ? safeGroup : fb.colorGroup,
      colorHex: sanitizeColorHex(item.colorHex, fb.colorHex),
      icon:
        typeof item.icon === 'string' && item.icon.trim().length > 0
          ? item.icon.trim().slice(0, 8)
          : fb.icon,
      price: safePrice,
      upgradeCost: safeUpgradeCost,
      rents: safeRents,
      rentReason:
        typeof item.rentReason === 'string'
          ? item.rentReason.trim().slice(0, 140)
          : fb.rentReason,
      description:
        typeof item.description === 'string' && item.description.trim().length > 0
          ? item.description.trim().slice(0, 260)
          : fb.description
    };
  });
}

function clampNum(val: unknown, min: number, max: number, fallback: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

/**
 * Validates and clamps `GameRulesConfig` fields to safe economic ranges.
 */
export function validateRulesConfig(
  input: unknown,
  fallback: GameRulesConfig
): GameRulesConfig {
  if (!input || typeof input !== 'object') return { ...fallback };
  const raw = input as Partial<GameRulesConfig>;
  return {
    startingGold: clampNum(raw.startingGold, 200, 50000, fallback.startingGold),
    passStartReward: clampNum(raw.passStartReward, 0, 10000, fallback.passStartReward),
    jailFineAmount: clampNum(raw.jailFineAmount, 0, 5000, fallback.jailFineAmount),
    mortgageRatePct: clampNum(raw.mortgageRatePct, 10, 90, fallback.mortgageRatePct),
    unmortgageRatePct: clampNum(raw.unmortgageRatePct, 10, 150, fallback.unmortgageRatePct),
    liquidationRatePct: clampNum(raw.liquidationRatePct, 10, 100, fallback.liquidationRatePct),
    monopolyBonusPct: clampNum(raw.monopolyBonusPct, 0, 300, fallback.monopolyBonusPct),
    hostileBuyoutMultiplierPct: clampNum(
      raw.hostileBuyoutMultiplierPct,
      100,
      500,
      fallback.hostileBuyoutMultiplierPct
    ),
    netherWarpGoldBonus: clampNum(
      raw.netherWarpGoldBonus,
      0,
      5000,
      fallback.netherWarpGoldBonus
    ),
    festivalNoPropertyGoldBonus: clampNum(
      raw.festivalNoPropertyGoldBonus,
      0,
      5000,
      fallback.festivalNoPropertyGoldBonus
    ),
    steveUpgradeDiscountPct: clampNum(
      raw.steveUpgradeDiscountPct,
      0,
      80,
      fallback.steveUpgradeDiscountPct
    ),
    alexStartBonus: clampNum(raw.alexStartBonus, 0, 5000, fallback.alexStartBonus),
    creeperTaxDiscountPct: clampNum(
      raw.creeperTaxDiscountPct,
      0,
      90,
      fallback.creeperTaxDiscountPct
    ),
    endermanPortalBonus: clampNum(
      raw.endermanPortalBonus,
      0,
      5000,
      fallback.endermanPortalBonus
    )
  };
}

/**
 * Validates and sanitizes the 4 Character Configurations.
 */
export function validateCharacterConfigs(
  input: unknown,
  fallback: CharacterConfig[]
): CharacterConfig[] {
  if (!Array.isArray(input) || input.length === 0) return fallback.map((c) => ({ ...c }));
  return fallback.map((fb) => {
    const found = input.find(
      (item: unknown) =>
        item &&
        typeof item === 'object' &&
        VALID_CHAR_IDS.has((item as CharacterConfig).id) &&
        (item as CharacterConfig).id === fb.id
    ) as Partial<CharacterConfig> | undefined;

    if (!found) return { ...fb };
    return {
      id: fb.id,
      name:
        typeof found.name === 'string' && found.name.trim()
          ? found.name.trim().slice(0, 40)
          : fb.name,
      title:
        typeof found.title === 'string' && found.title.trim()
          ? found.title.trim().slice(0, 60)
          : fb.title,
      color: sanitizeColorHex(found.color, fb.color),
      accentColor: sanitizeColorHex(found.accentColor, fb.accentColor),
      emoji:
        typeof found.emoji === 'string' && found.emoji.trim()
          ? found.emoji.trim().slice(0, 8)
          : fb.emoji,
      passiveName:
        typeof found.passiveName === 'string' && found.passiveName.trim()
          ? found.passiveName.trim().slice(0, 64)
          : fb.passiveName,
      passiveDescription:
        typeof found.passiveDescription === 'string' && found.passiveDescription.trim()
          ? found.passiveDescription.trim().slice(0, 220)
          : fb.passiveDescription
    };
  });
}

/**
 * Validates and sanitizes the 15 Chest Cards (Khí Vận & Cơ Hội).
 */
export function validateChestCards(
  input: unknown,
  fallback: ChestCard[]
): ChestCard[] {
  if (!Array.isArray(input) || input.length === 0) return fallback.map((c) => ({ ...c }));
  return fallback.map((fb, idx) => {
    const raw = (input[idx] ??
      input.find((x: unknown) => x && typeof x === 'object' && (x as ChestCard).id === fb.id)) as
      | Partial<ChestCard>
      | undefined;
    if (!raw || typeof raw !== 'object') return { ...fb };

    const deck = raw.deck === 'KHI_VAN' || raw.deck === 'CO_HOI' ? raw.deck : fb.deck;
    const goldDelta = clampNum(raw.goldDelta, -5000, 5000, fb.goldDelta);

    const moveToTile =
      typeof raw.moveToTile === 'number' &&
      Number.isFinite(raw.moveToTile) &&
      raw.moveToTile >= 0 &&
      raw.moveToTile < 40
        ? Math.round(raw.moveToTile)
        : undefined;

    const stepDelta =
      typeof raw.stepDelta === 'number' &&
      Number.isFinite(raw.stepDelta) &&
      raw.stepDelta !== 0
        ? clampNum(raw.stepDelta, -20, 20, 0)
        : undefined;

    const collectFromEachPlayer =
      typeof raw.collectFromEachPlayer === 'number' &&
      Number.isFinite(raw.collectFromEachPlayer) &&
      raw.collectFromEachPlayer > 0
        ? clampNum(raw.collectFromEachPlayer, 0, 2000, 0)
        : undefined;

    return {
      id: fb.id,
      deck,
      title:
        typeof raw.title === 'string' && raw.title.trim()
          ? raw.title.trim().slice(0, 80)
          : fb.title,
      description:
        typeof raw.description === 'string' && raw.description.trim()
          ? raw.description.trim().slice(0, 240)
          : fb.description,
      goldDelta,
      moveToTile,
      stepDelta,
      collectFromEachPlayer,
      goToJail: Boolean(raw.goToJail),
      grantGetOutOfJailCard: Boolean(raw.grantGetOutOfJailCard)
    };
  });
}
