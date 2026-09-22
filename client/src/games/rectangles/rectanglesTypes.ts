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

export type RectangleLibraryRegion = RectangleShape & {
  id: number;
};

export type RectangleLibraryGrid = {
  id: string;
  clues: Clue[];
  regions: RectangleLibraryRegion[];
};

export type RectangleLibrary = {
  format: "nin9hub-rectangle-library";
  version: number;
  uniquenessVerified: boolean;
  gridSize: number;
  grids: RectangleLibraryGrid[];
};

export type RectanglesPuzzle = {
  id: string;
  size: GridSize;
  clues: Clue[];
  solution: RectangleShape[];
};

export type RectanglesGameState = {
  rectangles: RectangleShape[];
};

export type RectanglesSavedSizeState = {
  puzzleId: string;
  rectangles: RectangleShape[];
  elapsedSeconds?: number;
};

export type RectanglesStorageState = {
  version: 1;
  sizes: Record<string, RectanglesSavedSizeState>;
};

export type RectanglesSettingsState = {
  showRuleErrors: boolean;
  showPreviewArea: boolean;
  coloredRectangles: boolean;
  filledRectangles: boolean;
  showTimer: boolean;
  zoom: number;
};
