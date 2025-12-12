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
      ns.to(room.id).emit(Events.RematchStatus, { votes: 0 });
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

    // SWAP ROLES (host-only, waiting room)
    socket.on("online:swap:roles", (ack: Ack<{}>) => {
      const roomId = getRoomIdBySocket(socket.id);
      if (!roomId) return err(ack, "NOT_IN_ROOM", "Pas dans une room.");
      const room = getRoom(roomId)!;

      if (socket.id !== room.hostId)
        return err(ack, "ONLY_HOST", "Seul l'hôte peut inverser.");
      if (room.started)
        return err(ack, "GAME_STARTED", "Impossible pendant la partie.");
      if (!room.players.X || !room.players.O)
        return err(ack, "NEED_2_PLAYERS", "Il faut deux joueurs.");

      // swap X <-> O (l'hôte ne change pas, juste les rôles)
      const t = room.players.X;
      room.players.X = room.players.O;
      room.players.O = t;

      // on laisse turn="X" (X commence toujours) car on est en waiting
      room.stateVersion++;
      saveRoom(room);
      broadcastState(nsp as Namespace, room); // doit inclure { players }
      ok(ack, {});
    });

    // REMATCH (vote à 2, uniquement après fin de manche)
    socket.on(Events.RematchRequest, (ack: Ack<{ votes: number }>) => {
      const roomId = getRoomIdBySocket(socket.id);
      if (!roomId) return err(ack, "NOT_IN_ROOM", "Tu n'es pas dans une room.");
      const room = getRoom(roomId)!;

      // 1) Rematch seulement si la manche est terminée
      if (!room.started || !room.state.winner) {
        return err(
          ack,
          "GAME_NOT_ENDED",
          "Le rematch est possible une fois la manche terminée."
        );
      }

      // 2) Enregistrer le vote (idempotent)
      room.rematchVotes.add(socket.id);

      // 3) Purger les votes fantômes (sockets plus présents)
      const live = new Set([room.players.X, room.players.O].filter(Boolean));
      const filtered = new Set<string>();
      for (const id of room.rematchVotes) if (live.has(id)) filtered.add(id);
      room.rematchVotes = filtered;

      const votes = room.rematchVotes.size;
      saveRoom(room);

      // 4) Notifier + ACK
      ns.to(room.id).emit(Events.RematchStatus, { votes });
      ok(ack, { votes });

      // 5) Si 2/2 et les deux slots sont occupés → relancer la manche
      if (votes >= 2 && room.players.X && room.players.O) {
        const settings = (room.settings ?? {}) as RoomSettings;

        // a) swap X/O si activé
        if (settings.swapRolesOnRematch) {
          const tmp = room.players.X;
          room.players.X = room.players.O;
          room.players.O = tmp;
        }

        // b) reset manche selon gridSize
        const grid = settings.gridSize ?? 3;
        room.state.board = Array(grid * grid).fill(null);
        room.state.turn = "X";
        room.state.winner = null;
        room.started = true;

        // c) RAZ votes + version
        room.rematchVotes.clear();
        room.stateVersion++;
        saveRoom(room);

        // d) pousser le nouvel état + votes=0
        broadcastState(ns, room);
        ns.to(room.id).emit(Events.RematchStatus, { votes: 0 });
      }
    });
  });
}
