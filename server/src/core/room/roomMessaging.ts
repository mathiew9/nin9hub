import type { Namespace, Server } from "socket.io";
import type { GameAdapter } from "./roomService";
import type { Room } from "../typesCore";
import { playersCount } from "../storeCore";

export class RoomMessaging<TState, TGameSettings, TMove> {
  constructor(
    private nsp: Namespace | Server,
    private adapter: GameAdapter<TState, TGameSettings, TMove>,
    private buildClientSettings: (room: Room<TState, TGameSettings>) => any,
  ) {}

  roomChannel(roomId: string) {
    return `${this.adapter.gameKey}:${roomId}`;
  }

  emitWaiting(room: Room<TState, TGameSettings>) {
    this.nsp
      .to(this.roomChannel(room.id))
      .emit(this.adapter.serverEvents.Waiting, {
        players: playersCount(room),
      });
  }

  broadcastState(room: Room<TState, TGameSettings>) {
    this.nsp
      .to(this.roomChannel(room.id))
      .emit(this.adapter.serverEvents.State, {
        roomId: room.id,
        gameKey: room.gameKey,
        started: room.started,
        playersCount: playersCount(room),
        stateVersion: room.stateVersion,
        hostId: room.hostId,
        guestId: room.guestId,
        seats: room.seats,
        players: room.players,
        matchScore: room.matchScore,
        matchWinner: room.matchWinner,
        settingsBase: room.settingsBase,
        gameSettings: room.gameSettings,
        settings: this.buildClientSettings(room),
        state: room.state,
      });
  }

  emitRematchStatus(roomId: string, votes: number) {
    this.nsp
      .to(this.roomChannel(roomId))
      .emit(this.adapter.serverEvents.RematchStatus, { votes });
  }

  emitOpponentLeft(args: {
    roomId: string;
    hostId: string;
    players: number;
    stateVersion: number;
  }) {
    this.nsp
      .to(this.roomChannel(args.roomId))
      .emit(this.adapter.serverEvents.OpponentLeft, args);
  }
}
