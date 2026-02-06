import type { RoomSettingsBase, Seat } from "../../core/typesCore";
import type { GameAdapter } from "../../core/room/roomService";
import { C4Events } from "../../events/events";
import type { C4State, C4GameSettings, C4Move } from "./types";

const ROWS = 6;
const COLS = 7;

function otherSeat(seat: Seat): Seat {
  return seat === "p1" ? "p2" : "p1";
}

function nextDeadline(ms: number) {
  return Date.now() + ms;
}

function setTurnTimer(state: C4State, turnTimeMs: number) {
  const ms = Math.max(0, Math.floor(turnTimeMs ?? 0));
  if (ms > 0) {
    state.turnDeadlineAt = nextDeadline(ms);
    state.turnStartedAt = null;
  } else {
    state.turnDeadlineAt = null;
    state.turnStartedAt = Date.now();
  }
}

function emptyBoard(): (Seat | null)[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null),
  );
}

function isDraw(board: (Seat | null)[][]): boolean {
  // draw si la première ligne est full
  return board[0].every((c) => c !== null);
}

function dropInColumn(board: (Seat | null)[][], col: number, seat: Seat) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === null) {
      board[row][col] = seat;
      return { row, col };
    }
  }
  return null; // colonne pleine
}

function checkWinner(
  board: (Seat | null)[][],
  lastRow: number,
  lastCol: number,
  seat: Seat,
): { winner: Seat; cells: Array<{ row: number; col: number }> } | null {
  const dirs = [
    { dr: 0, dc: 1 }, // horiz
    { dr: 1, dc: 0 }, // vert
    { dr: 1, dc: 1 }, // diag \
    { dr: 1, dc: -1 }, // diag /
  ];

  for (const { dr, dc } of dirs) {
    const cells: Array<{ row: number; col: number }> = [
      { row: lastRow, col: lastCol },
    ];

    // forward
    for (let k = 1; k < 4; k++) {
      const r = lastRow + dr * k;
      const c = lastCol + dc * k;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
      if (board[r][c] !== seat) break;
      cells.push({ row: r, col: c });
    }

    // backward
    for (let k = 1; k < 4; k++) {
      const r = lastRow - dr * k;
      const c = lastCol - dc * k;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
      if (board[r][c] !== seat) break;
      cells.push({ row: r, col: c });
    }

    if (cells.length >= 4) {
      return { winner: seat, cells };
    }
  }

  return null;
}

/* ---------------- Base settings (communs) ---------------- */

function defaultBaseSettings(): RoomSettingsBase {
  return {
    roundsToWin: 1,
    turnTimeMs: 0,
    idleKickMs: 0,
    moveRateLimitMs: 150,
    roomCodeLength: 5,
    reconnectGraceMs: 8000,
    preserveGameOnLeave: false,
    promoteGuestOnHostLeave: true,
    autoRematchOnBoth: false,
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

function defaultGameSettings(): C4GameSettings {
  return {
    // si tu veux swap auto sur rematch un jour
    swapRolesOnRematch: false,
  };
}

function sanitizeGameSettings(
  partial: Partial<C4GameSettings>,
): C4GameSettings {
  const d = defaultGameSettings();
  return {
    swapRolesOnRematch: !!(partial?.swapRolesOnRematch ?? d.swapRolesOnRematch),
  };
}

/* ---------------- Adapter export ---------------- */

export const c4Adapter: GameAdapter<C4State, C4GameSettings, C4Move> = {
  gameKey: "c4",

  clientEvents: C4Events as any,
  serverEvents: C4Events as any,

  defaultBaseSettings,
  defaultGameSettings,

  sanitizeBaseSettings,
  sanitizeGameSettings,

  createInitialState(): C4State {
    return {
      board: emptyBoard(),
      turn: "p1",
      winner: null,
      winningCells: [],
      turnDeadlineAt: null,
      turnStartedAt: null,
    };
  },

  canStart() {
    // Core check déjà “2 joueurs + host only”.
    return { ok: true };
  },

  validateMove({ room, seat, move }) {
    if (room.matchWinner) {
      return {
        ok: false,
        code: "MATCH_ENDED",
        message: "Le match est terminé.",
      };
    }
    if (room.state.winner) {
      return {
        ok: false,
        code: "ROUND_ENDED",
        message: "La manche est terminée.",
      };
    }
    if (seat !== room.state.turn) {
      return {
        ok: false,
        code: "NOT_YOUR_TURN",
        message: "Ce n'est pas ton tour.",
      };
    }

    const col = move?.column;
    if (!Number.isInteger(col) || col < 0 || col >= COLS) {
      return { ok: false, code: "MOVE_INVALID", message: "Colonne invalide." };
    }
    if (room.state.board[0][col] !== null) {
      return { ok: false, code: "MOVE_INVALID", message: "Colonne pleine." };
    }

    return { ok: true };
  },

  applyMove({ room, seat, move }) {
    const col = move.column;

    const placed = dropInColumn(room.state.board, col, seat);
    if (!placed) {
      // Normalement impossible car validateMove check column full
      return;
    }

    const win = checkWinner(room.state.board, placed.row, placed.col, seat);
    if (win) {
      room.state.winner = win.winner;
      room.state.winningCells = win.cells;

      // score / match
      const winnerSocketId = room.seats[win.winner];
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
      room.state.winningCells = [];
      room.state.turnDeadlineAt = null;
      room.state.turnStartedAt = null;
      return;
    }

    room.state.turn = otherSeat(room.state.turn);
    room.state.winningCells = [];

    setTurnTimer(room.state, room.settingsBase.turnTimeMs ?? 0);
  },

  onTurnTimeout({ room }) {
    // random colonne dispo
    const cols: number[] = [];
    for (let c = 0; c < COLS; c++) {
      if (room.state.board[0][c] === null) cols.push(c);
    }
    if (cols.length === 0) return { ok: false };

    const column = cols[Math.floor(Math.random() * cols.length)];
    return { ok: true, move: { column } };
  },

  onRematchAccepted({ room }) {
    const matchWasEnded = !!room.matchWinner;
    if (matchWasEnded) {
      if (room.seats.p1) room.matchScore[room.seats.p1] = 0;
      if (room.seats.p2) room.matchScore[room.seats.p2] = 0;
      room.matchWinner = null;
    }

    // Optionnel si tu actives plus tard:
    if (room.gameSettings.swapRolesOnRematch) {
      const tmpSeat = room.seats.p1;
      room.seats.p1 = room.seats.p2;
      room.seats.p2 = tmpSeat;

      const tmpLabel = room.players.p1;
      room.players.p1 = room.players.p2;
      room.players.p2 = tmpLabel;
    }

    room.state.board = emptyBoard();
    room.state.turn = "p1";
    room.state.winner = null;
    room.state.winningCells = [];

    setTurnTimer(room.state, room.settingsBase.turnTimeMs ?? 0);
  },
};
