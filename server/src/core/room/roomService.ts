import type { Namespace, Server, Socket } from "socket.io";
import type {
  Ack,
  GameKey,
  ClientToServerEvents,
  ServerToClientEvents,
  Room,
  RoomSettingsBase,
  Seat,
} from "../typesCore";
import {
  deleteRoom,
  getRoom,
  getRoomIdBySocket,
  mapSocketToRoom,
  playersCount,
  removePlayerBySocket,
  saveRoom,
  unmapSocket,
} from "../storeCore";
import { genRoomCode } from "../utils";
import { ok, err } from "../ack";
import { RoomMessaging } from "./roomMessaging";
import { RoomSettings } from "./roomSettings";
import { RoomTimers } from "./roomTimers";

/**
 * Adapter : chaque jeu implémente ces fonctions.
 */
export type GameAdapter<TState, TGameSettings, TMove> = {
  gameKey: GameKey;
  clientEvents: ClientToServerEvents;
  serverEvents: ServerToClientEvents;

  defaultBaseSettings(): RoomSettingsBase;
  defaultGameSettings(): TGameSettings;

  sanitizeBaseSettings(partial: Partial<RoomSettingsBase>): RoomSettingsBase;
  sanitizeGameSettings(partial: Partial<TGameSettings>): TGameSettings;

  createInitialState(args: {
    baseSettings: RoomSettingsBase;
    gameSettings: TGameSettings;
    seats: { p1: string; p2: string };
  }): TState;

  canStart(
    room: Room<TState, TGameSettings>,
  ): { ok: true } | { ok: false; code: string; message: string };

  validateMove(args: {
    room: Room<TState, TGameSettings>;
    seat: Seat;
    move: TMove;
  }): { ok: true } | { ok: false; code: string; message: string };

  applyMove(args: {
    room: Room<TState, TGameSettings>;
    seat: Seat;
    move: TMove;
  }): void;

  onLeave?(args: {
    room: Room<TState, TGameSettings>;
    leavingSocketId: string;
  }): void;

  onRematchAccepted?(args: { room: Room<TState, TGameSettings> }): void;

  onTurnTimeout?(args: {
    room: Room<TState, TGameSettings>;
  }): { ok: true; move: TMove } | { ok: false };
};

export class RoomService<TState, TGameSettings, TMove> {
  private settings: RoomSettings<TState, TGameSettings, TMove>;
  private messaging: RoomMessaging<TState, TGameSettings, TMove>;
  private timers: RoomTimers<TState, TGameSettings, TMove>;

  constructor(
    private io: Server,
    private nsp: Namespace | Server,
    private adapter: GameAdapter<TState, TGameSettings, TMove>,
  ) {
    this.settings = new RoomSettings(adapter);
    this.messaging = new RoomMessaging(nsp, adapter, (room) =>
      this.settings.buildClientSettings(room),
    );
    this.timers = new RoomTimers(
      adapter,
      (roomId) => getRoom(roomId) as Room<TState, TGameSettings> | undefined,
      (room) => saveRoom(room as any),
      (room) => this.messaging.broadcastState(room),
    );
  }

  private seatFromSocket(room: Room<TState, TGameSettings>, socketId: string) {
    if (room.seats.p1 === socketId) return "p1";
    if (room.seats.p2 === socketId) return "p2";
    return null;
  }

  private rateLimitOk(room: Room<TState, TGameSettings>, socketId: string) {
    const ms = Math.max(0, Math.floor(room.settingsBase.moveRateLimitMs ?? 0));
    if (ms <= 0) return true;

    const now = Date.now();
    if (!room.lastMoveAtBySocket) room.lastMoveAtBySocket = {};
    const last = room.lastMoveAtBySocket[socketId] ?? 0;

    if (now - last < ms) return false;
    room.lastMoveAtBySocket[socketId] = now;
    return true;
  }

  private resetState(room: Room<TState, TGameSettings>) {
    room.state = this.adapter.createInitialState({
      baseSettings: room.settingsBase,
      gameSettings: room.gameSettings,
      seats: room.seats,
    });
  }

  private getMyRoom(socket: Socket, ack?: Ack<any>) {
    const roomId = getRoomIdBySocket(socket.id);
    if (!roomId) {
      err(ack, "NOT_IN_ROOM", "Tu n'es pas dans une room.");
      return null;
    }

    const room = getRoom(roomId) as Room<TState, TGameSettings> | undefined;
    if (!room || room.gameKey !== this.adapter.gameKey) {
      err(ack, "ROOM_NOT_FOUND", "Room introuvable.");
      return null;
    }

    return room;
  }

  /* ---------------- PUBLIC API ---------------- */

  swapRoles(socket: Socket, ack?: Ack<{}>) {
    const room = this.getMyRoom(socket, ack);
    if (!room) return;

    if (socket.id !== room.hostId)
      return err(ack, "ONLY_HOST", "Seul l'hôte peut inverser.");

    if (room.started)
      return err(ack, "GAME_STARTED", "Impossible pendant la partie.");

    if (!room.seats.p1 || !room.seats.p2)
      return err(ack, "NEED_2_PLAYERS", "Il faut deux joueurs.");

    const tmpSeat = room.seats.p1;
    room.seats.p1 = room.seats.p2;
    room.seats.p2 = tmpSeat;

    const tmpLabel = room.players.p1;
    room.players.p1 = room.players.p2;
    room.players.p2 = tmpLabel;

    this.resetState(room);

    room.stateVersion++;
    saveRoom(room);

    this.messaging.emitWaiting(room);
    this.messaging.broadcastState(room);

    ok(ack, {});
  }

  updateSettings(
    socket: Socket,
    partialFlat: any,
    ack?: Ack<{ settings: any }>,
  ) {
    const room = this.getMyRoom(socket, ack);
    if (!room) return;

    if (socket.id !== room.hostId)
      return err(ack, "ONLY_HOST", "Seul l'hôte peut modifier les paramètres.");

    if (room.started)
      return err(
        ack,
        "GAME_STARTED",
        "Impossible de modifier les paramètres pendant la partie.",
      );

    const { base, game } = this.settings.splitFlatSettings(partialFlat);

    room.settingsBase = this.settings.mergeBaseSettings(
      room.settingsBase,
      base,
    );
    room.gameSettings = this.settings.mergeGameSettings(
      room.gameSettings,
      game,
    );

    this.resetState(room);

    room.stateVersion++;
    saveRoom(room);

    this.messaging.emitWaiting(room);
    this.messaging.broadcastState(room);

    ok(ack, { settings: this.settings.buildClientSettings(room) });
  }

  backToSettings(socket: Socket, ack?: Ack<{}>) {
    const room = this.getMyRoom(socket, ack);
    if (!room) return;

    if (socket.id !== room.hostId)
      return err(ack, "ONLY_HOST", "Seul l'hôte peut revenir aux paramètres.");

    if (!room.started) return ok(ack, {});

    room.started = false;
    room.rematchVotes.clear();

    (room as any).matchScore = {};
    (room as any).matchWinner = null;

    this.resetState(room);

    room.stateVersion++;
    saveRoom(room);

    this.messaging.emitRematchStatus(room.id, 0);

    this.timers.clearTurnTimer(room.id);

    this.messaging.emitWaiting(room);
    this.messaging.broadcastState(room);

    ok(ack, {});
  }

  createRoom(
    socket: Socket,
    payload: {
      baseSettings?: Partial<RoomSettingsBase>;
      gameSettings?: Partial<TGameSettings>;
      playerLabel?: string;
    },
    ack?: Ack<{ roomId: string; seat: Seat }>,
  ) {
    const baseSettings = this.adapter.sanitizeBaseSettings({
      ...this.adapter.defaultBaseSettings(),
      ...(payload?.baseSettings ?? {}),
    });

    const gameSettings = this.adapter.sanitizeGameSettings({
      ...this.adapter.defaultGameSettings(),
      ...(payload?.gameSettings ?? {}),
    });

    const roomId = genRoomCode(
      Math.max(3, Math.floor(baseSettings.roomCodeLength ?? 5)),
    );

    const room: Room<TState, TGameSettings> = {
      gameKey: this.adapter.gameKey,
      id: roomId,
      createdAt: Date.now(),
      stateVersion: 0,
      hostId: socket.id,
      guestId: "",
      seats: { p1: socket.id, p2: "" },
      players: { p1: payload?.playerLabel ?? socket.id, p2: "" },
      started: false,
      rematchVotes: new Set(),
      settingsBase: baseSettings,
      gameSettings,
      matchScore: { [socket.id]: 0 },
      matchWinner: null,
      state: this.adapter.createInitialState({
        baseSettings,
        gameSettings,
        seats: { p1: socket.id, p2: "" },
      }),
    };

    saveRoom(room);

    socket.join(this.messaging.roomChannel(roomId));
    mapSocketToRoom(socket.id, roomId);

    this.messaging.emitWaiting(room);
    this.messaging.broadcastState(room);

    ok(ack, { roomId, seat: "p1" });
  }

  joinRoom(
    socket: Socket,
    payload: { roomId: string; playerLabel?: string },
    ack?: Ack<{ seat: Seat; players: number }>,
  ) {
    const room = payload?.roomId
      ? (getRoom(payload.roomId) as Room<TState, TGameSettings> | undefined)
      : undefined;

    if (!room) return err(ack, "ROOM_NOT_FOUND", "La room est invalide.");
    if (room.gameKey !== this.adapter.gameKey)
      return err(
        ack,
        "ROOM_NOT_FOUND",
        "Cette room n'appartient pas à ce jeu.",
      );

    if (socket.id === room.hostId)
      return err(ack, "ALREADY_HOST", "Tu es déjà l'hôte.");

    if (room.seats.p1 && room.seats.p2)
      return err(ack, "ROOM_FULL", "La room est déjà pleine.");

    const hostAlreadyExists = !!room.hostId;

    let seat: Seat;
    if (!room.seats.p1) {
      room.seats.p1 = socket.id;
      room.players.p1 = payload?.playerLabel ?? socket.id;
      seat = "p1";
    } else {
      room.seats.p2 = socket.id;
      room.players.p2 = payload?.playerLabel ?? socket.id;
      seat = "p2";
    }

    if (!hostAlreadyExists) {
      room.hostId = socket.id;
      room.guestId = "";
    } else {
      room.guestId = socket.id;
    }

    room.matchScore[socket.id] = room.matchScore[socket.id] ?? 0;

    room.stateVersion++;
    saveRoom(room);

    socket.join(this.messaging.roomChannel(room.id));
    mapSocketToRoom(socket.id, room.id);

    this.messaging.emitWaiting(room);
    this.messaging.broadcastState(room);

    ok(ack, { seat, players: playersCount(room) });
  }

  leaveRoom(socket: Socket, ack?: Ack<{}>) {
    const roomId = getRoomIdBySocket(socket.id);
    if (!roomId) return ok(ack, {});

    const room = getRoom(roomId) as Room<TState, TGameSettings> | undefined;
    unmapSocket(socket.id);

    if (!room) return ok(ack, {});
    if (room.gameKey !== this.adapter.gameKey) return ok(ack, {});

    socket.leave(this.messaging.roomChannel(room.id));

    const leavingId = socket.id;
    const leavingWasHost = leavingId === room.hostId;
    const leavingWasGuest = leavingId === room.guestId;

    this.adapter.onLeave?.({ room, leavingSocketId: leavingId });

    const { changed } = removePlayerBySocket(room, leavingId);
    if (!changed) return ok(ack, {});

    if (!room.seats.p1 && !room.seats.p2) {
      this.timers.clearTurnTimer(room.id);
      deleteRoom(room.id);
      return ok(ack, {});
    }

    if (leavingWasGuest) room.guestId = "";

    if (leavingWasHost) {
      if (room.settingsBase.promoteGuestOnHostLeave) {
        const remaining = room.seats.p1 || room.seats.p2 || "";
        room.hostId = remaining;

        const other =
          remaining && remaining === room.seats.p1
            ? room.seats.p2
            : room.seats.p1;
        room.guestId = other || "";
      } else {
        room.hostId = "";
        room.guestId = room.seats.p1 || room.seats.p2 || "";
      }
    }

    room.matchScore = {};
    if (room.seats.p1) room.matchScore[room.seats.p1] = 0;
    if (room.seats.p2) room.matchScore[room.seats.p2] = 0;
    room.matchWinner = null;

    room.started = false;
    room.rematchVotes.clear();

    this.resetState(room);

    room.stateVersion++;
    saveRoom(room);

    this.messaging.emitRematchStatus(room.id, 0);
    this.messaging.emitOpponentLeft({
      roomId: room.id,
      hostId: room.hostId,
      players: playersCount(room),
      stateVersion: room.stateVersion,
    });

    this.timers.clearTurnTimer(room.id);
    this.messaging.emitWaiting(room);
    this.messaging.broadcastState(room);

    ok(ack, {});
  }

  start(socket: Socket, ack?: Ack<{}>) {
    const roomId = getRoomIdBySocket(socket.id);
    if (!roomId) return err(ack, "NOT_IN_ROOM", "Tu n'es pas dans une room.");

    const room = getRoom(roomId) as Room<TState, TGameSettings> | undefined;
    if (!room || room.gameKey !== this.adapter.gameKey)
      return err(ack, "ROOM_NOT_FOUND", "Room introuvable.");

    if (socket.id !== room.hostId)
      return err(ack, "ONLY_HOST", "Seul l'hôte peut démarrer.");
    if (playersCount(room) < 2)
      return err(ack, "NEED_2_PLAYERS", "Il faut deux joueurs.");

    const can = this.adapter.canStart(room);
    if (!can.ok) return err(ack, can.code, can.message);

    room.started = true;
    room.rematchVotes.clear();
    room.stateVersion++;

    this.timers.armTurnTimerIfSupported(room);
    this.timers.scheduleTurnTimeout(room);

    saveRoom(room);
    this.messaging.broadcastState(room);
    this.messaging.emitRematchStatus(room.id, 0);

    ok(ack, {});
  }

  playTurn(socket: Socket, move: TMove, ack?: Ack<{}>) {
    const roomId = getRoomIdBySocket(socket.id);
    if (!roomId) return err(ack, "NOT_IN_ROOM", "Tu n'es pas dans une room.");

    const room = getRoom(roomId) as Room<TState, TGameSettings> | undefined;
    if (!room || room.gameKey !== this.adapter.gameKey)
      return err(ack, "ROOM_NOT_FOUND", "Room introuvable.");

    if (!room.started)
      return err(ack, "GAME_NOT_STARTED", "La partie n'a pas commencé.");

    const seat = this.seatFromSocket(room, socket.id);
    if (!seat)
      return err(ack, "NOT_IN_ROOM", "Tu n'es pas un joueur de cette room.");

    if (!this.rateLimitOk(room, socket.id))
      return err(ack, "RATE_LIMIT", "Trop d'actions trop vite.");

    const v = this.adapter.validateMove({ room, seat, move });
    if (!v.ok) return err(ack, v.code, v.message);

    this.adapter.applyMove({ room, seat, move });

    room.stateVersion++;
    saveRoom(room);
    this.timers.scheduleTurnTimeout(room);
    this.messaging.broadcastState(room);

    ok(ack, {});
  }

  rematchRequest(socket: Socket, ack?: Ack<{ votes: number }>) {
    const roomId = getRoomIdBySocket(socket.id);
    if (!roomId) return err(ack, "NOT_IN_ROOM", "Tu n'es pas dans une room.");

    const room = getRoom(roomId) as Room<TState, TGameSettings> | undefined;
    if (!room || room.gameKey !== this.adapter.gameKey)
      return err(ack, "ROOM_NOT_FOUND", "Room introuvable.");

    if (!room.started)
      return err(ack, "GAME_NOT_STARTED", "La partie n'a pas commencé.");

    room.rematchVotes.add(socket.id);

    const live = new Set([room.seats.p1, room.seats.p2].filter(Boolean));
    const filtered = new Set<string>();
    for (const id of room.rematchVotes) if (live.has(id)) filtered.add(id);
    room.rematchVotes = filtered;

    const votes = room.rematchVotes.size;
    saveRoom(room);

    this.messaging.emitRematchStatus(room.id, votes);
    ok(ack, { votes });

    if (votes >= 2 && room.seats.p1 && room.seats.p2) {
      this.adapter.onRematchAccepted?.({ room });

      room.rematchVotes.clear();
      room.stateVersion++;
      saveRoom(room);

      this.timers.scheduleTurnTimeout(room);
      this.messaging.broadcastState(room);
      this.messaging.emitRematchStatus(room.id, 0);
    }
  }
}
