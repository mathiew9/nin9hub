import type { RoomSettingsBase, Seat } from "../../core/typesCore";
import type { GameAdapter } from "../../core/room/roomService";
import { C4Events } from "../../events/events";

export type C4State = {
  // placeholder
  ready: boolean;
};

export type C4GameSettings = {};
export type C4Move = { column: number };

function defaultBaseSettings(): RoomSettingsBase {
  return {
    roundsToWin: 1,
    turnTimeMs: 0,
    idleKickMs: 0,
    moveRateLimitMs: 150,
    roomCodeLength: 5,
    reconnectGraceMs: 8000,
    preserveGameOnLeave: false,
    promoteGuestOnHostLeave: true,
    autoRematchOnBoth: false,
  };
}

function sanitizeBaseSettings(
  partial: Partial<RoomSettingsBase>,
): RoomSettingsBase {
  const d = defaultBaseSettings();
  return { ...d, ...partial };
}

export const c4Adapter: GameAdapter<C4State, C4GameSettings, C4Move> = {
  gameKey: "c4",

  clientEvents: C4Events as any,
  serverEvents: C4Events as any,

  defaultBaseSettings,
  defaultGameSettings() {
    return {};
  },

  sanitizeBaseSettings,
  sanitizeGameSettings(partial) {
    return { ...(partial ?? {}) };
  },

  createInitialState() {
    return { ready: false };
  },

  canStart() {
    // tu passeras à true quand tu auras l’état C4
    return { ok: true };
  },

  validateMove() {
    return {
      ok: false,
      code: "MOVE_INVALID",
      message: "Connect4 adapter pas encore implémenté.",
    };
  },

  applyMove() {
    // no-op
  },

  onRematchAccepted() {
    // no-op
  },
};
