import type { Server, Socket } from "socket.io";
import { Events, ErrorCodes } from "../protocol/events";
import type { Ack, Player, RoomState } from "../protocol/types";
import { emptyBoard, other, checkWinner } from "../domain/tictactoe";
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
} from "../store/rooms";
import { ok, err } from "../utils/ack";

function emitWaiting(io: Server, room: RoomState) {
  io.to(room.id).emit(Events.Waiting, { players: playersCount(room) });
}

function broadcastState(io: Server, room: RoomState) {
  io.to(room.id).emit(Events.State, {
    roomId: room.id,
    board: room.board,
    turn: room.turn,
    started: room.started,
    winner: room.winner,
    playersCount: playersCount(room),
    stateVersion: room.stateVersion,
  });
}

function leaveRoom(io: Server, socket: Socket, reason: "leave" | "disconnect") {
  const roomId = getRoomIdBySocket(socket.id);
  if (!roomId) return;

  const room = getRoom(roomId);
  // Démappe et laisse la room (l’ordre importe peu ici, on émet à room.id)
  unmapSocket(socket.id);
  socket.leave(roomId);
  if (!room) return;

  const wasHost = room.hostId === socket.id;

  // Libère le rôle (tu es maintenant en Option A: string | null)
  if (room.players.X === socket.id) {
    room.players.X = null;
  } else if (room.players.O === socket.id) {
    room.players.O = null;
  }

  // Recalage host/guest intelligents (ne PAS “vider” toute la room)
  if (wasHost) {
    // Si un invité reste, il devient le nouvel hôte
    if (room.players.O) {
      room.hostId = room.players.O; // promotion de l’invité
      room.guestId = null;
    } else {
      // plus personne
      room.hostId = "";
      room.guestId = null;
    }
  } else {
    // C'était l'invité qui part
    room.guestId = null;
  }

  // On reste dans la même room mais on repasse en attente
  room.started = false;
  // On ne reset pas forcément le board : garde-le
  // (si tu préfères: room.board = emptyBoard();)
  room.winner = null;
  room.rematchVotes.clear();
  room.stateVersion++;

  // Si room vide → suppression, sinon on notifie le survivant
  if (!room.players.X && !room.players.O) {
    deleteRoom(room.id);
    return;
  }

  saveRoom(room);

  // 1) Badge "adversaire parti"
  io.to(room.id).emit(Events.OpponentLeft, {});

  // 2) Players 1/2
  emitWaiting(io, room);

  // 3) État complet (status waiting, started=false, turn etc.)
  broadcastState(io, room);
}

export function registerOnlineHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    // CREATE ROOM
    socket.on(
      Events.CreateRoom,
      (ack: Ack<{ roomId: string; role: Player }>) => {
        const roomId = genRoomId();
        const room: RoomState = {
          id: roomId,
          hostId: socket.id,
          guestId: null, // ⬅ null
          players: { X: socket.id, O: null }, // ⬅ null si vide
          board: emptyBoard(),
          turn: "X",
          started: false,
          winner: null,
          rematchVotes: new Set(),
          stateVersion: 0,
          createdAt: Date.now(),
        };
        saveRoom(room);
        socket.join(roomId);
        mapSocketToRoom(socket.id, roomId);
        emitWaiting(io, room);
        ok(ack, { roomId, role: "X" });
      }
    );

    // JOIN ROOM
    socket.on(
      Events.JoinRoom,
      (
        payload: { roomId: string },
        ack: Ack<{ role: Player; players: number }>
      ) => {
        const room = payload?.roomId ? getRoom(payload.roomId) : undefined;
        if (!room)
          return err(ack, ErrorCodes.ROOM_NOT_FOUND, "La room est invalide.");
        if (playersCount(room) >= 2)
          return err(ack, ErrorCodes.ROOM_FULL, "La room est déjà pleine.");
        if (socket.id === room.hostId)
          return err(ack, ErrorCodes.ALREADY_HOST, "Tu es déjà l'hôte.");

        // attribuer O si X pris, sinon X (rare)
        const role: Player = room.players.X ? "O" : "X";
        if (role === "O") room.guestId = socket.id;

        room.players[role] = socket.id;
        saveRoom(room);
        socket.join(room.id);
        mapSocketToRoom(socket.id, room.id);

        emitWaiting(io, room);
        ok(ack, { role, players: playersCount(room) });
      }
    );

    // START
    socket.on(Events.Start, (ack: Ack<{}>) => {
      const roomId = getRoomIdBySocket(socket.id);
      if (!roomId)
        return err(ack, ErrorCodes.NOT_IN_ROOM, "Tu n'es pas dans une room.");
      const room = getRoom(roomId)!;
      if (socket.id !== room.hostId)
        return err(ack, ErrorCodes.ONLY_HOST, "Seul l'hôte peut démarrer.");
      if (!room.guestId)
        return err(ack, ErrorCodes.NEED_2_PLAYERS, "Il faut deux joueurs.");

      room.board = emptyBoard();
      room.turn = "X";
      room.started = true;
      room.winner = null;
      room.rematchVotes.clear();
      room.stateVersion++;
      saveRoom(room);
      broadcastState(io, room);
      ok(ack, {});
    });

    // PLAY TURN
    socket.on(Events.PlayTurn, (payload: { index: number }, ack: Ack<{}>) => {
      const roomId = getRoomIdBySocket(socket.id);
      if (!roomId)
        return err(ack, ErrorCodes.NOT_IN_ROOM, "Tu n'es pas dans une room.");
      const room = getRoom(roomId)!;
      if (!room.started)
        return err(
          ack,
          ErrorCodes.GAME_NOT_STARTED,
          "La partie n'a pas commencé."
        );

      const role: Player | null =
        room.players.X === socket.id
          ? "X"
          : room.players.O === socket.id
          ? "O"
          : null;

      if (!role)
        return err(
          ack,
          ErrorCodes.NOT_IN_ROOM,
          "Tu n'es pas un joueur de cette room."
        );
      if (role !== room.turn)
        return err(ack, ErrorCodes.NOT_YOUR_TURN, "Ce n'est pas ton tour.");

      const idx = payload?.index;
      if (
        typeof idx !== "number" ||
        !Number.isInteger(idx) ||
        idx < 0 ||
        idx > 8
      ) {
        return err(ack, ErrorCodes.OUT_OF_RANGE, "Index de case invalide.");
      }
      if (room.board[idx] !== null) {
        return err(ack, ErrorCodes.CELL_TAKEN, "Cette case est déjà prise.");
      }

      room.board[idx] = role;
      const res = checkWinner(room.board);
      if (res.winner) {
        room.winner = res.winner;
        room.started = true;
      } else if (res.draw) {
        room.winner = "draw";
        room.started = true;
      } else {
        room.turn = other(role);
      }
      room.stateVersion++;
      saveRoom(room);
      broadcastState(io, room);
      ok(ack, {});
    });

    // REMATCH
    socket.on(Events.RematchRequest, (ack: Ack<{ votes: number }>) => {
      const roomId = getRoomIdBySocket(socket.id);
      if (!roomId)
        return err(ack, ErrorCodes.NOT_IN_ROOM, "Tu n'es pas dans une room.");
      const room = getRoom(roomId)!;

      if (room.rematchVotes.has(socket.id)) {
        return ok(ack, { votes: room.rematchVotes.size }); // déjà voté
      }

      room.rematchVotes.add(socket.id);
      const votes = room.rematchVotes.size;
      ok(ack, { votes });
      io.to(room.id).emit(Events.RematchStatus, { votes });

      if (votes >= 2 && room.players.X && room.players.O) {
        room.board = emptyBoard();
        room.turn = "X";
        room.started = true;
        room.winner = null;
        room.rematchVotes.clear();
        room.stateVersion++;
        saveRoom(room);
        broadcastState(io, room);
      }
    });

    // LEAVE
    socket.on(Events.Leave, (ack: Ack<{}>) => {
      leaveRoom(io, socket, "leave");
      ok(ack, {});
    });

    socket.on("disconnecting", () => {
      leaveRoom(io, socket, "disconnect");
    });
  });
}
