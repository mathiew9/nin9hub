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
  onCellMouseDown: (position: Position) => void;
  onCellMouseEnter: (position: Position) => void;
  onCellMouseUp: (position: Position) => void;
  onBoardMouseLeave: () => void;
};

function isCellInsideRectangle(
  row: number,
  col: number,
  rectangle: RectangleShape,
) {
  return (
    row >= rectangle.row &&
    row < rectangle.row + rectangle.height &&
    col >= rectangle.col &&
    col < rectangle.col + rectangle.width
  );
}

function getRectangleClasses(
  row: number,
  col: number,
  rectangle: RectangleShape | null,
  baseClass: string,
) {
  if (!rectangle || !isCellInsideRectangle(row, col, rectangle)) {
    return "";
  }

  const classes = [baseClass];

  if (row === rectangle.row) {
    classes.push(`${baseClass}Top`);
  }

  if (row === rectangle.row + rectangle.height - 1) {
    classes.push(`${baseClass}Bottom`);
  }

  if (col === rectangle.col) {
    classes.push(`${baseClass}Left`);
  }

  if (col === rectangle.col + rectangle.width - 1) {
    classes.push(`${baseClass}Right`);
  }

  return classes.join(" ");
}

export default function RectanglesBoard({
  size,
  clues,
  zoom,
  rectangles,
  previewRectangle,
  onCellMouseDown,
  onCellMouseEnter,
  onCellMouseUp,
  onBoardMouseLeave,
}: RectanglesBoardProps) {
  const { rows, cols } = size;
  const cells = Array.from({ length: rows * cols });
  const cellSize = Math.round((32 * zoom) / 100);
  const fontSize = Math.round(cellSize * 0.4);

  return (
    <div
      className="rectanglesBoard"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
      }}
      onMouseLeave={onBoardMouseLeave}
    >
      {cells.map((_, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;

        const clue = clues.find(
          (currentClue) => currentClue.row === row && currentClue.col === col,
        );

        const savedRectangle = rectangles.find((rectangle) =>
          isCellInsideRectangle(row, col, rectangle),
        );

        const savedRectangleClasses = getRectangleClasses(
          row,
          col,
          savedRectangle || null,
          "rectanglesBoard--cellSaved",
        );

        const previewClasses = getRectangleClasses(
          row,
          col,
          previewRectangle,
          "rectanglesBoard--cellPreview",
        );

        return (
          <div
            key={index}
            className={`rectanglesBoard--cell ${savedRectangleClasses} ${previewClasses}`}
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
            }}
            onMouseDown={() => onCellMouseDown({ row, col })}
            onMouseEnter={() => onCellMouseEnter({ row, col })}
            onMouseUp={() => onCellMouseUp({ row, col })}
          >
            {clue && (
              <span
                className="rectanglesBoard--clue"
                style={{ fontSize: `${fontSize}px` }}
              >
                {clue.value}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
