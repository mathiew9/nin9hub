import { SudokuGrid } from "./types";
import { isValid } from "./sudokuUtils";

// Générateur pseudo-aléatoire déterministe
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shuffle déterministe avec rng
function shuffleWithSeed<T>(array: T[], rng: () => number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Crée une grille complète avec rng pour le shuffle
function generateCompleteGridWithRNG(rng: () => number): SudokuGrid | null {
  const grid: SudokuGrid = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => ({
      value: null,
      notes: [],
      readonly: false,
    }))
  );

  function fill(row = 0, col = 0): boolean {
    if (row === 9) return true;
    const nextRow = col === 8 ? row + 1 : row;
    const nextCol = (col + 1) % 9;

    const numbers = shuffleWithSeed([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
    for (const num of numbers) {
      if (isValid(grid, row, col, num)) {
        grid[row][col].value = num;
        if (fill(nextRow, nextCol)) return true;
        grid[row][col].value = null;
      }
    }

    return false;
  }

  return fill() ? grid : null;
}

// Enlève un nombre fixe de cases de manière déterministe (position ET ordre)
export function removeCellsWithRNG(
  fullGrid: SudokuGrid,
  rng: () => number,
  attempts: number
): SudokuGrid {
  const grid = fullGrid.map((row) =>
    row.map((cell) => ({ ...cell, readonly: true }))
  );

  const positions = shuffleWithSeed(
    Array.from(
      { length: 81 },
      (_, i) => [Math.floor(i / 9), i % 9] as [number, number]
    ),
    rng
  );

  let removed = 0;
  let i = 0;
  while (removed < attempts && i < positions.length) {
    const [row, col] = positions[i++];
    if (grid[row][col].value === null) continue;

    grid[row][col].value = null;
    grid[row][col].readonly = false;
    removed++;
  }

  return grid;
}

// Fonction principale : génère la grille du jour (solution + à jouer)
export function generateDailyGrid(date: string): {
  solution: SudokuGrid;
  grid: SudokuGrid;
} | null {
  const seed = parseInt(date.replace(/-/g, ""), 10);
  const rng = mulberry32(seed);

  const solution = generateCompleteGridWithRNG(rng);
  if (!solution) return null;

  const grid = removeCellsWithRNG(solution, rng, 45); // difficulté medium
  return { solution, grid };
}
