import { useTranslation } from "react-i18next";
import { FaRegHandPointLeft } from "react-icons/fa";
import { FaTrophy } from "react-icons/fa";

import "./GameScorePanel.css";

type ScorePlayer = {
  label: string;
  score: number;
  badge?: string | null;
  isTurn?: boolean;
  matchWinner?: boolean;
};

type ScoreAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
};

type Props = {
  modeLabel?: string;
  title?: string;
  players: [ScorePlayer, ScorePlayer];
  roundsToWin?: number | null;
  actions?: ScoreAction[];
  className?: string;
};

export default function GameScorePanel({
  modeLabel,
  title,
  players,
  roundsToWin = null,
  actions = [],
  className = "",
}: Props) {
  const { t } = useTranslation();
  const [p1, p2] = players;
  const resolvedTitle = title ?? t("common.labels.score");

  const getMode = (modeLabel: string) => {
    switch (modeLabel) {
      case "online":
        return t("common.modes.online");
      case "friend":
        return t("common.modes.withfriend");
      case "ai":
        return t("common.modes.withai");
      default:
        return modeLabel;
    }
  };

  return (
    <div className={["scorePanel", className].filter(Boolean).join(" ")}>
      {/* Header */}
      <div
        className={[
          "scorePanel__header",
          typeof roundsToWin === "number" && roundsToWin > 0
            ? "has-rounds"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="scorePanel__titleRow">
          <div className="scorePanel__title">{resolvedTitle}</div>

          {modeLabel ? (
            <span className="scorePanel__modeBadge">{getMode(modeLabel)}</span>
          ) : null}
        </div>

        {typeof roundsToWin === "number" && roundsToWin > 0 ? (
          <div className="scorePanel__subtitle">
            {t("games.tictactoe.plural.firstToRounds", {
              count: Number(roundsToWin),
            })}
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="scorePanel__body">
        <ScoreRow player={p1} />
        <ScoreRow player={p2} />
      </div>

      {/* Footer */}
      {actions.length > 0 ? (
        <div className="scorePanel__footer">
          {actions.map((a, idx) => (
            <button
              key={`${a.label}-${idx}`}
              className={[
                "commonButton",
                "commonMediumButton",
                "scorePanel__btn",
                a.className,
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={a.onClick}
              disabled={!!a.disabled}
              title={a.title}
              type="button"
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ScoreRow({ player }: { player: ScorePlayer }) {
  const { t } = useTranslation();
  const { label, score, badge = null, isTurn, matchWinner = false } = player;

  return (
    <div className={`scorePanel__row ${matchWinner ? "is-highlight" : ""}`}>
      <div className="scorePanel__rowLeft">
        {badge && (
          <span
            className={`statusBar__roleBadge statusBar__roleBadge-${badge.toLowerCase()}`}
          >
            {badge === "red" || badge === "yellow"
              ? t(`games.connect4.colors.${badge}`)
              : badge}
          </span>
        )}

        <span className="scorePanel__playerName">
          {label}
          {isTurn && (
            <span
              className="scorePanel__turnIcon scorePanel__icon"
              title="C'est son tour"
            >
              <FaRegHandPointLeft />
            </span>
          )}
          {matchWinner && (
            <span
              className="scorePanel__matchWinnerIcon scorePanel__icon"
              title="Vainqueur du match"
            >
              <FaTrophy />
            </span>
          )}
        </span>
      </div>

      <div className="scorePanel__rowRight">
        <span className="scorePanel__score">{score}</span>
      </div>
    </div>
  );
}
