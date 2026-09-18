import { useMemo, useRef } from "react";
import "./RectanglesBoard.css";
import type {
  Clue,
  GridSize,
  Position,
  RectangleShape,
} from "./rectanglesTypes";

type RectanglesBoardProps = {
  size: GridSize;
  clues: Clue[];
  zoom: number;
  rectangles: RectangleShape[];
  previewRectangle: RectangleShape | null;
  invalidRectangleKeys: Set<string>;
  showRuleErrors: boolean;
  toggleFilledRectangles: boolean;
  toggleColoredRectangles: boolean;
  onCellMouseDown: (
    position: Position,
    event: React.MouseEvent<HTMLDivElement>,
  ) => void;
  onCellMouseEnter: (position: Position) => void;
  onCellMouseUp: (position: Position) => void;
  onBoardMouseLeave: () => void;
};

const RECTANGLE_COLOR_COUNT = 8;

function getRectangleKey(rectangle: RectangleShape) {
  return `${rectangle.row}-${rectangle.col}-${rectangle.width}-${rectangle.height}`;
}

export default function RectanglesBoard({
  size,
  clues,
  zoom,
  rectangles,
  previewRectangle,
  invalidRectangleKeys,
  showRuleErrors,
  toggleFilledRectangles,
  toggleColoredRectangles,
  onCellMouseDown,
  onCellMouseEnter,
  onCellMouseUp,
  onBoardMouseLeave,
}: RectanglesBoardProps) {
  const { rows, cols } = size;

  const cellSize = Math.round((32 * zoom) / 100);
  const fontSize = Math.round(cellSize * 0.4);

  const boardWidth = cols * cellSize;
  const boardHeight = rows * cellSize;

  const lastHoveredCellRef = useRef<number | null>(null);

  /* =========================================================
     GRILLE
     ========================================================= */

  const gridPath = useMemo(() => {
    const lines: string[] = [];

    /*
     * Lignes verticales internes.
     * Le contour extérieur est déjà dessiné par le board.
     */
    for (let col = 1; col < cols; col++) {
      const x = col * cellSize + 0.5;

      lines.push(`M ${x} 0 V ${boardHeight}`);
    }

    /*
     * Lignes horizontales internes.
     */
    for (let row = 1; row < rows; row++) {
      const y = row * cellSize + 0.5;

      lines.push(`M 0 ${y} H ${boardWidth}`);
    }

    return lines.join(" ");
  }, [rows, cols, cellSize, boardWidth, boardHeight]);

  /* =========================================================
     INDICES
     ========================================================= */

  const renderedClues = useMemo(() => {
    return clues.map((clue) => {
      const clueKey = `${clue.row}-${clue.col}`;

      return (
        <div
          key={clueKey}
          className="rectanglesBoard--clue"
          style={{
            width: `${cellSize}px`,
            height: `${cellSize}px`,
            fontSize: `${fontSize}px`,
            transform: `translate3d(
              ${clue.col * cellSize}px,
              ${clue.row * cellSize}px,
              0
            )`,
          }}
        >
          {clue.value}
        </div>
      );
    });
  }, [clues, cellSize, fontSize]);

  /* =========================================================
     RECTANGLES POSÉS
     ========================================================= */

  const renderedRectangles = useMemo(() => {
    return rectangles.map((rectangle, index) => {
      const rectangleKey = getRectangleKey(rectangle);

      const isInvalid =
        showRuleErrors && invalidRectangleKeys.has(rectangleKey);

      const classes = [
        "rectanglesBoard--savedRectangle",

        toggleFilledRectangles ? "rectanglesBoard--savedRectangleFilled" : "",

        toggleColoredRectangles
          ? `rectanglesBoard--savedRectangleColored rectanglesBoard--rectangleColor${
              index % RECTANGLE_COLOR_COUNT
            }`
          : "",

        isInvalid ? "rectanglesBoard--savedRectangleInvalid" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return (
        <div
          key={rectangleKey}
          className={classes}
          style={{
            width: `${rectangle.width * cellSize}px`,
            height: `${rectangle.height * cellSize}px`,
            transform: `translate3d(
              ${rectangle.col * cellSize}px,
              ${rectangle.row * cellSize}px,
              0
            )`,
          }}
        />
      );
    });
  }, [
    rectangles,
    cellSize,
    showRuleErrors,
    invalidRectangleKeys,
    toggleFilledRectangles,
    toggleColoredRectangles,
  ]);

  /* =========================================================
     POSITION SOURIS
     ========================================================= */

  const getPositionFromMouseEvent = (
    event: React.MouseEvent<HTMLDivElement>,
  ): Position | null => {
    const board = event.currentTarget;
    const bounds = board.getBoundingClientRect();

    const x = event.clientX - bounds.left - board.clientLeft;

    const y = event.clientY - bounds.top - board.clientTop;

    if (x < 0 || y < 0 || x >= boardWidth || y >= boardHeight) {
      return null;
    }

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return null;
    }

    return {
      row,
      col,
    };
  };

  /* =========================================================
     ÉVÉNEMENTS SOURIS
     ========================================================= */

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const position = getPositionFromMouseEvent(event);

    if (!position) {
      return;
    }

    lastHoveredCellRef.current = position.row * cols + position.col;

    onCellMouseDown(position, event);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const position = getPositionFromMouseEvent(event);

    if (!position) {
      return;
    }

    const index = position.row * cols + position.col;

    if (lastHoveredCellRef.current === index) {
      return;
    }

    lastHoveredCellRef.current = index;

    onCellMouseEnter(position);
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    const position = getPositionFromMouseEvent(event);

    if (!position) {
      return;
    }

    onCellMouseUp(position);
  };

  const handleMouseLeave = () => {
    lastHoveredCellRef.current = null;

    onBoardMouseLeave();
  };

  /* =========================================================
     RENDU
     ========================================================= */

  return (
    <div
      className="rectanglesBoard"
      style={{
        width: `${boardWidth}px`,
        height: `${boardHeight}px`,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Grille complète en un seul élément SVG */}
      <svg
        className="rectanglesBoard--grid"
        width={boardWidth}
        height={boardHeight}
        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
        aria-hidden="true"
      >
        <path d={gridPath} className="rectanglesBoard--gridLines" />
      </svg>

      {/* Rectangles posés */}
      <div className="rectanglesBoard--savedRectanglesLayer">
        {renderedRectangles}
      </div>

      {/* Preview */}
      {previewRectangle && (
        <div
          className="rectanglesBoard--previewRectangle"
          style={{
            width: `${previewRectangle.width * cellSize}px`,
            height: `${previewRectangle.height * cellSize}px`,
            transform: `translate3d(
              ${previewRectangle.col * cellSize}px,
              ${previewRectangle.row * cellSize}px,
              0
            )`,
          }}
        />
      )}

      {/* Les indices restent toujours au-dessus */}
      <div className="rectanglesBoard--cluesLayer">{renderedClues}</div>
    </div>
  );
}
