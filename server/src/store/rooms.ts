import type { RoomState } from "../protocol/types";

const rooms = new Map<string, RoomState>();
const socketToRoom = new Map<string, string>();

export function genRoomId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 5; i++)
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

// ---- helpers joueurs ----
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
    room.players[role] = null; // ← null (pas undefined)
  }
}

/**
 * Retire un joueur de la room par son socket:
 * - libère players.X/O
 * - unmap socket→room
 * - si vide → supprime la room
 * - sinon repasse en waiting (started=false), tour=X, winner=null, ++version
 */
export function removePlayerBySocket(
  roomId: string,
  socketId: string
): { deleted: boolean; remaining: number } {
  const room = rooms.get(roomId);
  if (!room) return { deleted: false, remaining: 0 };

  const role = getRoleInRoom(room, socketId);
  if (role) {
    clearPlayer(room, role, socketId);
    // optionnel: si tu tiens à garder host/guest alignés
    if (role === "X" && room.hostId === socketId) room.hostId = ""; // ou null si tu changes le type
    if (role === "O" && room.guestId === socketId) room.guestId = null;
  }
  unmapSocket(socketId);

  const remaining = playersCount(room);

  if (remaining === 0) {
    rooms.delete(roomId);
    return { deleted: true, remaining: 0 };
  }

  // room encore vivante → back to waiting
  room.started = false;
  room.turn = "X";
  room.winner = null;
  room.stateVersion = (room.stateVersion ?? 0) + 1;

  // (optionnel) reset du board si tu préfères repartir clean après départ:
  // room.board = Array(9).fill(null);

  return { deleted: false, remaining };
}
