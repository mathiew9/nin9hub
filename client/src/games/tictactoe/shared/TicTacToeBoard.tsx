// TicTacToeBoard.tsx
import XIcon from "./XIcon.tsx";
import OIcon from "./OIcon.tsx";

interface Props {
  board: (null | "X" | "O")[];
  gridSize: number;
  currentPlayer: "X" | "O";
  winningLine: number[];
  gameDone: boolean;
  onCellClick: (index: number) => void;
  mode: "ai" | "friend" | "online";
  canPlay?: boolean;
}

export default function TicTacToeBoard({
  board,
  gridSize,
  currentPlayer,
  winningLine,
  onCellClick,
  gameDone,
  mode,
  canPlay = true,
}: Props) {
  return (
    <div
      className="tictactoe-board"
      style={{
        gridTemplateColumns: `repeat(${gridSize}, 80px)`,
        gridTemplateRows: `repeat(${gridSize}, 80px)`,
      }}
    >
      {board.map((value, i) => {
        // ✅ Règles de clic :
        // - online : basé sur canPlay
        // - ai :
        //    - si canPlay est fourni par le parent => on respecte canPlay
        //    - sinon (fallback) => ancien comportement : humain = X
        // - friend : toujours clickable si case vide et game pas fini
        const canClickThisTurn =
          mode === "online"
            ? !!canPlay
            : mode === "ai"
            ? typeof canPlay === "boolean"
              ? canPlay
              : currentPlayer === "X"
            : true;

        const clickable = !value && !gameDone && canClickThisTurn;

        return (
          <button
            key={i}
            className={`square ${clickable ? "squareEmpty" : "squareFilled"} ${
              !value && currentPlayer === "X" && clickable
                ? "squareXToPlay"
                : !value && currentPlayer === "O" && clickable
                ? "squareOToPlay"
                : ""
            } ${winningLine.includes(i) ? "win" : ""}`}
            onClick={() => clickable && onCellClick(i)}
          >
            {value === "X" && <XIcon />}
            {value === "O" && <OIcon />}
          </button>
        );
      })}
    </div>
  );
}
