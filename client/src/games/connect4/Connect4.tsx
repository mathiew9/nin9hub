import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

import "./Connect4.css";

import Connect4Board, { Disc, WinningCell } from "./shared/Connect4Board";
import Connect4OnlineRoot from "./online/Connect4OnlineRoot";
import GameStatusBar from "../_shared/hud/GameStatusBar";
import GameScorePanel from "../_shared/hud/GameScorePanel";

const ROWS = 6;
const COLS = 7;

const TURN_SECONDS = 10;

interface Props {
  mode: "ai" | "friend" | "online";
  setMode: (mode: "ai" | "friend" | "online" | null) => void;
}

export default function Connect4({ mode, setMode }: Props) {
  const { t } = useTranslation();

  // ONLINE MODE
  if (mode === "online") {
    return (
      <div className="tictactoe">
        <Connect4OnlineRoot onBack={() => setMode(null)} />
      </div>
    );
  }

  const [board, setBoard] = useState<Disc[][]>(
    Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(null)),
  );

  const [currentPlayer, setCurrentPlayer] = useState<"red" | "yellow">("red");
  const [winner, setWinner] = useState<"red" | "yellow" | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [score, setScore] = useState({ red: 0, yellow: 0 });
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [winningCells, setWinningCells] = useState<WinningCell[]>([]);

  const checkWinner = (
    b: (string | null)[][],
    row: number,
    col: number,
    player: string,
  ): WinningCell[] | null => {
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (const [dx, dy] of directions) {
      const cells: WinningCell[] = [{ row, col }];

      for (let step = 1; step < 4; step++) {
        const r = row + step * dx;
        const c = col + step * dy;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || b[r][c] !== player)
          break;
        cells.push({ row: r, col: c });
      }

      for (let step = 1; step < 4; step++) {
        const r = row - step * dx;
        const c = col - step * dy;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || b[r][c] !== player)
          break;
        cells.push({ row: r, col: c });
      }

      if (cells.length >= 4) return cells;
    }

    return null;
  };

  const checkDraw = (b: (string | null)[][]) => {
    return b.every((row) => row.every((cell) => cell !== null));
  };

  const isColumnFull = (col: number) => board[0][col] !== null;

  const dropDisc = (col: number) => {
    if (winner || isDraw) return;
    if (isColumnFull(col)) return;

    const newBoard = board.map((row) => [...row]);

    for (let row = ROWS - 1; row >= 0; row--) {
      if (!newBoard[row][col]) {
        newBoard[row][col] = currentPlayer;
        setBoard(newBoard);

        const result = checkWinner(newBoard, row, col, currentPlayer);
        if (result) {
          setWinner(currentPlayer);
          setWinningCells(result);
          setScore((prev) => ({
            ...prev,
            [currentPlayer]: prev[currentPlayer] + 1,
          }));
        } else if (checkDraw(newBoard)) {
          setIsDraw(true);
        } else {
          setCurrentPlayer(currentPlayer === "red" ? "yellow" : "red");
        }
        break;
      }
    }
  };

  const resetGame = () => {
    setBoard(
      Array(ROWS)
        .fill(null)
        .map(() => Array(COLS).fill(null)),
    );
    setCurrentPlayer("red");
    setWinner(null);
    setIsDraw(false);
    setWinningCells([]);
  };

  const resetScore = () => {
    setScore({ red: 0, yellow: 0 });
  };

  const getAvailableColumns = () => {
    return board[0]
      .map((_, colIndex) => colIndex)
      .filter((col) => board[0][col] === null);
  };

  // règle d’interaction (offline) : friend = toujours, ai = seulement quand red joue
  const canInteract =
    mode === "friend" || (mode === "ai" && currentPlayer === "red");

  /* ---------------- TIMER OFFLINE (comme TTT) ---------------- */

  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(TURN_SECONDS);

  const timerActive = !winner && !isDraw && canInteract;

  // reset timer à chaque changement de tour (ou si le timer s’active)
  useEffect(() => {
    if (!timerActive) {
      setTimeLeftSec(null);
      return;
    }
    setTimeLeftSec(TURN_SECONDS);
  }, [timerActive, currentPlayer]);

  // tick
  useEffect(() => {
    if (!timerActive || timeLeftSec === null || timeLeftSec <= 0) return;

    const id = window.setInterval(() => {
      setTimeLeftSec((prev) => (prev && prev > 1 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(id);
  }, [timerActive, timeLeftSec]);

  // timeout -> auto move (random colonne)
  useEffect(() => {
    if (!timerActive) return;
    if (timeLeftSec !== 0) return;
    if (winner || isDraw) return;

    const available = getAvailableColumns();
    if (available.length === 0) return;

    const col = available[Math.floor(Math.random() * available.length)];
    dropDisc(col);
  }, [timeLeftSec, timerActive, winner, isDraw, board]);

  /* ---------------- AI (simple) ---------------- */

  useEffect(() => {
    if (mode === "ai" && currentPlayer === "yellow" && !winner && !isDraw) {
      const timeout = setTimeout(() => {
        const availableCols = getAvailableColumns();
        if (availableCols.length > 0) {
          const randomCol =
            availableCols[Math.floor(Math.random() * availableCols.length)];
          dropDisc(randomCol);
        }
      }, 800);

      return () => clearTimeout(timeout);
    }
  }, [board, currentPlayer, mode, winner, isDraw]);

  const isHoveredPlayable = (row: number, col: number) => {
    if (hoverCol !== col) return false;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === null) return r === row;
    }
    return false;
  };

  /* ---------------- Labels pour la status bar ---------------- */

  const actorLabel = useMemo(() => {
    if (mode === "ai") {
      return currentPlayer === "red"
        ? t("common.players.you")
        : t("common.players.computer");
    }
    return currentPlayer === "red"
      ? t("common.players.player1")
      : t("common.players.player2");
  }, [mode, currentPlayer, t]);

  const centerText = winner
    ? `${t(`games.connect4.colors.${winner}`)} ${t("games.connect4.inGame.wins")}!`
    : isDraw
      ? t("common.results.draw")
      : actorLabel;

  const p1Label =
    mode === "ai" ? t("common.players.you") : t("common.players.player1");
  const p2Label =
    mode === "ai" ? t("common.players.computer") : t("common.players.player2");

  return (
    <div className="connect4">
      <GameStatusBar
        leftText={
          winner || isDraw ? "" : `${t("games.tictactoe.inGame.toPlayShort")}`
        }
        leftBadge={isDraw ? null : winner ? (winner as Disc) : currentPlayer}
        centerText={centerText}
        timeSec={winner || isDraw ? null : timeLeftSec}
        isInfinite={false}
      />

      <div className="commonGameLayout">
        <div className="side">
          <GameScorePanel
            modeLabel={mode}
            players={[
              {
                label: p1Label,
                score: score.red,
                badge: "red",
                isTurn: currentPlayer === "red" && !winner && !isDraw,

                matchWinner: winner === "red",
              },
              {
                label: p2Label,
                score: score.yellow,
                badge: "yellow",
                isTurn: currentPlayer === "yellow" && !winner && !isDraw,
                matchWinner: winner === "yellow",
              },
            ]}
            roundsToWin={null}
            actions={[
              { label: t("common.actions.resetScore"), onClick: resetScore },
              {
                label: t("common.modes.changeGameMode"),
                onClick: () => setMode(null),
              },
            ]}
          />
        </div>

        <div className="center">
          <Connect4Board
            board={board}
            currentPlayer={currentPlayer}
            winner={winner}
            isDraw={isDraw}
            hoverCol={hoverCol}
            setHoverCol={setHoverCol}
            winningCells={winningCells}
            canInteract={canInteract}
            dropDisc={dropDisc}
            isHoveredPlayable={isHoveredPlayable}
            isColumnFull={isColumnFull}
          />
        </div>

        <div className="side hidden" />
      </div>

      <button
        className="commonButton commonMediumButton connect4PlayAgainButton"
        onClick={resetGame}
      >
        {t("common.actions.playAgain")}
      </button>
    </div>
  );
}
