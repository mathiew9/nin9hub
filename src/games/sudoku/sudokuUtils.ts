import { SudokuGrid } from "./types";

// Crée une grille vide
export function createEmptyGrid(): SudokuGrid {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => ({
      value: null,
      notes: [],
      readonly: false,
    }))
  );
}

// Vérifie si un chiffre peut être placé à une position donnée
export function isValid(
  grid: SudokuGrid,
  row: number,
  col: number,
  num: number
): boolean {
  const blockRow = Math.floor(row / 3) * 3;
  const blockCol = Math.floor(col / 3) * 3;

  for (let i = 0; i < 9; i++) {
    if (grid[row][i].value === num) return false; // ligne
    if (grid[i][col].value === num) return false; // colonne
    if (grid[blockRow + Math.floor(i / 3)][blockCol + (i % 3)].value === num)
      return false; // bloc
  }

  return true;
}

// Remplit récursivement une grille complète
export function generateCompleteGrid(): SudokuGrid | null {
  const grid = createEmptyGrid();

  function fill(row = 0, col = 0): boolean {
    if (row === 9) return true;
    const nextRow = col === 8 ? row + 1 : row;
    const nextCol = (col + 1) % 9;

    const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    for (const num of numbers) {
      if (isValid(grid, row, col, num)) {
        grid[row][col].value = num;
        if (fill(nextRow, nextCol)) return true;
        grid[row][col].value = null;
      }
    }

    return false;
  }

  if (fill()) return grid;
  return null;
}

// Shuffle utilitaire
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function removeCells(
  fullGrid: SudokuGrid,
  difficulty: "easy" | "medium" | "hard"
): SudokuGrid {
  const grid = fullGrid.map((row) =>
    row.map((cell) => ({ ...cell, readonly: true }))
  );

  let attempts;
  switch (difficulty) {
    case "easy":
      attempts = 35;
      break;
    case "medium":
      attempts = 45;
      break;
    case "hard":
      attempts = 55;
      break;
  }

  while (attempts > 0) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (grid[row][col].value === null) continue;

    const backup = grid[row][col].value;
    grid[row][col].value = null;
    grid[row][col].readonly = false;

    // (optionnel) vérification d’unicité ici

    attempts--;
  }

  return grid;
}
