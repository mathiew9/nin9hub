export type GameKey = "ttt" | "c4";
export type Seat = "p1" | "p2";

export type MatchScore = Record<string, number>;
export type MatchWinner = string | null;

export type RoomSettingsBase = {
  roundsToWin: number;

  turnTimeMs: number; // 0 = illimité
  idleKickMs: number; // 0 = disabled
  moveRateLimitMs: number;

  roomCodeLength: number; // si tu veux un code type "ABCD"

  reconnectGraceMs: number;
  preserveGameOnLeave: boolean;
  promoteGuestOnHostLeave: boolean;

  autoRematchOnBoth: boolean;
  resetRolesOnRematch: boolean;
};

export type RoomPlayers = {
  p1: string; // label/pseudo (ou socketId si tu veux minimal)
  p2: string;
};

export type Seats = {
  p1: string; // socketId (ou playerId plus tard)
  p2: string;
};

export type RoomBase<TGameSettings = unknown> = {
  gameKey: GameKey;

  id: string;
  createdAt: number;
  stateVersion: number;

  hostId: string; // socketId
  guestId: string; // socketId | ""

  seats: Seats;
  players: RoomPlayers;

  started: boolean;

  rematchVotes: Set<string>; // socketIds
  settingsBase: RoomSettingsBase;
  gameSettings: TGameSettings;

  matchScore: MatchScore;
  matchWinner: MatchWinner;
};

export type Room<TState, TGameSettings = unknown> = RoomBase<TGameSettings> & {
  state: TState;

  // metadata runtime (optionnel)
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

  // optionnels selon ton jeu / features
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
