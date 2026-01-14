import type { Namespace, Server, Socket } from "socket.io";

import { Events } from "../../protocol/events";
import type { Ack, Player, RoomSettings } from "../../protocol/types";

import { err, ok } from "../../utils/ack";
import { getRoom, getRoomIdBySocket, saveRoom } from "../../core/storeCore";
import { broadcastState } from "../../core/socketsCore";

import { checkWinner, emptyBoard, nextDeadline, other } from "./domain";
import { sanitizeTTTSettings } from "./settings";

const turnTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearTurnTimer(roomId: string) {
  const t = turnTimers.get(roomId);
  if (t) clearTimeout(t);
  turnTimers.delete(roomId);
}

function setTurnTimer(state: any, turnTimeMs: number) {
  const ms = Math.max(0, Math.floor(turnTimeMs ?? 0));

  if (ms > 0) {
    state.turnDeadlineAt = nextDeadline(ms);
    state.turnStartedAt = null;
  } else {
    state.turnDeadlineAt = null;
    state.turnStartedAt = Date.now();
  }
}

function pickRandomEmptyIndex(board: Array<Player | null>): number | null {
  const empties: number[] = [];
  for (let i = 0; i < board.length; i++) if (board[i] === null) empties.push(i);
  if (empties.length === 0) return null;
  return empties[Math.floor(Math.random() * empties.length)];
}
type Seat = "p1" | "p2";

function seatFromSocket(room: any, socketId: string): Seat | null {
  if (!socketId) return null;
  if (room.hostId === socketId) return "p1";
  if (room.guestId === socketId) return "p2";
  return null;
}

function seatFromWinnerSymbol(room: any, winner: Player): Seat | null {
  const winnerSocketId = room.players?.[winner] ?? "";
  return seatFromSocket(room, winnerSocketId);
}
function onRoundFinished(room: any, roundWinner: Player | "draw") {
  // init safe
  if (!room.state.matchScore) room.state.matchScore = { p1: 0, p2: 0 };
  if (room.state.matchWinner === undefined) room.state.matchWinner = null;

  // score uniquement si gagnant
  if (roundWinner === "X" || roundWinner === "O") {
    const settings = (room.settings ?? {}) as RoomSettings;
    const roundsToWin = Math.max(1, Math.floor(settings.roundsToWin ?? 1));

    const seat = seatFromWinnerSymbol(room, roundWinner);
    if (seat) {
      room.state.matchScore[seat] += 1;

      if (room.state.matchScore[seat] >= roundsToWin) {
        room.state.matchWinner = seat;
      }
    }
  }

  room.state.turnDeadlineAt = null;
  room.state.turnStartedAt = null;
}

function armTurnTimer(
  ns: Namespace,
  roomId: string,
  deadlineAt: number | null
) {
  clearTurnTimer(roomId);
  if (!deadlineAt) return;

  const delayMs = Math.max(0, deadlineAt - Date.now());

  const timer = setTimeout(() => {
    const room = getRoom(roomId);
    if (!room) return;

    // ensure this timer is still valid (avoid stale timeouts)
    if (!room.started) return;
    if (room.state.winner) return;
    if (room.state.turnDeadlineAt !== deadlineAt) return;
    if (room.state.matchWinner) return;

    const settings = (room.settings ?? {}) as RoomSettings;
    const grid = settings.gridSize ?? 3;

    const idx = pickRandomEmptyIndex(room.state.board);
    if (idx === null) {
      room.state.winner = "draw";
      room.state.line = [];
      room.state.turnDeadlineAt = null;

      room.stateVersion++;
      saveRoom(room);
      broadcastState(ns, room);
      clearTurnTimer(roomId);
      return;
    }

    const roleToPlay = room.state.turn;
    room.state.board[idx] = roleToPlay;

    const res = checkWinner(room.state.board, grid);

    if (res.winner) {
      room.state.winner = res.winner;
      room.state.line = res.line;
      onRoundFinished(room, res.winner);
      clearTurnTimer(roomId);
    } else if (res.draw) {
      room.state.winner = "draw";
      room.state.line = [];
      onRoundFinished(room, "draw");
      clearTurnTimer(roomId);
    } else {
      room.state.turn = other(roleToPlay);
      room.state.line = [];
      setTurnTimer(room.state, settings.turnTimeMs ?? 0);

      // re-arm next turn timer
      armTurnTimer(ns, roomId, room.state.turnDeadlineAt ?? null);
    }

    room.stateVersion++;
    saveRoom(room);
    broadcastState(ns, room);
  }, delayMs + 15);

  turnTimers.set(roomId, timer);
}

export function registerTicTacToeHandlers(io: Server, nsp: Namespace | Server) {
  const ns = nsp as Namespace;

  (nsp as Server | Namespace).on("connection", (socket: Socket) => {
    // Start game (host-only)
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
      room.state.line = [];
      setTurnTimer(room.state, settings.turnTimeMs ?? 0);

      room.started = true;
      room.rematchVotes.clear();
      room.stateVersion++;

      saveRoom(room);
      broadcastState(ns, room);
      ns.to(room.id).emit(Events.RematchStatus, { votes: 0 });

      armTurnTimer(ns, room.id, room.state.turnDeadlineAt ?? null);

      ok(ack, {});
    });

    // PlayTurn
    socket.on(Events.PlayTurn, (payload: { index: number }, ack: Ack<{}>) => {
      const roomId = getRoomIdBySocket(socket.id);
      if (!roomId) return err(ack, "NOT_IN_ROOM", "Tu n'es pas dans une room.");

      const room = getRoom(roomId)!;
      if (!room.started)
        return err(ack, "GAME_NOT_STARTED", "La partie n'a pas commencé.");

      if (room.state.matchWinner) {
        return err(
          ack,
          "MATCH_ENDED",
          "Le match est terminé. Lance un nouveau match."
        );
      }

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
      const size = room.state.board.length;
      if (!Number.isInteger(idx) || idx < 0 || idx > size - 1) {
        return err(ack, "OUT_OF_RANGE", "Index de case invalide.");
      }
      if (room.state.board[idx] !== null) {
        return err(ack, "CELL_TAKEN", "Cette case est déjà prise.");
      }

      room.state.board[idx] = role;

      const settings = (room.settings ?? {}) as RoomSettings;
      const grid = settings.gridSize ?? 3;
      const res = checkWinner(room.state.board, grid);

      if (res.winner) {
        room.state.winner = res.winner;
        room.state.line = res.line;
        onRoundFinished(room, res.winner);
        clearTurnTimer(room.id);
      } else if (res.draw) {
        room.state.winner = "draw";
        room.state.line = [];
        onRoundFinished(room, "draw");
        clearTurnTimer(room.id);
      } else {
        room.state.turn = other(role);
        room.state.line = [];
        setTurnTimer(room.state, settings.turnTimeMs ?? 0);

        armTurnTimer(ns, room.id, room.state.turnDeadlineAt ?? null);
      }

      room.stateVersion++;
      saveRoom(room);
      broadcastState(ns, room);

      ok(ack, {});
    });

    // Update room settings (host-only)
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

        const merged = sanitizeTTTSettings({
          ...(room.settings ?? {}),
          ...(partial ?? {}),
        });

        room.settings = merged;
        room.stateVersion++;

        saveRoom(room);
        broadcastState(ns, room);

        // If timer setting changes mid-game, re-arm from "now"
        if (room.started && !room.state.winner) {
          setTurnTimer(room.state, merged.turnTimeMs ?? 0);
          saveRoom(room);
          broadcastState(ns, room);
          armTurnTimer(ns, room.id, room.state.turnDeadlineAt ?? null);
        }

        ok(ack, { settings: merged });
      }
    );

    // Swap roles in waiting room (host-only)
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

      const tmp = room.players.X;
      room.players.X = room.players.O;
      room.players.O = tmp;

      room.stateVersion++;
      saveRoom(room);
      broadcastState(ns, room);

      ok(ack, {});
    });

    function startNewMatch(room: any) {
      const settings = (room.settings ?? {}) as RoomSettings;
      const grid = settings.gridSize ?? 3;

      // Option: reset roles to default mapping host=X, guest=O
      if (settings.resetRolesOnRematch) {
        if (room.hostId) room.players.X = room.hostId;
        if (room.guestId) room.players.O = room.guestId;
      } else if (settings.swapRolesOnRematch) {
        // si tu veux swap même entre matchs (à toi de voir)
        const tmp = room.players.X;
        room.players.X = room.players.O;
        room.players.O = tmp;
      }

      room.state.board = emptyBoard(grid);
      room.state.turn = "X";
      room.state.winner = null;
      room.state.line = [];
      room.state.matchScore = { p1: 0, p2: 0 };
      room.state.matchWinner = null;

      setTurnTimer(room.state, settings.turnTimeMs ?? 0);

      room.rematchVotes.clear();
      room.stateVersion++;
    }

    // Rematch vote (2/2)
    socket.on(Events.RematchRequest, (ack: Ack<{ votes: number }>) => {
      const roomId = getRoomIdBySocket(socket.id);
      if (!roomId) return err(ack, "NOT_IN_ROOM", "Tu n'es pas dans une room.");

      const room = getRoom(roomId)!;
      if (!room.started || !room.state.winner) {
        return err(
          ack,
          "GAME_NOT_ENDED",
          "Le rematch est possible une fois la manche terminée."
        );
      }

      room.rematchVotes.add(socket.id);

      const live = new Set([room.players.X, room.players.O].filter(Boolean));
      const filtered = new Set<string>();
      for (const id of room.rematchVotes) if (live.has(id)) filtered.add(id);
      room.rematchVotes = filtered;

      const votes = room.rematchVotes.size;
      saveRoom(room);

      ns.to(room.id).emit(Events.RematchStatus, { votes });
      ok(ack, { votes });

      if (votes >= 2 && room.players.X && room.players.O) {
        const settings = (room.settings ?? {}) as RoomSettings;

        // ✅ Si le match est terminé -> Nouveau match (reset score)
        if (room.state.matchWinner) {
          startNewMatch(room);
          saveRoom(room);
          broadcastState(ns, room);
          ns.to(room.id).emit(Events.RematchStatus, { votes: 0 });

          armTurnTimer(ns, room.id, room.state.turnDeadlineAt ?? null);
          return;
        }

        // ✅ Sinon -> simple manche suivante (score conservé)
        if (settings.swapRolesOnRematch) {
          const tmp = room.players.X;
          room.players.X = room.players.O;
          room.players.O = tmp;
        }

        const grid = settings.gridSize ?? 3;

        room.state.board = emptyBoard(grid);
        room.state.turn = "X";
        room.state.winner = null;
        room.state.line = [];
        setTurnTimer(room.state, settings.turnTimeMs ?? 0);

        room.rematchVotes.clear();
        room.stateVersion++;

        saveRoom(room);
        broadcastState(ns, room);
        ns.to(room.id).emit(Events.RematchStatus, { votes: 0 });

        armTurnTimer(ns, room.id, room.state.turnDeadlineAt ?? null);
      }
    });
  });
}
