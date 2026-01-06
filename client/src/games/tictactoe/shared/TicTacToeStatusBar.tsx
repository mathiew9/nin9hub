import { FaStopwatch, FaInfinity } from "react-icons/fa";

type PlayerSymbol = "X" | "O";

type Props = {
  leftText?: string;
  leftSymbol?: PlayerSymbol | null;

  centerText: string;
  timeLeftSec?: number | null;
  infinite?: boolean;

  state?: "playing" | "won" | "draw";
  className?: string;
};

// Timer visual state based on remaining time
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
  infinite = false,
  state = "playing",
  className = "",
}: Props) {
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
      {/* Left: label + optional symbol */}
      <div className="tttStatusBar__left">
        {(leftText || leftSymbol) && (
          <div className="tttStatusBar__leftInner">
            {leftText && (
              <span className="tttStatusBar__leftLabel">{leftText}</span>
            )}

            {leftSymbol && (
              <span
                className={`symbol-badge symbol-${leftSymbol.toLowerCase()}`}
                aria-label={`Symbole ${leftSymbol}`}
              >
                {leftSymbol}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Center: main status text */}
      <div className="tttStatusBar__center">
        <span className="tttStatusBar__centerText">{centerText}</span>
      </div>

      {/* Right: turn timer */}
      <div className="tttStatusBar__right">
        {infinite ? (
          <span
            className="tttStatusBar__timer tttStatusBar__timer--infinite"
            aria-label="Temps infini"
          >
            <FaStopwatch className="timerIcon" />
            <FaInfinity />
          </span>
        ) : showTimer ? (
          <span
            className={[
              "tttStatusBar__timer",
              `tttStatusBar__timer--${timerLevel}`,
            ].join(" ")}
            aria-label={`Temps restant ${timeLeftSec} secondes`}
          >
            <FaStopwatch /> {timeLeftSec}s
          </span>
        ) : null}
      </div>
    </div>
  );
}
