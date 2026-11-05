import { CharacterId } from './boardData';
import { GameMode } from './gameEngine';

export interface GameEventMap {
  'lobby:started': {
    mode: GameMode;
    humanCount: number;
    primaryCharacter: CharacterId;
    roomCode?: string;
  };
  'turn:started': {
    round: number;
    playerId: string;
    playerName: string;
  };
  'dice:rolled': {
    playerId: string;
    d1: number;
    d2: number;
    total: number;
    isDoubles: boolean;
  };
  'tile:landed': {
    playerId: string;
    tileIndex: number;
    action: string;
  };
  'property:bought': {
    playerId: string;
    tileIndex: number;
    price: number;
  };
  'property:upgraded': {
    playerId: string;
    tileIndex: number;
    level: number;
    cost: number;
  };
  'property:traded': {
    fromPlayerId: string;
    toPlayerId: string;
    targetTileIndex: number;
    offeredTileIndex?: number;
    cashOffer: number;
  };
  PROPERTY_TRADED: {
    proposerId: string;
    targetOwnerId: string;
    tileIndex: number;
    cashOffer: number;
  };
  'festival:boosted': {
    playerId: string;
    tileIndex: number;
    multiplier: number;
    turnsLeft: number;
  };
  'portal:teleported': {
    playerId: string;
    fromTile: number;
    toTile: number;
    reason: 'PORTAL_20' | 'PORTAL_30' | 'NETHER_33' | 'CHEST_CARD' | 'JAIL_ESCAPE';
  };
  'config:updated': {
    updatedAt?: string;
    source: 'CLOUD' | 'ADMIN' | 'FACTORY_RESET';
  };
}

type EventHandler<T> = (payload: T) => void;

/**
 * Strongly-typed Pub/Sub Event Bus decoupling `GameEngine`, 3D Scene, Audio, and Network layers.
 */
export class TypedEventBus {
  private listeners = new Map<keyof GameEventMap, Set<EventHandler<unknown>>>();

  public on<K extends keyof GameEventMap>(
    event: K,
    handler: EventHandler<GameEventMap[K]>
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as EventHandler<unknown>);
    return () => {
      set?.delete(handler as EventHandler<unknown>);
    };
  }

  public emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(payload);
      } catch {
        // Prevent individual listener errors from breaking the core game loop
      }
    }
  }
}

export const gameEventBus = new TypedEventBus();
