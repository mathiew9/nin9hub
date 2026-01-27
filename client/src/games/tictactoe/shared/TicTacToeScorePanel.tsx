import { useTranslation } from "react-i18next";
import { FaRegHandPointLeft } from "react-icons/fa";
import { FaTrophy } from "react-icons/fa";

type PlayerSymbol = "X" | "O";

type ScorePlayer = {
  label: string;
  score: number;
  symbol?: PlayerSymbol | null;
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

export default function TicTacToeScorePanel({
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
    <div className={["tttScorePanel", className].filter(Boolean).join(" ")}>
      {/* Header */}
      <div
        className={[
          "tttScorePanel__header",
          typeof roundsToWin === "number" && roundsToWin > 0
            ? "has-rounds"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="tttScorePanel__titleRow">
          <div className="tttScorePanel__title">{resolvedTitle}</div>

          {modeLabel ? (
            <span className="tttScorePanel__modeBadge">
              {getMode(modeLabel)}
            </span>
          ) : null}
        </div>

        {typeof roundsToWin === "number" && roundsToWin > 0 ? (
          <div className="tttScorePanel__subtitle">
            {t("games.tictactoe.plural.firstToRounds", {
              count: Number(roundsToWin),
            })}
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="tttScorePanel__body">
        <ScoreRow player={p1} />
        <ScoreRow player={p2} />
      </div>

      {/* Footer */}
      {actions.length > 0 ? (
        <div className="tttScorePanel__footer">
          {actions.map((a, idx) => (
            <button
              key={`${a.label}-${idx}`}
              className={[
                "commonButton",
                "commonMediumButton",
                "tttScorePanel__btn",
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
  const { label, score, symbol = null, isTurn, matchWinner = false } = player;

  return (
    <div className={`tttScorePanel__row ${matchWinner ? "is-highlight" : ""}`}>
      <div className="tttScorePanel__rowLeft">
        {symbol && (
          <span className={`symbol-badge symbol-${symbol.toLowerCase()}`}>
            {symbol}
          </span>
        )}

        <span className="tttScorePanel__playerName">
          {label}
          {isTurn && (
            <span
              className="tttScorePanel__turnIcon tttScorePanel__icon"
              title="C'est son tour"
            >
              <FaRegHandPointLeft />
            </span>
          )}
          {matchWinner && (
            <span
              className="tttScorePanel__matchWinnerIcon tttScorePanel__icon"
              title="Vainqueur du match"
            >
              <FaTrophy />
            </span>
          )}
        </span>
      </div>

      <div className="tttScorePanel__rowRight">
        <span className="tttScorePanel__score">{score}</span>
      </div>
    </div>
  );
}
