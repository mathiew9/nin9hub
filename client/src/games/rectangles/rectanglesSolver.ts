import type { Clue, GridSize, RectangleShape } from "./rectanglesTypes";

type Candidate = RectangleShape;

export function countSolutions(
  size: GridSize,
  clues: Clue[],
  limit = 2,
): number {
  const candidatesPerClue = clues.map((clue) =>
    getPossibleRectanglesForClue(size, clue),
  );

  let solutions = 0;

  function backtrack(index: number, usedGrid: number[][]) {
    if (solutions >= limit) {
      return;
    }

    if (index === clues.length) {
      // vérifier que toute la grille est couverte
      if (isGridFullyCovered(size, usedGrid)) {
        solutions += 1;
      }
      return;
    }

    for (const rect of candidatesPerClue[index]) {
      if (!canPlace(rect, usedGrid)) {
        continue;
      }

      paint(rect, usedGrid, 1);
      backtrack(index + 1, usedGrid);
      paint(rect, usedGrid, -1);
    }
  }

  const grid = createGrid(size, 0);
  backtrack(0, grid);

  return solutions;
}

export function hasUniqueSolution(size: GridSize, clues: Clue[]): boolean {
  return countSolutions(size, clues, 2) === 1;
}

/* ========================= */

function getPossibleRectanglesForClue(size: GridSize, clue: Clue): Candidate[] {
  const candidates: Candidate[] = [];

  const area = clue.value;

  for (let h = 1; h <= area; h++) {
    if (area % h !== 0) continue;

    const w = area / h;

    for (let r = clue.row - h + 1; r <= clue.row; r++) {
      for (let c = clue.col - w + 1; c <= clue.col; c++) {
        if (r >= 0 && c >= 0 && r + h <= size.rows && c + w <= size.cols) {
          candidates.push({
            row: r,
            col: c,
            width: w,
            height: h,
          });
        }
      }
    }
  }

  return candidates;
}

function canPlace(rect: RectangleShape, grid: number[][]) {
  for (let r = rect.row; r < rect.row + rect.height; r++) {
    for (let c = rect.col; c < rect.col + rect.width; c++) {
      if (grid[r][c] !== 0) return false;
    }
  }
  return true;
}

function paint(rect: RectangleShape, grid: number[][], delta: number) {
  for (let r = rect.row; r < rect.row + rect.height; r++) {
    for (let c = rect.col; c < rect.col + rect.width; c++) {
      grid[r][c] += delta;
    }
  }
}

function isGridFullyCovered(size: GridSize, grid: number[][]) {
  for (let r = 0; r < size.rows; r++) {
    for (let c = 0; c < size.cols; c++) {
      if (grid[r][c] !== 1) return false;
    }
  }
  return true;
}

function createGrid(size: GridSize, value: number) {
  return Array.from({ length: size.rows }, () =>
    Array.from({ length: size.cols }, () => value),
  );
}
