// Avant
// export type RoomState = {
//   ...
//   players: Record<"X"|"O", string>; // empty string if role not occupied
//   ...
// }

// Après (Option A propre)
export type Player = "X" | "O";
export type Cell = Player | null;
export type Winner = Player | "draw" | null;

export type RoomPlayers = {
  X: string | null; // socket.id quand rôle occupé, sinon null
  O: string | null;
};

export type RoomState = {
  id: string;
  hostId: string;
  guestId?: string | null; // ← optionnel + nullable (cohérent avec players.O)
  players: RoomPlayers; // ← plus de Record<string> strict
  board: Cell[];
  turn: Player;
  started: boolean;
  winner: Winner;
  rematchVotes: Set<string>; // ok si c’est seulement côté serveur
  stateVersion: number;
  createdAt: number;
};

export type Ack<T = any> = (
  payload: { ok: true; data: T } | { ok: false; code: string; message: string }
) => void;
