import { useTranslation } from "react-i18next";

import "./WaitingRoom.css";

type Props = {
  isHost: boolean;
  guestConnected: boolean;
  opponentLeft: boolean;
  hostRoleLabel: string;
  hostRoleClassname: string;
  guestRoleLabel: string;
  guestRoleClassname: string;
  swapRolesNowLabel?: string;
  swapRolesNow: () => void;
  hint?: string;
};

export default function PlayersBlock({
  isHost,
  guestConnected,
  opponentLeft,
  hostRoleLabel,
  hostRoleClassname,
  guestRoleLabel,
  guestRoleClassname,
  swapRolesNowLabel,
  swapRolesNow,
  hint,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="ttt-wr-playersBlock ttt-wr-commonBlock">
      <div className="ttt-wr-commonTitle ttt-wr-playersTitle">
        <span className="ttt-wr-colTitle ttt-wr-colTitle--player">
          {t("common.labels.players")}
        </span>
        <span className="ttt-wr-colTitle ttt-wr-colTitle--role">
          {t("common.labels.role")}
        </span>
      </div>

      {/* Hôte */}
      <div className="ttt-wr-playerRow commonBox ttt-wr-playerRow--host">
        <div className="ttt-wr-cell ttt-wr-cell--player">
          <span className="ttt-wr-dot online" />
          <span className="ttt-wr-playerName">
            {t("common.players.host")}{" "}
            {isHost ? `(${t("common.players.you")})` : ""}
          </span>
        </div>
        <div className="ttt-wr-cell ttt-wr-cell--role">
          <span className={`ttt-wr-role ${hostRoleClassname}`}>
            {hostRoleLabel.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Invité */}
      <div className="ttt-wr-playerRow ttt-wr-playerRow--guest commonBox">
        <div className="ttt-wr-cell ttt-wr-cell--player">
          <span
            className={`ttt-wr-dot ${guestConnected ? "online" : "offline"}`}
          />
          <span className="ttt-wr-playerName">
            {guestConnected
              ? isHost
                ? ` ${t("common.players.guest")}`
                : `${t("common.players.guest")} (${t("common.players.you")})`
              : `${t("common.status.waiting")}…`}
          </span>
        </div>

        {/* Opponent left */}
        <div className="ttt-wr-cell ttt-wr-cell--status">
          {opponentLeft && (
            <span className="ttt-wr-miniAlert">
              {t("common.messages.yourOpponentHasLeftTheGame")}
            </span>
          )}
        </div>

        <div className="ttt-wr-cell ttt-wr-cell--role">
          <span
            className={`ttt-wr-role ${
              guestConnected
                ? guestRoleClassname
                : `ttt-wr-role--ghost ${guestRoleClassname}`
            }`}
          >
            {guestRoleLabel.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Footer Joueurs : hint + bouton swap */}
      <div className="ttt-wr-playersFooter">
        <div className="ttt-wr-playersBlock-hint">{hint}</div>

        {isHost && (
          <button
            className="commonButton ttt-wr-swapRolesBtn"
            onClick={() => swapRolesNow()}
            disabled={!guestConnected}
            title="Inverser X ↔ O"
          >
            {swapRolesNowLabel ?? t("games.tictactoe.actions.swapRoles")}
          </button>
        )}
      </div>
    </div>
  );
}
