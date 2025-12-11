import type { Server, Namespace, Socket } from "socket.io";
import { Events } from "../../protocol/events";
import type { Ack, Player } from "../../protocol/types";
import { ok, err } from "../../utils/ack";
import { getRoom, saveRoom, getRoomIdBySocket } from "../../core/storeCore";
import { emptyBoard, checkWinner, other } from "./domain";
import { broadcastState } from "../../core/socketsCore";
import type { RoomSettings } from "../../protocol/types";
import { sanitizeTTTSettings } from "./settings";

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

      const settings = (room.settings ?? {}) as RoomSettings;
      const grid = settings.gridSize ?? 3;

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
      const settings = (room.settings ?? {}) as RoomSettings;
      const res = checkWinner(room.state.board, settings.gridSize ?? 3);
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

    // UPDATE SETTINGS
    socket.on(
      Events.UpdateSettings,
      (
        partial: Partial<RoomSettings>,
        ack: Ack<{ settings: RoomSettings }>
      ) => {
        const roomId = getRoomIdBySocket(socket.id);
        if (!roomId)
          return err(ack, "NOT_IN_ROOM", "Tu n'es pas dans une room.");

        const room = getRoom(roomId)!;
        if (socket.id !== room.hostId) {
          return err(
            ack,
            "ONLY_HOST",
            "Seul l'hôte peut modifier les paramètres."
          );
        }

        // merge + sanitize (on ne garde que les champs TTT connus)
        const merged = sanitizeTTTSettings({
          ...(room.settings ?? {}),
          ...(partial ?? {}),
        });
        room.settings = merged;
        room.stateVersion++;
        saveRoom(room);

        broadcastState(nsp as any, room); // inclut settings
        ok(ack, { settings: merged });
      }
    );

    // REMATCH
    socket.on(Events.RematchRequest, (ack: Ack<{ votes: number }>) => {
      const roomId = getRoomIdBySocket(socket.id);
      if (!roomId) return err(ack, "NOT_IN_ROOM", "Tu n'es pas dans une room.");
      const room = getRoom(roomId)!;

      // 1) Comptabiliser le vote (idempotent)
      if (!room.rematchVotes.has(socket.id)) room.rematchVotes.add(socket.id);
      const votes = room.rematchVotes.size;

      // 2) Informer tout le monde de l'état des votes + ACK
      ns.to(room.id).emit(Events.RematchStatus, { votes });
      ok(ack, { votes });

      // 3) Si 2/2 votes et les deux slots sont occupés, on relance
      if (votes >= 2 && room.players.X && room.players.O) {
        // Lire les settings attachés à la room
        const settings = (room.settings ?? {}) as RoomSettings;

        // a) Échanger les rôles si activé
        if (settings.swapRolesOnRematch) {
          const prevX = room.players.X;
          room.players.X = room.players.O;
          room.players.O = prevX;
        }

        // (Optionnel) Si tu supportes resetRolesOnRematch à l'avenir :
        // if (settings.resetRolesOnRematch) {
        //   // ex: remettre X = hostId, O = guestId (à définir selon ta logique)
        //   room.players.X = room.hostId || room.players.X;
        //   room.players.O = room.guestId || room.players.O;
        // }

        // b) Réinitialiser la manche selon la taille de grille (par défaut 3)
        const gridSize = settings.gridSize ?? 3;

        room.state.board = emptyBoard(gridSize);
        room.state.turn = "X"; // X commence toujours dans ta vision
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
