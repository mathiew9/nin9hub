// TicTacToeStatusBar.tsx
type PlayerSymbol = "X" | "O";

type Props = {
  leftText?: string; // e.g. "À jouer"
  leftSymbol?: PlayerSymbol | null; // "X" | "O" | null

  centerText: string; // e.g. "Joueur 1" | "Joueur 1 a gagné" | "Match nul"

  timeLeftSec?: number | null;

  state?: "playing" | "won" | "draw";

  className?: string;
};

function getTimerLevel(timeLeftSec: number): "ok" | "warn" | "danger" {
  if (timeLeftSec <= 2) return "danger";
  if (timeLeftSec <= 5) return "warn";
  return "ok";
}

export default function TicTacToeStatusBar({
  leftText,
  leftSymbol = null,
  centerText,
  timeLeftSec = null,
  state = "playing",
  className = "",
}: Props) {
  const showLeft = !!leftText;
  const showTimer =
    typeof timeLeftSec === "number" && Number.isFinite(timeLeftSec);

  const timerLevel = showTimer ? getTimerLevel(timeLeftSec) : "ok";

  return (
    <div
      className={["tttStatusBar", `tttStatusBar--${state}`, className]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live={state === "playing" ? "polite" : "off"}
    >
      <div className="tttStatusBar__left">
        {showLeft ? (
          <div className="tttStatusBar__leftInner">
            <span className="tttStatusBar__leftLabel">{leftText}</span>
            {leftSymbol ? (
              <span
                className={`symbol-badge symbol-${leftSymbol.toLowerCase()}`}
                aria-label={`Symbole ${leftSymbol}`}
              >
                {leftSymbol}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="tttStatusBar__center">
        <span className="tttStatusBar__centerText">{centerText}</span>
      </div>

      <div className="tttStatusBar__right">
        {showTimer ? (
          <span
            className={[
              "tttStatusBar__timer",
              `tttStatusBar__timer--${timerLevel}`,
            ].join(" ")}
            aria-label={`Temps restant ${timeLeftSec} secondes`}
          >
            ⏱ {timeLeftSec}s
          </span>
        ) : null}
      </div>
    </div>
  );
}
