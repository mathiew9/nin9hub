import type { Server, Namespace, Socket } from "socket.io";
import { Events } from "../protocol/events";
import type { Ack, Player, RoomState, Cell } from "../protocol/types";
import {
  genRoomId,
  saveRoom,
  getRoom,
  deleteRoom,
  mapSocketToRoom,
  unmapSocket,
  getRoomIdBySocket,
  playersCount,
  removePlayerBySocket,
} from "../core/storeCore";
import { ok, err } from "../utils/ack";
import { sanitizeTTTSettings, TTT_DEFAULTS } from "../games/tictactoe/settings";

/* ----------------------- Helpers ----------------------- */

export function emitWaiting(io: Server | Namespace, room: RoomState) {
  io.to(room.id).emit(Events.Waiting, { players: playersCount(room) });
}

export function broadcastState(io: Server | Namespace, room: RoomState) {
  io.to(room.id).emit(Events.State, {
    roomId: room.id,
    started: room.started,
    playersCount: playersCount(room),
    stateVersion: room.stateVersion,
    state: room.state,
    hostId: room.hostId,
    guestId: room.guestId,
    players: room.players,
    settings: room.settings,
  });
}

export function leaveRoom(io: Server | Namespace, socket: Socket) {
  const roomId = getRoomIdBySocket(socket.id);
  if (!roomId) return;

  socket.leave(roomId);

  const result = removePlayerBySocket(roomId, socket.id);
  if (result.deleted) return;

  const room = getRoom(roomId);
  if (!room) return;

  broadcastState(io, room);
  io.to(room.id).emit(Events.RematchStatus, { votes: 0 });

  io.to(room.id).emit(Events.OpponentLeft, {
    roomId: room.id,
    hostId: room.hostId,
    players: playersCount(room),
    stateVersion: room.stateVersion,
  });

  emitWaiting(io, room);
}

/* --------------------- Core Handlers -------------------- */

export function registerCoreRoomHandlers(io: Server, nsp: Server | Namespace) {
  nsp.on("connection", (socket: Socket) => {
    // CREATE
    socket.on(
      Events.CreateRoom,
      (ack: Ack<{ roomId: string; role: Player }>) => {
        const settings = sanitizeTTTSettings(TTT_DEFAULTS);
        const roomId = genRoomId(settings.roomCodeLength);
        const board = Array<Cell>(settings.gridSize * settings.gridSize).fill(
          null
        );
        const room: RoomState = {
          id: roomId,
          hostId: socket.id,
          guestId: "",
          players: { X: socket.id, O: "" },
          seats: { p1: socket.id, p2: "" },
          started: false,
          rematchVotes: new Set(),
          stateVersion: 0,
          createdAt: Date.now(),
          state: {
            board,
            turn: "X",
            winner: null,
            line: [],
            matchScore: { p1: 0, p2: 0 },
            matchWinner: null,
            turnDeadlineAt: null,
            turnStartedAt: null,
          },
          settings,
        };

        saveRoom(room);
        socket.join(roomId);
        mapSocketToRoom(socket.id, roomId);
        emitWaiting(nsp, room);
        broadcastState(nsp, room);
        ok(ack, { roomId, role: "X" });
      }
    );

    // JOIN
    socket.on(
      Events.JoinRoom,
      (
        payload: { roomId: string },
        ack: Ack<{ role: Player; players: number }>
      ) => {
        const room = payload?.roomId ? getRoom(payload.roomId) : undefined;
        if (!room) return err(ack, "ROOM_NOT_FOUND", "La room est invalide.");
        if (socket.id === room.hostId)
          return err(ack, "ALREADY_HOST", "Tu es déjà l'hôte.");

        const isXFree = !room.players.X;
        const isOFree = !room.players.O;
        if (!isXFree && !isOFree)
          return err(ack, "ROOM_FULL", "La room est déjà pleine.");

        let role: Player;
        if (isXFree) {
          room.players.X = socket.id;
          role = "X";
        } else {
          room.players.O = socket.id;
          role = "O";
        }

        if (room.hostId && room.hostId !== socket.id) {
          room.guestId = socket.id;
          room.seats.p2 = socket.id;
        }

        saveRoom(room);
        socket.join(room.id);
        mapSocketToRoom(socket.id, room.id);

        emitWaiting(nsp, room);
        broadcastState(nsp, room);
        ok(ack, { role, players: playersCount(room) });
      }
    );

    socket.on(Events.Leave, (ack: Ack<{}>) => {
      leaveRoom(nsp, socket);
      ok(ack, {});
    });

    socket.on("disconnect", () => {
      leaveRoom(nsp, socket);
    });
  });
}
