import { GameKey } from "../core/typesCore";

export const makeEvents = (gameKey: GameKey) =>
  ({
    CreateRoom: `${gameKey}:online:createRoom`,
    JoinRoom: `${gameKey}:online:joinRoom`,
    Start: `${gameKey}:online:start`,
    PlayTurn: `${gameKey}:online:playTurn`,
    RematchRequest: `${gameKey}:online:rematch:request`,
    Leave: `${gameKey}:online:leave`,

    Waiting: `${gameKey}:online:waiting`,
    State: `${gameKey}:online:state`,
    OpponentLeft: `${gameKey}:online:opponent:left`,
    RematchStatus: `${gameKey}:online:rematch:status`,
    UpdateSettings: `${gameKey}:online:settings:update`,
    BackToSettings: `${gameKey}:online:backToSettings`,
    SwapRoles: `${gameKey}:online:swap:roles`,
    Error: `${gameKey}:online:error`,
  }) as const;

export const TTTEvents = makeEvents("ttt");
export const C4Events = makeEvents("c4");

export type TTTEventName = (typeof TTTEvents)[keyof typeof TTTEvents];
export type C4EventName = (typeof C4Events)[keyof typeof C4Events];

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
