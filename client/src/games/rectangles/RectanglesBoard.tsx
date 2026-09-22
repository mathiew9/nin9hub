import { useEffect, useMemo, useRef } from "react";
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
    event: React.PointerEvent<HTMLDivElement>,
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

  const activePointerIdRef = useRef<number | null>(null);

  const lastHoveredCellRef = useRef<number | null>(null);

  const lastValidPositionRef = useRef<Position | null>(null);

  const previewBadgeElementRef = useRef<HTMLElement | null>(null);

  const previewBadgeAnimationFrameRef = useRef<number | null>(null);

  const latestPointerPositionRef = useRef({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    return () => {
      if (previewBadgeAnimationFrameRef.current !== null) {
        cancelAnimationFrame(previewBadgeAnimationFrameRef.current);
      }
    };
  }, []);

  const gridPath = useMemo(() => {
    const lines: string[] = [];

    for (let col = 1; col < cols; col++) {
      const x = col * cellSize + 0.5;

      lines.push(`M ${x} 0 V ${boardHeight}`);
    }

    for (let row = 1; row < rows; row++) {
      const y = row * cellSize + 0.5;

      lines.push(`M 0 ${y} H ${boardWidth}`);
    }

    return lines.join(" ");
  }, [rows, cols, cellSize, boardWidth, boardHeight]);

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

  const getPositionFromPointerEvent = (
    event: React.PointerEvent<HTMLDivElement>,
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

  const updatePreviewBadgePosition = (clientX: number, clientY: number) => {
    latestPointerPositionRef.current = {
      x: clientX,
      y: clientY,
    };

    if (previewBadgeAnimationFrameRef.current !== null) {
      return;
    }

    previewBadgeAnimationFrameRef.current = requestAnimationFrame(() => {
      previewBadgeAnimationFrameRef.current = null;

      let badge = previewBadgeElementRef.current;

      if (!badge || !badge.isConnected) {
        badge = document.querySelector<HTMLElement>(
          ".rectangles--previewBadge",
        );

        previewBadgeElementRef.current = badge;
      }

      if (!badge) {
        return;
      }

      const { x: pointerX, y: pointerY } = latestPointerPositionRef.current;

      const offset = 16;
      const screenMargin = 8;

      const badgeWidth = badge.offsetWidth || 40;
      const badgeHeight = badge.offsetHeight || 28;

      let badgeX = pointerX + offset;

      let badgeY = pointerY + offset;

      if (badgeX + badgeWidth > window.innerWidth - screenMargin) {
        badgeX = pointerX - offset - badgeWidth;
      }

      if (badgeY + badgeHeight > window.innerHeight - screenMargin) {
        badgeY = pointerY - offset - badgeHeight;
      }

      badgeX = Math.max(
        screenMargin,
        Math.min(badgeX, window.innerWidth - badgeWidth - screenMargin),
      );

      badgeY = Math.max(
        screenMargin,
        Math.min(badgeY, window.innerHeight - badgeHeight - screenMargin),
      );

      badge.style.transform = `translate3d(${Math.round(
        badgeX,
      )}px, ${Math.round(badgeY)}px, 0)`;
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (activePointerIdRef.current !== null) {
      return;
    }

    const position = getPositionFromPointerEvent(event);

    if (!position) {
      return;
    }

    event.preventDefault();

    activePointerIdRef.current = event.pointerId;

    lastHoveredCellRef.current = position.row * cols + position.col;

    lastValidPositionRef.current = position;

    event.currentTarget.setPointerCapture(event.pointerId);

    updatePreviewBadgePosition(event.clientX, event.clientY);

    onCellMouseDown(position, event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();

    updatePreviewBadgePosition(event.clientX, event.clientY);

    const position = getPositionFromPointerEvent(event);

    if (!position) {
      return;
    }

    lastValidPositionRef.current = position;

    const index = position.row * cols + position.col;

    if (lastHoveredCellRef.current === index) {
      return;
    }

    lastHoveredCellRef.current = index;

    onCellMouseEnter(position);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();

    updatePreviewBadgePosition(event.clientX, event.clientY);

    const position =
      getPositionFromPointerEvent(event) ?? lastValidPositionRef.current;

    if (position) {
      onCellMouseUp(position);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    activePointerIdRef.current = null;

    lastHoveredCellRef.current = null;

    lastValidPositionRef.current = null;
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    activePointerIdRef.current = null;

    lastHoveredCellRef.current = null;

    lastValidPositionRef.current = null;

    onBoardMouseLeave();
  };

  const handlePointerLeave = () => {
    if (activePointerIdRef.current !== null) {
      return;
    }

    lastHoveredCellRef.current = null;

    lastValidPositionRef.current = null;

    onBoardMouseLeave();
  };

  const handleLostPointerCapture = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    activePointerIdRef.current = null;

    lastHoveredCellRef.current = null;

    lastValidPositionRef.current = null;

    onBoardMouseLeave();
  };

  return (
    <div
      className="rectanglesBoard"
      style={{
        width: `${boardWidth}px`,
        height: `${boardHeight}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      onLostPointerCapture={handleLostPointerCapture}
      onContextMenu={(event) => event.preventDefault()}
    >
      <svg
        className="rectanglesBoard--grid"
        width={boardWidth}
        height={boardHeight}
        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
        aria-hidden="true"
      >
        <path d={gridPath} className="rectanglesBoard--gridLines" />
      </svg>

      <div className="rectanglesBoard--savedRectanglesLayer">
        {renderedRectangles}
      </div>

      {previewRectangle && (
        <div
          className={[
            "rectanglesBoard--previewRectangle",

            toggleFilledRectangles
              ? "rectanglesBoard--previewRectangleFilled"
              : "",

            toggleColoredRectangles
              ? "rectanglesBoard--previewRectangleColored"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
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

      <div className="rectanglesBoard--cluesLayer">{renderedClues}</div>
    </div>
  );
}
