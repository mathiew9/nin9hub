import type { RoomState } from "../protocol/types";
import type { Cell, Winner } from "../protocol/types";

const rooms = new Map<string, RoomState>();
const socketToRoom = new Map<string, string>();

export function genRoomId(len = 5): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < len; i++)
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  if (rooms.has(id)) return genRoomId();
  return id;
}

export function saveRoom(room: RoomState) {
  rooms.set(room.id, room);
}
export function getRoom(id: string) {
  return rooms.get(id);
}
export function deleteRoom(id: string) {
  rooms.delete(id);
}

export function mapSocketToRoom(socketId: string, roomId: string) {
  socketToRoom.set(socketId, roomId);
}
export function unmapSocket(socketId: string) {
  socketToRoom.delete(socketId);
}
export function getRoomIdBySocket(socketId: string) {
  return socketToRoom.get(socketId);
}

export function playersCount(room: RoomState): number {
  let count = 0;
  if (room.players.X) count++;
  if (room.players.O) count++;
  return count;
}
export function isRoomEmpty(room: RoomState): boolean {
  return !room.players.X && !room.players.O;
}

export function getRoleInRoom(
  room: RoomState,
  socketId: string
): "X" | "O" | null {
  if (room.players.X === socketId) return "X";
  if (room.players.O === socketId) return "O";
  return null;
}

export function setPlayer(room: RoomState, role: "X" | "O", socketId: string) {
  room.players[role] = socketId;
  mapSocketToRoom(socketId, room.id);
}

export function clearPlayer(
  room: RoomState,
  role: "X" | "O",
  socketId: string
) {
  if (room.players[role] === socketId) {
    room.players[role] = "";
  }
}

/** Retire un joueur, met à jour l’état, et supprime la room si vide. */
/** Remove a player from a room by socketId, update room state, and delete room if empty. */
export function removePlayerBySocket(
  roomId: string,
  socketId: string
): { deleted: boolean; remaining: number } {
  const room = rooms.get(roomId);
  if (!room) return { deleted: false, remaining: 0 };

  const wasHost = room.hostId === socketId;

  // Detach from X/O slots (role can change with swaps, so we check both)
  if (room.players.X === socketId) room.players.X = "";
  if (room.players.O === socketId) room.players.O = "";

  // Detach host/guest ids (independent from X/O role)
  if (room.hostId === socketId) room.hostId = "";
  if (room.guestId === socketId) room.guestId = "";

  // Remove socket -> room mapping
  unmapSocket(socketId);

  const remaining = playersCount(room);

  // If room is now empty, delete it
  if (remaining === 0) {
    rooms.delete(roomId);
    return { deleted: true, remaining: 0 };
  }

  // Promote remaining player to host if host left and option enabled
  const promote = !!(room.settings as any)?.promoteGuestOnHostLeave;
  if (wasHost && promote && !room.hostId) {
    const remainingId = room.players.X || room.players.O;
    room.hostId = remainingId || room.hostId;
    room.guestId = "";
  }

  // Back to waiting state
  room.started = false;
  room.rematchVotes.clear();
  room.stateVersion = (room.stateVersion ?? 0) + 1;

  // Reset game state (for now: reset match too)
  const size = room.state.board.length;
  room.state = {
    board: Array<Cell>(size).fill(null),
    turn: "X",
    winner: null as Winner,
    line: [],
    matchScore: { p1: 0, p2: 0 },
    matchWinner: null,
    turnDeadlineAt: null,
    turnStartedAt: null,
  };

  return { deleted: false, remaining };
}
