export type Player = "X" | "O";
export type Cell = Player | null;
export type Winner = Player | "draw" | null;

export type RoomPlayers = {
  X: string | null;
  O: string | null;
};

export type GameStateTTT = {
  board: Cell[];
  turn: Player;
  winner: Winner;
};

export type RoomState = {
  id: string;
  hostId: string;
  guestId: string;
  players: Record<"X" | "O", string>;
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

  turnTimeMs: number; // 0 = sans limite
  idleKickMs: number; // 0 = off
  moveRateLimitMs: number; // anti-spam

  roomCodeLength: number;

  reconnectGraceMs: number; //TODO
  preserveGameOnLeave: boolean;
  promoteGuestOnHostLeave: boolean;

  autoRematchOnBoth: boolean;
  resetRolesOnRematch: boolean;
};

export type Ack<T = any> = (
  payload: { ok: true; data: T } | { ok: false; code: string; message: string }
) => void;
