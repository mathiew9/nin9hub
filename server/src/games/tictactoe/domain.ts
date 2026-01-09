import type { Cell, Player } from "../../protocol/types";

/** Return the other player. */
export function other(p: Player): Player {
  return p === "X" ? "O" : "X";
}

/** Create an empty board (n x n). */
export function emptyBoard(gridSize = 3): Cell[] {
  return Array<Cell>(gridSize * gridSize).fill(null);
}

/** Check if a move index is valid and the cell is empty. */
export function isValidMove(board: Cell[], index: number): boolean {
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < board.length &&
    board[index] === null
  );
}

/** Apply a move immutably. */
export function applyMove(
  board: Cell[],
  index: number,
  player: Player
): Cell[] {
  if (!isValidMove(board, index)) return board;

  const next = board.slice();
  next[index] = player;
  return next;
}

/** Win / draw detection */
type WinnerResult = {
  winner: Player | null;
  draw: boolean;
  line: number[];
};

function buildLines(gridSize: number): number[][] {
  const lines: number[][] = [];
  const winLength = gridSize;

  // rows
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c <= gridSize - winLength; c++) {
      const L: number[] = [];
      for (let k = 0; k < winLength; k++) L.push(r * gridSize + (c + k));
      lines.push(L);
    }
  }

  // columns
  for (let c = 0; c < gridSize; c++) {
    for (let r = 0; r <= gridSize - winLength; r++) {
      const L: number[] = [];
      for (let k = 0; k < winLength; k++) L.push((r + k) * gridSize + c);
      lines.push(L);
    }
  }

  // main diagonals
  for (let r = 0; r <= gridSize - winLength; r++) {
    for (let c = 0; c <= gridSize - winLength; c++) {
      const L: number[] = [];
      for (let k = 0; k < winLength; k++) L.push((r + k) * gridSize + (c + k));
      lines.push(L);
    }
  }

  // anti-diagonals
  for (let r = 0; r <= gridSize - winLength; r++) {
    for (let c = winLength - 1; c < gridSize; c++) {
      const L: number[] = [];
      for (let k = 0; k < winLength; k++) L.push((r + k) * gridSize + (c - k));
      lines.push(L);
    }
  }

  return lines;
}

/** Check winner, draw state and winning line. */
export function checkWinner(board: Cell[], gridSize = 3): WinnerResult {
  const lines = buildLines(gridSize);

  for (const L of lines) {
    const a = board[L[0]];
    if (!a) continue;

    let ok = true;
    for (let i = 1; i < L.length; i++) {
      if (board[L[i]] !== a) {
        ok = false;
        break;
      }
    }

    if (ok) return { winner: a, draw: false, line: L };
  }

  const draw = board.every((c) => c !== null);
  return { winner: null, draw, line: [] };
}

// Timer
/** Compute next turn deadline or null if timer disabled. */
export function nextDeadline(turnTimeMs: number): number | null {
  return turnTimeMs > 0 ? Date.now() + turnTimeMs : null;
}
