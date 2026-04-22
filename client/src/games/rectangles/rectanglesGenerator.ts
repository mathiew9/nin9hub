import type {
  Clue,
  GridSize,
  RectangleShape,
  RectanglesPuzzle,
} from "./rectanglesTypes";

import { hasUniqueSolution } from "./rectanglesSolver";

/* ========================= */
/* PUBLIC API */
/* ========================= */

export function generateRectanglesPuzzle(size: GridSize): RectanglesPuzzle {
  let best: RectanglesPuzzle | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < 50; i++) {
    const solution = generateSolution(size);
    if (!solution.length) continue;

    const clues = buildClues(solution);

    if (!hasUniqueSolution(size, clues)) {
      continue;
    }

    const puzzle: RectanglesPuzzle = {
      size,
      clues,
      solution,
    };

    const score = scorePuzzle(puzzle);

    if (score > bestScore) {
      best = puzzle;
      bestScore = score;
    }
  }

  if (!best) {
    throw new Error("Failed to generate puzzle");
  }

  return best;
}

/* ========================= */
/* SOLUTION GENERATION */
/* ========================= */

function generateSolution(size: GridSize): RectangleShape[] {
  const occupied = createGrid(size, false);
  const rectangles: RectangleShape[] = [];
  const areaCounts = new Map<number, number>();

  function backtrack(): boolean {
    const cell = findFreeCell(size, occupied);
    if (!cell) return true;

    const candidates = getCandidates(cell, size, occupied, areaCounts);

    for (const rect of candidates) {
      const area = rect.width * rect.height;

      paint(rect, occupied, true);
      rectangles.push(rect);
      areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);

      if (backtrack()) return true;

      paint(rect, occupied, false);
      rectangles.pop();

      const nextCount = (areaCounts.get(area) ?? 1) - 1;
      if (nextCount <= 0) {
        areaCounts.delete(area);
      } else {
        areaCounts.set(area, nextCount);
      }
    }

    return false;
  }

  return backtrack() ? rectangles : [];
}

/* ========================= */

function getMaxArea(size: GridSize) {
  return Math.max(6, Math.floor((size.rows * size.cols) / 6));
}

function getCandidates(
  start: { row: number; col: number },
  size: GridSize,
  occupied: boolean[][],
  areaCounts: Map<number, number>,
): RectangleShape[] {
  const list: { rectangle: RectangleShape; score: number }[] = [];
  const maxArea = getMaxArea(size);
  const totalCells = size.rows * size.cols;

  for (let h = 1; h <= size.rows; h++) {
    for (let w = 1; w <= size.cols; w++) {
      const area = w * h;

      if (area < 2 || area > maxArea) continue;

      const rect = {
        row: start.row,
        col: start.col,
        width: w,
        height: h,
      };

      if (!canPlace(rect, size, occupied)) {
        continue;
      }

      let score = 0;

      const currentCount = areaCounts.get(area) ?? 0;

      // Favorise les aires encore peu présentes
      score += 8 - currentCount * 3;

      // Léger bonus aux aires intermédiaires, sans cibler une seule valeur
      const normalizedArea = area / totalCells;
      if (normalizedArea >= 0.08 && normalizedArea <= 0.22) {
        score += 2.5;
      } else if (normalizedArea >= 0.04 && normalizedArea < 0.08) {
        score += 1.5;
      } else if (normalizedArea > 0.22) {
        score -= 1.5;
      }

      // Éviter le spam de 2
      if (area === 2) {
        score -= 2;
      }

      // Éviter les formes trop fines
      const shapeRatio = Math.max(w, h) / Math.min(w, h);
      score -= (shapeRatio - 1) * 1.4;

      // Petit bonus aux formes carrées / équilibrées
      if (w === h) {
        score += 0.8;
      } else if (shapeRatio <= 2) {
        score += 0.4;
      }

      // Légère part aléatoire
      score += Math.random() * 0.5;

      list.push({
        rectangle: rect,
        score,
      });
    }
  }

  return list.sort((a, b) => b.score - a.score).map((entry) => entry.rectangle);
}

/* ========================= */
/* CLUES */
/* ========================= */

function buildClues(solution: RectangleShape[]): Clue[] {
  return solution.map((rect) => {
    const row = rect.row + Math.floor(Math.random() * rect.height);
    const col = rect.col + Math.floor(Math.random() * rect.width);

    return {
      row,
      col,
      value: rect.width * rect.height,
    };
  });
}

/* ========================= */
/* QUALITY */
/* ========================= */

function scorePuzzle(puzzle: RectanglesPuzzle): number {
  const areas = puzzle.solution.map((r) => r.width * r.height);
  const totalCells = puzzle.size.rows * puzzle.size.cols;

  let score = 0;

  const uniqueAreas = new Set(areas).size;
  score += uniqueAreas * 5;

  const areaCounts = new Map<number, number>();
  for (const area of areas) {
    areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
  }

  // Pénalise une aire trop dominante
  let maxSameAreaCount = 0;
  for (const count of areaCounts.values()) {
    if (count > maxSameAreaCount) {
      maxSameAreaCount = count;
    }
  }
  score -= maxSameAreaCount * 4;

  // Récompense la diversité des buckets
  const small = areas.filter((area) => area / totalCells < 0.08).length;
  const medium = areas.filter(
    (area) => area / totalCells >= 0.08 && area / totalCells <= 0.22,
  ).length;
  const large = areas.filter((area) => area / totalCells > 0.22).length;

  if (small > 0) score += 4;
  if (medium > 0) score += 6;
  if (large > 0) score += 4;

  // Évite trop de petits
  const twos = areas.filter((area) => area === 2).length;
  score -= twos * 2;

  // Évite trop de très grands
  const huge = areas.filter(
    (area) => area > getMaxArea(puzzle.size) * 0.75,
  ).length;
  score -= huge * 2.5;

  // Bonus si la moyenne reste dans une zone raisonnable
  const avg = areas.reduce((a, b) => a + b, 0) / areas.length;
  const targetAverage = Math.max(3.5, Math.sqrt(totalCells) * 0.75);
  score -= Math.abs(avg - targetAverage) * 1.2;

  return score;
}

/* ========================= */
/* UTILS */
/* ========================= */

function canPlace(rect: RectangleShape, size: GridSize, occupied: boolean[][]) {
  if (rect.row + rect.height > size.rows || rect.col + rect.width > size.cols) {
    return false;
  }

  for (let r = rect.row; r < rect.row + rect.height; r++) {
    for (let c = rect.col; c < rect.col + rect.width; c++) {
      if (occupied[r][c]) return false;
    }
  }

  return true;
}

function paint(rect: RectangleShape, grid: boolean[][], value: boolean) {
  for (let r = rect.row; r < rect.row + rect.height; r++) {
    for (let c = rect.col; c < rect.col + rect.width; c++) {
      grid[r][c] = value;
    }
  }
}

function findFreeCell(size: GridSize, occupied: boolean[][]) {
  for (let r = 0; r < size.rows; r++) {
    for (let c = 0; c < size.cols; c++) {
      if (!occupied[r][c]) return { row: r, col: c };
    }
  }
  return null;
}

function createGrid<T>(size: GridSize, value: T): T[][] {
  return Array.from({ length: size.rows }, () =>
    Array.from({ length: size.cols }, () => value),
  );
}
