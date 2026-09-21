import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaCog, FaMinus, FaPlus } from "react-icons/fa";
import { TiZoomIn } from "react-icons/ti";
import RectanglesBoard from "./RectanglesBoard";
import {
  getRandomRectanglesPuzzle,
  getRectanglesPuzzleById,
} from "./rectanglesLibrary";
import type {
  Clue,
  GridSize,
  Position,
  RectangleShape,
  RectanglesPuzzle,
  RectanglesStorageState,
} from "./rectanglesTypes";
import "./Rectangles.css";

import { useTranslation } from "react-i18next";

import { loadGame, saveGame, STORAGE_KEYS } from "../../utils/storage";

const AVAILABLE_SIZES: GridSize[] = [
  { rows: 5, cols: 5 },
  { rows: 10, cols: 10 },
  { rows: 15, cols: 15 },
  { rows: 20, cols: 20 },
  { rows: 25, cols: 25 },
];

const RECTANGLES_STORAGE_VERSION = 1;

function getSizeStorageKey(size: GridSize) {
  return `${size.rows}x${size.cols}`;
}

function loadRectanglesStorage(): RectanglesStorageState {
  const saved = loadGame<RectanglesStorageState>(STORAGE_KEYS.rectangles);

  if (!saved || saved.version !== RECTANGLES_STORAGE_VERSION) {
    return {
      version: RECTANGLES_STORAGE_VERSION,
      sizes: {},
    };
  }

  return saved;
}

function loadSavedGameForSize(size: GridSize): {
  puzzle: RectanglesPuzzle;
  rectangles: RectangleShape[];
  elapsedSeconds: number;
} {
  const storage = loadRectanglesStorage();
  const sizeKey = getSizeStorageKey(size);

  const savedGame = storage.sizes[sizeKey];

  if (savedGame) {
    const savedPuzzle = getRectanglesPuzzleById(size, savedGame.puzzleId);

    if (savedPuzzle) {
      return {
        puzzle: savedPuzzle,
        rectangles: savedGame.rectangles,
        elapsedSeconds: savedGame.elapsedSeconds ?? 0,
      };
    }
  }

  return {
    puzzle: getRandomRectanglesPuzzle(size),
    rectangles: [],
    elapsedSeconds: 0,
  };
}

function saveCurrentGame(
  size: GridSize,
  puzzleId: string,
  rectangles: RectangleShape[],
  elapsedSeconds: number,
) {
  const storage = loadRectanglesStorage();
  const sizeKey = getSizeStorageKey(size);

  storage.sizes[sizeKey] = {
    puzzleId,
    rectangles,
    elapsedSeconds,
  };

  saveGame(STORAGE_KEYS.rectangles, storage);
}

function getRectangleFromPositions(
  start: Position,
  end: Position,
): RectangleShape {
  const row = Math.min(start.row, end.row);
  const col = Math.min(start.col, end.col);
  const width = Math.abs(end.col - start.col) + 1;
  const height = Math.abs(end.row - start.row) + 1;

  return {
    row,
    col,
    width,
    height,
  };
}

function isRectangleValid(rectangle: RectangleShape) {
  return rectangle.width * rectangle.height >= 2;
}

function doRectanglesOverlap(
  firstRectangle: RectangleShape,
  secondRectangle: RectangleShape,
) {
  const firstTop = firstRectangle.row;
  const firstBottom = firstRectangle.row + firstRectangle.height - 1;
  const firstLeft = firstRectangle.col;
  const firstRight = firstRectangle.col + firstRectangle.width - 1;

  const secondTop = secondRectangle.row;
  const secondBottom = secondRectangle.row + secondRectangle.height - 1;
  const secondLeft = secondRectangle.col;
  const secondRight = secondRectangle.col + secondRectangle.width - 1;

  const noVerticalOverlap = firstBottom < secondTop || secondBottom < firstTop;
  const noHorizontalOverlap =
    firstRight < secondLeft || secondRight < firstLeft;

  return !noVerticalOverlap && !noHorizontalOverlap;
}

function isPositionInsideRectangle(
  position: Position,
  rectangle: RectangleShape,
) {
  return (
    position.row >= rectangle.row &&
    position.row < rectangle.row + rectangle.height &&
    position.col >= rectangle.col &&
    position.col < rectangle.col + rectangle.width
  );
}

function getRectangleKey(rectangle: RectangleShape) {
  return `${rectangle.row}-${rectangle.col}-${rectangle.width}-${rectangle.height}`;
}

function areRectanglesSetsEqual(
  playerRectangles: RectangleShape[],
  solutionRectangles: RectangleShape[],
) {
  if (playerRectangles.length !== solutionRectangles.length) {
    return false;
  }

  const playerKeys = [...playerRectangles].map(getRectangleKey).sort();
  const solutionKeys = [...solutionRectangles].map(getRectangleKey).sort();

  return playerKeys.every((key, index) => key === solutionKeys[index]);
}

function getCluesInsideRectangle(rectangle: RectangleShape, clues: Clue[]) {
  return clues.filter(
    (clue) =>
      clue.row >= rectangle.row &&
      clue.row < rectangle.row + rectangle.height &&
      clue.col >= rectangle.col &&
      clue.col < rectangle.col + rectangle.width,
  );
}

function isRectangleRuleValid(rectangle: RectangleShape, clues: Clue[]) {
  const containedClues = getCluesInsideRectangle(rectangle, clues);

  if (containedClues.length !== 1) {
    return false;
  }

  return rectangle.width * rectangle.height === containedClues[0].value;
}

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export default function Rectangles() {
  const { t } = useTranslation();
  const [showZoomControls, setShowZoomControls] = useState(false);
  const [showSettingsControls, setShowSettingsControls] = useState(false);
  const [zoom, setZoom] = useState(150);

  const initialGame = useMemo(
    () =>
      loadSavedGameForSize({
        rows: 5,
        cols: 5,
      }),
    [],
  );

  const [selectedSize, setSelectedSize] = useState<GridSize>({
    rows: 5,
    cols: 5,
  });

  const [puzzle, setPuzzle] = useState<RectanglesPuzzle>(initialGame.puzzle);

  const [dragStart, setDragStart] = useState<Position | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rectangles, setRectangles] = useState<RectangleShape[]>(
    initialGame.rectangles,
  );
  const [showWinPanel, setShowWinPanel] = useState(true);

  const previewBadgeRef = useRef<HTMLDivElement | null>(null);

  const pointerPositionRef = useRef({
    x: 0,
    y: 0,
  });

  const pointerAnimationFrameRef = useRef<number | null>(null);

  const updatePreviewBadgePosition = useCallback((x: number, y: number) => {
    pointerPositionRef.current = {
      x,
      y,
    };

    if (pointerAnimationFrameRef.current !== null) {
      return;
    }

    pointerAnimationFrameRef.current = requestAnimationFrame(() => {
      pointerAnimationFrameRef.current = null;

      const badge = previewBadgeRef.current;

      if (!badge) {
        return;
      }

      const { x: pointerX, y: pointerY } = pointerPositionRef.current;

      badge.style.transform = `translate3d(
      ${pointerX + 16}px,
      ${pointerY + 16}px,
      0
    )`;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (pointerAnimationFrameRef.current !== null) {
        cancelAnimationFrame(pointerAnimationFrameRef.current);
      }
    };
  }, []);

  const [showRuleErrors, setShowRuleErrors] = useState(true);
  const [showPreviewArea, setShowPreviewArea] = useState(true);
  const [toggleColoredRectangles, setToggleColoredRectangles] = useState(true);
  const [toggleFilledRectangles, setToggleFilledRectangles] = useState(true);
  const [showTimer, setShowTimer] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(
    initialGame.elapsedSeconds,
  );

  const invalidRectangleKeys = useMemo(() => {
    return new Set(
      rectangles
        .filter((rectangle) => !isRectangleRuleValid(rectangle, puzzle.clues))
        .map(getRectangleKey),
    );
  }, [rectangles, puzzle.clues]);

  const gameWon = useMemo(() => {
    return areRectanglesSetsEqual(rectangles, puzzle.solution);
  }, [rectangles, puzzle.solution]);

  useEffect(() => {
    if (gameWon) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [gameWon]);

  const previewRectangle = useMemo(() => {
    if (!dragStart || !dragCurrent || gameWon) {
      return null;
    }

    const rectangle = getRectangleFromPositions(dragStart, dragCurrent);

    if (!isRectangleValid(rectangle)) {
      return null;
    }

    return rectangle;
  }, [dragStart, dragCurrent, gameWon]);

  useEffect(() => {
    saveCurrentGame(selectedSize, puzzle.id, rectangles, elapsedSeconds);
  }, [selectedSize, puzzle.id, rectangles, elapsedSeconds]);

  const resetInteractionState = () => {
    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
    setShowWinPanel(true);
  };

  useEffect(() => {
    if (!isDragging || gameWon) {
      return;
    }

    const handleWindowMouseUp = () => {
      setIsDragging(false);
      setDragStart(null);
      setDragCurrent(null);
    };

    const handleWindowMouseMove = (event: MouseEvent) => {
      updatePreviewBadgePosition(event.clientX, event.clientY);
    };

    window.addEventListener("mouseup", handleWindowMouseUp);
    window.addEventListener("mousemove", handleWindowMouseMove);

    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp);
      window.removeEventListener("mousemove", handleWindowMouseMove);
    };
  }, [isDragging, gameWon, updatePreviewBadgePosition]);

  const handleCellMouseDown = (
    position: Position,
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (gameWon) {
      return;
    }

    setIsDragging(true);
    setDragStart(position);
    setDragCurrent(position);

    updatePreviewBadgePosition(event.clientX, event.clientY);
  };

  const handleCellMouseEnter = (position: Position) => {
    if (!isDragging || gameWon) {
      return;
    }

    setDragCurrent(position);
  };

  const handleCellMouseUp = (position: Position) => {
    if (!isDragging || !dragStart || gameWon) {
      return;
    }

    const rectangle = getRectangleFromPositions(dragStart, position);

    const isClickWithoutDrag =
      dragStart.row === position.row && dragStart.col === position.col;

    if (isClickWithoutDrag) {
      const clickedRectangle = rectangles.find((currentRectangle) =>
        isPositionInsideRectangle(position, currentRectangle),
      );

      if (clickedRectangle) {
        setRectangles((prev) =>
          prev.filter(
            (currentRectangle) => currentRectangle !== clickedRectangle,
          ),
        );
      }

      setIsDragging(false);
      setDragStart(null);
      setDragCurrent(null);

      return;
    }

    if (isRectangleValid(rectangle)) {
      setRectangles((prev) => {
        const rectanglesWithoutOverlaps = prev.filter(
          (existingRectangle) =>
            !doRectanglesOverlap(existingRectangle, rectangle),
        );

        return [...rectanglesWithoutOverlaps, rectangle];
      });
    }

    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  const handleBoardMouseLeave = () => {
    if (!isDragging || gameWon) {
      return;
    }

    setDragCurrent(dragStart);
  };

  const handleSizeChange = (size: GridSize) => {
    if (size.rows === selectedSize.rows && size.cols === selectedSize.cols) {
      return;
    }

    const savedGame = loadSavedGameForSize(size);

    setSelectedSize(size);
    setPuzzle(savedGame.puzzle);
    setRectangles(savedGame.rectangles);
    setElapsedSeconds(savedGame.elapsedSeconds);

    resetInteractionState();
  };

  const handleNewGrid = () => {
    const nextPuzzle = getRandomRectanglesPuzzle(selectedSize, puzzle.id);

    setPuzzle(nextPuzzle);
    setRectangles([]);
    setElapsedSeconds(0);

    resetInteractionState();
  };

  const handleClearRectangles = () => {
    setRectangles([]);
    resetInteractionState();
  };

  return (
    <div className="rectangles">
      <div className="rectangles--sideWrapper">
        <div className="rectangles--sidePanel">
          <div className="rectangles--sideLabel">
            {t("games.rectangles.labels.actions")}
          </div>

          <div className="rectangles--actionButtons">
            <button
              type="button"
              className="rectangles--sideButton"
              onClick={handleNewGrid}
            >
              {t("common.actions.newGrid")}
            </button>

            <button
              type="button"
              className="rectangles--sideButton"
              onClick={handleClearRectangles}
            >
              {t("common.actions.erase")}
            </button>
          </div>
        </div>

        <div className="rectangles--sidePanel">
          <div className="rectangles--sideLabel">
            {t("games.rectangles.labels.sizes")}
          </div>

          <div className="rectangles--sizeButtons">
            {AVAILABLE_SIZES.map((size) => {
              const isActive =
                size.rows === selectedSize.rows &&
                size.cols === selectedSize.cols;

              return (
                <button
                  key={`${size.rows}x${size.cols}`}
                  type="button"
                  className={`rectangles--sizeButton ${
                    isActive ? "rectangles--sizeButtonActive" : ""
                  }`}
                  onClick={() => handleSizeChange(size)}
                >
                  {size.rows} x {size.cols}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rectangles--timerArea">
        {showTimer && (
          <div className="rectangles--timer">{formatTime(elapsedSeconds)}</div>
        )}
      </div>

      <div className="rectangles--boardArea">
        <div className="rectangles--boardShell">
          <RectanglesBoard
            size={puzzle.size}
            clues={puzzle.clues}
            zoom={zoom}
            rectangles={rectangles}
            previewRectangle={previewRectangle}
            invalidRectangleKeys={invalidRectangleKeys}
            showRuleErrors={showRuleErrors}
            toggleColoredRectangles={toggleColoredRectangles}
            toggleFilledRectangles={toggleFilledRectangles}
            onCellMouseDown={handleCellMouseDown}
            onCellMouseEnter={handleCellMouseEnter}
            onCellMouseUp={handleCellMouseUp}
            onBoardMouseLeave={handleBoardMouseLeave}
          />
        </div>

        {gameWon && showWinPanel && (
          <div
            className="rectangles--winOverlay"
            onClick={() => setShowWinPanel(false)}
          >
            <div
              className="rectangles--winPanel"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="rectangles--winClose"
                onClick={() => setShowWinPanel(false)}
                aria-label="Fermer"
                title="Fermer"
              >
                ×
              </button>

              <div className="rectangles--winTitle">
                {t("games.rectangles.puzzleCompleted")}
              </div>

              <div className="rectangles--winText">
                {t("games.rectangles.puzzleCompletedMessage")}
                {showTimer && (
                  <div className="rectangles--winTime">
                    Temps : {formatTime(elapsedSeconds)}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="rectangles--winButton"
                onClick={handleNewGrid}
              >
                {t("common.actions.newGrid")}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="rectangles--puzzleId">Puzzle ID: {puzzle.id}</div>

      {previewRectangle && !gameWon && showPreviewArea && (
        <div ref={previewBadgeRef} className="rectangles--previewBadge">
          {previewRectangle.width * previewRectangle.height}
        </div>
      )}

      <div className="rectangles--floatingControls">
        {showSettingsControls && (
          <div className="rectangles--settingsPanel">
            <div className="rectangles--settingsLabel">
              {t("common.labels.settings")}
            </div>

            <div className="rectangles--settingsContent">
              <label className="rectangles--toggleRow">
                <input
                  type="checkbox"
                  checked={showRuleErrors}
                  onChange={(event) => setShowRuleErrors(event.target.checked)}
                />

                <span>{t("games.rectangles.settings.showErrors")}</span>
              </label>

              <label className="rectangles--toggleRow">
                <input
                  type="checkbox"
                  checked={showPreviewArea}
                  onChange={(event) => setShowPreviewArea(event.target.checked)}
                />

                <span>{t("games.rectangles.settings.previewCounter")}</span>
              </label>

              <label className="rectangles--toggleRow">
                <input
                  type="checkbox"
                  checked={toggleColoredRectangles}
                  onChange={(event) =>
                    setToggleColoredRectangles(event.target.checked)
                  }
                />
                <span>{t("games.rectangles.settings.coloredRectangles")}</span>
              </label>

              <label className="rectangles--toggleRow">
                <input
                  type="checkbox"
                  checked={toggleFilledRectangles}
                  onChange={(event) =>
                    setToggleFilledRectangles(event.target.checked)
                  }
                />
                <span>{t("games.rectangles.settings.fillRectangles")}</span>
              </label>

              <label className="rectangles--toggleRow">
                <input
                  type="checkbox"
                  checked={showTimer}
                  onChange={(event) => setShowTimer(event.target.checked)}
                />

                <span>Afficher le timer</span>
              </label>

              <label className="rectangles--toggleRow">
                <input
                  type="checkbox"
                  checked={showTimer}
                  onChange={(event) => setShowTimer(event.target.checked)}
                />

                <span>Afficher le timer</span>
              </label>
            </div>
          </div>
        )}

        {showZoomControls && (
          <div className="rectangles--zoomPanel">
            <div className="rectangles--zoomLabel">
              {t("common.labels.zoom")}
            </div>

            <div className="rectangles--zoomControls">
              <button
                type="button"
                className="rectangles--zoomAction"
                onClick={() => setZoom((prev) => Math.max(prev - 10, 60))}
                aria-label="Zoom out"
              >
                <FaMinus />
              </button>

              <input
                className="rectangles--zoomRange"
                type="range"
                id="rectangles-zoom"
                name="rectangles-zoom"
                min="60"
                max="200"
                step="10"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              />

              <button
                type="button"
                className="rectangles--zoomAction"
                onClick={() => setZoom((prev) => Math.min(prev + 10, 200))}
                aria-label="Zoom in"
              >
                <FaPlus />
              </button>
            </div>
          </div>
        )}

        <div className="rectangles--floatingButtons">
          <button
            type="button"
            title="Paramètres"
            className={`rectangles--floatingToggle ${
              showSettingsControls ? "rectangles--floatingToggleActive" : ""
            }`}
            onClick={() => setShowSettingsControls((prev) => !prev)}
            aria-label="Afficher les paramètres"
          >
            <FaCog />
          </button>

          <button
            type="button"
            title="Zoom"
            className={`rectangles--floatingToggle ${
              showZoomControls ? "rectangles--floatingToggleActive" : ""
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
