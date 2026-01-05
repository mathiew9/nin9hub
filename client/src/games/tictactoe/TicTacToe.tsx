import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import "./TicTacToe.css";
import TicTacToeBoard from "./shared/TicTacToeBoard";
import TicTacToeStatusBar from "./shared/TicTacToeStatusBar";

// ➜ Nouveau conteneur online (provider + setup + waiting + board)
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

  // --- Cas ONLINE : on délègue 100% à l'UI online ---
  if (mode === "online") {
    return (
      <div className="tictactoe">
        <TicTacToeOnlineRoot />
      </div>
    );
  }

  // --- Cas IA / ami local ---
  const [board, setBoard] = useState<SquareValue[]>(() =>
    Array(gridSize * gridSize).fill(null)
  );

  // Rôles par manche : Player 1 a un symbole (X/O) qui alterne à chaque "Rejouer"
  const [player1Symbol, setPlayer1Symbol] = useState<Player>("X");
  const player2Symbol: Player = player1Symbol === "X" ? "O" : "X";

  // currentPlayer reste le symbole (pour être compatible avec Board / logique)
  const [currentPlayer, setCurrentPlayer] = useState<Player>("X");

  // Score par joueur (plus par symbole)
  const [scoreP1, setScoreP1] = useState(0);
  const [scoreP2, setScoreP2] = useState(0);

  const result = calculateWinner(board, gridSize);
  const winner = result?.player ?? null;
  const winningLine = result?.line ?? [];
  const draw = !winner && !board.includes(null);

  const isPlayer1Turn = currentPlayer === player1Symbol;
  const currentActorLabel = useMemo(() => {
    if (isPlayer1Turn) return t("tictactoe.player1");
    // player 2 ou ordinateur
    return mode === "ai" ? t("tictactoe.computer") : t("tictactoe.player2");
  }, [isPlayer1Turn, mode, t]);

  const TURN_SECONDS = 10;
  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(TURN_SECONDS);
  const timerActive =
    !winner &&
    !draw &&
    (mode === "friend" || (mode === "ai" && currentPlayer === player1Symbol));

  const handleClick = (index: number) => {
    if (board[index] || winner) return;
    const next = [...board];
    next[index] = currentPlayer;
    setBoard(next);
    setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
  };

  // Timer par tour
  useEffect(() => {
    if (!timerActive) {
      setTimeLeftSec(null);
      return;
    }
    setTimeLeftSec(TURN_SECONDS);
  }, [timerActive, currentPlayer, gridSize]);

  // Score local : on mappe winner (X/O) -> Player 1 ou Player 2/IA selon la manche
  useEffect(() => {
    if (!winner) return;

    const winnerIsP1 = winner === player1Symbol;
    if (winnerIsP1) setScoreP1((s) => s + 1);
    else setScoreP2((s) => s + 1);
  }, [winner, player1Symbol]);

  // Décrémentation du timer
  useEffect(() => {
    if (!timerActive) return;
    if (timeLeftSec === null) return;
    if (timeLeftSec <= 0) return;

    const id = window.setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev === null) return null;
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [timerActive, timeLeftSec]);

  // IA simple : l'IA joue avec le symbole de "Player 2" pour la manche en cours
  useEffect(() => {
    const aiSymbol = player2Symbol;

    if (
      mode === "ai" &&
      currentPlayer === aiSymbol &&
      !winner &&
      board.includes(null)
    ) {
      const timeout = setTimeout(() => {
        const empties = board
          .map((v, i) => (v === null ? i : null))
          .filter((v) => v !== null) as number[];

        const pick = empties[Math.floor(Math.random() * empties.length)];
        const next = [...board];
        next[pick] = aiSymbol;
        setBoard(next);
        setCurrentPlayer(aiSymbol === "X" ? "O" : "X");
      }, 800);

      return () => clearTimeout(timeout);
    }
  }, [board, currentPlayer, mode, winner, player2Symbol]);

  // Rejouer : reset board + X commence toujours + swap rôles (P1 X/O)
  const reset = () => {
    setBoard(Array(gridSize * gridSize).fill(null));
    setCurrentPlayer("X");
    setPlayer1Symbol((s) => (s === "X" ? "O" : "X"));
  };

  const resetScore = () => {
    setScoreP1(0);
    setScoreP2(0);
  };

  // Helpers d'affichage score
  const p1Label = t("tictactoe.player1");
  const p2Label =
    mode === "ai" ? t("tictactoe.computer") : t("tictactoe.player2");

  return (
    <div className="tictactoe">
      <TicTacToeStatusBar
        leftText={winner || draw ? "" : t("tictactoe.toPlayShort")}
        leftSymbol={winner || draw ? null : currentPlayer}
        centerText={
          winner
            ? `${winner === player1Symbol ? p1Label : p2Label} ${t(
                "tictactoe.won"
              )}`
            : draw
            ? t("tictactoe.draw")
            : currentActorLabel
        }
        timeLeftSec={winner || draw ? null : timeLeftSec} // ton state timer (à créer)
      />

      <div className="commonGameLayout">
        <div className="side">
          <div className="scoreCard">
            <div className="scoreCardMode">
              <div className="modeText">
                {t("tictactoe.gamemode")} :{" "}
                {mode === "ai"
                  ? t("tictactoe.withai")
                  : t("tictactoe.withfriend")}
              </div>
            </div>
            <div className="scoreCardHeader">
              <div className="scoreTitle">{t("common.score")}</div>
            </div>

            <div className="scoreCardBody">
              <p>
                {p1Label} - {scoreP1}{" "}
                <span
                  className={`symbol-badge symbol-${player1Symbol.toLowerCase()}`}
                >
                  {player1Symbol}
                </span>
              </p>
              <p>
                {p2Label} - {scoreP2}{" "}
                <span
                  className={`symbol-badge symbol-${player2Symbol.toLowerCase()}`}
                >
                  {player2Symbol}
                </span>
              </p>
            </div>

            <div className="scoreCardFooter">
              <button
                className="commonScoreButton commonButton"
                onClick={resetScore}
              >
                {t("tictactoe.resetScore")}
              </button>
              <button
                className="commonScoreButton commonButton"
                onClick={() => setMode(null)}
              >
                {t("tictactoe.changeGameMode")}
              </button>
            </div>
          </div>
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

      <button onClick={reset} className="commonButton commonMediumButton">
        {t("common.playAgain")}
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
    if (s[f] && rest.every((i) => s[i] === s[f]))
      return { player: s[f]!, line };
  }
  return null;
}
