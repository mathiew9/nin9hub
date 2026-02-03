import type { Seat, RoomSettingsBase } from "../../core/typesCore";

export type C4Cell = Seat | null;
export type C4Winner = Seat | "draw" | null;

export type C4WinningCell = { row: number; col: number };

export type C4State = {
  board: C4Cell[][]; // 6x7
  turn: Seat; // "p1" / "p2"
  winner: C4Winner; // "p1" / "p2" / "draw" / null
  winningCells: C4WinningCell[];

  turnDeadlineAt: number | null;
  turnStartedAt: number | null;
};

// Pour l’instant, règles fixes => pas besoin de settings de jeu.
export type C4GameSettings = {
  // plus tard: connectN, rows, cols, swapRolesOnRematch, etc.
  swapRolesOnRematch?: boolean;
};

export type C4Move = { column: number };

export type C4SettingsFull = RoomSettingsBase & C4GameSettings;
