import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  BOARD_TILES,
  CHARACTER_CONFIGS,
  CHEST_CARDS,
  CharacterConfig,
  ChestCard,
  FACTORY_CHARACTER_CONFIGS,
  FACTORY_CHEST_CARDS,
  FACTORY_RULES_CONFIG,
  FACTORY_TILES_40,
  GAME_RULES_CONFIG,
  GameRulesConfig,
  TileConfig,
  getTileGridCoord40
} from '../core/boardData';
import { gameEventBus } from '../core/EventBus';
import {
  validateCharacterConfigs,
  validateChestCards,
  validateRulesConfig,
  validateTileConfigArray
} from '../utils/security';

const SUPABASE_URL: string =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL ?? '';

const SUPABASE_ANON_KEY: string =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('your-project-id') &&
    SUPABASE_ANON_KEY.length > 20
);

/**
 * Parses authorized admin emails from `VITE_ADMIN_EMAILS` env variable (if set).
 * Primary write protection is enforced server-side via Supabase Row-Level Security (RLS).
 */
export function getConfiguredAdminEmails(): string[] {
  const raw =
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_ADMIN_EMAILS ?? '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const configured = getConfiguredAdminEmails();
  // If VITE_ADMIN_EMAILS is configured, enforce client-side allowlist in addition to Supabase RLS;
  // otherwise allow authenticated Google OAuth users who pass Supabase RLS policies.
  if (configured.length > 0) {
    return configured.includes(normalized);
  }
  return normalized.includes('@');
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export interface MonopolyCloudConfigRow {
  id: string;
  tiles_config: TileConfig[];
  rules_config: GameRulesConfig;
  characters_config: CharacterConfig[];
  chest_cards_config: ChestCard[];
  updated_at?: string;
  updated_by?: string | null;
}

/**
 * Applies a validated `MonopolyCloudConfigRow` in-place onto the live in-memory arrays/objects
 * (`BOARD_TILES`, `GAME_RULES_CONFIG`, `CHARACTER_CONFIGS`, `CHEST_CARDS`).
 */
export function applyCloudConfigToMemory(row: Partial<MonopolyCloudConfigRow>): void {
  if (Array.isArray(row.tiles_config) && row.tiles_config.length === BOARD_TILES.length) {
    const validatedTiles = validateTileConfigArray(row.tiles_config, BOARD_TILES);
    validatedTiles.forEach((t, idx) => {
      const coords = getTileGridCoord40(idx);
      BOARD_TILES[idx] = {
        ...BOARD_TILES[idx],
        ...t,
        index: idx,
        rents: Array.isArray(t.rents) ? [...t.rents] : BOARD_TILES[idx].rents,
        ...coords
      };
    });
  }

  if (row.rules_config && typeof row.rules_config === 'object') {
    const validatedRules = validateRulesConfig(row.rules_config, GAME_RULES_CONFIG);
    Object.assign(GAME_RULES_CONFIG, validatedRules);
  }

  if (Array.isArray(row.characters_config) && row.characters_config.length > 0) {
    const validatedChars = validateCharacterConfigs(row.characters_config, CHARACTER_CONFIGS);
    validatedChars.forEach((c, idx) => {
      if (CHARACTER_CONFIGS[idx]) {
        CHARACTER_CONFIGS[idx] = { ...CHARACTER_CONFIGS[idx], ...c };
      }
    });
  }

  if (Array.isArray(row.chest_cards_config) && row.chest_cards_config.length > 0) {
    const validatedCards = validateChestCards(row.chest_cards_config, CHEST_CARDS);
    CHEST_CARDS.length = 0;
    validatedCards.forEach((card) => {
      CHEST_CARDS.push({ ...card });
    });
  }
}

/**
 * Restores all 40 tiles, Global Rules, 4 Characters, and 15 Chest Cards back to their
 * immutable Factory Default values in memory.
 */
export function resetMonopolyConfigToFactoryDefault(): void {
  applyCloudConfigToMemory({
    tiles_config: FACTORY_TILES_40.map((t) => ({
      ...t,
      rents: t.rents ? [...t.rents] : undefined
    })),
    rules_config: { ...FACTORY_RULES_CONFIG },
    characters_config: FACTORY_CHARACTER_CONFIGS.map((c) => ({ ...c })),
    chest_cards_config: FACTORY_CHEST_CARDS.map((c) => ({ ...c }))
  });
  gameEventBus.emit('config:updated', {
    updatedAt: new Date().toISOString(),
    source: 'FACTORY_RESET'
  });
}

/**
 * Fetches the active `default` configuration from Supabase (`public.monopoly_config`)
 * and applies it to the game memory.
 */
export async function fetchAndApplyMonopolyCloudConfig(): Promise<MonopolyCloudConfigRow | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('monopoly_config')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as MonopolyCloudConfigRow;
    applyCloudConfigToMemory(row);
    gameEventBus.emit('config:updated', {
      updatedAt: row.updated_at,
      source: 'CLOUD'
    });
    return row;
  } catch {
    return null;
  }
}

/**
 * Saves the complete configuration (40 Tiles + Global Rules + 4 Characters + 15 Chest Cards)
 * to Supabase (`public.monopoly_config` row `id = 'default'`).
 */
export async function saveMonopolyCloudConfig(
  updatedByEmail?: string | null
): Promise<{ ok: boolean; error?: string; updatedAt?: string }> {
  if (!supabase) {
    return {
      ok: false,
      error:
        'Chưa cấu hình VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY trong file .env. Đã lưu tạm vào bộ nhớ cục bộ.'
    };
  }

  const cleanTiles = validateTileConfigArray(BOARD_TILES, FACTORY_TILES_40).map((t) => ({
    index: t.index,
    name: t.name,
    type: t.type,
    group: t.group,
    colorHex: t.colorHex,
    icon: t.icon,
    price: t.price,
    upgradeCost: t.upgradeCost,
    rents: t.rents ? [...t.rents] : undefined,
    rentReason: t.rentReason,
    description: t.description,
    gridX: t.gridX,
    gridZ: t.gridZ,
    outwardRotationY: t.outwardRotationY
  }));

  const cleanRules = validateRulesConfig(GAME_RULES_CONFIG, FACTORY_RULES_CONFIG);
  const cleanChars = validateCharacterConfigs(CHARACTER_CONFIGS, FACTORY_CHARACTER_CONFIGS);
  const cleanCards = validateChestCards(CHEST_CARDS, FACTORY_CHEST_CARDS);

  const nowIso = new Date().toISOString();

  const { error } = await supabase.from('monopoly_config').upsert(
    {
      id: 'default',
      tiles_config: cleanTiles,
      rules_config: cleanRules,
      characters_config: cleanChars,
      chest_cards_config: cleanCards,
      updated_at: nowIso,
      updated_by: updatedByEmail ?? null
    },
    { onConflict: 'id' }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  gameEventBus.emit('config:updated', {
    updatedAt: nowIso,
    source: 'ADMIN'
  });

  return { ok: true, updatedAt: nowIso };
}

/**
 * Subscribes to real-time updates on `public.monopoly_config` so any changes saved in `/admin`
 * immediately update all connected 3D boards without reloading!
 */
export function subscribeMonopolyCloudConfigRealtime(
  onUpdate: (row: MonopolyCloudConfigRow) => void
): () => void {
  if (!supabase) {
    return () => {};
  }

  const channel = supabase
    .channel('monopoly_config_realtime_sync')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'monopoly_config',
        filter: 'id=eq.default'
      },
      (payload) => {
        if (payload.new && typeof payload.new === 'object') {
          const row = payload.new as MonopolyCloudConfigRow;
          applyCloudConfigToMemory(row);
          gameEventBus.emit('config:updated', {
            updatedAt: row.updated_at,
            source: 'CLOUD'
          });
          onUpdate(row);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
