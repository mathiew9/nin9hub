import type { Namespace, Server, Socket } from "socket.io";
import type {
  Ack,
  GameKey,
  ClientToServerEvents,
  ServerToClientEvents,
  Room,
  RoomSettingsBase,
  Seat,
} from "./typesCore";
import {
  deleteRoom,
  getRoom,
  getRoomIdBySocket,
  mapSocketToRoom,
  playersCount,
  removePlayerBySocket,
  saveRoom,
  unmapSocket,
} from "./storeCore";
import { err, genRoomCode, ok } from "./utils";

/**
 * Adapter : chaque jeu implémente ces fonctions.
 * - TState: state du jeu (TTTGameState, C4GameState…)
 * - TGameSettings: settings spécifiques au jeu
 * - TMove: payload du playTurn (index, column…)
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

  onRematchAccepted?(args: {
    room: Room<TState, TGameSettings>;
    resetMatch: boolean;
  }): void;

  onTurnTimeout?(args: {
    room: Room<TState, TGameSettings>;
  }): { ok: true; move: TMove } | { ok: false };
};

export class RoomService<TState, TGameSettings, TMove> {
  constructor(
    private io: Server,
    private nsp: Namespace | Server,
    private adapter: GameAdapter<TState, TGameSettings, TMove>,
  ) {}

  private turnTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private roomChannel(roomId: string) {
    // Un channel socket.io “scopé” (évite collisions si roomId identique entre jeux)
    return `${this.adapter.gameKey}:${roomId}`;
  }

  private emitWaiting(room: Room<TState, TGameSettings>) {
    this.nsp
      .to(this.roomChannel(room.id))
      .emit(this.adapter.serverEvents.Waiting, {
        players: playersCount(room),
      });
  }

  private broadcastState(room: Room<TState, TGameSettings>) {
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

  private seatFromSocket(
    room: Room<TState, TGameSettings>,
    socketId: string,
  ): Seat | null {
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

  private buildClientSettings(room: Room<TState, TGameSettings>) {
    // ⚠️ Compat hook : on renvoie un objet "flat"
    // Ton hook attend: settings: RoomSettings (gridSize + base keys)
    return {
      ...(room.settingsBase as any),
      ...(room.gameSettings as any),
    };
  }

  // ✅ helper: merge + sanitize base settings
  private mergeBaseSettings(
    current: RoomSettingsBase | undefined,
    partial: Partial<RoomSettingsBase> | undefined,
  ): RoomSettingsBase {
    const baseDefaults = this.adapter.defaultBaseSettings();
    return this.adapter.sanitizeBaseSettings({
      ...baseDefaults,
      ...(current ?? {}),
      ...(partial ?? {}),
    });
  }

  // ✅ helper: merge + sanitize game settings
  private mergeGameSettings(
    current: TGameSettings | undefined,
    partial: Partial<TGameSettings> | undefined,
  ): TGameSettings {
    const gameDefaults = this.adapter.defaultGameSettings();
    return this.adapter.sanitizeGameSettings({
      ...gameDefaults,
      ...(current ?? {}),
      ...(partial ?? {}),
    });
  }

  // ✅ helper: accept ton payload "flat" venant du hook
  // - tout ce qui existe dans RoomSettingsBase => base
  // - le reste => game (ex: gridSize pour TTT)
  private splitFlatSettings(partialFlat: any): {
    base: Partial<RoomSettingsBase>;
    game: Partial<TGameSettings>;
  } {
    const base: Partial<RoomSettingsBase> = {};
    const game: Partial<TGameSettings> = {};

    if (!partialFlat || typeof partialFlat !== "object") return { base, game };

    // Liste des clés "base" (communes)
    const baseKeys: Array<keyof RoomSettingsBase> = [
      "roundsToWin",
      "turnTimeMs",
      "idleKickMs",
      "moveRateLimitMs",
      "roomCodeLength",
      "reconnectGraceMs",
      "preserveGameOnLeave",
      "promoteGuestOnHostLeave",
      "autoRematchOnBoth",
      "resetRolesOnRematch",
    ];

    for (const [k, v] of Object.entries(partialFlat)) {
      if ((baseKeys as string[]).includes(k)) {
        (base as any)[k] = v;
      } else {
        // tout le reste (gridSize, etc.) => game settings
        (game as any)[k] = v;
      }
    }

    return { base, game };
  }

  private armTurnTimerIfSupported(room: Room<TState, TGameSettings>) {
    const s = room.state as any;

    // Only if this game state supports timers
    if (!("turnDeadlineAt" in s) || !("turnStartedAt" in s)) return;

    const ms = Math.max(0, Math.floor(room.settingsBase.turnTimeMs ?? 0));

    if (ms > 0) {
      s.turnDeadlineAt = Date.now() + ms;
      s.turnStartedAt = null;
    } else {
      s.turnDeadlineAt = null;
      s.turnStartedAt = Date.now();
    }
  }

  // ✅ helper: re-init state (utile si gridSize change)
  private resetState(room: Room<TState, TGameSettings>) {
    room.state = this.adapter.createInitialState({
      baseSettings: room.settingsBase,
      gameSettings: room.gameSettings,
      seats: room.seats,
    });
  }

  // ✅ helper: load room + validate gameKey
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

  private clearTurnTimer(roomId: string) {
    const t = this.turnTimers.get(roomId);
    if (t) clearTimeout(t);
    this.turnTimers.delete(roomId);
  }

  private getDeadline(room: Room<TState, TGameSettings>): number | null {
    const s = room.state as any;
    return typeof s.turnDeadlineAt === "number" ? s.turnDeadlineAt : null;
  }

  private scheduleTurnTimeout(room: Room<TState, TGameSettings>) {
    // si le jeu ne supporte pas timeout -> rien
    if (!this.adapter.onTurnTimeout) return;

    const deadlineAt = this.getDeadline(room);
    this.clearTurnTimer(room.id);
    if (!deadlineAt) return;

    const delayMs = Math.max(0, deadlineAt - Date.now());

    const timer = setTimeout(() => {
      const live = getRoom(room.id) as Room<TState, TGameSettings> | undefined;
      if (!live) return;

      // sécurité : bon jeu + started + pas fini
      if (live.gameKey !== this.adapter.gameKey) return;
      if (!live.started) return;

      const s = live.state as any;
      if (s?.winner) return;

      // anti-timeout stale : si la deadline a changé depuis qu’on a armé
      const stillDeadline =
        typeof s.turnDeadlineAt === "number" ? s.turnDeadlineAt : null;
      if (stillDeadline !== deadlineAt) return;

      // demande à l’adapter le move auto
      const res = this.adapter.onTurnTimeout?.({ room: live });
      if (!res || !res.ok) return;

      // seat actuel (par convention : live.state.turn est un Seat)
      const seat = (live.state as any).turn as Seat;

      // applique comme un move normal (validation incluse)
      const v = this.adapter.validateMove({ room: live, seat, move: res.move });
      if (!v.ok) return;

      this.adapter.applyMove({ room: live, seat, move: res.move });

      live.stateVersion++;
      saveRoom(live);
      this.broadcastState(live);

      // re-arm si nouvelle deadline
      this.scheduleTurnTimeout(live);
    }, delayMs + 15);

    this.turnTimers.set(room.id, timer);
  }

  // ✅ SWAP ROLES (host-only, waiting-only)
  swapRoles(socket: Socket, ack?: Ack<{}>) {
    const room = this.getMyRoom(socket, ack);
    if (!room) return;

    if (socket.id !== room.hostId)
      return err(ack, "ONLY_HOST", "Seul l'hôte peut inverser.");

    if (room.started)
      return err(ack, "GAME_STARTED", "Impossible pendant la partie.");

    if (!room.seats.p1 || !room.seats.p2)
      return err(ack, "NEED_2_PLAYERS", "Il faut deux joueurs.");

    // swap seats
    const tmpSeat = room.seats.p1;
    room.seats.p1 = room.seats.p2;
    room.seats.p2 = tmpSeat;

    // swap labels aussi (sinon affichage incohérent)
    const tmpLabel = room.players.p1;
    room.players.p1 = room.players.p2;
    room.players.p2 = tmpLabel;

    // ⚠️ host/guest restent (hostId = propriétaire)
    // si tu veux que le "host" suive p1, enlève ce commentaire et swap hostId/guestId
    // mais là ton UI "host-only" est basé sur hostId, donc on ne touche pas.

    // reset state en waiting room (optionnel mais safe)
    this.resetState(room);

    room.stateVersion++;
    saveRoom(room);

    this.emitWaiting(room);
    this.broadcastState(room);

    ok(ack, {});
  }

  // ✅ UPDATE SETTINGS (host-only, waiting-only)
  updateSettings(
    socket: Socket,
    partialFlat: any,
    ack?: Ack<{ settings: any }>,
  ) {
    const room = this.getMyRoom(socket, ack);
    if (!room) return;

    if (socket.id !== room.hostId)
      return err(ack, "ONLY_HOST", "Seul l'hôte peut modifier les paramètres.");

    // version simple et stable : settings uniquement en waiting room
    if (room.started)
      return err(
        ack,
        "GAME_STARTED",
        "Impossible de modifier les paramètres pendant la partie.",
      );

    const { base, game } = this.splitFlatSettings(partialFlat);

    room.settingsBase = this.mergeBaseSettings(room.settingsBase, base);
    room.gameSettings = this.mergeGameSettings(room.gameSettings, game);

    // si gridSize ou autre impacte state -> on reset
    this.resetState(room);

    room.stateVersion++;
    saveRoom(room);

    this.emitWaiting(room);
    this.broadcastState(room);

    ok(ack, { settings: this.buildClientSettings(room) });
  }

  backToSettings(socket: Socket, ack?: Ack<{}>) {
    const roomId = getRoomIdBySocket(socket.id);
    if (!roomId) return err(ack, "NOT_IN_ROOM", "Tu n'es pas dans une room.");

    const room = getRoom(roomId) as Room<TState, TGameSettings> | undefined;
    if (!room || room.gameKey !== this.adapter.gameKey)
      return err(ack, "ROOM_NOT_FOUND", "Room introuvable.");

    if (socket.id !== room.hostId)
      return err(ack, "ONLY_HOST", "Seul l'hôte peut revenir aux paramètres.");

    // Idempotent: si déjà en waiting/settings
    if (!room.started) {
      ok(ack, {});
      return;
    }

    // Retour en waiting room (settings)
    room.started = false;
    room.rematchVotes.clear();

    // Reset state propre (board/turn/winner/...)
    room.state = this.adapter.createInitialState({
      baseSettings: room.settingsBase,
      gameSettings: room.gameSettings,
      seats: room.seats,
    });

    room.stateVersion++;
    saveRoom(room);

    const channel = this.roomChannel(room.id);

    // Rematch UI reset
    this.nsp
      .to(channel)
      .emit(this.adapter.serverEvents.RematchStatus, { votes: 0 });

    this.clearTurnTimer(room.id);
    // Update clients
    this.emitWaiting(room);
    this.broadcastState(room);

    ok(ack, {});
  }

  createRoom(
    socket: Socket,
    payload: {
      baseSettings?: Partial<RoomSettingsBase>;
      gameSettings?: Partial<TGameSettings>;
      playerLabel?: string; // optionnel (pseudo)
    },
    ack?: Ack<{ roomId: string; seat: Seat }>,
  ) {
    const baseDefaults = this.adapter.defaultBaseSettings();
    const gameDefaults = this.adapter.defaultGameSettings();

    const baseSettings = this.adapter.sanitizeBaseSettings({
      ...baseDefaults,
      ...(payload?.baseSettings ?? {}),
    });
    const gameSettings = this.adapter.sanitizeGameSettings({
      ...gameDefaults,
      ...(payload?.gameSettings ?? {}),
    });

    const roomId = genRoomCode(
      Math.max(3, Math.floor(baseSettings.roomCodeLength ?? 4)),
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

    const channel = this.roomChannel(roomId);
    socket.join(channel);
    mapSocketToRoom(socket.id, roomId);

    this.emitWaiting(room);
    this.broadcastState(room);

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

    let seat: Seat;
    if (!room.seats.p1) {
      room.seats.p1 = socket.id;
      room.players.p1 = payload?.playerLabel ?? socket.id;
      room.hostId = socket.id;
      seat = "p1";
    } else {
      room.seats.p2 = socket.id;
      room.players.p2 = payload?.playerLabel ?? socket.id;
      room.guestId = socket.id;
      seat = "p2";
    }

    room.matchScore[socket.id] = room.matchScore[socket.id] ?? 0;

    room.stateVersion++;
    saveRoom(room);

    const channel = this.roomChannel(room.id);
    socket.join(channel);
    mapSocketToRoom(socket.id, room.id);

    this.emitWaiting(room);
    this.broadcastState(room);

    ok(ack, { seat, players: playersCount(room) });
  }

  leaveRoom(socket: Socket, ack?: Ack<{}>) {
    const roomId = getRoomIdBySocket(socket.id);
    if (!roomId) {
      ok(ack, {});
      return;
    }

    const room = getRoom(roomId) as Room<TState, TGameSettings> | undefined;
    unmapSocket(socket.id);

    if (!room) {
      ok(ack, {});
      return;
    }
    if (room.gameKey !== this.adapter.gameKey) {
      ok(ack, {});
      return;
    }

    const channel = this.roomChannel(room.id);
    socket.leave(channel);

    // Hook jeu (optionnel)
    this.adapter.onLeave?.({ room, leavingSocketId: socket.id });

    const { changed } = removePlayerBySocket(room, socket.id);
    if (!changed) {
      ok(ack, {});
      return;
    }

    // Si plus personne, on supprime la room
    if (!room.seats.p1 && !room.seats.p2) {
      this.clearTurnTimer(room.id);
      deleteRoom(room.id);
      ok(ack, {});
      return;
    }

    // Si host parti et option promote
    if (!room.hostId && room.settingsBase.promoteGuestOnHostLeave) {
      if (room.seats.p1) room.hostId = room.seats.p1;
      else if (room.seats.p2) room.hostId = room.seats.p2;
    }

    // ✅ IMPORTANT: reset “match” quand quelqu’un quitte (si la room survit)
    // => le score suit les joueurs (socketIds), et on repart clean
    room.matchScore = {};
    if (room.seats.p1) room.matchScore[room.seats.p1] = 0;
    if (room.seats.p2) room.matchScore[room.seats.p2] = 0;
    room.matchWinner = null;

    // On repasse en waiting room
    room.started = false;
    room.rematchVotes.clear();

    // Reset manche côté state (ne dépend pas du jeu, safe)
    (room.state as any).winner = null;
    (room.state as any).line = [];
    (room.state as any).turnDeadlineAt = null;
    (room.state as any).turnStartedAt = null;

    room.stateVersion++;
    saveRoom(room);

    // Notifs + refresh
    this.nsp
      .to(channel)
      .emit(this.adapter.serverEvents.RematchStatus, { votes: 0 });
    this.nsp.to(channel).emit(this.adapter.serverEvents.OpponentLeft, {
      roomId: room.id,
      hostId: room.hostId,
      players: playersCount(room),
      stateVersion: room.stateVersion,
    });

    this.clearTurnTimer(room.id);
    this.emitWaiting(room);
    this.broadcastState(room);

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

    this.armTurnTimerIfSupported(room);
    this.scheduleTurnTimeout(room);

    saveRoom(room);
    this.broadcastState(room);
    this.nsp
      .to(this.roomChannel(room.id))
      .emit(this.adapter.serverEvents.RematchStatus, { votes: 0 });

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
    this.scheduleTurnTimeout(room);
    this.broadcastState(room);

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

    // keep only live seats
    const live = new Set([room.seats.p1, room.seats.p2].filter(Boolean));
    const filtered = new Set<string>();
    for (const id of room.rematchVotes) if (live.has(id)) filtered.add(id);
    room.rematchVotes = filtered;

    const votes = room.rematchVotes.size;
    saveRoom(room);

    const channel = this.roomChannel(room.id);
    this.nsp
      .to(channel)
      .emit(this.adapter.serverEvents.RematchStatus, { votes });
    ok(ack, { votes });

    if (votes >= 2 && room.seats.p1 && room.seats.p2) {
      // par défaut, on considère "reset match" si option auto
      const resetMatch = !!room.settingsBase.resetRolesOnRematch;
      this.adapter.onRematchAccepted?.({ room, resetMatch });

      room.rematchVotes.clear();
      room.stateVersion++;
      saveRoom(room);

      this.broadcastState(room);
      this.nsp
        .to(channel)
        .emit(this.adapter.serverEvents.RematchStatus, { votes: 0 });
    }
  }
}
