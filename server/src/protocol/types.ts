export type GameKey = "ttt" | "c4";

export type Seat = "p1" | "p2";

export type Seats = {
  p1: string; // socketId ou playerId selon ton design
  p2: string;
};

export type MatchScore = { p1: number; p2: number };
export type MatchWinner = Seat | null;

export type RoomPlayers = {
  p1: string; // displayName (ou pseudo) de p1
  p2: string; // displayName (ou pseudo) de p2
};

export type RoomStateBase = {
  game: GameKey;

  id: string;
  hostId: string;
  guestId: string;

  players: RoomPlayers;
  seats: Seats;

  started: boolean;

  rematchVotes: Set<string>;
  stateVersion: number;
  createdAt: number;
};

export type RoomSettingsBase = {
  roundsToWin: number;

  turnTimeMs: number; // 0 = illimité
  idleKickMs: number; // 0 = disabled
  moveRateLimitMs: number;

  roomCodeLength: number;

  reconnectGraceMs: number;
  preserveGameOnLeave: boolean;
  promoteGuestOnHostLeave: boolean;

  autoRematchOnBoth: boolean;
  resetRolesOnRematch: boolean;
};

/**
 * RoomState générique :
 * - TState = état du jeu (TTT, C4, etc.)
 * - TSettings = settings spécifiques au jeu (ou null/undefined si pas besoin)
 */
export type RoomState<TState, TSettings = undefined> = RoomStateBase & {
  state: TState;
  settings?: (RoomSettingsBase & TSettings) | undefined;
};

export type Ack<T = any> = (
  payload: { ok: true; data: T } | { ok: false; code: string; message: string },
) => void;
