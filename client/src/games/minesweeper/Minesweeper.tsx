import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type TouchEvent,
} from "react";

import { FaBomb, FaFlag, FaQuestion, FaMinus, FaPlus } from "react-icons/fa";
import { TiZoomIn } from "react-icons/ti";

import { LiaTimesSolid } from "react-icons/lia";
import { useTranslation } from "react-i18next";

import "./Minesweeper.css";

import GameStatusBar from "../_shared/hud/GameStatusBar";

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

interface TouchPoint {
  x: number;
  y: number;
}

interface PanStart {
  x: number;
  y: number;
  scrollLeft: number;
  scrollTop: number;
}

const LONG_PRESS_DELAY = 450;
const TOUCH_MOVE_TOLERANCE = 10;

export default function Minesweeper({ rows, cols, mines }: Props) {
  const { t } = useTranslation();

  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [activeCells, setActiveCells] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState(0);

  const [zoom, setZoom] = useState(100);
  const [showZoomControls, setShowZoomControls] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const longPressTriggeredRef = useRef(false);

  const touchStartRef = useRef<TouchPoint | null>(null);

  const isPanningRef = useRef(false);

  const panStartRef = useRef<PanStart | null>(null);

  const lastTouchEndRef = useRef(0);

  const touchMovedRef = useRef(false);

  const isPinchingRef = useRef(false);

  const pinchStartDistanceRef = useRef<number | null>(null);

  const pinchStartZoomRef = useRef(100);

  const getKey = (x: number, y: number) => `${x}-${y}`;

  useEffect(() => {
    initGrid();
  }, [rows, cols, mines]);

  const deepCopyGrid = (grid: Cell[][]): Cell[][] =>
    grid.map((row) => row.map((cell) => ({ ...cell })));

  const initGrid = () => {
    setTimer(0);

    const newGrid: Cell[][] = [];

    for (let y = 0; y < rows; y++) {
      const row: Cell[] = [];

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
    setActiveCells(new Set());

    if (viewportRef.current) {
      viewportRef.current.scrollLeft = 0;
      viewportRef.current.scrollTop = 0;
    }
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

    if (gameOver || currentCell.revealed || currentCell.flag === "flag") {
      return;
    }

    const newGrid = deepCopyGrid(grid);

    const revealRecursively = (x: number, y: number) => {
      if (
        x < 0 ||
        x >= cols ||
        y < 0 ||
        y >= rows ||
        newGrid[y][x].revealed ||
        newGrid[y][x].flag === "flag"
      ) {
        return;
      }

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
      newGrid.forEach((row) =>
        row.forEach((cell) => {
          if (cell.isMine) {
            cell.revealed = true;
          }
        }),
      );

      newGrid[y][x].isWrongTrigger = true;

      setGrid(newGrid);
      setGameOver(true);

      return;
    }

    revealRecursively(x, y);

    checkVictory(newGrid);

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
    ) {
      return;
    }

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

  const checkVictory = (gridToCheck: Cell[][]) => {
    const totalCells = rows * cols;

    const revealedCount = gridToCheck
      .flat()
      .filter((cell) => cell.revealed).length;

    if (revealedCount !== totalCells - mines) {
      return false;
    }

    gridToCheck.forEach((row) =>
      row.forEach((cell) => {
        if (cell.isMine && !cell.revealed) {
          cell.flag = "flag";
        }
      }),
    );

    setVictory(true);
    setGameOver(true);

    return true;
  };

  const cycleCellFlag = (x: number, y: number) => {
    if (gameOver || !grid[y] || !grid[y][x] || grid[y][x].revealed) {
      return;
    }

    const newGrid = deepCopyGrid(grid);
    const cell = newGrid[y][x];

    if (cell.flag === "none") {
      cell.flag = "flag";
    } else if (cell.flag === "flag") {
      cell.flag = "question";
    } else {
      cell.flag = "none";
    }

    setGrid(newGrid);
  };

  const handleRightClick = (
    e: MouseEvent<HTMLDivElement>,
    x: number,
    y: number,
  ) => {
    e.preventDefault();

    if (longPressTriggeredRef.current) {
      return;
    }

    cycleCellFlag(x, y);
  };

  const countFlags = (grid: Cell[][]) =>
    grid.flat().filter((cell) => cell.flag === "flag").length;

  const handleNumberClick = (x: number, y: number) => {
    const cell = grid[y][x];

    if (gameOver || !cell.revealed || cell.adjacentMines === 0) {
      return;
    }

    const adjacentCoords: { x: number; y: number }[] = [];

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
          adjacentCoords.push({
            x: nx,
            y: ny,
          });
        }
      }
    }

    const flagged = adjacentCoords.filter(
      ({ x, y }) => grid[y][x].flag === "flag",
    );

    if (flagged.length !== cell.adjacentMines) {
      return;
    }

    const newGrid = deepCopyGrid(grid);

    const wrongFlag = flagged.some(({ x, y }) => !newGrid[y][x].isMine);

    if (wrongFlag) {
      newGrid.forEach((row) =>
        row.forEach((cell) => {
          if (cell.isMine) {
            cell.revealed = true;
          }

          if (cell.flag === "flag" && !cell.isMine) {
            cell.flag = "wrong";
          }
        }),
      );

      const culprit = adjacentCoords.find(
        ({ x, y }) => newGrid[y][x].isMine && newGrid[y][x].flag !== "flag",
      );

      if (culprit) {
        newGrid[culprit.y][culprit.x].isWrongTrigger = true;
      }

      setGrid(newGrid);
      setGameOver(true);

      return;
    }

    for (const { x: nx, y: ny } of adjacentCoords) {
      if (!newGrid[ny][nx].revealed && newGrid[ny][nx].flag === "none") {
        revealRecursivelyFromGrid(newGrid, nx, ny);
      }
    }

    checkVictory(newGrid);

    setGrid(newGrid);
  };

  const handleCellAction = (x: number, y: number) => {
    const cell = grid[y]?.[x];

    if (!cell || gameOver) {
      return;
    }

    if (cell.revealed && cell.adjacentMines > 0) {
      handleNumberClick(x, y);
    } else {
      revealCell(x, y);
    }

    clearActive();
  };

  const getActiveCells = (x: number, y: number) => {
    const cell = grid[y][x];

    const newActive = new Set<string>();

    if (!cell.revealed && cell.flag === "none") {
      newActive.add(getKey(x, y));

      return newActive;
    }

    if (cell.revealed && cell.adjacentMines > 0) {
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
            const adjacentCell = grid[ny][nx];

            if (!adjacentCell.revealed && adjacentCell.flag === "none") {
              newActive.add(getKey(nx, ny));
            }
          }
        }
      }
    }

    return newActive;
  };

  const handleMouseDown = (
    e: MouseEvent<HTMLDivElement>,
    x: number,
    y: number,
  ) => {
    if (e.button !== 0 || gameOver) {
      return;
    }

    setActiveCells(getActiveCells(x, y));
  };

  const clearActive = () => {
    setActiveCells(new Set());
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const getTouchDistance = (
    firstTouch: React.Touch,
    secondTouch: React.Touch,
  ) => {
    return Math.hypot(
      secondTouch.clientX - firstTouch.clientX,
      secondTouch.clientY - firstTouch.clientY,
    );
  };

  const handleCellTouchStart = (
    e: TouchEvent<HTMLDivElement>,
    x: number,
    y: number,
  ) => {
    if (e.touches.length !== 1 || gameOver) {
      cancelLongPress();
      return;
    }

    longPressTriggeredRef.current = false;
    touchMovedRef.current = false;

    const touch = e.touches[0];

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };

    setActiveCells(getActiveCells(x, y));

    cancelLongPress();

    longPressTimerRef.current = setTimeout(() => {
      if (
        touchMovedRef.current ||
        isPanningRef.current ||
        isPinchingRef.current
      ) {
        return;
      }

      longPressTriggeredRef.current = true;

      cycleCellFlag(x, y);
      clearActive();

      if ("vibrate" in navigator) {
        navigator.vibrate(35);
      }

      longPressTimerRef.current = null;
    }, LONG_PRESS_DELAY);
  };

  const handleCellTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1 || !touchStartRef.current) {
      cancelLongPress();
      clearActive();
      return;
    }

    const touch = e.touches[0];

    const distance = Math.hypot(
      touch.clientX - touchStartRef.current.x,
      touch.clientY - touchStartRef.current.y,
    );

    if (distance > TOUCH_MOVE_TOLERANCE) {
      touchMovedRef.current = true;

      cancelLongPress();
      clearActive();
    }
  };

  const handleCellTouchEnd = (
    e: TouchEvent<HTMLDivElement>,
    x: number,
    y: number,
  ) => {
    e.preventDefault();

    cancelLongPress();

    if (
      isPanningRef.current ||
      isPinchingRef.current ||
      touchMovedRef.current
    ) {
      clearActive();

      touchStartRef.current = null;
      lastTouchEndRef.current = Date.now();

      return;
    }

    if (longPressTriggeredRef.current) {
      touchStartRef.current = null;
      lastTouchEndRef.current = Date.now();

      clearActive();

      setTimeout(() => {
        longPressTriggeredRef.current = false;
      }, 300);

      return;
    }

    handleCellAction(x, y);

    touchStartRef.current = null;
    lastTouchEndRef.current = Date.now();

    clearActive();
  };

  const handleCellTouchCancel = () => {
    cancelLongPress();

    longPressTriggeredRef.current = false;
    touchMovedRef.current = false;
    touchStartRef.current = null;

    clearActive();
  };

  const handleViewportTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];

      isPanningRef.current = false;
      isPinchingRef.current = false;

      panStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
      };

      return;
    }

    if (e.touches.length === 2) {
      cancelLongPress();
      clearActive();

      touchMovedRef.current = true;
      isPanningRef.current = false;
      isPinchingRef.current = true;

      panStartRef.current = null;

      pinchStartDistanceRef.current = getTouchDistance(
        e.touches[0],
        e.touches[1],
      );

      pinchStartZoomRef.current = zoom;
    }
  };

  const handleViewportTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    if (e.touches.length === 2 && pinchStartDistanceRef.current !== null) {
      e.preventDefault();

      cancelLongPress();
      clearActive();

      touchMovedRef.current = true;
      isPinchingRef.current = true;
      isPanningRef.current = false;

      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);

      const scale = currentDistance / pinchStartDistanceRef.current;

      const nextZoom = Math.min(
        200,
        Math.max(60, Math.round(pinchStartZoomRef.current * scale)),
      );

      setZoom(nextZoom);

      return;
    }

    if (
      e.touches.length !== 1 ||
      !panStartRef.current ||
      isPinchingRef.current
    ) {
      return;
    }

    const touch = e.touches[0];

    const deltaX = touch.clientX - panStartRef.current.x;

    const deltaY = touch.clientY - panStartRef.current.y;

    const distance = Math.hypot(deltaX, deltaY);

    if (distance <= TOUCH_MOVE_TOLERANCE) {
      return;
    }

    e.preventDefault();

    cancelLongPress();
    clearActive();

    touchMovedRef.current = true;
    isPanningRef.current = true;

    viewport.scrollLeft = panStartRef.current.scrollLeft - deltaX;

    viewport.scrollTop = panStartRef.current.scrollTop - deltaY;
  };

  const handleViewportTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) {
      panStartRef.current = null;

      pinchStartDistanceRef.current = null;

      isPanningRef.current = false;
      isPinchingRef.current = false;

      touchMovedRef.current = false;

      lastTouchEndRef.current = Date.now();

      clearActive();

      return;
    }

    if (isPinchingRef.current && e.touches.length === 1) {
      panStartRef.current = null;
      pinchStartDistanceRef.current = null;

      clearActive();
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (!gameOver && !victory) {
      interval = setInterval(() => setTimer((current) => current + 1), 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [gameOver, victory]);

  useEffect(() => {
    return () => {
      cancelLongPress();
    };
  }, []);

  const minesLeft = mines - countFlags(grid);

  const centerText = victory
    ? `${t("common.results.victory")} !`
    : gameOver
      ? `${t("common.results.defeat")} !`
      : "";

  const gridStyle = {
    "--minesweeper-cell-size": `${30 * (zoom / 100)}px`,
    "--minesweeper-font-size": `${16 * (zoom / 100)}px`,
  } as CSSProperties;

  return (
    <div className="minesweeper">
      <GameStatusBar
        leftText={String(minesLeft)}
        leftBadge={<FaFlag />}
        centerText={centerText}
        timeSec={timer}
        isInfinite={true}
      />

      <div
        ref={viewportRef}
        className="minesweeperViewport"
        onTouchStart={handleViewportTouchStart}
        onTouchMove={handleViewportTouchMove}
        onTouchEnd={handleViewportTouchEnd}
        onTouchCancel={handleViewportTouchEnd}
      >
        <div className="minesweeperGrid" style={gridStyle}>
          {grid.map((row, y) => (
            <div key={y} className="row">
              {row.map((cell, x) => (
                <div
                  key={x}
                  className={`cell
                      ${cell.revealed ? "revealed" : ""}

                      ${cell.isMine && cell.isWrongTrigger ? "wrongBomb" : ""}

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
                    if (Date.now() - lastTouchEndRef.current < 700) {
                      return;
                    }

                    handleCellAction(x, y);
                  }}
                  onMouseDown={(e) => handleMouseDown(e, x, y)}
                  onMouseUp={clearActive}
                  onMouseLeave={clearActive}
                  onContextMenu={(e) => handleRightClick(e, x, y)}
                  onTouchStart={(e) => handleCellTouchStart(e, x, y)}
                  onTouchMove={handleCellTouchMove}
                  onTouchEnd={(e) => handleCellTouchEnd(e, x, y)}
                  onTouchCancel={handleCellTouchCancel}
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
      </div>

      <div className="gameStatus">
        <button
          type="button"
          onClick={initGrid}
          className="commonButton commonMediumButton"
        >
          {t("common.actions.playAgain")}
        </button>
      </div>

      <div className="minesweeper--floatingControls">
        {showZoomControls && (
          <div className="minesweeper--zoomPanel">
            <div className="minesweeper--zoomLabel">
              {t("common.labels.zoom")}
            </div>

            <div className="minesweeper--zoomControls">
              <button
                type="button"
                className="minesweeper--zoomAction"
                onClick={() => setZoom((prev) => Math.max(prev - 10, 60))}
                aria-label="Zoom out"
              >
                <FaMinus />
              </button>

              <input
                className="minesweeper--zoomRange"
                type="range"
                id="minesweeper-zoom"
                name="minesweeper-zoom"
                min="60"
                max="200"
                step="10"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              />

              <button
                type="button"
                className="minesweeper--zoomAction"
                onClick={() => setZoom((prev) => Math.min(prev + 10, 200))}
                aria-label="Zoom in"
              >
                <FaPlus />
              </button>
            </div>
          </div>
        )}

        <div className="minesweeper--floatingButtons">
          <button
            type="button"
            title="Zoom"
            className={`minesweeper--floatingToggle ${
              showZoomControls ? "minesweeper--floatingToggleActive" : ""
            }`}
            onClick={() => setShowZoomControls((prev) => !prev)}
            aria-label="Afficher les contrôles de zoom"
          >
            <TiZoomIn />
          </button>
        </div>
      </div>
    </div>
  );
}
