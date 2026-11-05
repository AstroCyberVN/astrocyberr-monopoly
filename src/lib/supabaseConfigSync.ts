import { createClient, RealtimeChannel, SupabaseClient, User } from '@supabase/supabase-js';
import { RawTileConfigItem, TILES_CONFIG_40 } from '../config/tilesConfig';
import {
  BOARD_SIZE,
  BOARD_TILES,
  CHARACTER_CONFIGS,
  CHEST_CARDS,
  CharacterConfig,
  ChestCard,
  GAME_RULES_CONFIG,
  MonopolyRulesConfig,
  getExportableTilesSpecArray,
  getPerimeterGridCoords40
} from '../core/boardData';

const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
const SUPABASE_URL =
  viteEnv?.VITE_SUPABASE_URL || 'https://ichwmsoceppybdyiycyj.supabase.co';
const SUPABASE_ANON_KEY =
  viteEnv?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljaHdtc29jZXBweWJkeWl5Y3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MzA1NzMsImV4cCI6MjEwOTAwNjU3M30.XH6KLBDhbGQxkTja77b1RzaZxkdpC2faD5KEp7XtfpE';

export const ALLOWED_ADMIN_EMAILS: readonly string[] = [
  'astrocyberr@gmail.com',
  'tructhuy1910@gmail.com'
];

export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ALLOWED_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export interface MonopolyCloudRow {
  id: string;
  tiles_json: RawTileConfigItem[];
  rules_json: MonopolyRulesConfig;
  characters_json: CharacterConfig[];
  chest_cards_json: ChestCard[];
  updated_at?: string;
  updated_by?: string | null;
}

export function applyCloudConfigToRuntime(row: Partial<MonopolyCloudRow>): void {
  // 1. Apply 40 Tiles
  if (Array.isArray(row.tiles_json) && row.tiles_json.length === BOARD_SIZE) {
    TILES_CONFIG_40.forEach((base, idx) => {
      const incoming = row.tiles_json![idx] || base;
      BOARD_TILES[idx] = {
        ...base,
        ...incoming,
        index: idx,
        ...getPerimeterGridCoords40(idx)
      };
    });
  }

  // 2. Apply Game Rules
  if (row.rules_json && typeof row.rules_json === 'object') {
    Object.assign(GAME_RULES_CONFIG, row.rules_json);
  }

  // 3. Apply 4 Chibi Characters
  if (Array.isArray(row.characters_json) && row.characters_json.length === CHARACTER_CONFIGS.length) {
    row.characters_json.forEach((incomingChar, idx) => {
      if (CHARACTER_CONFIGS[idx]) {
        Object.assign(CHARACTER_CONFIGS[idx], incomingChar);
      }
    });
  }

  // 4. Apply Chest Cards
  if (Array.isArray(row.chest_cards_json) && row.chest_cards_json.length > 0) {
    CHEST_CARDS.splice(0, CHEST_CARDS.length, ...row.chest_cards_json);
  }
}

export async function fetchAndApplyMonopolyCloudConfig(): Promise<MonopolyCloudRow | null> {
  try {
    const { data, error } = await supabase
      .from('monopoly_config')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as MonopolyCloudRow;
    applyCloudConfigToRuntime(row);
    return row;
  } catch {
    return null;
  }
}

const realtimeListeners = new Set<(row: MonopolyCloudRow) => void>();
let activeRealtimeChannel: RealtimeChannel | null = null;

export function subscribeMonopolyCloudConfigRealtime(
  onUpdated: (row: MonopolyCloudRow) => void
): () => void {
  realtimeListeners.add(onUpdated);

  if (!activeRealtimeChannel) {
    activeRealtimeChannel = supabase
      .channel('monopoly_config_live_sync')
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
            const row = payload.new as MonopolyCloudRow;
            applyCloudConfigToRuntime(row);
            realtimeListeners.forEach((listener) => listener(row));
          }
        }
      )
      .subscribe();
  }

  return () => {
    realtimeListeners.delete(onUpdated);
    if (realtimeListeners.size === 0 && activeRealtimeChannel) {
      const ch = activeRealtimeChannel;
      activeRealtimeChannel = null;
      supabase.removeChannel(ch);
    }
  };
}

export async function saveMonopolyCloudConfigToSupabase(
  user?: User | null,
  payload?: Partial<MonopolyCloudRow>
): Promise<{ ok: boolean; error?: string; updatedAt?: string }> {
  let activeUser = user ?? null;
  if (!activeUser) {
    const { data } = await supabase.auth.getSession();
    activeUser = data.session?.user ?? null;
  }

  if (!activeUser || !isAuthorizedAdminEmail(activeUser.email)) {
    return {
      ok: false,
      error: 'Email của bạn không nằm trong danh sách quản trị viên được phép ghi dữ liệu.'
    };
  }

  const nowIso = new Date().toISOString();
  const rowToSave: MonopolyCloudRow = {
    id: 'default',
    tiles_json: payload?.tiles_json ?? getExportableTilesSpecArray(),
    rules_json: payload?.rules_json ?? { ...GAME_RULES_CONFIG },
    characters_json: payload?.characters_json ?? structuredClone(CHARACTER_CONFIGS),
    chest_cards_json: payload?.chest_cards_json ?? structuredClone(CHEST_CARDS),
    updated_at: nowIso,
    updated_by: activeUser.email ?? null
  };

  const { error } = await supabase.from('monopoly_config').upsert(rowToSave, {
    onConflict: 'id'
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  applyCloudConfigToRuntime(rowToSave);
  return { ok: true, updatedAt: nowIso };
}
