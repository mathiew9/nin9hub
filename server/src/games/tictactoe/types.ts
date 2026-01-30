import type { Seat } from "../../core/typesCore";

/* ---------- Players / Board ---------- */

export type TTTPlayer = "X" | "O";
export type TTTCell = Seat | null;

/* ---------- Game Settings ---------- */

export type TTTGameSettings = {
  gridSize: number;
  swapRolesOnRematch: boolean;
};

/* ---------- Game State (ONLINE) ---------- */

export type TTTState = {
  board: TTTCell[];
  turn: Seat;
  winner: Seat | "draw" | null;
  line: number[];

  turnDeadlineAt: number | null;
  turnStartedAt: number | null;
};
