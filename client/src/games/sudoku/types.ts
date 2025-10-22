export type Cell = {
  value: number | null;
  notes: number[];
  readonly: boolean;
  hasError?: boolean;
};

export type SudokuGrid = Cell[][];

export type SolutionGrid = number[][];

export type Difficulty = "easy" | "medium" | "hard" | "daily";

export type StoredSudokuGame = {
  grid: SudokuGrid;
  solution: SudokuGrid;
  level: Difficulty;
  gameFinished: boolean;
  date?: string; // uniquement pour le daily
};
