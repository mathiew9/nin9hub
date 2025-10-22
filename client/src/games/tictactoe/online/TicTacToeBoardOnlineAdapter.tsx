import { useMemo } from "react";
import TicTacToeBoard from "../TicTacToeBoard";
import { useOnline } from "./TicTacToeOnlineProvider";

type Player = "X" | "O";
type Cell = Player | null;

// util pour la ligne gagnante (3x3 ici)
function calculateWinner(
  s: Cell[],
  n: number
): { player: Player; line: number[] } | null {
  const lines: number[][] = [];
  for (let r = 0; r < n; r++)
    lines.push(Array.from({ length: n }, (_, c) => r * n + c)); // rows
  for (let c = 0; c < n; c++)
    lines.push(Array.from({ length: n }, (_, r) => r * n + c)); // cols
  lines.push([0, 4, 8], [2, 4, 6]); // diags (3x3)

  for (const line of lines) {
    const [f, ...rest] = line;
    if (s[f] && rest.every((i) => s[i] === s[f]))
      return { player: s[f]!, line };
  }
  return null;
}

export default function TicTacToeBoardOnlineAdapter() {
  const { board, turn, winner, canPlay, playTurn } = useOnline();

  // mappe winner -> ligne gagnante pour le template (optionnel)
  const winningLine = useMemo(() => {
    if (!winner) {
      const r = calculateWinner(board as Cell[], 3);
      return r?.line ?? [];
    }
    const r = calculateWinner(board as Cell[], 3);
    return r?.line ?? [];
  }, [board, winner]);

  const onCellClick = (i: number) => {
    if (winner) return;
    if (!canPlay) return;
    playTurn(i);
  };

  return (
    <TicTacToeBoard
      board={board as Cell[]}
      gridSize={3}
      currentPlayer={(turn ?? "X") as Player} // qui doit jouer maintenant
      winningLine={winningLine}
      gameDone={!!winner}
      onCellClick={onCellClick}
      mode="online"
      canPlay={canPlay}
    />
  );
}
