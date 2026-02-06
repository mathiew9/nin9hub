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
    <div className="lobby-playersBlock lobby-commonBlock">
      <div className="lobby-commonTitle">
        <span className="lobby-colTitle--player">
          {t("common.labels.players")}
        </span>
        <span className="lobby-colTitle--role">{t("common.labels.role")}</span>
      </div>

      {/* Hôte */}
      <div className="lobby-playerRow commonBox lobby-playerRow--host">
        <div className="lobby-cell--player">
          <span className="lobby-dot online" />
          <span className="lobby-playerName">
            {t("common.players.host")}{" "}
            {isHost ? `(${t("common.players.you")})` : ""}
          </span>
        </div>
        <div className="lobby-cell--role">
          <span className={`lobby-role ${hostRoleClassname}`}>
            {hostRoleLabel.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Invité */}
      <div className="lobby-playerRow lobby-playerRow--guest commonBox">
        <div className="lobby-cell--player">
          <span
            className={`lobby-dot ${guestConnected ? "online" : "offline"}`}
          />
          <span className="lobby-playerName">
            {guestConnected
              ? isHost
                ? ` ${t("common.players.guest")}`
                : `${t("common.players.guest")} (${t("common.players.you")})`
              : `${t("common.status.waiting")}…`}
          </span>
        </div>

        {/* Opponent left */}
        <div className="lobby-cell--status">
          {opponentLeft && (
            <span className="lobby-miniAlert">
              {t("common.messages.yourOpponentHasLeftTheGame")}
            </span>
          )}
        </div>

        <div className="lobby-cell--role">
          <span
            className={`lobby-role ${
              guestConnected
                ? guestRoleClassname
                : `lobby-role--ghost ${guestRoleClassname}`
            }`}
          >
            {guestRoleLabel.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Footer Joueurs : hint + bouton swap */}
      <div className="lobby-playersBlockFooter">
        <div className="lobby-playersBlock-hint">{hint}</div>

        {isHost && (
          <button
            className="commonButton lobby-playersBlock-swapRolesBtn"
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
