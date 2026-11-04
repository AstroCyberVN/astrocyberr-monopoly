import { SerializedGameState } from '../core/gameEngine';

export interface RoomMessage {
  senderTabId: string;
  roomCode: string;
  type: 'STATE_SYNC' | 'PING_JOIN';
  state?: SerializedGameState;
  timestamp: number;
}

export class RoomSync {
  private tabId = `tab_${Math.random().toString(36).slice(2, 9)}`;
  private roomCode = 'ASTRO-888';
  private channel: BroadcastChannel | null = null;
  private onStateReceived: ((state: SerializedGameState) => void) | null = null;
  private peerCount = 1;

  public connect(
    roomCode: string,
    onStateReceived: (state: SerializedGameState) => void
  ): void {
    this.disconnect();
    this.roomCode = roomCode.trim().toUpperCase() || 'ASTRO-888';
    this.onStateReceived = onStateReceived;

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(`astrocyberr_monopoly_${this.roomCode}`);
      this.channel.onmessage = (ev: MessageEvent<RoomMessage>) => {
        const msg = ev.data;
        if (!msg || msg.senderTabId === this.tabId) return;

        if (msg.type === 'PING_JOIN') {
          this.peerCount = Math.min(4, this.peerCount + 1);
        } else if (msg.type === 'STATE_SYNC' && msg.state && this.onStateReceived) {
          this.onStateReceived(msg.state);
        }
      };

      const joinMsg: RoomMessage = {
        senderTabId: this.tabId,
        roomCode: this.roomCode,
        type: 'PING_JOIN',
        timestamp: Date.now()
      };
      this.channel.postMessage(joinMsg);
    }
  }

  public broadcastState(state: SerializedGameState): void {
    if (!this.channel) return;
    const msg: RoomMessage = {
      senderTabId: this.tabId,
      roomCode: this.roomCode,
      type: 'STATE_SYNC',
      state,
      timestamp: Date.now()
    };
    this.channel.postMessage(msg);
  }

  public getRoomCode(): string {
    return this.roomCode;
  }

  public disconnect(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}
