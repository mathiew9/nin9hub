import { FaStopwatch } from "react-icons/fa";

import { useTranslation } from "react-i18next";

import "./GameStatusBar.css";

type Props = {
  leftText?: React.ReactNode | null;
  leftBadge?: React.ReactNode | null;

  centerText: string | null;
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

export default function GameStatusBar({
  leftText,
  leftBadge = null,
  centerText,
  timeSec = null,
  isInfinite = false,
  state = "playing",
  className = "",
}: Props) {
  const { t } = useTranslation();

  // Timer related
  const hasTime = typeof timeSec === "number" && Number.isFinite(timeSec);
  const timerLevel =
    hasTime && !isInfinite ? getTimerLevel(timeSec) : ("ok" as const);

  return (
    <div
      className={["statusBar", className].filter(Boolean).join(" ")}
      role="status"
      aria-live={state === "playing" ? "polite" : "off"}
    >
      <div className="statusBar__left">
        {(leftText || leftBadge) && (
          <div className="statusBar__leftInner">
            {leftText && (
              <span className="statusBar__leftLabel">{leftText}</span>
            )}
            {leftBadge && (
              <span
                className={`statusBar__roleBadge statusBar__roleBadge-${leftBadge}`}
                aria-label={`Badge ${leftBadge}`}
              >
                {leftBadge === "red" || leftBadge === "yellow"
                  ? t(`games.connect4.colors.${leftBadge}`)
                  : leftBadge}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="statusBar__center">
        <span className="statusBar__centerText">{centerText}</span>
      </div>

      <div className="statusBar__right">
        {hasTime ? (
          <span
            className={[
              "statusBar__timer",
              isInfinite
                ? "statusBar__timer--infinite"
                : `statusBar__timer--${timerLevel}`,
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
