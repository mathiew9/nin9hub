export type Cell = {
  value: number | null; // Valeur principale (1-9 ou null)
  notes: number[]; // Petits chiffres en mode note
  readonly: boolean; // true si c'est une case fixe
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
