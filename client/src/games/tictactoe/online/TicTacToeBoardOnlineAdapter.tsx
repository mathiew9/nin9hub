import { useEffect, useMemo, useState } from "react";

import TicTacToeBoard from "../shared/TicTacToeBoard";
import TicTacToeStatusBar from "../shared/TicTacToeStatusBar";
import TicTacToeScorePanel from "../shared/TicTacToeScorePanel";
import { useOnline } from "./TicTacToeOnlineProvider";
import { useTranslation } from "react-i18next";

type Player = "X" | "O";
type Cell = Player | null;
type Seat = "p1" | "p2";

export default function TicTacToeBoardOnlineAdapter() {
  const {
    board,
    role,
    turn,
    winner,
    winningLine,
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
  } = useOnline();

  const { t } = useTranslation();
  const isMatchEnded = !!matchWinner;
  const actionLabelBase = isMatchEnded
    ? t("games.tictactoe.rematch")
    : t("common.actions.playAgain");

  // Timer tick (used to compute remaining time)
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

  // Grid size resolution
  const gridSize = useMemo(() => {
    const fromSettings = (settings as any)?.gridSize;

    if (
      Number.isInteger(fromSettings) &&
      fromSettings >= 3 &&
      fromSettings <= 5
    ) {
      return fromSettings as number;
    }

    const n = Math.sqrt(board?.length ?? 9);
    return Number.isInteger(n) ? n : 3;
  }, [settings, board]);

  // Status bar visual state
  const stateForBar: "playing" | "won" | "draw" =
    winner === "draw" ? "draw" : winner ? "won" : "playing";

  // Board interaction
  const onCellClick = (i: number) => {
    if (!canPlay || winner) return;
    playTurn(i);
  };

  // --- SCORE mapping (X/O -> Vous/Adversaire) ---

  const myId = (useOnline() as any).myId as string | null; // si tu l’exposes déjà
  const hostId = (useOnline() as any).hostId as string | null;

  const mySeat: Seat | null =
    myId && hostId ? (myId === hostId ? "p1" : "p2") : null;

  const oppSeat: Seat | null = mySeat ? (mySeat === "p1" ? "p2" : "p1") : null;

  const myScore = mySeat ? (matchScore?.[mySeat] ?? 0) : 0;
  const oppScore = oppSeat ? (matchScore?.[oppSeat] ?? 0) : 0;

  const mySymbol = (role ?? "X") as Player;
  const oppSymbol: Player = mySymbol === "X" ? "O" : "X";

  const roundsToWin = settings?.roundsToWin ?? null;

  const scoreActions = isHost
    ? [
        {
          label: t("common.actions.changeSettings"),
          onClick: backToSettings,
        },
      ]
    : [];

  return (
    <>
      <TicTacToeStatusBar
        leftText={winner ? "" : `${t("common.labels.turn")} :`}
        leftSymbol={
          winner === "draw"
            ? null
            : winner
              ? (winner as Player)
              : (turn ?? null)
        }
        centerText={
          winner === "draw"
            ? t("common.results.draw")
            : winner
              ? winner === role
                ? `${t("common.results.victory")} !`
                : `${t("common.results.defeat")}.`
              : canPlay
                ? `${t("common.turn.yourTurn")}`
                : `${t("common.status.waiting")}...`
        }
        isInfinite={isInfinite}
        timeSec={winner ? null : isInfinite ? elapsedSec : timeLeft}
        state={stateForBar}
      />

      <div className="commonGameLayout">
        <div className="side">
          <TicTacToeScorePanel
            modeLabel="online"
            roundsToWin={roundsToWin}
            players={[
              {
                label: t("common.players.you"),
                score: myScore,
                symbol: mySymbol,
                isTurn: turn === mySymbol && !winner,
                matchWinner: matchWinner === mySeat,
              },
              {
                label: t("common.players.opponent"),
                score: oppScore,
                symbol: oppSymbol,
                isTurn: turn === oppSymbol && !winner,
                matchWinner: matchWinner === oppSeat,
              },
            ]}
            actions={scoreActions}
          />
        </div>

        <div className="center">
          <div className="ttt-online-boardBox">
            <TicTacToeBoard
              board={board as Cell[]}
              gridSize={gridSize}
              currentPlayer={(turn ?? "X") as Player}
              winningLine={winningLine}
              gameDone={!!winner}
              onCellClick={onCellClick}
              mode="online"
              canPlay={canPlay}
            />
            <div className="ttt-online-help">
              {t("games.tictactoe.hints.youAre") + " " + role + "."}
            </div>
          </div>

          {/* Si tu veux : quand matchWinner existe, tu peux choisir de ne plus proposer "rejouer" mais plutôt "nouveau match" */}
          {winner && (
            <div className="ttt-online-actions">
              <button
                className={`commonButton ttt-online-actionBtn ${
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
                className="commonButton ttt-online-actionBtn"
                onClick={leave}
              >
                {t("common.actions.leave")}
              </button>
            </div>
          )}
        </div>

        <div className="side hidden" />
      </div>
    </>
  );
}
