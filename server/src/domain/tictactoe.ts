import type { Cell, Player } from "../protocol/types";

export const emptyBoard = (): Cell[] => Array<Cell>(9).fill(null);
export const other = (p: Player): Player => (p === "X" ? "O" : "X");

export function checkWinner(board: Cell[]): { winner: Player | null; draw?: boolean; line?: number[] } {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  for (const line of lines) {
    const [a,b,c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every(c => c !== null)) return { winner: null, draw: true };
  return { winner: null };
}
