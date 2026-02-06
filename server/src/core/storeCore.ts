import type { Room } from "./typesCore";

const rooms = new Map<string, Room<any, any>>();
const socketToRoom = new Map<string, string>();

export function saveRoom(room: Room<any, any>) {
  rooms.set(room.id, room);
}

export function getRoom(roomId: string) {
  return rooms.get(roomId);
}

export function deleteRoom(roomId: string) {
  rooms.delete(roomId);
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

export function playersCount(room: Room<any, any>) {
  const p1 = room.seats.p1 ? 1 : 0;
  const p2 = room.seats.p2 ? 1 : 0;
  return p1 + p2;
}

export function removePlayerBySocket(room: Room<any, any>, socketId: string) {
  let changed = false;

  if (room.seats.p1 === socketId) {
    room.seats.p1 = "";
    room.players.p1 = "";
    changed = true;
  }

  if (room.seats.p2 === socketId) {
    room.seats.p2 = "";
    room.players.p2 = "";
    changed = true;
  }

  // Nettoyage votes
  if (room.rematchVotes.has(socketId)) {
    room.rematchVotes.delete(socketId);
    changed = true;
  }

  return { changed };
}
