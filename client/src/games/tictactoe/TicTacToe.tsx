import { useState, useEffect } from "react";
import { useTranslation, Trans } from "react-i18next";
import "./TicTacToe.css";
import TicTacToeBoard from "./shared/TicTacToeBoard";

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

  // --- Cas IA / ami local : logique locale comme avant ---
  const [board, setBoard] = useState<SquareValue[]>(() =>
    Array(gridSize * gridSize).fill(null)
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>("X");
  const [scoreX, setScoreX] = useState(0);
  const [scoreO, setScoreO] = useState(0);

  const result = calculateWinner(board, gridSize);
  const winner = result?.player ?? null;
  const winningLine = result?.line ?? [];
  const draw = !winner && !board.includes(null);

  const handleClick = (index: number) => {
    if (board[index] || winner) return;
    const next = [...board];
    next[index] = currentPlayer;
    setBoard(next);
    setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
  };

  // Score local
  useEffect(() => {
    if (winner === "X") setScoreX((s) => s + 1);
    else if (winner === "O") setScoreO((s) => s + 1);
  }, [winner]);

  // IA simple (quand O joue)
  useEffect(() => {
    if (
      mode === "ai" &&
      currentPlayer === "O" &&
      !winner &&
      board.includes(null)
    ) {
      const t = setTimeout(() => {
        const empties = board
          .map((v, i) => (v === null ? i : null))
          .filter((v) => v !== null) as number[];
        const pick = empties[Math.floor(Math.random() * empties.length)];
        const next = [...board];
        next[pick] = "O";
        setBoard(next);
        setCurrentPlayer("X");
      }, 800);
      return () => clearTimeout(t);
    }
  }, [board, currentPlayer, mode, winner]);

  const reset = () => {
    setBoard(Array(gridSize * gridSize).fill(null));
    setCurrentPlayer("X");
  };
  const resetScore = () => {
    setScoreX(0);
    setScoreO(0);
  };

  return (
    <div className="tictactoe">
      <h2>
        {winner ? (
          <Trans
            i18nKey="tictactoe.wonByRich"
            values={{ player: winner }}
            components={{
              player: (
                <span
                  className={`symbol-badge symbol-${winner.toLowerCase()}`}
                />
              ),
            }}
          />
        ) : draw ? (
          t("tictactoe.draw")
        ) : (
          <Trans
            i18nKey="tictactoe.toPlayRich"
            values={{ player: currentPlayer }}
            components={{
              player: (
                <span
                  className={`symbol-badge symbol-${currentPlayer.toLowerCase()}`}
                />
              ),
            }}
          />
        )}
      </h2>

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
                <span className="symbol-badge symbol-x">X</span> - {scoreX}
              </p>
              <p>
                <span className="symbol-badge symbol-o">O</span> - {scoreO}
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
