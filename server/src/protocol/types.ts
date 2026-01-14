export type Player = "X" | "O";
export type Seat = "p1" | "p2";
export type Cell = Player | null;
export type Winner = Player | "draw" | null;

export type RoomPlayers = {
  X: string;
  O: string;
};

export type Seats = {
  p1: string;
  p2: string;
};

export type MatchScore = { p1: number; p2: number };
export type MatchWinner = Seat | null;

export type GameStateTTT = {
  board: Cell[];
  turn: Player;
  winner: Winner;
  line: number[];

  turnDeadlineAt: number | null;
  turnStartedAt: number | null;

  matchScore: MatchScore;
  matchWinner: MatchWinner;
};

export type RoomState = {
  id: string;
  hostId: string;
  guestId: string;

  players: RoomPlayers;
  seats: Seats;

  started: boolean;

  rematchVotes: Set<string>;
  stateVersion: number;
  createdAt: number;

  state: GameStateTTT;
  settings?: RoomSettings;
};

export type RoomSettings = {
  gridSize: number;
  roundsToWin: number;
  swapRolesOnRematch: boolean;

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

export type Ack<T = any> = (
  payload: { ok: true; data: T } | { ok: false; code: string; message: string }
) => void;
