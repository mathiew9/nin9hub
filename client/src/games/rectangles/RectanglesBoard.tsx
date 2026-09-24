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
  onZoomChange: (zoom: number) => void;
  rectangles: RectangleShape[];
  previewRectangle: RectangleShape | null;
  invalidRectangleKeys: Set<string>;
  showRuleErrors: boolean;
  previewCounterRight: boolean;
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

const MIN_TOUCH_ZOOM = 50;
const MAX_TOUCH_ZOOM = 250;

const PAN_ACTIVATION_DISTANCE = 7;
const PINCH_ACTIVATION_DISTANCE = 12;
const PINCH_PRIORITY_RATIO = 1.15;

type PointerCoordinates = {
  x: number;
  y: number;
};

type GestureMode = "pending" | "pan" | "pinch";

type GestureState = {
  mode: GestureMode;

  startDistance: number;
  startZoom: number;

  startMidpointX: number;
  startMidpointY: number;

  startPanX: number;
  startPanY: number;
};

function getRectangleKey(rectangle: RectangleShape) {
  return `${rectangle.row}-${rectangle.col}-${rectangle.width}-${rectangle.height}`;
}

function getDistance(first: PointerCoordinates, second: PointerCoordinates) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function getMidpoint(first: PointerCoordinates, second: PointerCoordinates) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export default function RectanglesBoard({
  size,
  clues,
  zoom,
  onZoomChange,
  rectangles,
  previewRectangle,
  invalidRectangleKeys,
  showRuleErrors,
  previewCounterRight,
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

  const boardRef = useRef<HTMLDivElement | null>(null);

  const lastHoveredCellRef = useRef<number | null>(null);

  const lastValidPositionRef = useRef<Position | null>(null);

  const drawingPointerIdRef = useRef<number | null>(null);

  const touchPointersRef = useRef<Map<number, PointerCoordinates>>(new Map());

  const navigationLockedRef = useRef(false);

  const gestureStateRef = useRef<GestureState | null>(null);

  const panRef = useRef({
    x: 0,
    y: 0,
  });

  const lastTouchZoomRef = useRef(zoom);

  const previewBadgeElementRef = useRef<HTMLElement | null>(null);

  const previewBadgeAnimationFrameRef = useRef<number | null>(null);

  const latestPointerPositionRef = useRef({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    lastTouchZoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panRef.current = {
      x: 0,
      y: 0,
    };

    gestureStateRef.current = null;
    navigationLockedRef.current = false;

    touchPointersRef.current.clear();

    const board = boardRef.current;

    const surface = board?.closest<HTMLElement>(".rectangles--boardShell");

    if (surface) {
      surface.style.translate = "";
    }
  }, [rows, cols]);

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
      const margin = 8;

      const badgeWidth = badge.offsetWidth || 40;

      const badgeHeight = badge.offsetHeight || 28;

      let badgeX = previewCounterRight
        ? pointerX + offset
        : pointerX - offset - badgeWidth;

      let badgeY = pointerY + offset;

      if (badgeX + badgeWidth > window.innerWidth - margin) {
        badgeX = pointerX - offset - badgeWidth;
      }

      if (badgeX < margin) {
        badgeX = pointerX + offset;
      }

      if (badgeY + badgeHeight > window.innerHeight - margin) {
        badgeY = pointerY - offset - badgeHeight;
      }

      badgeX = clamp(badgeX, margin, window.innerWidth - badgeWidth - margin);

      badgeY = clamp(badgeY, margin, window.innerHeight - badgeHeight - margin);

      badge.style.transform = `translate3d(
            ${Math.round(badgeX)}px,
            ${Math.round(badgeY)}px,
            0
          )`;
    });
  };

  const getMovableSurface = () => {
    const board = boardRef.current;

    if (!board) {
      return null;
    }

    return board.closest<HTMLElement>(".rectangles--boardShell") ?? board;
  };

  const applyPan = (x: number, y: number) => {
    panRef.current = {
      x,
      y,
    };

    const surface = getMovableSurface();

    if (!surface) {
      return;
    }

    surface.style.translate = `${x}px ${y}px`;
  };

  const startNavigationGesture = () => {
    const pointers = Array.from(touchPointersRef.current.values());

    if (pointers.length < 2) {
      return;
    }

    const first = pointers[0];

    const second = pointers[1];

    const midpoint = getMidpoint(first, second);

    gestureStateRef.current = {
      mode: "pending",

      startDistance: Math.max(getDistance(first, second), 1),

      startZoom: zoom,

      startMidpointX: midpoint.x,

      startMidpointY: midpoint.y,

      startPanX: panRef.current.x,

      startPanY: panRef.current.y,
    };

    lastTouchZoomRef.current = zoom;

    drawingPointerIdRef.current = null;

    lastHoveredCellRef.current = null;

    lastValidPositionRef.current = null;

    navigationLockedRef.current = true;

    onBoardMouseLeave();
  };

  const updateNavigationGesture = () => {
    const gesture = gestureStateRef.current;

    if (!gesture) {
      return;
    }

    const pointers = Array.from(touchPointersRef.current.values());

    if (pointers.length < 2) {
      return;
    }

    const first = pointers[0];

    const second = pointers[1];

    const midpoint = getMidpoint(first, second);

    const distance = getDistance(first, second);

    const deltaX = midpoint.x - gesture.startMidpointX;

    const deltaY = midpoint.y - gesture.startMidpointY;

    const panDistance = Math.hypot(deltaX, deltaY);

    const pinchDistance = Math.abs(distance - gesture.startDistance);

    if (gesture.mode === "pending") {
      const panScore = panDistance / PAN_ACTIVATION_DISTANCE;

      const pinchScore = pinchDistance / PINCH_ACTIVATION_DISTANCE;

      if (panScore < 1 && pinchScore < 1) {
        return;
      }

      if (pinchScore > panScore * PINCH_PRIORITY_RATIO) {
        gesture.mode = "pinch";
      } else {
        gesture.mode = "pan";
      }
    }

    if (gesture.mode === "pan") {
      applyPan(
        gesture.startPanX + deltaX,

        gesture.startPanY + deltaY,
      );

      return;
    }

    const scale = distance / gesture.startDistance;

    const newZoom = clamp(
      Math.round(gesture.startZoom * scale),

      MIN_TOUCH_ZOOM,
      MAX_TOUCH_ZOOM,
    );

    if (newZoom !== lastTouchZoomRef.current) {
      lastTouchZoomRef.current = newZoom;

      onZoomChange(newZoom);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();

    event.currentTarget.setPointerCapture(event.pointerId);

    if (event.pointerType === "touch") {
      touchPointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (touchPointersRef.current.size >= 2) {
        startNavigationGesture();

        return;
      }

      if (navigationLockedRef.current) {
        return;
      }
    }

    const position = getPositionFromPointerEvent(event);

    if (!position) {
      return;
    }

    drawingPointerIdRef.current = event.pointerId;

    lastHoveredCellRef.current = position.row * cols + position.col;

    lastValidPositionRef.current = position;

    updatePreviewBadgePosition(event.clientX, event.clientY);

    onCellMouseDown(position, event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") {
      if (touchPointersRef.current.has(event.pointerId)) {
        touchPointersRef.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
      }

      if (navigationLockedRef.current && touchPointersRef.current.size >= 2) {
        event.preventDefault();

        updateNavigationGesture();

        return;
      }

      if (navigationLockedRef.current) {
        return;
      }
    }

    if (drawingPointerIdRef.current !== event.pointerId) {
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

  const finishPointer = (
    event: React.PointerEvent<HTMLDivElement>,
    cancelled: boolean,
  ) => {
    if (event.pointerType === "touch") {
      touchPointersRef.current.delete(event.pointerId);
    }

    if (navigationLockedRef.current) {
      if (touchPointersRef.current.size === 0) {
        navigationLockedRef.current = false;

        gestureStateRef.current = null;

        lastHoveredCellRef.current = null;

        lastValidPositionRef.current = null;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      return;
    }

    if (drawingPointerIdRef.current !== event.pointerId) {
      return;
    }

    if (!cancelled) {
      const position =
        getPositionFromPointerEvent(event) ?? lastValidPositionRef.current;

      if (position) {
        onCellMouseUp(position);
      }
    } else {
      onBoardMouseLeave();
    }

    drawingPointerIdRef.current = null;

    lastHoveredCellRef.current = null;

    lastValidPositionRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();

    finishPointer(event, false);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    finishPointer(event, true);
  };

  const handlePointerLeave = () => {
    if (drawingPointerIdRef.current !== null || navigationLockedRef.current) {
      return;
    }

    lastHoveredCellRef.current = null;

    lastValidPositionRef.current = null;

    onBoardMouseLeave();
  };

  return (
    <div
      ref={boardRef}
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
