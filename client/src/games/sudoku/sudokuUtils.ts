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
  value: number
): boolean {
  for (let i = 0; i < 9; i++) {
    if (i !== col && grid[row][i].value === value) return false; // ligne
    if (i !== row && grid[i][col].value === value) return false; // colonne
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      if ((r !== row || c !== col) && grid[r][c].value === value) {
        return false; // bloc
      }
    }
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

function hasUniqueSolution(grid: SudokuGrid): boolean {
  let count = 0;

  function solve(row = 0, col = 0): boolean {
    if (row === 9) {
      count++;
      return count === 1;
    }

    const nextRow = col === 8 ? row + 1 : row;
    const nextCol = (col + 1) % 9;

    if (grid[row][col].value !== null) {
      return solve(nextRow, nextCol);
    }

    for (let num = 1; num <= 9; num++) {
      if (isValid(grid, row, col, num)) {
        grid[row][col].value = num;
        if (!solve(nextRow, nextCol)) {
          grid[row][col].value = null;
          if (count > 1) return false; // early stop
        } else {
          grid[row][col].value = null;
        }
      }
    }

    grid[row][col].value = null;
    return count < 2;
  }

  solve();
  return count === 1;
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

    if (!hasUniqueSolution(grid)) {
      // revert if multiple solutions
      grid[row][col].value = backup;
      grid[row][col].readonly = true;
      continue;
    }

    attempts--;
  }
  return grid;
}
