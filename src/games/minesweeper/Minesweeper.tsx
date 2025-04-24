import { useEffect, useState } from "react";
import "./Minesweeper.css";

interface Cell {
  isMine: boolean;
  revealed: boolean;
  adjacentMines: number;
  x: number;
  y: number;
}

interface Props {
  rows: number;
  cols: number;
  mines: number;
}

export default function Minesweeper({ rows, cols, mines }: Props) {
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [cellsRevealed, setCellsRevealed] = useState(0);

  useEffect(() => {
    initGrid();
  }, [rows, cols, mines]);

  const initGrid = () => {
    // Crée une grille vide
    let newGrid: Cell[][] = [];
    for (let y = 0; y < rows; y++) {
      let row: Cell[] = [];
      for (let x = 0; x < cols; x++) {
        row.push({
          isMine: false,
          revealed: false,
          adjacentMines: 0,
          x,
          y,
        });
      }
      newGrid.push(row);
    }

    // Place les mines aléatoirement
    let minesPlaced = 0;
    while (minesPlaced < mines) {
      const x = Math.floor(Math.random() * cols);
      const y = Math.floor(Math.random() * rows);
      if (!newGrid[y][x].isMine) {
        newGrid[y][x].isMine = true;
        minesPlaced++;
      }
    }

    // Calcule les mines adjacentes
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        newGrid[y][x].adjacentMines = countAdjacentMines(newGrid, x, y);
      }
    }

    setGrid(newGrid);
    setGameOver(false);
    setCellsRevealed(0);
  };

  const countAdjacentMines = (grid: Cell[][], x: number, y: number) => {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        const newX = x + dx;
        const newY = y + dy;
        if (
          newX >= 0 &&
          newX < cols &&
          newY >= 0 &&
          newY < rows &&
          grid[newY][newX].isMine
        ) {
          count++;
        }
      }
    }
    return count;
  };

  const revealCell = (x: number, y: number) => {
    if (gameOver || grid[y][x].revealed) return;

    const newGrid = [...grid];
    const cell = newGrid[y][x];

    if (cell.isMine) {
      cell.revealed = true;
      setGrid(newGrid);
      setGameOver(true);
      return;
    }

    const revealRecursively = (x: number, y: number) => {
      if (x < 0 || x >= cols || y < 0 || y >= rows || newGrid[y][x].revealed)
        return;

      const cell = newGrid[y][x];
      cell.revealed = true;
      setCellsRevealed((prev) => prev + 1);

      if (cell.adjacentMines === 0) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx !== 0 || dy !== 0) {
              revealRecursively(x + dx, y + dy);
            }
          }
        }
      }
    };

    revealRecursively(x, y);
    setGrid(newGrid);
  };

  return (
    <div className="minesweeperGrid">
      {grid.map((row, y) => (
        <div key={y} className="row">
          {row.map((cell, x) => (
            <div
              key={x}
              className={`cell ${cell.revealed ? "revealed" : ""} ${
                gameOver && cell.isMine ? "mine" : ""
              }`}
              onClick={() => revealCell(x, y)}
            >
              {cell.revealed
                ? cell.isMine
                  ? "💣"
                  : cell.adjacentMines > 0
                  ? cell.adjacentMines
                  : ""
                : ""}
            </div>
          ))}
        </div>
      ))}

      {gameOver && <div className="gameOver">💥 Game Over !</div>}
    </div>
  );
}
