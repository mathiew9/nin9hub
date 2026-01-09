import { FaStopwatch } from "react-icons/fa";

type PlayerSymbol = "X" | "O";

type Props = {
  leftText?: string;
  leftSymbol?: PlayerSymbol | null;

  centerText: string;
  timeSec?: number | null;
  isInfinite?: boolean;

  state?: "playing" | "won" | "draw";
  className?: string;
};

function getTimerLevel(timeLeftSec: number): "ok" | "warn" | "danger" {
  if (timeLeftSec <= 2) return "danger";
  if (timeLeftSec <= 5) return "warn";
  return "ok";
}

function formatMMSS(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TicTacToeStatusBar({
  leftText,
  leftSymbol = null,
  centerText,
  timeSec = null,
  isInfinite = false,
  state = "playing",
  className = "",
}: Props) {
  const hasTime = typeof timeSec === "number" && Number.isFinite(timeSec);

  const timerLevel =
    hasTime && !isInfinite ? getTimerLevel(timeSec) : ("ok" as const);

  return (
    <div
      className={["tttStatusBar", `tttStatusBar--${state}`, className]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live={state === "playing" ? "polite" : "off"}
    >
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

      <div className="tttStatusBar__center">
        <span className="tttStatusBar__centerText">{centerText}</span>
      </div>

      <div className="tttStatusBar__right">
        {hasTime ? (
          <span
            className={[
              "tttStatusBar__timer",
              isInfinite
                ? "tttStatusBar__timer--infinite"
                : `tttStatusBar__timer--${timerLevel}`,
            ].join(" ")}
            aria-label={
              isInfinite
                ? `Temps écoulé ${formatMMSS(timeSec)}`
                : `Temps restant ${formatMMSS(timeSec)}`
            }
          >
            <FaStopwatch className="timerIcon" /> {formatMMSS(timeSec)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
