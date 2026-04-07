import { useMemo, useState } from "react";
import { FaMinus, FaPlus } from "react-icons/fa";
import { TiZoomIn } from "react-icons/ti";
import RectanglesBoard from "./RectanglesBoard";
import type {
  Position,
  RectangleShape,
  RectanglesPuzzle,
} from "./rectanglesTypes";
import "./Rectangles.css";

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

export default function Rectangles() {
  const [showZoomControls, setShowZoomControls] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [dragStart, setDragStart] = useState<Position | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rectangles, setRectangles] = useState<RectangleShape[]>([]);

  const puzzle: RectanglesPuzzle = {
    size: {
      rows: 5,
      cols: 5,
    },
    clues: [
      { row: 0, col: 1, value: 4 },
      { row: 0, col: 4, value: 2 },
      { row: 1, col: 3, value: 3 },
      { row: 2, col: 0, value: 5 },
      { row: 2, col: 2, value: 1 },
      { row: 3, col: 4, value: 6 },
      { row: 4, col: 1, value: 2 },
    ],
    solution: [],
  };

  const previewRectangle = useMemo(() => {
    if (!dragStart || !dragCurrent) {
      return null;
    }

    return getRectangleFromPositions(dragStart, dragCurrent);
  }, [dragStart, dragCurrent]);

  const handleCellMouseDown = (position: Position) => {
    setIsDragging(true);
    setDragStart(position);
    setDragCurrent(position);
  };

  const handleCellMouseEnter = (position: Position) => {
    if (!isDragging) {
      return;
    }

    setDragCurrent(position);
  };

  const handleCellMouseUp = (position: Position) => {
    if (!isDragging || !dragStart) {
      return;
    }

    const rectangle = getRectangleFromPositions(dragStart, position);

    setRectangles((prev) => [...prev, rectangle]);
    console.log("Rectangle created:", rectangle);

    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  const handleBoardMouseLeave = () => {
    if (!isDragging) {
      return;
    }

    setDragCurrent(dragStart);
  };

  return (
    <div className="rectangles">
      <div className="rectangles--boardArea">
        <div className="rectangles--boardShell">
          <RectanglesBoard
            size={puzzle.size}
            clues={puzzle.clues}
            zoom={zoom}
            rectangles={rectangles}
            previewRectangle={previewRectangle}
            onCellMouseDown={handleCellMouseDown}
            onCellMouseEnter={handleCellMouseEnter}
            onCellMouseUp={handleCellMouseUp}
            onBoardMouseLeave={handleBoardMouseLeave}
          />
        </div>
      </div>

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
