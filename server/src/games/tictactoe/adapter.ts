import type { RoomSettingsBase, Seat } from "../../core/typesCore";
import type { TTTState, TTTGameSettings, TTTCell, TTTPlayer } from "./types";
import type { GameAdapter } from "../../core/roomService";
import { TTTEvents } from "../../protocol/events";

export type TTTMove = { index: number };

function nextDeadline(ms: number) {
  return Date.now() + ms;
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

function otherSeat(seat: "p1" | "p2"): "p1" | "p2" {
  return seat === "p1" ? "p2" : "p1";
}

// --- Helpers ---
function emptyBoard(size: number): TTTCell[] {
  return Array<TTTCell>(size * size).fill(null);
}

// Win check (simple, marche pour NxN)
function checkWinner(
  board: TTTCell[], // = (Seat | null)[]
  n: number,
): { winner: Seat | null; line: number[] } {
  const lines: number[][] = [];

  // rows
  for (let r = 0; r < n; r++) {
    const row: number[] = [];
    for (let c = 0; c < n; c++) row.push(r * n + c);
    lines.push(row);
  }

  // cols
  for (let c = 0; c < n; c++) {
    const col: number[] = [];
    for (let r = 0; r < n; r++) col.push(r * n + c);
    lines.push(col);
  }

  // diag \
  const d1: number[] = [];
  for (let i = 0; i < n; i++) d1.push(i * n + i);
  lines.push(d1);

  // diag /
  const d2: number[] = [];
  for (let i = 0; i < n; i++) d2.push(i * n + (n - 1 - i));
  lines.push(d2);

  for (const line of lines) {
    const first = board[line[0]];
    if (!first) continue;

    let ok = true;
    for (let i = 1; i < line.length; i++) {
      if (board[line[i]] !== first) {
        ok = false;
        break;
      }
    }

    if (ok) return { winner: first, line };
  }

  return { winner: null, line: [] };
}

function isDraw(board: TTTCell[]): boolean {
  return board.every((c) => c !== null);
}

// --- Settings base (communs) ---
function defaultBaseSettings(): RoomSettingsBase {
  return {
    roundsToWin: 1,
    turnTimeMs: 0,
    idleKickMs: 0,
    moveRateLimitMs: 150,
    roomCodeLength: 4,
    reconnectGraceMs: 8000,
    preserveGameOnLeave: false,
    promoteGuestOnHostLeave: true,
    autoRematchOnBoth: false,
    resetRolesOnRematch: false,
  };
}

function sanitizeBaseSettings(
  partial: Partial<RoomSettingsBase>,
): RoomSettingsBase {
  const d = defaultBaseSettings();
  return {
    ...d,
    ...partial,
    roundsToWin: Math.max(1, Math.floor(partial.roundsToWin ?? d.roundsToWin)),
    turnTimeMs: Math.max(0, Math.floor(partial.turnTimeMs ?? d.turnTimeMs)),
    idleKickMs: Math.max(0, Math.floor(partial.idleKickMs ?? d.idleKickMs)),
    moveRateLimitMs: Math.max(
      0,
      Math.floor(partial.moveRateLimitMs ?? d.moveRateLimitMs),
    ),
    roomCodeLength: Math.max(
      3,
      Math.min(8, Math.floor(partial.roomCodeLength ?? d.roomCodeLength)),
    ),
    reconnectGraceMs: Math.max(
      0,
      Math.floor(partial.reconnectGraceMs ?? d.reconnectGraceMs),
    ),
  };
}

function defaultGameSettings(): TTTGameSettings {
  return {
    gridSize: 3,
    swapRolesOnRematch: true,
  };
}

function sanitizeGameSettings(
  partial: Partial<TTTGameSettings>,
): TTTGameSettings {
  const d = defaultGameSettings();

  return {
    gridSize: Math.max(
      3,
      Math.min(8, Math.floor(partial.gridSize ?? d.gridSize)),
    ),
    swapRolesOnRematch: !!partial.swapRolesOnRematch,
  };
}

// --- Adapter export ---
export const tttAdapter: GameAdapter<TTTState, TTTGameSettings, TTTMove> = {
  gameKey: "ttt",

  // même objet de strings des deux côtés (on sépare juste le typing)
  clientEvents: TTTEvents as any,
  serverEvents: TTTEvents as any,

  defaultBaseSettings,
  defaultGameSettings,

  sanitizeBaseSettings,
  sanitizeGameSettings,

  createInitialState({ gameSettings }): TTTState {
    const size = gameSettings.gridSize;

    return {
      board: Array<TTTCell>(size * size).fill(null),
      turn: "p1",
      winner: null,
      line: [],
      turnDeadlineAt: null,
      turnStartedAt: null,
    };
  },

  canStart(room) {
    // Le core check déjà "2 joueurs" + host-only.
    // Ici, on peut reset l’état au start si tu veux (mais on le fait dans apply/adapter start plus tard).
    // Pour l’instant ok.
    return { ok: true };
  },

  validateMove({ room, seat, move }) {
    if (room.matchWinner)
      return {
        ok: false,
        code: "MATCH_ENDED",
        message: "Le match est terminé.",
      };

    if (room.state.winner)
      return {
        ok: false,
        code: "MATCH_ENDED",
        message: "La manche est terminée.",
      };
    if (seat !== room.state.turn)
      return {
        ok: false,
        code: "NOT_YOUR_TURN",
        message: "Ce n'est pas ton tour.",
      };

    const idx = move?.index;
    const size = room.state.board.length;
    if (!Number.isInteger(idx) || idx < 0 || idx >= size) {
      return { ok: false, code: "MOVE_INVALID", message: "Index invalide." };
    }
    if (room.state.board[idx] !== null) {
      return { ok: false, code: "MOVE_INVALID", message: "Case déjà prise." };
    }
    return { ok: true };
  },

  applyMove({ room, seat, move }) {
    const n = room.gameSettings.gridSize;
    const idx = move.index;

    room.state.board[idx] = seat;

    const res = checkWinner(room.state.board, n);

    if (res.winner) {
      room.state.winner = res.winner;
      room.state.line = res.line;

      const winnerSeat = res.winner;
      const winnerSocketId = room.seats[winnerSeat];

      room.matchScore[winnerSocketId] =
        (room.matchScore[winnerSocketId] ?? 0) + 1;

      const roundsToWin = Math.max(
        1,
        Math.floor(room.settingsBase.roundsToWin ?? 1),
      );
      if (room.matchScore[winnerSocketId] >= roundsToWin) {
        room.matchWinner = winnerSocketId;
      }

      room.state.turnDeadlineAt = null;
      room.state.turnStartedAt = null;
      return;
    }

    if (isDraw(room.state.board)) {
      room.state.winner = "draw";
      room.state.line = [];

      room.state.turnDeadlineAt = null;
      room.state.turnStartedAt = null;
      return;
    }

    room.state.turn = otherSeat(room.state.turn);
    room.state.line = [];

    setTurnTimer(room.state, room.settingsBase.turnTimeMs ?? 0);
  },

  onTurnTimeout({ room }) {
    const board = room.state.board; // (Seat | null)[]
    const empties: number[] = [];

    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) empties.push(i);
    }

    if (empties.length === 0) return { ok: false };

    const index = empties[Math.floor(Math.random() * empties.length)];
    return { ok: true, move: { index } };
  },

  onRematchAccepted({ room }) {
    const matchWasEnded = !!room.matchWinner;
    if (matchWasEnded) {
      room.matchScore = { p1: 0, p2: 0 };
      room.matchWinner = null;
    }

    if (room.gameSettings.swapRolesOnRematch) {
      const tmpSeat = room.seats.p1;
      room.seats.p1 = room.seats.p2;
      room.seats.p2 = tmpSeat;

      const tmpLabel = room.players.p1;
      room.players.p1 = room.players.p2;
      room.players.p2 = tmpLabel;
    }

    const n = room.gameSettings.gridSize;
    room.state.board = emptyBoard(n);
    room.state.turn = "p1";
    room.state.winner = null;
    room.state.line = [];

    setTurnTimer(room.state, room.settingsBase.turnTimeMs ?? 0);
  },
};
