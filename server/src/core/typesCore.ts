export type GameKey = "ttt" | "c4";
export type Seat = "p1" | "p2";

export type MatchScore = Record<string, number>;
export type MatchWinner = string | null;

export type RoomSettingsBase = {
  roundsToWin: number;

  turnTimeMs: number; // 0 = illimité TODO
  idleKickMs: number; // 0 = disabled TODO
  moveRateLimitMs: number; // TODO

  roomCodeLength: number;

  reconnectGraceMs: number; //TODO
  preserveGameOnLeave: boolean; // TODO
  promoteGuestOnHostLeave: boolean;

  autoRematchOnBoth: boolean; // TODO
};

export const ROOM_SETTINGS_BASE_KEYS = [
  "roundsToWin",
  "turnTimeMs",
  "idleKickMs",
  "moveRateLimitMs",
  "roomCodeLength",
  "reconnectGraceMs",
  "preserveGameOnLeave",
  "promoteGuestOnHostLeave",
  "autoRematchOnBoth",
] as const satisfies ReadonlyArray<keyof RoomSettingsBase>;

export type RoomSettingsBaseKey = (typeof ROOM_SETTINGS_BASE_KEYS)[number];

export type RoomPlayers = {
  p1: string;
  p2: string;
};

export type Seats = {
  p1: string;
  p2: string;
};

export type RoomBase<TGameSettings = unknown> = {
  gameKey: GameKey;

  id: string;
  createdAt: number;
  stateVersion: number;

  hostId: string;
  guestId: string;

  seats: Seats;
  players: RoomPlayers;

  started: boolean;

  rematchVotes: Set<string>;
  settingsBase: RoomSettingsBase;
  gameSettings: TGameSettings;

  matchScore: MatchScore;
  matchWinner: MatchWinner;
};

export type Room<TState, TGameSettings = unknown> = RoomBase<TGameSettings> & {
  state: TState;

  lastMoveAtBySocket?: Record<string, number>;
};

export type AckOk<T> = { ok: true; data: T };
export type AckErr = { ok: false; code: string; message: string };
export type Ack<T = any> = (payload: AckOk<T> | AckErr) => void;

export type OnlineErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "NOT_IN_ROOM"
  | "ONLY_HOST"
  | "ALREADY_HOST"
  | "NEED_2_PLAYERS"
  | "GAME_STARTED"
  | "GAME_NOT_STARTED"
  | "MATCH_ENDED"
  | "GAME_NOT_ENDED"
  | "NOT_YOUR_TURN"
  | "MOVE_INVALID"
  | "RATE_LIMIT";

export type ClientToServerEvents = {
  CreateRoom: string;
  JoinRoom: string;
  Start: string;
  PlayTurn: string;
  RematchRequest: string;
  Leave: string;

  UpdateSettings?: string;
  BackToSettings?: string;
  SwapRoles?: string;
};

export type ServerToClientEvents = {
  Waiting: string;
  State: string;
  OpponentLeft: string;
  RematchStatus: string;
  Error: string;
};
