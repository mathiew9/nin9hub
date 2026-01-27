// Event names centralization
export const Events = {
  CreateRoom: "online:createRoom",
  JoinRoom: "online:joinRoom",
  Start: "online:start",
  PlayTurn: "online:playTurn",
  RematchRequest: "online:rematch:request",
  Leave: "online:leave",

  Waiting: "online:waiting",
  State: "online:state",
  OpponentLeft: "online:opponent:left",
  RematchStatus: "online:rematch:status",
  UpdateSettings: "online:settings:update",
  BackToSettings: "online:backToSettings",
  SwapRoles: "online:swap:roles",
  Error: "online:error",
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

// Error codes (stable)
export const ErrorCodes = {
  ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
  ROOM_FULL: "ROOM_FULL",
  NOT_IN_ROOM: "NOT_IN_ROOM",

  ONLY_HOST: "ONLY_HOST",
  ALREADY_HOST: "ALREADY_HOST",
  NEED_2_PLAYERS: "NEED_2_PLAYERS",

  GAME_STARTED: "GAME_STARTED",
  GAME_NOT_STARTED: "GAME_NOT_STARTED",
  MATCH_ENDED: "MATCH_ENDED",
  GAME_NOT_ENDED: "GAME_NOT_ENDED",
  NOT_YOUR_TURN: "NOT_YOUR_TURN",

  CELL_TAKEN: "CELL_TAKEN",
  OUT_OF_RANGE: "OUT_OF_RANGE",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
