// server/games/connect4/types.ts

import type { RoomSettingsBase } from "../../protocol/types";

export type C4Player = "R" | "Y"; // ou "P1" | "P2" si tu préfères
export type C4Cell = C4Player | null;
export type C4Winner = C4Player | "draw" | null;

export type C4GameState = {
  // tu adapteras à ton modèle local (grid 6x7 etc.)
  grid: C4Cell[]; // ou C4Cell[][]
  turn: C4Player;
  winner: C4Winner;

  turnDeadlineAt: number | null;
  turnStartedAt: number | null;

  matchScore: { p1: number; p2: number };
  matchWinner: "p1" | "p2" | null;
};

// Settings C4 (souvent pas nécessaire car règles fixes)
export type C4Settings = {
  // si tu veux des variantes un jour (connectN, rows/cols, etc.)
};

export type C4SettingsFull = RoomSettingsBase & C4Settings;
