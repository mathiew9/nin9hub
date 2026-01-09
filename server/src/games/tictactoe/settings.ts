import type { RoomSettings } from "../../protocol/types";

// Default settings for a Tic-Tac-Toe room
export const TTT_DEFAULTS: RoomSettings = {
  gridSize: 3,
  roundsToWin: 3,
  swapRolesOnRematch: true,

  turnTimeMs: 0,
  idleKickMs: 0,
  moveRateLimitMs: 300,

  roomCodeLength: 5,

  reconnectGraceMs: 0,
  preserveGameOnLeave: false,
  promoteGuestOnHostLeave: true,

  autoRematchOnBoth: false,
  resetRolesOnRematch: false,
};

// Normalize / clamp settings values
export function sanitizeTTTSettings(
  input?: Partial<RoomSettings>
): RoomSettings {
  const s = { ...TTT_DEFAULTS, ...(input ?? {}) };

  // gameplay limits
  s.gridSize = Math.min(5, Math.max(3, Math.floor(s.gridSize)));
  s.roundsToWin = Math.min(5, Math.max(1, Math.floor(s.roundsToWin)));

  // timing & rate limits
  s.turnTimeMs = Math.max(0, Math.floor(s.turnTimeMs));
  s.idleKickMs = Math.max(0, Math.floor(s.idleKickMs));
  s.moveRateLimitMs = Math.max(0, Math.floor(s.moveRateLimitMs));

  // room constraints
  s.roomCodeLength = Math.min(8, Math.max(4, Math.floor(s.roomCodeLength)));
  s.reconnectGraceMs = Math.max(0, Math.floor(s.reconnectGraceMs));

  return s;
}
