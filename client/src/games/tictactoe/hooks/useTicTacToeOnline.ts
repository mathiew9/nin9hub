import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { getSocket } from "../../../sockets/socket";

/* -------- Types locaux -------- */
type Player = "X" | "O";
type Cell = Player | null;
type Winner = Player | "draw" | null;

type Seat = "p1" | "p2";
type MatchScoreById = Record<string, number>;

type AckSuccess<T> = { ok: true; data: T };
type AckError = { ok: false; code: string; message: string };
type Ack<T> = AckSuccess<T> | AckError;

type Status = "setup" | "waiting" | "playing" | "ended";

type RoomSettings = {
  gridSize: number;
  roundsToWin: number;
  swapRolesOnRematch: boolean;
  turnTimeMs: number;
  idleKickMs: number;
  moveRateLimitMs: number;
  roomCodeLength: number;
  reconnectGraceMs: number;
  preserveGameOnLeave: boolean;
  promoteGuestOnHostLeave: boolean;
  autoRematchOnBoth: boolean;
};

type State = {
  status: Status;
  roomId: string | null;
  role: Player | null;

  board: Cell[];
  turn: Player | null;
  started: boolean;
  winner: Winner;
  winningLine: number[];

  seats: { p1: string; p2: string } | null;

  matchScore: MatchScoreById;
  matchWinner: string | null;

  playersCount: 1 | 2;
  stateVersion: number;

  rematchVotes: 0 | 1 | 2;
  myRematchVoted: boolean;

  lastError: { code: string; message: string } | null;
  opponentLeft: boolean;

  myId: string | null;
  hostId: string | null;

  turnDeadlineAt: number | null;
  turnStartedAt: number | null;

  settings: RoomSettings | null;
};

const initialState: State = {
  status: "setup",
  roomId: null,
  role: null,

  board: Array<Cell>(9).fill(null),
  turn: null,
  started: false,
  winner: null,
  winningLine: [],

  seats: null,

  matchScore: {},
  matchWinner: null,

  playersCount: 1,
  stateVersion: 0,

  rematchVotes: 0,
  myRematchVoted: false,

  lastError: null,
  opponentLeft: false,

  myId: null,
  hostId: null,

  turnDeadlineAt: null,
  turnStartedAt: null,

  settings: null,
};

/* -------- Helpers seat <-> Player (UI reste en X/O) -------- */
function seatToPlayer(seat: Seat): Player {
  return seat === "p1" ? "X" : "O";
}

function mapSeatBoardToPlayerBoard(
  board: Array<Seat | null>,
): Array<Player | null> {
  return board.map((c) => (c ? seatToPlayer(c) : null));
}

function playerFromMySocketId(
  me: string,
  seats?: { p1: string; p2: string },
): Player | null {
  if (!me || !seats) return null;
  if (seats.p1 === me) return "X";
  if (seats.p2 === me) return "O";
  return null;
}

function mapSeatWinnerToWinner(w: Seat | "draw" | null | undefined): Winner {
  if (!w) return null;
  if (w === "draw") return "draw";
  return seatToPlayer(w);
}

function mapSeatTurnToTurn(t: Seat | null | undefined): Player | null {
  if (!t) return null;
  return seatToPlayer(t);
}

export function useTicTacToeOnline() {
  const socket = useMemo(() => getSocket(), []);
  const [s, setS] = useState<State>(initialState);

  const lastLeaveSentForRoomIdRef = useRef<string | null>(null);
  const roomIdRef = useRef<string | null>(null);

  const canPlay =
    s.status === "playing" && !s.winner && s.role !== null && s.turn === s.role;

  const isHost = !!(socket.id && s.hostId && socket.id === s.hostId);

  const setError = useCallback(
    (code: string, message: string) =>
      setS((prev) => ({ ...prev, lastError: { code, message } })),
    [],
  );

  const refreshMyId = useCallback(() => {
    setS((prev) => ({ ...prev, myId: socket.id || prev.myId }));
  }, [socket]);

  // Fire-and-forget leave (anti-double), used for unload/exit
  const leaveNow = useCallback(() => {
    const rid = roomIdRef.current;
    if (!rid) return;

    if (lastLeaveSentForRoomIdRef.current === rid) return;
    lastLeaveSentForRoomIdRef.current = rid;

    try {
      socket.emit("ttt:online:leave", () => {});
    } catch {}
  }, [socket]);

  useEffect(() => {
    const onExit = () => leaveNow();
    window.addEventListener("ninehub:exit-online", onExit);
    return () => window.removeEventListener("ninehub:exit-online", onExit);
  }, [leaveNow]);

  /* -------- Boot / connect -------- */
  useEffect(() => {
    roomIdRef.current = s.roomId;
  }, [s.roomId]);

  useEffect(() => {
    const onConnect = () =>
      setS((prev) => ({ ...prev, myId: socket.id || prev.myId }));
    onConnect();
    socket.on("connect", onConnect);
    return () => {
      socket.off("connect", onConnect);
    };
  }, [socket]);

  /* -------- Centralized leave + reset (await ack or timeout) -------- */
  const leaveAndReset = useCallback(
    async (opts?: { silent?: boolean }) => {
      const currentRoomId = roomIdRef.current;
      if (!currentRoomId) {
        // still reset local state to be safe
        setS(initialState);
        roomIdRef.current = null;
        lastLeaveSentForRoomIdRef.current = null;
        refreshMyId();
        return;
      }

      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };

        try {
          socket.emit("ttt:online:leave", () => finish());
          setTimeout(() => finish(), 200);
        } catch {
          finish();
        }
      });

      setS(initialState);
      roomIdRef.current = null;
      lastLeaveSentForRoomIdRef.current = null;

      if (!opts?.silent) refreshMyId();
    },
    [socket, refreshMyId],
  );

  /* -------- Events -------- */
  useEffect(() => {
    function onWaiting(payload: { players: 1 | 2 }) {
      setS((prev) => {
        // don't let waiting override an active game (events can arrive out-of-order)
        if (prev.started || prev.status === "playing") {
          // We still accept playersCount update, but avoid downgrading status.
          return {
            ...prev,
            playersCount: payload.players,
          };
        }

        return {
          ...prev,
          playersCount: payload.players,
          status: "waiting",
          started: false,
          turn: payload.players === 2 ? prev.turn : null,
          opponentLeft: payload.players === 2 ? false : prev.opponentLeft,
        };
      });
    }

    function onState(payload: {
      roomId: string;
      started: boolean;
      playersCount: 1 | 2;
      stateVersion: number;

      state: {
        board: Array<Seat | null>;
        turn: Seat;
        winner: Seat | "draw" | null;
        line: number[];

        turnDeadlineAt?: number | null;
        turnStartedAt?: number | null;
      };

      matchScore?: Record<string, number>;
      matchWinner?: string | null;

      hostId?: string;
      guestId?: string;

      seats?: { p1: string; p2: string };

      // Note: server sends players as {p1,p2} labels in your core
      players?: any;

      settings?: RoomSettings;
    }) {
      if (roomIdRef.current && payload.roomId !== roomIdRef.current) return;

      const {
        board,
        turn: turnSeat,
        winner: winnerSeat,
        line,
        turnDeadlineAt,
        turnStartedAt,
      } = payload.state;

      const matchScore =
        payload.matchScore ?? (payload.state as any).matchScore ?? undefined;

      const matchWinner =
        payload.matchWinner ?? (payload.state as any).matchWinner ?? null;

      setS((prev) => {
        if (
          prev.roomId &&
          prev.roomId === payload.roomId &&
          payload.stateVersion < prev.stateVersion
        ) {
          return prev;
        }

        const winner = mapSeatWinnerToWinner(winnerSeat);
        const turn = payload.started ? mapSeatTurnToTurn(turnSeat) : null;
        const boardXO = mapSeatBoardToPlayerBoard(board);

        const status: Status = winner
          ? "ended"
          : payload.started
            ? "playing"
            : "waiting";

        const nextHostId =
          payload.hostId && payload.hostId.length > 0
            ? payload.hostId
            : prev.hostId;

        if (!roomIdRef.current) roomIdRef.current = payload.roomId;

        const me = (socket.id || "").trim();
        let nextRole = prev.role;

        // Role deduction: only from seats (p1/p2). No X/O mapping from server labels.
        if (me) {
          const bySeats = playerFromMySocketId(me, payload.seats);
          if (bySeats) nextRole = bySeats;
        }

        // preserve timer fields if server omitted them (undefined)
        const nextTurnDeadlineAt =
          typeof turnDeadlineAt === "undefined"
            ? prev.turnDeadlineAt
            : (turnDeadlineAt ?? null);

        const nextTurnStartedAt =
          typeof turnStartedAt === "undefined"
            ? prev.turnStartedAt
            : (turnStartedAt ?? null);

        return {
          ...prev,
          roomId: payload.roomId ?? prev.roomId,

          board: boardXO as Cell[],
          turn,
          started: payload.started,
          winner,
          winningLine: line ?? [],

          seats: payload.seats ?? prev.seats,

          matchScore: matchScore ?? prev.matchScore,
          matchWinner: matchWinner ?? null,

          turnDeadlineAt: nextTurnDeadlineAt,
          turnStartedAt: nextTurnStartedAt,

          playersCount: payload.playersCount,
          opponentLeft:
            payload.playersCount === 2 || payload.started
              ? false
              : prev.opponentLeft,

          stateVersion: payload.stateVersion,
          status,
          hostId: nextHostId,
          role: nextRole,

          settings: payload.settings ?? prev.settings,
        };
      });
    }

    function onOpponentLeft(payload?: {
      roomId?: string;
      hostId?: string;
      players?: 1 | 2;
    }) {
      if (
        roomIdRef.current &&
        payload?.roomId &&
        payload.roomId !== roomIdRef.current
      ) {
        return;
      }

      setS((prev) => {
        // don't let opponent-left override an active game
        if (prev.started || prev.status === "playing") {
          return {
            ...prev,
            // keep hostId possibly updated
            hostId:
              payload?.hostId && payload.hostId.length > 0
                ? payload.hostId
                : prev.hostId,
            playersCount: payload?.players ?? prev.playersCount,
          };
        }

        return {
          ...prev,
          status: "waiting",
          started: false,
          turn: null,
          opponentLeft: true,
          playersCount: payload?.players ?? 1,
          hostId:
            payload?.hostId && payload.hostId.length > 0
              ? payload.hostId
              : prev.hostId,
        };
      });
    }

    function onRematchStatus(payload: { votes: 0 | 1 | 2 }) {
      setS((prev) => ({
        ...prev,
        rematchVotes: payload.votes,
        myRematchVoted: payload.votes === 0 ? false : prev.myRematchVoted,
      }));
    }

    function onError(payload: { code: string; message: string }) {
      setError(payload.code, payload.message);
    }

    socket.on("ttt:online:waiting", onWaiting);
    socket.on("ttt:online:state", onState);
    socket.on("ttt:online:opponent:left", onOpponentLeft);
    socket.on("ttt:online:rematch:status", onRematchStatus);
    socket.on("ttt:online:error", onError);

    return () => {
      socket.off("ttt:online:waiting", onWaiting);
      socket.off("ttt:online:state", onState);
      socket.off("ttt:online:opponent:left", onOpponentLeft);
      socket.off("ttt:online:rematch:status", onRematchStatus);
      socket.off("ttt:online:error", onError);
    };
  }, [socket, setError]);

  /* -------- Actions -------- */

  // server returns seat (p1/p2), not role
  const createRoom = useCallback(async () => {
    await leaveAndReset({ silent: true });

    return new Promise<AckSuccess<{ roomId: string; seat: Seat }> | AckError>(
      (resolve) => {
        socket.emit(
          "ttt:online:createRoom",
          (res: Ack<{ roomId: string; seat: Seat }>) => {
            if (res.ok) {
              roomIdRef.current = res.data.roomId;

              setS((prev) => ({
                ...prev,
                roomId: res.data.roomId,
                role: seatToPlayer(res.data.seat),
                status: "waiting",
                opponentLeft: false,
                lastError: null,
                rematchVotes: 0,
                myRematchVoted: false,
                hostId: socket.id ?? prev.hostId,
                stateVersion: 0,
              }));

              refreshMyId();
            } else {
              setError(res.code, res.message);
            }
            resolve(res);
          },
        );
      },
    );
  }, [socket, leaveAndReset, refreshMyId, setError]);

  // server returns seat (p1/p2), not role
  const joinRoom = useCallback(
    async (roomId: string) => {
      await leaveAndReset({ silent: true });

      return new Promise<
        AckSuccess<{ seat: Seat; players: number }> | AckError
      >((resolve) => {
        socket.emit(
          "ttt:online:joinRoom",
          { roomId },
          (res: Ack<{ seat: Seat; players: number }>) => {
            if (res.ok) {
              roomIdRef.current = roomId;

              setS((prev) => ({
                ...prev,
                roomId,
                role: seatToPlayer(res.data.seat),
                status: "waiting",
                opponentLeft: false,
                lastError: null,
                rematchVotes: 0,
                myRematchVoted: false,
                stateVersion: 0,
              }));

              refreshMyId();
            } else {
              setError(res.code, res.message);
            }
            resolve(res);
          },
        );
      });
    },
    [socket, leaveAndReset, refreshMyId, setError],
  );

  const startGame = useCallback(async () => {
    return new Promise<AckSuccess<{}> | AckError>((resolve) => {
      socket.emit("ttt:online:start", (res: Ack<{}>) => {
        if (!res.ok) setError(res.code, res.message);
        resolve(res);
      });
    });
  }, [socket, setError]);

  const playTurn = useCallback(
    async (index: number) => {
      if (!canPlay) {
        return {
          ok: false,
          code: "NOT_YOUR_TURN",
          message: "Pas ton tour.",
        } as AckError;
      }
      return new Promise<AckSuccess<{}> | AckError>((resolve) => {
        socket.emit("ttt:online:playTurn", { index }, (res: Ack<{}>) => {
          if (!res.ok) setError(res.code, res.message);
          resolve(res);
        });
      });
    },
    [socket, canPlay, setError],
  );

  const requestRematch = useCallback(async () => {
    if (s.myRematchVoted) {
      return { ok: true, data: { votes: s.rematchVotes } } as AckSuccess<{
        votes: number;
      }>;
    }
    return new Promise<AckSuccess<{ votes: number }> | AckError>((resolve) => {
      socket.emit(
        "ttt:online:rematch:request",
        (res: Ack<{ votes: number }>) => {
          if (res.ok) setS((prev) => ({ ...prev, myRematchVoted: true }));
          else setError(res.code, res.message);
          resolve(res);
        },
      );
    });
  }, [socket, s.myRematchVoted, s.rematchVotes, setError]);

  const swapRolesNow = useCallback(async () => {
    return new Promise<AckSuccess<{}> | AckError>((resolve) => {
      socket.emit("ttt:online:swap:roles", (res: Ack<{}>) => {
        if (!res.ok) setError(res.code, res.message);
        resolve(res);
      });
    });
  }, [socket, setError]);

  const leave = useCallback(async () => {
    await leaveAndReset();
    return { ok: true, data: {} } as AckSuccess<{}>;
  }, [leaveAndReset]);

  const updateSettings = useCallback(
    async (partial: Partial<RoomSettings>) => {
      return new Promise<AckSuccess<{ settings: RoomSettings }> | AckError>(
        (resolve) => {
          socket.emit(
            "ttt:online:settings:update",
            partial,
            (res: Ack<{ settings: RoomSettings }>) => {
              if (res.ok) {
                setS((prev) => ({
                  ...prev,
                  settings: res.data.settings,
                  lastError: null,
                }));
              } else {
                setError(res.code, res.message);
              }
              resolve(res);
            },
          );
        },
      );
    },
    [socket, setError],
  );

  const backToSettings = useCallback(async () => {
    return new Promise<AckSuccess<{}> | AckError>((resolve) => {
      socket.emit("ttt:online:backToSettings", (res: Ack<{}>) => {
        if (res.ok) {
          setS((prev) => ({ ...prev, lastError: null }));
        } else {
          setError(res.code, res.message);
        }
        resolve(res);
      });
    });
  }, [socket, setError]);

  /* -------- Lifecycles -------- */
  useEffect(() => {
    if (!s.opponentLeft) return;
    const t = setTimeout(
      () => setS((prev) => ({ ...prev, opponentLeft: false })),
      3000,
    );
    return () => clearTimeout(t);
  }, [s.opponentLeft]);

  useEffect(() => {
    return () => leaveNow();
  }, [leaveNow]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (!s.roomId) return;
      try {
        socket.emit("ttt:online:leave", () => {});
      } catch {}
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onBeforeUnload);
    };
  }, [socket, s.roomId]);

  return {
    ...s,
    canPlay,
    isHost,
    myId: s.myId,
    seats: s.seats,
    createRoom,
    joinRoom,
    startGame,
    playTurn,
    requestRematch,
    leave,
    leaveNow,
    updateSettings,
    swapRolesNow,
    backToSettings,
    clearError: () => setS((p) => ({ ...p, lastError: null })),
  };
}
