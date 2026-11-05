import { RealtimeChannel } from '@supabase/supabase-js';
import { SerializedGameState, TradeProposal } from '../core/gameEngine';
import { supabase } from '../lib/supabaseConfigSync';

export interface RoomEmotePayload {
  playerId: string;
  emoji: string;
  text: string;
}

interface RoomMessage {
  type: 'STATE_SYNC' | 'TRADE_PROPOSAL' | 'QUICK_EMOTE';
  roomCode: string;
  senderId: string;
  payload?: SerializedGameState;
  trade?: TradeProposal;
  emote?: RoomEmotePayload;
}

/**
 * Dual-Transport Multiplayer Room Synchronizer:
 * 1. Primary Cloud Transport: Supabase Realtime (`supabase.channel('monopoly_room_' + roomCode)`)
 *    with Broadcast events (`STATE_SYNC`, `TRADE_PROPOSAL`, `QUICK_EMOTE`) and Presence tracking!
 * 2. Local Multi-Tab Fallback: `BroadcastChannel` (`astrocyberr_monopoly_40_room_<roomCode>`)
 *    so multi-tab testing works instantaneously even when offline.
 */
export class RoomSync {
  private channel: BroadcastChannel | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private roomCode = '';
  private clientId = `peer_${Math.random().toString(36).slice(2, 9)}`;
  private onlinePeerCount = 1;

  private onStateReceived: ((state: SerializedGameState) => void) | null = null;
  private onTradeProposalReceived: ((trade: TradeProposal) => void) | null = null;
  private onEmoteReceived: ((emote: RoomEmotePayload) => void) | null = null;
  private onPeerCountChanged: ((count: number) => void) | null = null;

  public joinRoom(
    code: string,
    onStateUpdate: (state: SerializedGameState) => void,
    options?: {
      onTradeProposal?: (trade: TradeProposal) => void;
      onEmote?: (emote: RoomEmotePayload) => void;
      onPeerCount?: (count: number) => void;
    }
  ): string {
    this.leaveRoom();
    this.roomCode = code.trim().toUpperCase() || this.generateRoomCode();
    this.onStateReceived = onStateUpdate;
    this.onTradeProposalReceived = options?.onTradeProposal ?? null;
    this.onEmoteReceived = options?.onEmote ?? null;
    this.onPeerCountChanged = options?.onPeerCount ?? null;

    // 1. Local BroadcastChannel (Multi-tab instant sync)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(`astrocyberr_monopoly_40_room_${this.roomCode}`);
      this.channel.onmessage = (ev: MessageEvent<RoomMessage>) => {
        this.handleIncomingMessage(ev.data);
      };
    }

    // 2. Cloud Supabase Realtime Broadcast + Presence
    if (supabase) {
      this.realtimeChannel = supabase.channel(`monopoly_room_${this.roomCode}`, {
        config: {
          broadcast: { self: false },
          presence: { key: this.clientId }
        }
      });

      this.realtimeChannel
        .on('broadcast', { event: 'room_msg' }, ({ payload }) => {
          if (payload && typeof payload === 'object') {
            this.handleIncomingMessage(payload as RoomMessage);
          }
        })
        .on('presence', { event: 'sync' }, () => {
          if (!this.realtimeChannel) return;
          const state = this.realtimeChannel.presenceState();
          const count = Math.max(1, Object.keys(state).length);
          this.onlinePeerCount = count;
          this.onPeerCountChanged?.(count);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && this.realtimeChannel) {
            await this.realtimeChannel.track({
              online_at: new Date().toISOString(),
              clientId: this.clientId
            });
          }
        });
    }

    return this.roomCode;
  }

  private handleIncomingMessage(msg: RoomMessage | undefined): void {
    if (!msg || msg.roomCode !== this.roomCode || msg.senderId === this.clientId) return;

    if (msg.type === 'STATE_SYNC' && msg.payload && this.onStateReceived) {
      this.onStateReceived(msg.payload);
    } else if (msg.type === 'TRADE_PROPOSAL' && msg.trade && this.onTradeProposalReceived) {
      this.onTradeProposalReceived(msg.trade);
    } else if (msg.type === 'QUICK_EMOTE' && msg.emote && this.onEmoteReceived) {
      this.onEmoteReceived(msg.emote);
    }
  }

  public broadcastState(state: SerializedGameState): void {
    if (!this.roomCode) return;
    const msg: RoomMessage = {
      type: 'STATE_SYNC',
      roomCode: this.roomCode,
      senderId: this.clientId,
      payload: state
    };
    this.sendMessage(msg);
  }

  public broadcastTradeProposal(trade: TradeProposal): void {
    if (!this.roomCode) return;
    const msg: RoomMessage = {
      type: 'TRADE_PROPOSAL',
      roomCode: this.roomCode,
      senderId: this.clientId,
      trade
    };
    this.sendMessage(msg);
  }

  public broadcastQuickEmote(emote: RoomEmotePayload): void {
    if (!this.roomCode) return;
    const msg: RoomMessage = {
      type: 'QUICK_EMOTE',
      roomCode: this.roomCode,
      senderId: this.clientId,
      emote
    };
    this.sendMessage(msg);
  }

  private sendMessage(msg: RoomMessage): void {
    if (this.channel) {
      this.channel.postMessage(msg);
    }
    if (this.realtimeChannel) {
      this.realtimeChannel
        .send({
          type: 'broadcast',
          event: 'room_msg',
          payload: msg
        })
        .catch(() => {});
    }
  }

  public leaveRoom(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.realtimeChannel && supabase) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.roomCode = '';
    this.onlinePeerCount = 1;
  }

  public getRoomCode(): string {
    return this.roomCode;
  }

  public getOnlinePeerCount(): number {
    return this.onlinePeerCount;
  }

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 6; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }
}
