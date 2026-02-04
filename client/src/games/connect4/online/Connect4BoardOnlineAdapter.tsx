import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import Connect4Board from "../shared/Connect4Board";

import GameStatusBar from "../../_shared/hud/GameStatusBar";
import GameScorePanel from "../../_shared/hud/GameScorePanel";

import { useOnline } from "./Connect4OnlineProvider";

type Disc = "red" | "yellow" | null;

type WinningCell = { row: number; col: number };

const ROWS = 6;
const COLS = 7;

function emptyBoard(): Disc[][] {
  return Array(ROWS)
    .fill(null)
    .map(() => Array<Disc>(COLS).fill(null));
}

export default function Connect4BoardOnlineAdapter() {
  const online = useOnline();
  const {
    board,
    role,
    turn,
    winner,
    winningCells,
    canPlay,
    rematchVotes,
    myRematchVoted,
    requestRematch,
    leave,
    playTurn,
    backToSettings,
    settings,
    turnDeadlineAt,
    turnStartedAt,
    matchScore,
    matchWinner,
    isHost,

    myId,
    seats,
  } = online as any;

  const { t } = useTranslation();

  const isMatchEnded = !!matchWinner;
  const actionLabelBase = isMatchEnded
    ? t("common.actions.rematch")
    : t("common.actions.playAgain");

  /* ---------------- Timer (comme TTT adapter) ---------------- */
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!turnDeadlineAt && !turnStartedAt) return;

    const id = window.setInterval(() => setNow(Date.now()), 300);
    return () => window.clearInterval(id);
  }, [turnDeadlineAt, turnStartedAt]);

  const isInfinite = (settings?.turnTimeMs ?? 0) <= 0;

  const timeLeft = useMemo<number | null>(() => {
    const turnTimeMs = settings?.turnTimeMs ?? 0;
    if (!turnDeadlineAt) return null;

    const msLeft = Math.max(0, turnDeadlineAt - now);
    const raw = Math.ceil(msLeft / 1000);
    const max = Math.ceil(turnTimeMs / 1000);

    return Math.min(max, raw);
  }, [turnDeadlineAt, now, settings?.turnTimeMs]);

  const elapsedSec = useMemo<number | null>(() => {
    if (!turnStartedAt) return null;
    const ms = Math.max(0, now - turnStartedAt);
    return Math.floor(ms / 1000);
  }, [turnStartedAt, now]);

  /* ---------------- Normalisation board / winCells ---------------- */
  const gridBoard: Disc[][] = useMemo(() => {
    if (Array.isArray(board) && Array.isArray(board[0]))
      return board as Disc[][];
    return emptyBoard();
  }, [board]);

  const winCells: WinningCell[] = useMemo(() => {
    return Array.isArray(winningCells) ? (winningCells as WinningCell[]) : [];
  }, [winningCells]);

  /* ---------------- Opponent id + scores ---------------- */
  const oppId: string | null = useMemo(() => {
    if (!myId || !seats) return null;
    if (seats.p1 === myId) return seats.p2 || null;
    if (seats.p2 === myId) return seats.p1 || null;
    return null;
  }, [myId, seats]);

  const myScore = (myId ? matchScore?.[myId] : null) ?? 0;
  const oppScore = (oppId ? matchScore?.[oppId] : null) ?? 0;

  const iWonMatch = !!(myId && matchWinner === myId);
  const oppWonMatch = !!(oppId && matchWinner === oppId);

  const myColor = (role ?? "red") as "red" | "yellow";
  const oppColor: "red" | "yellow" = myColor === "red" ? "yellow" : "red";

  const roundsToWin = settings?.roundsToWin ?? null;

  const scoreActions = isHost
    ? [
        {
          label: t("common.actions.changeSettings"),
          onClick: backToSettings,
        },
      ]
    : [];

  const isMyTurn = turn === myColor && !winner;
  const isOppTurn = turn === oppColor && !winner;

  /* ---------------- Hover logic (offline-like) ---------------- */
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const isColumnFull = (col: number) => gridBoard?.[0]?.[col] !== null;

  const isHoveredPlayable = (row: number, col: number) => {
    if (hoverCol !== col) return false;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (gridBoard[r][col] === null) return r === row;
    }
    return false;
  };

  /* ---------------- Board interaction ---------------- */
  const onDrop = (col: number) => {
    if (!canPlay || winner) return;
    playTurn(col);
  };

  /* ---------------- StatusBar (réutilise TTT component) ---------------- */
  const stateForBar: "playing" | "won" | "draw" =
    winner === "draw" ? "draw" : winner ? "won" : "playing";

  const centerText =
    winner === "draw"
      ? t("common.results.draw")
      : winner
        ? winner === myColor
          ? `${t("common.results.victory")} !`
          : `${t("common.results.defeat")}.`
        : canPlay
          ? `${t("common.turn.yourTurn")}`
          : `${t("common.status.waiting")}...`;

  return (
    <>
      <GameStatusBar
        leftText={winner ? "" : `${t("common.labels.turn")} :`}
        leftBadge={
          winner === "draw" ? null : winner ? (winner as Disc) : (turn ?? null)
        }
        centerText={centerText}
        isInfinite={isInfinite}
        timeSec={winner ? null : isInfinite ? elapsedSec : timeLeft}
        state={stateForBar}
      />

      <div className="commonGameLayout">
        <div className="side">
          <GameScorePanel
            modeLabel="online"
            roundsToWin={roundsToWin}
            players={[
              {
                label: t("common.players.you"),
                score: myScore,
                badge: myColor,

                isTurn: isMyTurn,

                matchWinner: iWonMatch,
              },
              {
                label: t("common.players.opponent"),
                score: oppScore,
                badge: oppColor,
                isTurn: isOppTurn,
                matchWinner: oppWonMatch,
              },
            ]}
            actions={scoreActions}
          />
        </div>

        <div className="center">
          <div className="connect4-online-boardBox">
            <Connect4Board
              board={gridBoard}
              currentPlayer={(turn ?? "red") as "red" | "yellow"}
              winner={winner as any}
              isDraw={winner === "draw"}
              hoverCol={hoverCol}
              setHoverCol={setHoverCol}
              winningCells={winCells}
              canInteract={!!canPlay && !winner}
              dropDisc={onDrop}
              isHoveredPlayable={isHoveredPlayable}
              isColumnFull={isColumnFull}
            />

            <div className="connect4-online-help">
              {t("common.messages.youAre") +
                " " +
                (myColor === "red"
                  ? t("games.connect4.colors.red")
                  : t("games.connect4.colors.yellow")) +
                "."}
            </div>

            {winner && (
              <div className="connect4-online-actions">
                <button
                  className={`commonButton connect4-online-actionBtn ${
                    myRematchVoted || rematchVotes === 2 ? "is-disabled" : ""
                  }`}
                  onClick={requestRematch}
                  disabled={myRematchVoted || rematchVotes === 2}
                  title={
                    myRematchVoted
                      ? `${t("common.status.waitingForOpponent")}…`
                      : t("common.actions.requestRematch")
                  }
                >
                  {rematchVotes === 0 &&
                    !myRematchVoted &&
                    `${actionLabelBase} (0/2)`}
                  {rematchVotes === 1 &&
                    !myRematchVoted &&
                    `${actionLabelBase} (1/2)`}
                  {myRematchVoted &&
                    rematchVotes < 2 &&
                    `${t("common.status.waitingForOpponent")} (1/2)…`}
                  {rematchVotes === 2 && `${actionLabelBase} (2/2)`}
                </button>

                <button
                  className="commonButton connect4-online-actionBtn"
                  onClick={leave}
                >
                  {t("common.actions.leave")}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="side hidden" />
      </div>
    </>
  );
}
