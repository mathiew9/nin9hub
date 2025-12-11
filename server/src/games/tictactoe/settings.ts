// server/src/games/tictactoe/settings.ts
import type { RoomSettings } from "../../protocol/types";

/** Defaults TicTacToe */
export const TTT_DEFAULTS: RoomSettings = {
  gridSize: 3,
  roundsToWin: 3,
  swapRolesOnRematch: false,

  turnTimeMs: 0,
  idleKickMs: 0,
  moveRateLimitMs: 300,

  roomCodeLength: 5,

  reconnectGraceMs: 0, // pas encore implémenté
  preserveGameOnLeave: false,
  promoteGuestOnHostLeave: true,

  autoRematchOnBoth: false,
  resetRolesOnRematch: false,
};

/** Contrainte/normalisation si plus tard tu veux les rendre configurables */
export function sanitizeTTTSettings(
  input?: Partial<RoomSettings>
): RoomSettings {
  const s = { ...TTT_DEFAULTS, ...(input ?? {}) };

  // bornes simples
  s.gridSize = Math.min(5, Math.max(3, Math.floor(s.gridSize)));
  s.roundsToWin = Math.min(5, Math.max(1, Math.floor(s.roundsToWin)));

  s.turnTimeMs = Math.max(0, Math.floor(s.turnTimeMs));
  s.idleKickMs = Math.max(0, Math.floor(s.idleKickMs));
  s.moveRateLimitMs = Math.max(0, Math.floor(s.moveRateLimitMs));
  s.roomCodeLength = Math.min(8, Math.max(4, Math.floor(s.roomCodeLength)));
  s.reconnectGraceMs = Math.max(0, Math.floor(s.reconnectGraceMs));

  return s;
}
