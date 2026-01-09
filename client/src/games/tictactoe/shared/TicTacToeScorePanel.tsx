type PlayerSymbol = "X" | "O";

type ScorePlayer = {
  label: string; // "Joueur 1", "Vous", "Ordinateur", "Adversaire", etc.
  score: number;
  symbol?: PlayerSymbol | null; // optional badge
  highlight?: boolean; // optional (ex: current leader / winner)
};

type ScoreAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  className?: string; // lets you add mode-specific styling
};

type Props = {
  modeLabel?: string; // e.g. "En ligne", "Avec ami", "Avec IA"
  title?: string; // default: "Score"
  players: [ScorePlayer, ScorePlayer];

  roundsToWin?: number | null; // show "First to X" if provided

  actions?: ScoreAction[];

  className?: string;
};

export default function TicTacToeScorePanel({
  modeLabel,
  title = "Score",
  players,
  roundsToWin = null,
  actions = [],
  className = "",
}: Props) {
  const [p1, p2] = players;

  return (
    <div className={["tttScorePanel", className].filter(Boolean).join(" ")}>
      {/* Header */}
      <div className="tttScorePanel__header">
        {modeLabel ? (
          <div className="tttScorePanel__mode">{modeLabel}</div>
        ) : null}
        <div className="tttScorePanel__title">{title}</div>

        {typeof roundsToWin === "number" && roundsToWin > 0 ? (
          <div className="tttScorePanel__subtitle">
            Premier à <b>{roundsToWin}</b> manche{roundsToWin > 1 ? "s" : ""}
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
              className={["commonButton", "tttScorePanel__btn", a.className]
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
  const { label, score, symbol = null, highlight = false } = player;

  return (
    <div
      className={["tttScorePanel__row", highlight ? "is-highlight" : ""].join(
        " "
      )}
    >
      <div className="tttScorePanel__rowLeft">
        <span className="tttScorePanel__playerName">{label}</span>
        {symbol ? (
          <span
            className={`symbol-badge symbol-${symbol.toLowerCase()}`}
            aria-label={`Symbole ${symbol}`}
          >
            {symbol}
          </span>
        ) : null}
      </div>

      <div className="tttScorePanel__rowRight">
        <span className="tttScorePanel__score">{score}</span>
      </div>
    </div>
  );
}
