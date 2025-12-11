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
export function removePlayerBySocket(
  roomId: string,
  socketId: string
): { deleted: boolean; remaining: number } {
  const room = rooms.get(roomId);
  if (!room) return { deleted: false, remaining: 0 };

  const role = getRoleInRoom(room, socketId);
  if (role) {
    clearPlayer(room, role, socketId);
    if (role === "X" && room.hostId === socketId) room.hostId = "";
    if (role === "O" && room.guestId === socketId) room.guestId = "";
  }
  unmapSocket(socketId);

  const remaining = playersCount(room);

  if (remaining === 0) {
    rooms.delete(roomId);
    return { deleted: true, remaining: 0 };
  }

  // repasse en attente
  room.started = false;
  room.stateVersion = (room.stateVersion ?? 0) + 1;

  // reset uniquement dans room.state (state-only)
  const size = room.state.board.length;
  room.state = {
    board: Array<Cell>(size).fill(null),
    turn: "X",
    winner: null as Winner,
  };

  return { deleted: false, remaining };
}
