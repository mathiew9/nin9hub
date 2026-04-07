export type GridSize = {
  rows: number;
  cols: number;
};

export type Position = {
  row: number;
  col: number;
};

export type Clue = Position & {
  value: number;
};

export type RectangleShape = Position & {
  width: number;
  height: number;
};

export type RectanglesPuzzle = {
  size: GridSize;
  clues: Clue[];
  solution: RectangleShape[];
};

export type RectanglesGameState = {
  rectangles: RectangleShape[];
};
