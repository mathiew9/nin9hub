import type { Server, Namespace, Socket } from "socket.io";
import { Events } from "../protocol/events";
import type { Ack, Player, RoomState, Cell, Winner } from "../protocol/types";
import {
  genRoomId,
  saveRoom,
  getRoom,
  deleteRoom,
  mapSocketToRoom,
  unmapSocket,
  getRoomIdBySocket,
  playersCount,
  isRoomEmpty,
} from "../core/storeCore";
import { ok, err } from "../utils/ack";

/** Waiting ping */
export function emitWaiting(io: Server | Namespace, room: RoomState) {
  io.to(room.id).emit(Events.Waiting, { players: playersCount(room) });
}

/** ✅ State-only */
export function broadcastState(io: Server | Namespace, room: RoomState) {
  io.to(room.id).emit(Events.State, {
    roomId: room.id,
    started: room.started,
    playersCount: playersCount(room),
    stateVersion: room.stateVersion,
    state: room.state, // <-- unique source
  });
}

/** leave propre */
export function leaveRoom(io: Server | Namespace, socket: Socket) {
  const roomId = getRoomIdBySocket(socket.id);
  if (!roomId) return;

  const room = getRoom(roomId);
  unmapSocket(socket.id);
  socket.leave(roomId);
  if (!room) return;

  // Libère son rôle si occupé
  if (room.players.X === socket.id) {
    room.players.X = "";
    if (room.hostId === socket.id) room.hostId = "";
  } else if (room.players.O === socket.id) {
    room.players.O = "";
    if (room.guestId === socket.id) room.guestId = "";
  }

  // repasse en attente
  room.started = false;
  room.rematchVotes.clear();
  room.stateVersion++;

  // ✅ reset dans state uniquement
  const board = room.state.board.slice().map(() => null as Cell);
  room.state = {
    board,
    turn: "X",
    winner: null as Winner,
  };
  saveRoom(room);

  io.to(room.id).emit(Events.OpponentLeft, {});
  emitWaiting(io, room);

  if (isRoomEmpty(room)) deleteRoom(room.id);
}

/** Core handlers */
export function registerCoreRoomHandlers(io: Server, nsp: Server | Namespace) {
  nsp.on("connection", (socket: Socket) => {
    // CREATE
    socket.on(
      Events.CreateRoom,
      (ack: Ack<{ roomId: string; role: Player }>) => {
        const roomId = genRoomId();
        const board = Array<Cell>(9).fill(null);
        const room: RoomState = {
          id: roomId,
          hostId: socket.id,
          guestId: "",
          players: { X: socket.id, O: "" },
          started: false,
          rematchVotes: new Set(),
          stateVersion: 0,
          createdAt: Date.now(),
          state: { board, turn: "X", winner: null }, // ✅ state-only
        };

        saveRoom(room);
        socket.join(roomId);
        mapSocketToRoom(socket.id, roomId);
        emitWaiting(nsp as Namespace, room);
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
        if (room.players.O)
          return err(ack, "ROOM_FULL", "La room est déjà pleine.");
        if (socket.id === room.hostId)
          return err(ack, "ALREADY_HOST", "Tu es déjà l'hôte.");

        room.guestId = socket.id;
        room.players.O = socket.id;
        saveRoom(room);
        socket.join(room.id);
        mapSocketToRoom(socket.id, room.id);
        emitWaiting(nsp as Namespace, room);
        ok(ack, { role: "O", players: 2 });
      }
    );

    // LEAVE volontaire
    socket.on(Events.Leave, (ack: Ack<{}>) => {
      leaveRoom(nsp as Namespace, socket);
      ok(ack, {});
    });

    // Déconnexion
    socket.on("disconnect", () => {
      leaveRoom(nsp as Namespace, socket);
    });
  });
}
