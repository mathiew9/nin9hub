import type { Server, Namespace, Socket } from "socket.io";
import { Events } from "../../protocol/events";
import type { Ack, Player } from "../../protocol/types";
import { ok, err } from "../../utils/ack";
import { getRoom, saveRoom, getRoomIdBySocket } from "../../core/storeCore";
import { emptyBoard, checkWinner, other } from "./domain";
import { broadcastState } from "../../core/socketsCore";

export function registerTicTacToeHandlers(io: Server, nsp: Namespace | Server) {
  const ns = nsp as Namespace;

  (nsp as Server | Namespace).on("connection", (socket: Socket) => {
    // START
    socket.on(Events.Start, (ack: Ack<{}>) => {
      const roomId = getRoomIdBySocket(socket.id);
      if (!roomId) return err(ack, "NOT_IN_ROOM", "Tu n'es pas dans une room.");
      const room = getRoom(roomId)!;
      if (socket.id !== room.hostId)
        return err(ack, "ONLY_HOST", "Seul l'hôte peut démarrer.");
      if (!room.players.O)
        return err(ack, "NEED_2_PLAYERS", "Il faut deux joueurs.");

      const grid = 3; // ou settings?.gridSize ?? 3
      room.state.board = emptyBoard(grid);
      room.state.turn = "X";
      room.state.winner = null;
      room.started = true;
      room.rematchVotes.clear();
      room.stateVersion++;
      saveRoom(room);

      broadcastState(ns, room);
      ok(ack, {});
    });

    // PLAY TURN
    socket.on(Events.PlayTurn, (payload: { index: number }, ack: Ack<{}>) => {
      const roomId = getRoomIdBySocket(socket.id);
      if (!roomId) return err(ack, "NOT_IN_ROOM", "Tu n'es pas dans une room.");
      const room = getRoom(roomId)!;
      if (!room.started)
        return err(ack, "GAME_NOT_STARTED", "La partie n'a pas commencé.");

      const role: Player | null =
        room.players.X === socket.id
          ? "X"
          : room.players.O === socket.id
          ? "O"
          : null;

      if (!role)
        return err(ack, "NOT_IN_ROOM", "Tu n'es pas un joueur de cette room.");
      if (role !== room.state.turn)
        return err(ack, "NOT_YOUR_TURN", "Ce n'est pas ton tour.");

      const idx = payload?.index;
      const size = room.state.board.length; // 9 pour 3x3
      if (!Number.isInteger(idx) || idx < 0 || idx > size - 1) {
        return err(ack, "OUT_OF_RANGE", "Index de case invalide.");
      }
      if (room.state.board[idx] !== null) {
        return err(ack, "CELL_TAKEN", "Cette case est déjà prise.");
      }

      room.state.board[idx] = role;
      const res = checkWinner(room.state.board);
      if (res.winner) {
        room.state.winner = res.winner;
        room.started = true;
      } else if (res.draw) {
        room.state.winner = "draw";
        room.started = true;
      } else {
        room.state.turn = other(role);
      }
      room.stateVersion++;
      saveRoom(room);

      broadcastState(ns, room);
      ok(ack, {});
    });

    // REMATCH
    socket.on(Events.RematchRequest, (ack: Ack<{ votes: number }>) => {
      const roomId = getRoomIdBySocket(socket.id);
      if (!roomId) return err(ack, "NOT_IN_ROOM", "Tu n'es pas dans une room.");
      const room = getRoom(roomId)!;

      if (!room.rematchVotes.has(socket.id)) room.rematchVotes.add(socket.id);
      const votes = room.rematchVotes.size;

      ns.to(room.id).emit(Events.RematchStatus, { votes });
      ok(ack, { votes });

      if (votes >= 2 && room.players.X && room.players.O) {
        // (optionnel) swap si settings.swapRolesOnRematch
        room.state.board = emptyBoard(3);
        room.state.turn = "X";
        room.state.winner = null;
        room.started = true;
        room.rematchVotes.clear();
        room.stateVersion++;
        saveRoom(room);

        broadcastState(ns, room);
      }
    });
  });
}
