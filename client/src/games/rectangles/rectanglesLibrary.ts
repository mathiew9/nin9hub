import type {
  GridSize,
  RectangleLibrary,
  RectangleLibraryGrid,
  RectanglesPuzzle,
} from "./rectanglesTypes";

import grids5x5Data from "./data/grids-5x5.json";
import grids10x10Data from "./data/grids-10x10.json";
import grids15x15Data from "./data/grids-15x15.json";
import grids20x20Data from "./data/grids-20x20.json";
import grids25x25Data from "./data/grids-25x25.json";

const grids5x5 = grids5x5Data as RectangleLibrary;
const grids10x10 = grids10x10Data as RectangleLibrary;
const grids15x15 = grids15x15Data as RectangleLibrary;
const grids20x20 = grids20x20Data as RectangleLibrary;
const grids25x25 = grids25x25Data as RectangleLibrary;

const LIBRARIES: Record<number, RectangleLibrary> = {
  5: grids5x5,
  10: grids10x10,
  15: grids15x15,
  20: grids20x20,
  25: grids25x25,
};

function getLibrary(size: GridSize): RectangleLibrary {
  if (size.rows !== size.cols) {
    throw new Error(
      `Les grilles Rectangles doivent être carrées : ${size.rows}x${size.cols}`,
    );
  }

  const library = LIBRARIES[size.rows];

  if (!library) {
    throw new Error(
      `Aucune bibliothèque disponible pour la taille ${size.rows}x${size.cols}.`,
    );
  }

  return library;
}

function convertLibraryGridToPuzzle(
  library: RectangleLibrary,
  grid: RectangleLibraryGrid,
): RectanglesPuzzle {
  return {
    id: grid.id,

    size: {
      rows: library.gridSize,
      cols: library.gridSize,
    },

    clues: grid.clues,

    solution: grid.regions.map(({ row, col, width, height }) => ({
      row,
      col,
      width,
      height,
    })),
  };
}

export function getRectanglesPuzzleById(
  size: GridSize,
  puzzleId: string,
): RectanglesPuzzle | null {
  const library = getLibrary(size);

  const grid = library.grids.find((currentGrid) => currentGrid.id === puzzleId);

  if (!grid) {
    return null;
  }

  return convertLibraryGridToPuzzle(library, grid);
}

export function getRandomRectanglesPuzzle(
  size: GridSize,
  excludedPuzzleId?: string,
): RectanglesPuzzle {
  const library = getLibrary(size);

  if (library.grids.length === 0) {
    throw new Error(
      `La bibliothèque ${size.rows}x${size.cols} ne contient aucune grille.`,
    );
  }

  const availableGrids =
    excludedPuzzleId && library.grids.length > 1
      ? library.grids.filter((grid) => grid.id !== excludedPuzzleId)
      : library.grids;

  const randomIndex = Math.floor(Math.random() * availableGrids.length);

  const selectedGrid = availableGrids[randomIndex];

  return convertLibraryGridToPuzzle(library, selectedGrid);
}
