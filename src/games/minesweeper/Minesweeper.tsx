import { useEffect, useState } from "react";
import "./Minesweeper.css";
import { FaBomb, FaFlag, FaQuestion, FaStopwatch } from "react-icons/fa";
import { LiaTimesSolid } from "react-icons/lia";
interface Cell {
  isMine: boolean;
  revealed: boolean;
  adjacentMines: number;
  x: number;
  y: number;
  flag: "none" | "flag" | "question" | "wrong";
  isWrongTrigger?: boolean;
}

interface Props {
  rows: number;
  cols: number;
  mines: number;
}

export default function Minesweeper({ rows, cols, mines }: Props) {
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [activeCells, setActiveCells] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState(0);

  const getKey = (x: number, y: number) => `${x}-${y}`;

  useEffect(() => {
    initGrid();
  }, [rows, cols, mines]);

  const deepCopyGrid = (grid: Cell[][]): Cell[][] =>
    grid.map((row) => row.map((cell) => ({ ...cell })));

  const initGrid = () => {
    setTimer(0);
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
          flag: "none",
        });
      }
      newGrid.push(row);
    }

    let minesPlaced = 0;
    while (minesPlaced < mines) {
      const x = Math.floor(Math.random() * cols);
      const y = Math.floor(Math.random() * rows);
      if (!newGrid[y][x].isMine) {
        newGrid[y][x].isMine = true;
        minesPlaced++;
      }
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        newGrid[y][x].adjacentMines = countAdjacentMines(newGrid, x, y);
      }
    }

    setGrid(newGrid);
    setGameOver(false);
    setVictory(false);
  };

  const countAdjacentMines = (grid: Cell[][], x: number, y: number) => {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx >= 0 &&
          nx < cols &&
          ny >= 0 &&
          ny < rows &&
          grid[ny][nx].isMine
        ) {
          count++;
        }
      }
    }
    return count;
  };

  const revealCell = (x: number, y: number) => {
    const currentCell = grid[y][x];
    if (gameOver || currentCell.revealed || currentCell.flag === "flag") return;

    const newGrid = deepCopyGrid(grid);
    const revealRecursively = (x: number, y: number) => {
      if (
        x < 0 ||
        x >= cols ||
        y < 0 ||
        y >= rows ||
        newGrid[y][x].revealed ||
        newGrid[y][x].flag === "flag"
      )
        return;

      const cell = newGrid[y][x];
      cell.revealed = true;

      if (cell.adjacentMines === 0 && !cell.isMine) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx !== 0 || dy !== 0) {
              revealRecursively(x + dx, y + dy);
            }
          }
        }
      }
    };

    const clickedCell = newGrid[y][x];
    if (clickedCell.isMine) {
      // Révèle toutes les bombes
      newGrid.forEach((row) =>
        row.forEach((cell) => {
          if (cell.isMine) cell.revealed = true;
        })
      );

      // Marque cette bombe comme responsable
      newGrid[y][x].isWrongTrigger = true;

      setGrid(newGrid);
      setGameOver(true);
      return;
    }

    revealRecursively(x, y);

    // Vérifie la victoire
    const totalCells = rows * cols;
    const revealedCount = newGrid.flat().filter((cell) => cell.revealed).length;
    if (revealedCount === totalCells - mines) {
      newGrid.forEach((row) =>
        row.forEach((cell) => {
          if (cell.isMine && !cell.revealed) {
            cell.flag = "flag";
          }
        })
      );
      setVictory(true);
      setGameOver(true);
    }

    setGrid(newGrid);
  };

  const revealRecursivelyFromGrid = (grid: Cell[][], x: number, y: number) => {
    if (
      x < 0 ||
      x >= cols ||
      y < 0 ||
      y >= rows ||
      grid[y][x].revealed ||
      grid[y][x].flag === "flag"
    )
      return;

    const cell = grid[y][x];
    cell.revealed = true;

    if (cell.adjacentMines === 0 && !cell.isMine) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx !== 0 || dy !== 0) {
            revealRecursivelyFromGrid(grid, x + dx, y + dy);
          }
        }
      }
    }
  };

  const handleRightClick = (
    e: React.MouseEvent<HTMLDivElement>,
    x: number,
    y: number
  ) => {
    e.preventDefault();
    if (gameOver || grid[y][x].revealed) return;

    const newGrid = deepCopyGrid(grid);
    const cell = newGrid[y][x];

    // Cycle: none → flag → question → none
    if (cell.flag === "none") {
      cell.flag = "flag";
    } else if (cell.flag === "flag") {
      cell.flag = "question";
    } else {
      cell.flag = "none";
    }

    setGrid(newGrid);
  };
  const countFlags = (grid: Cell[][]) =>
    grid.flat().filter((cell) => cell.flag === "flag").length;

  const handleNumberClick = (x: number, y: number) => {
    const cell = grid[y][x];
    if (gameOver || !cell.revealed || cell.adjacentMines === 0) return;

    const adjacentCoords = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (
          !(dx === 0 && dy === 0) &&
          nx >= 0 &&
          nx < cols &&
          ny >= 0 &&
          ny < rows
        ) {
          adjacentCoords.push({ x: nx, y: ny });
        }
      }
    }

    const flagged = adjacentCoords.filter(
      ({ x, y }) => grid[y][x].flag === "flag"
    );
    if (flagged.length !== cell.adjacentMines) return;

    const newGrid = deepCopyGrid(grid);

    const wrongFlag = flagged.some(({ x, y }) => !newGrid[y][x].isMine);
    if (wrongFlag) {
      const newGrid = deepCopyGrid(grid);

      // Révéler toutes les bombes
      newGrid.forEach((row) =>
        row.forEach((cell) => {
          if (cell.isMine) cell.revealed = true;
          // Marque les drapeaux incorrects
          if (cell.flag === "flag" && !cell.isMine) {
            cell.flag = "wrong"; // drapeau barré, sans fond rouge
          }
        })
      );

      // Trouver la bombe fautive (non flaggée)
      const culprit = adjacentCoords.find(
        ({ x, y }) => newGrid[y][x].isMine && newGrid[y][x].flag !== "flag"
      );
      if (culprit) {
        newGrid[culprit.y][culprit.x].isWrongTrigger = true;
      }

      setGrid(newGrid);
      setGameOver(true);
      return;
    }

    // Tous les drapeaux sont corrects → on révèle les cases autour
    for (const { x: nx, y: ny } of adjacentCoords) {
      if (!newGrid[ny][nx].revealed && newGrid[ny][nx].flag === "none") {
        revealRecursivelyFromGrid(newGrid, nx, ny);
      }
    }

    setGrid(newGrid);

    // Vérifie victoire après révélation
    const totalCells = rows * cols;
    const revealedCount = newGrid.flat().filter((cell) => cell.revealed).length;
    if (revealedCount === totalCells - mines) {
      newGrid.forEach((row) =>
        row.forEach((cell) => {
          if (cell.isMine && !cell.revealed) {
            cell.flag = "flag";
          }
        })
      );
      setVictory(true);
      setGameOver(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, x: number, y: number) => {
    if (e.button !== 0 || gameOver) return; // ⛔ ignore clic droit

    const cell = grid[y][x];
    const newActive = new Set<string>();

    if (!cell.revealed && cell.flag === "none") {
      newActive.add(getKey(x, y));
    } else if (cell.revealed && cell.adjacentMines > 0) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            (dx !== 0 || dy !== 0) &&
            nx >= 0 &&
            nx < cols &&
            ny >= 0 &&
            ny < rows
          ) {
            const adjCell = grid[ny][nx];
            if (!adjCell.revealed && adjCell.flag === "none") {
              newActive.add(getKey(nx, ny));
            }
          }
        }
      }
    }

    setActiveCells(newActive);
  };

  const clearActive = () => setActiveCells(new Set());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (!gameOver && !victory) {
      interval = setInterval(() => setTimer((t) => t + 1), 1000);
    }

    return () => clearInterval(interval);
  }, [gameOver, victory]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="minesweeper">
      <div className="top-bar">
        <span className="scoreText">
          <FaFlag /> {mines - countFlags(grid)}
        </span>

        <div className="topBarCenter">
          {victory && <span className="topBarMessage victory">Victoire !</span>}
          {gameOver && !victory && (
            <span className="topBarMessage gameOver">Perdu !</span>
          )}
        </div>

        <div className="timerContainer">
          <FaStopwatch className="timerIcon" />
          <span className="timerText">{formatTime(timer)}</span>
        </div>
      </div>

      <div className="minesweeperGrid">
        {grid.map((row, y) => (
          <div key={y} className="row">
            {row.map((cell, x) => (
              <div
                key={x}
                className={`cell 
                  ${cell.revealed ? "revealed" : ""} 
                  ${
                    cell.isMine && cell.isWrongTrigger ? "wrongBomb" : ""
                  }                 
                  ${cell.isWrongTrigger ? "wrongTrigger" : ""}
                  ${
                    !cell.revealed &&
                    cell.flag === "none" &&
                    activeCells.has(getKey(x, y))
                      ? "active"
                      : ""
                  }
                `}
                onClick={() => {
                  if (cell.revealed && cell.adjacentMines > 0) {
                    handleNumberClick(x, y);
                  } else {
                    revealCell(x, y);
                  }
                  clearActive();
                }}
                onMouseDown={(e) => handleMouseDown(e, x, y)}
                onMouseUp={clearActive}
                onMouseLeave={clearActive}
                onContextMenu={(e) => handleRightClick(e, x, y)}
              >
                {cell.revealed ? (
                  cell.isMine ? (
                    <FaBomb />
                  ) : cell.adjacentMines > 0 ? (
                    <span className={`number number-${cell.adjacentMines}`}>
                      {cell.adjacentMines}
                    </span>
                  ) : (
                    ""
                  )
                ) : cell.flag === "flag" ? (
                  <FaFlag />
                ) : cell.flag === "wrong" ? (
                  <span className="wrongFlag">
                    <FaFlag />
                    <LiaTimesSolid className="crossIcon" />
                  </span>
                ) : cell.flag === "question" ? (
                  <FaQuestion />
                ) : (
                  ""
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="gameStatus">
        <button onClick={initGrid} className="restartButton">
          Recommencer
        </button>
      </div>
    </div>
  );
}
