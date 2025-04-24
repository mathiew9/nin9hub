import { useState } from "react";
import "./Connect4.css";

const ROWS = 6;
const COLS = 7;

export default function Connect4() {
  const [board, setBoard] = useState(
    Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState("red");
  const [winner, setWinner] = useState<string | null>(null);

  const dropDisc = (col: number) => {
    if (winner) return;
    const newBoard = board.map((row) => [...row]);
    for (let row = ROWS - 1; row >= 0; row--) {
      if (!newBoard[row][col]) {
        newBoard[row][col] = currentPlayer;
        setBoard(newBoard);
        if (checkWinner(newBoard, row, col, currentPlayer)) {
          setWinner(currentPlayer);
        } else {
          setCurrentPlayer(currentPlayer === "red" ? "yellow" : "red");
        }
        break;
      }
    }
  };

  const checkWinner = (
    board: string[][],
    row: number,
    col: number,
    player: string
  ) => {
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];
    for (const [dx, dy] of directions) {
      let count = 1;
      for (let step = 1; step < 4; step++) {
        const r = row + step * dx;
        const c = col + step * dy;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player)
          break;
        count++;
      }
      for (let step = 1; step < 4; step++) {
        const r = row - step * dx;
        const c = col - step * dy;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player)
          break;
        count++;
      }
      if (count >= 4) return true;
    }
    return false;
  };

  const resetGame = () => {
    setBoard(
      Array(ROWS)
        .fill(null)
        .map(() => Array(COLS).fill(null))
    );
    setCurrentPlayer("red");
    setWinner(null);
  };

  return (
    <div className="connect4">
      {winner && <h3>{winner.toUpperCase()} wins!</h3>}
      <div className="board">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="row">
            {row.map((cell, colIndex) => (
              <div
                key={colIndex}
                className={`cell ${cell || ""}`}
                onClick={() => dropDisc(colIndex)}
              />
            ))}
          </div>
        ))}
      </div>
      <br></br>
      <button className="connect4-restart-button" onClick={resetGame}>
        Restart
      </button>
    </div>
  );
}
