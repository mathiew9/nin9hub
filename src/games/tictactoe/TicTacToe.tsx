import { useState, useEffect } from "react";
import "./TicTacToe.css";
import XIcon from "./XIcon.tsx";
import OIcon from "./OIcon.tsx";

interface Props {
  mode: "ai" | "friend";
  gridSize: number;
}

type Player = "X" | "O";

type SquareValue = Player | null;

export default function TicTacToe({ mode, gridSize }: Props) {
  const [board, setBoard] = useState<SquareValue[]>(() =>
    Array(gridSize * gridSize).fill(null)
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>("X");
  const [scoreX, setScoreX] = useState(0);
  const [scoreO, setScoreO] = useState(0);

  const result = calculateWinner(board, gridSize);
  const winner = result?.player ?? null;
  const winningLine = result?.line ?? [];
  const draw = !winner && !board.includes(null);
  const gameDone = winner || draw;

  const handleClick = (index: number) => {
    if (board[index] || calculateWinner(board, gridSize)) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);
    setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
  };

  const reset = () => {
    setBoard(() => Array(gridSize * gridSize).fill(null));
    setCurrentPlayer("X");
  };
  const resetScore = () => {
    setScoreX(0);
    setScoreO(0);
  };

  useEffect(() => {
    if (winner === "X") {
      setScoreX((prev) => prev + 1);
    } else if (winner === "O") {
      setScoreO((prev) => prev + 1);
    }
  }, [winner]);

  useEffect(() => {
    if (
      mode === "ai" &&
      currentPlayer === "O" &&
      !calculateWinner(board, gridSize) &&
      board.includes(null)
    ) {
      // Petite pause pour simuler la réflexion de l'IA
      const timeout = setTimeout(() => {
        playAiMove();
      }, 300);

      return () => clearTimeout(timeout);
    }
  }, [board, currentPlayer]);

  function playAiMove() {
    const emptyIndexes = board
      .map((value, index) => (value === null ? index : null))
      .filter((v) => v !== null) as number[];

    if (emptyIndexes.length === 0) return;

    const randomIndex =
      emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];

    const newBoard = [...board];
    newBoard[randomIndex] = "O";
    setBoard(newBoard);
    setCurrentPlayer("X");
  }

  return (
    <div className="tictactoe">
      <p className="mode">
        Mode : {mode === "ai" ? "Contre l'ordinateur" : "Avec un ami"}
      </p>

      <h2>
        {winner
          ? `Gagné par ${winner}`
          : draw
          ? "Match nul"
          : `Joueur ${currentPlayer} à jouer`}
      </h2>

      <div className="gameLayout">
        <div className="side left">
          <div className="scoreCard">
            <div className="cardHeader">Score</div>
            <div className="cardBody">
              X - {scoreX} | O - {scoreO}
            </div>
            <div className="cardFooter">
              <button className="resetScore" onClick={resetScore}>
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="center">
          <div
            className="board"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, 80px)`,
              gridTemplateRows: `repeat(${gridSize}, 80px)`,
            }}
          >
            {board.map((value, i) => (
              <button
                key={i}
                className={`square ${
                  (!value && mode !== "ai" && !gameDone) ||
                  (!value &&
                    mode === "ai" &&
                    currentPlayer === "X" &&
                    !gameDone)
                    ? "squareEmpty"
                    : "squareFilled"
                } ${
                  !value && currentPlayer === "X"
                    ? "squareXToPlay"
                    : !value && currentPlayer === "O" && mode !== "ai"
                    ? "squareOToPlay"
                    : ""
                } ${winningLine.includes(i) ? "win" : ""}`}
                onClick={() => handleClick(i)}
              >
                {value === "X" && <XIcon />}
                {value === "O" && <OIcon />}
              </button>
            ))}
          </div>

          <button onClick={reset} className="reset">
            Recommencer
          </button>
        </div>

        <div className="side right" />
      </div>
    </div>
  );
}

// Define the result type: either null or an object containing the winner and the winning line
type WinResult = {
  player: Player;
  line: number[];
} | null;

// Determines if a player has won the game based on the current board and grid size
function calculateWinner(squares: SquareValue[], gridSize: number): WinResult {
  const lines: number[][] = [];

  // Horizontal lines
  // For each row, collect the indexes of its cells
  for (let row = 0; row < gridSize; row++) {
    const line: number[] = [];
    for (let col = 0; col < gridSize; col++) {
      line.push(row * gridSize + col);
    }
    lines.push(line);
  }

  // Vertical lines
  // For each column, collect the indexes of its cells
  for (let col = 0; col < gridSize; col++) {
    const line: number[] = [];
    for (let row = 0; row < gridSize; row++) {
      line.push(row * gridSize + col);
    }
    lines.push(line);
  }

  // Main diagonal (top-left to bottom-right)
  const diag1: number[] = [];
  for (let i = 0; i < gridSize; i++) {
    diag1.push(i * gridSize + i);
  }
  lines.push(diag1);

  // Anti-diagonal (top-right to bottom-left)
  const diag2: number[] = [];
  for (let i = 0; i < gridSize; i++) {
    diag2.push(i * gridSize + (gridSize - 1 - i));
  }
  lines.push(diag2);

  // Check all lines for a winning condition
  for (const line of lines) {
    const [first, ...rest] = line;

    // If the first cell is not null and all others are equal to it,
    // then we have a winner
    if (
      squares[first] &&
      rest.every((index) => squares[index] === squares[first])
    ) {
      return { player: squares[first], line };
    }
  }

  // No winner found
  return null;
}
