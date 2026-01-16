import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import TicTacToeScorePanel from "./shared/TicTacToeScorePanel";

import "./TicTacToe.css";

import TicTacToeBoard from "./shared/TicTacToeBoard";
import TicTacToeStatusBar from "./shared/TicTacToeStatusBar";
import TicTacToeOnlineRoot from "./online/TicTacToeOnlineRoot";

interface Props {
  mode: "ai" | "friend" | "online";
  gridSize: number;
  setMode: (mode: "ai" | "friend" | "online" | null) => void;
}

type Player = "X" | "O";
type SquareValue = Player | null;

export default function TicTacToe({ mode, gridSize, setMode }: Props) {
  const { t } = useTranslation();

  // ONLINE MODE
  if (mode === "online") {
    return (
      <div className="tictactoe">
        <TicTacToeOnlineRoot onBack={() => setMode(null)} />
      </div>
    );
  }

  // LOCAL GAME STATE
  const [board, setBoard] = useState<SquareValue[]>(() =>
    Array(gridSize * gridSize).fill(null)
  );

  const [player1Symbol, setPlayer1Symbol] = useState<Player>("X");
  const player2Symbol: Player = player1Symbol === "X" ? "O" : "X";

  const [currentPlayer, setCurrentPlayer] = useState<Player>("X");

  const [scoreP1, setScoreP1] = useState(0);
  const [scoreP2, setScoreP2] = useState(0);

  // GAME RESULT
  const result = calculateWinner(board, gridSize);
  const winner = result?.player ?? null;
  const winningLine = result?.line ?? [];
  const draw = !winner && !board.includes(null);

  // LABELS
  const isPlayer1Turn = currentPlayer === player1Symbol;

  const currentActorLabel = useMemo(() => {
    if (isPlayer1Turn) return t("common.players.player1");
    return mode === "ai"
      ? t("common.players.computer")
      : t("common.players.player2");
  }, [isPlayer1Turn, mode, t]);

  const p1Label = t("common.players.player1");
  const p2Label =
    mode === "ai" ? t("common.players.computer") : t("common.players.player2");

  // TURN TIMER
  const TURN_SECONDS = 10;
  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(TURN_SECONDS);

  const timerActive =
    !winner &&
    !draw &&
    (mode === "friend" || (mode === "ai" && currentPlayer === player1Symbol));

  useEffect(() => {
    if (!timerActive) {
      setTimeLeftSec(null);
      return;
    }
    setTimeLeftSec(TURN_SECONDS);
  }, [timerActive, currentPlayer, gridSize]);

  useEffect(() => {
    if (!timerActive || timeLeftSec === null || timeLeftSec <= 0) return;

    const id = window.setInterval(() => {
      setTimeLeftSec((prev) => (prev && prev > 1 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(id);
  }, [timerActive, timeLeftSec]);

  // CORE MOVE LOGIC
  const playMove = (index: number, symbol: Player) => {
    if (board[index] || winner) return;

    const next = [...board];
    next[index] = symbol;

    setBoard(next);
    setCurrentPlayer(symbol === "X" ? "O" : "X");
  };

  const pickRandomEmptyCell = (): number | null => {
    const empties = board
      .map((v, i) => (v === null ? i : null))
      .filter((v) => v !== null) as number[];

    if (empties.length === 0) return null;
    return empties[Math.floor(Math.random() * empties.length)];
  };

  // HUMAN CLICK
  const handleClick = (index: number) => {
    playMove(index, currentPlayer);
  };

  // TIMER TIMEOUT → AUTO MOVE
  useEffect(() => {
    if (!timerActive) return;
    if (timeLeftSec !== 0) return;
    if (winner || draw) return;

    const pick = pickRandomEmptyCell();
    if (pick !== null) {
      playMove(pick, currentPlayer);
    }
  }, [timeLeftSec, timerActive, winner, draw]);

  // SIMPLE AI
  useEffect(() => {
    if (mode !== "ai") return;
    if (winner) return;
    if (currentPlayer !== player2Symbol) return;

    const pick = pickRandomEmptyCell();
    if (pick === null) return;

    const timeout = window.setTimeout(() => {
      playMove(pick, player2Symbol);
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [board, currentPlayer, mode, winner, player2Symbol]);

  // SCORE UPDATE
  useEffect(() => {
    if (!winner) return;

    const winnerIsP1 = winner === player1Symbol;
    if (winnerIsP1) setScoreP1((s) => s + 1);
    else setScoreP2((s) => s + 1);
  }, [winner, player1Symbol]);

  // RESET
  const reset = () => {
    setBoard(Array(gridSize * gridSize).fill(null));
    setCurrentPlayer("X");
    setPlayer1Symbol((s) => (s === "X" ? "O" : "X"));
  };

  const resetScore = () => {
    setScoreP1(0);
    setScoreP2(0);
  };

  return (
    <div className="tictactoe">
      <TicTacToeStatusBar
        leftText={winner || draw ? "" : t("games.tictactoe.inGame.toPlayShort")}
        leftSymbol={winner || draw ? null : currentPlayer}
        centerText={
          winner
            ? `${winner === player1Symbol ? p1Label : p2Label} ${t(
                "games.tictactoe.results.won"
              )}`
            : draw
            ? t("common.results.draw")
            : currentActorLabel
        }
        timeSec={winner || draw ? null : timeLeftSec}
      />

      <div className="commonGameLayout">
        <div className="side">
          <TicTacToeScorePanel
            modeLabel={mode}
            players={[
              { label: p1Label, score: scoreP1, symbol: player1Symbol },
              { label: p2Label, score: scoreP2, symbol: player2Symbol },
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
          <TicTacToeBoard
            board={board}
            gridSize={gridSize}
            gameDone={!!winner || draw}
            currentPlayer={currentPlayer}
            winningLine={winningLine}
            onCellClick={handleClick}
            mode={mode}
            canPlay={mode === "ai" ? currentPlayer === player1Symbol : true}
          />
        </div>

        <div className="side hidden" />
      </div>

      <button
        onClick={reset}
        className="commonButton commonMediumButton ttt-playAgainButton"
      >
        {t("common.actions.playAgain")}
      </button>
    </div>
  );
}

// ---- utils
type WinResult = { player: Player; line: number[] } | null;

function calculateWinner(s: SquareValue[], n: number): WinResult {
  const lines: number[][] = [];

  for (let r = 0; r < n; r++) {
    const L: number[] = [];
    for (let c = 0; c < n; c++) L.push(r * n + c);
    lines.push(L);
  }

  for (let c = 0; c < n; c++) {
    const L: number[] = [];
    for (let r = 0; r < n; r++) L.push(r * n + c);
    lines.push(L);
  }

  const d1: number[] = [];
  for (let i = 0; i < n; i++) d1.push(i * n + i);
  lines.push(d1);

  const d2: number[] = [];
  for (let i = 0; i < n; i++) d2.push(i * n + (n - 1 - i));
  lines.push(d2);

  for (const line of lines) {
    const [f, ...rest] = line;
    if (s[f] && rest.every((i) => s[i] === s[f])) {
      return { player: s[f]!, line };
    }
  }

  return null;
}
