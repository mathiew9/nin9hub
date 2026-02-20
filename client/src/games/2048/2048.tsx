import { useReducer, useEffect, useRef } from "react";
import Tile from "./Tile.tsx";
import "./2048.css";
import { useTranslation } from "react-i18next";
import { TileMeta, reducer, initialState, State } from "./reducer";
import {
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaChevronUp,
} from "react-icons/fa";

let tileIdCounter = 1;
function generateTileId() {
  return tileIdCounter++;
}

type Direction = "left" | "right" | "up" | "down";

export default function Game2048() {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(reducer, initialState);

  const stateRef = useRef(state);
  const inMotionRef = useRef(false);

  // --- Swipe refs
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const didSwipeRef = useRef(false);
  const MIN_SWIPE = 28; // px (ajuste si tu veux)

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    restartGame();
  }, []);

  useEffect(() => {
    inMotionRef.current = state.inMotion;
  }, [state.inMotion]);

  // --- Keyboard arrows
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight"
      ) {
        event.preventDefault();

        switch (event.key) {
          case "ArrowUp":
            handleMove("up", stateRef.current);
            break;
          case "ArrowDown":
            handleMove("down", stateRef.current);
            break;
          case "ArrowLeft":
            handleMove("left", stateRef.current);
            break;
          case "ArrowRight":
            handleMove("right", stateRef.current);
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- Touch handlers (swipe)
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t0 = e.touches[0];
    touchStartRef.current = { x: t0.clientX, y: t0.clientY };
    didSwipeRef.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    // On empêche le scroll UNIQUEMENT si on commence à swiper
    if (!touchStartRef.current) return;
    const t1 = e.touches[0];
    const dx = t1.clientX - touchStartRef.current.x;
    const dy = t1.clientY - touchStartRef.current.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      didSwipeRef.current = true;
      e.preventDefault();
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const t1 = e.changedTouches[0];
    const dx = t1.clientX - touchStartRef.current.x;
    const dy = t1.clientY - touchStartRef.current.y;

    touchStartRef.current = null;

    // Trop petit => ignore (évite les taps)
    if (Math.abs(dx) < MIN_SWIPE && Math.abs(dy) < MIN_SWIPE) return;

    // Direction principale
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? "right" : "left", stateRef.current);
    } else {
      handleMove(dy > 0 ? "down" : "up", stateRef.current);
    }
  };

  function handleMove(direction: Direction, localState: State = state) {
    if (Object.keys(localState.tiles).length < 2) return;
    if (inMotionRef.current) return;

    const movedTiles = applyMove(localState.tiles, direction);

    // Si il y a du mouvement
    const hasChanged = movedTiles.some((tile) => {
      const original = localState.tiles[tile.id];
      return (
        tile.mergeWith !== undefined ||
        tile.position[0] !== original.position[0] ||
        tile.position[1] !== original.position[1]
      );
    });

    if (!hasChanged) return;

    // ----- Début du mouvement
    dispatch({ type: "START_MOVE" });
    inMotionRef.current = true;

    // ----- Mise à jour de l'emplacement de chaque tuile
    for (const tile of movedTiles) {
      dispatch({ type: "UPDATE_TILE", tile });
    }

    // ----- Fusions des tuiles
    setTimeout(() => {
      const toMerge = movedTiles.filter((tile) => tile.mergeWith !== undefined);
      for (const tile of toMerge) {
        const source = localState.tiles[tile.mergeWith!];
        dispatch({ type: "MERGE_TILE", source, destination: tile });
      }
    }, 100);

    // ----- Création de nouvelles tuiles après déplacement
    const newPos = getRandomFreePosition({
      ...localState.tiles,
      ...Object.fromEntries(movedTiles.map((t) => [t.id, t])),
    });

    if (newPos) {
      setTimeout(() => {
        dispatch({
          type: "CREATE_TILE",
          tile: {
            id: generateTileId(),
            value: 2,
            position: newPos,
          },
        });
      }, 100);
    }

    // ----- Fin du mouvement
    setTimeout(() => {
      dispatch({ type: "END_MOVE" });
      inMotionRef.current = false;
    }, 100);
  }

  function applyMove(
    tiles: Record<number, TileMeta>,
    direction: Direction,
  ): TileMeta[] {
    const movedTiles: TileMeta[] = [];

    const isHorizontal = direction === "left" || direction === "right";
    const isReverse = direction === "right" || direction === "down";

    const groups = new Map<number, TileMeta[]>();

    // Étape 1 : regrouper par ligne ou colonne
    for (const tile of Object.values(tiles)) {
      const key = isHorizontal ? tile.position[1] : tile.position[0];
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tile);
    }

    // Étape 2 : traiter chaque ligne/colonne
    for (const [groupIndex, group] of groups.entries()) {
      // Tri selon la direction
      group.sort((a, b) => {
        const aIndex = isHorizontal ? a.position[0] : a.position[1];
        const bIndex = isHorizontal ? b.position[0] : b.position[1];
        return isReverse ? bIndex - aIndex : aIndex - bIndex;
      });

      const newGroup: TileMeta[] = [];
      let skip = false;
      let targetCoord = isReverse ? 3 : 0;

      for (let i = 0; i < group.length; i++) {
        if (skip) {
          skip = false;
          continue;
        }

        const current = group[i];
        const next = group[i + 1];

        const newPosition: [number, number] = isHorizontal
          ? [targetCoord, groupIndex]
          : [groupIndex, targetCoord];

        const currentTile: TileMeta = {
          ...current,
          fromPosition: current.position,
          position: newPosition,
        };

        if (next && next.value === current.value) {
          currentTile.mergeWith = next.id;

          const nextTile: TileMeta = {
            ...next,
            fromPosition: next.position,
            position: newPosition,
          };

          newGroup.push(currentTile);
          newGroup.push(nextTile);
          skip = true;
        } else {
          newGroup.push(currentTile);
        }

        targetCoord += isReverse ? -1 : 1;
      }

      movedTiles.push(...newGroup);
    }

    return movedTiles;
  }

  function restartGame() {
    dispatch({ type: "RESET_GAME" });

    const tempTiles: Record<number, TileMeta> = {};

    const pos1 = getRandomFreePosition(tempTiles);
    const pos2 = getRandomFreePosition({
      ...tempTiles,
      [999]: { id: 999, value: 2, position: pos1! },
    });

    if (pos1) {
      dispatch({
        type: "CREATE_TILE",
        tile: {
          id: generateTileId(),
          value: 2,
          position: pos1,
        },
      });
    }

    if (pos2) {
      dispatch({
        type: "CREATE_TILE",
        tile: {
          id: generateTileId(),
          value: 2,
          position: pos2,
        },
      });
    }
  }

  return (
    <div className="game2048">
      <div className="grid-container">
        <div
          className="grid"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Fond de grille */}
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="grid-background-cell" />
          ))}

          {/* Tuiles par-dessus */}
          {Object.values(state.tiles).map((tile) => (
            <Tile key={tile.id} tile={tile} />
          ))}
        </div>

        <button
          className="commonButton commonMediumButton"
          onClick={restartGame}
        >
          {t("common.actions.playAgain")}
        </button>

        <div className="controls2048">
          <button onClick={() => handleMove("left")}>
            <FaChevronLeft />
          </button>
          <button onClick={() => handleMove("right")}>
            <FaChevronRight />
          </button>
          <button onClick={() => handleMove("up")}>
            <FaChevronUp />
          </button>
          <button onClick={() => handleMove("down")}>
            <FaChevronDown />
          </button>
        </div>
      </div>
    </div>
  );
}

export function getRandomFreePosition(
  tiles: Record<number, TileMeta>,
): [number, number] | null {
  const occupiedPositions = new Set(
    Object.values(tiles).map((tile) => tile.position.toString()),
  );

  const freePositions: [number, number][] = [];

  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      const posStr = `${x},${y}`;
      if (!occupiedPositions.has(posStr)) {
        freePositions.push([x, y]);
      }
    }
  }

  if (freePositions.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * freePositions.length);
  return freePositions[randomIndex];
}
