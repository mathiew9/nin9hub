import { useEffect, useMemo, useState } from "react";
import { FaMinus, FaPlus } from "react-icons/fa";
import { TiZoomIn } from "react-icons/ti";
import RectanglesBoard from "./RectanglesBoard";
import type {
  Clue,
  GridSize,
  Position,
  RectangleShape,
} from "./rectanglesTypes";
import "./Rectangles.css";

import { generateRectanglesPuzzle } from "./rectanglesGenerator";

const AVAILABLE_SIZES: GridSize[] = [
  { rows: 5, cols: 5 },
  { rows: 7, cols: 7 },
  { rows: 10, cols: 10 },
  { rows: 12, cols: 12 },
  { rows: 15, cols: 15 },
];

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

export default function Rectangles() {
  const [showZoomControls, setShowZoomControls] = useState(false);
  const [zoom, setZoom] = useState(150);
  const [selectedSize, setSelectedSize] = useState<GridSize>({
    rows: 5,
    cols: 5,
  });
  const [puzzleSeed, setPuzzleSeed] = useState(0);
  const [dragStart, setDragStart] = useState<Position | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rectangles, setRectangles] = useState<RectangleShape[]>([]);
  const [pointerPosition, setPointerPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showRuleErrors, setShowRuleErrors] = useState(true);
  const [showPreviewArea, setShowPreviewArea] = useState(true);

  const puzzle = useMemo(
    () => generateRectanglesPuzzle(selectedSize),
    [selectedSize, puzzleSeed],
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
    setRectangles([]);
    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
    setPointerPosition(null);
  }, [selectedSize, puzzleSeed]);

  useEffect(() => {
    if (!isDragging || gameWon) {
      return;
    }

    const handleWindowMouseUp = () => {
      setIsDragging(false);
      setDragStart(null);
      setDragCurrent(null);
      setPointerPosition(null);
    };

    const handleWindowMouseMove = (event: MouseEvent) => {
      setPointerPosition({
        x: event.clientX,
        y: event.clientY,
      });
    };

    window.addEventListener("mouseup", handleWindowMouseUp);
    window.addEventListener("mousemove", handleWindowMouseMove);

    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp);
      window.removeEventListener("mousemove", handleWindowMouseMove);
    };
  }, [isDragging, gameWon]);

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
    setPointerPosition({
      x: event.clientX,
      y: event.clientY,
    });
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
      setPointerPosition(null);
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
    setPointerPosition(null);
  };

  const handleBoardMouseLeave = () => {
    if (!isDragging || gameWon) {
      return;
    }

    setDragCurrent(dragStart);
  };

  const handleSizeChange = (size: GridSize) => {
    setSelectedSize(size);
  };

  const handleNewGrid = () => {
    setPuzzleSeed((prev) => prev + 1);
  };

  const handleClearRectangles = () => {
    setRectangles([]);
    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
    setPointerPosition(null);
  };

  return (
    <div className="rectangles">
      <div className="rectangles--sideWrapper">
        <div className="rectangles--sidePanel">
          <div className="rectangles--sideLabel">Actions</div>

          <div className="rectangles--actionButtons">
            <button
              type="button"
              className="rectangles--sideButton"
              onClick={handleNewGrid}
            >
              Nouvelle grille
            </button>

            <button
              type="button"
              className="rectangles--sideButton"
              onClick={handleClearRectangles}
            >
              Effacer
            </button>
          </div>
        </div>

        <div className="rectangles--sidePanel">
          <div className="rectangles--sideLabel">Tailles</div>

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

        <div className="rectangles--sidePanel">
          <div className="rectangles--sideLabel">Options</div>

          <label className="rectangles--toggleRow">
            <input
              type="checkbox"
              checked={showRuleErrors}
              onChange={(e) => setShowRuleErrors(e.target.checked)}
            />
            <span>Afficher les erreurs</span>
          </label>

          <label className="rectangles--toggleRow">
            <input
              type="checkbox"
              checked={showPreviewArea}
              onChange={(e) => setShowPreviewArea(e.target.checked)}
            />
            <span>Compteur de preview</span>
          </label>
        </div>
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
            onCellMouseDown={handleCellMouseDown}
            onCellMouseEnter={handleCellMouseEnter}
            onCellMouseUp={handleCellMouseUp}
            onBoardMouseLeave={handleBoardMouseLeave}
          />
        </div>

        {gameWon && (
          <div className="rectangles--winOverlay">
            <div className="rectangles--winPanel">
              <div className="rectangles--winTitle">Puzzle terminé</div>
              <div className="rectangles--winText">
                Bien joué, tu as trouvé tous les bons rectangles.
              </div>
              <button
                type="button"
                className="rectangles--winButton"
                onClick={handleNewGrid}
              >
                Rejouer
              </button>
            </div>
          </div>
        )}
      </div>

      {previewRectangle && pointerPosition && !gameWon && showPreviewArea && (
        <div
          className="rectangles--previewBadge"
          style={{
            left: `${pointerPosition.x + 16}px`,
            top: `${pointerPosition.y + 16}px`,
          }}
        >
          {previewRectangle.width * previewRectangle.height}
        </div>
      )}

      <div className="rectangles--zoomWrapper">
        {showZoomControls && (
          <div className="rectangles--zoomPanel">
            <div className="rectangles--zoomLabel">Zoom</div>

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
                onChange={(e) => setZoom(Number(e.target.value))}
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

        <button
          type="button"
          title="Zoom"
          className={`rectangles--zoomToggle ${
            showZoomControls ? "rectangles--zoomToggle--active" : ""
          }`}
          onClick={() => setShowZoomControls((prev) => !prev)}
          aria-label="Afficher les contrôles de zoom"
        >
          <TiZoomIn />
        </button>
      </div>
    </div>
  );
}
