import { useMemo } from "react";
import { useOnline } from "./Connect4OnlineProvider";
import { useTranslation } from "react-i18next";

import RoomCodeBlock from "../../_shared/online/waiting-room/RoomCodeBlock";
import PlayersBlock from "../../_shared/online/waiting-room/PlayersBlock";

import "../../tictactoe/online/TicTacToeWR.css";

type Player = "red" | "yellow";
function otherRole(r: Player): Player {
  return r === "red" ? "yellow" : "red";
}

export default function Connect4WaitingRoom() {
  const {
    roomId,
    role,
    playersCount,
    opponentLeft,
    lastError,
    clearError,
    startGame,
    leave,
    isHost,
    settings,
    updateSettings,
    swapRolesNow,
  } = useOnline();

  const { t } = useTranslation();
  const canStart = isHost && playersCount === 2;

  // Qui est "host color" vs "guest color"
  const hostRole: Player = useMemo(() => {
    if (role) return isHost ? (role as Player) : otherRole(role as Player);
    return "red";
  }, [role, isHost]);

  const guestRole: Player = hostRole === "red" ? "yellow" : "red";
  const guestConnected = playersCount === 2;

  // Seulement les 2 settings que tu veux exposer
  const rounds = settings?.roundsToWin ?? 1;
  const tms = settings?.turnTimeMs ?? 0;

  const disabled = !isHost;

  const applyRounds = async (v: number) => {
    const roundsToWin = Math.max(1, Math.min(10, Math.floor(v)));
    await updateSettings({ roundsToWin });
  };

  const applyTurnMs = async (v: number) => {
    const ms = Math.max(0, Math.floor(v));
    await updateSettings({ turnTimeMs: ms });
  };

  // Petit helper UI pour afficher les couleurs dans la colonne "role"
  const roleLabel = (p: Player) =>
    p === "red"
      ? t("games.connect4.colors.red")
      : t("games.connect4.colors.yellow");

  return (
    <div className="commonMenu ttt-wr-container">
      <h3 className="commonMenuTitle">{t("common.labels.waitingRoom")}</h3>

      {/* Bloc Code room */}
      <RoomCodeBlock roomId={roomId} isHost={isHost} />

      {/* Bloc Joueurs */}
      <PlayersBlock
        isHost={isHost}
        guestConnected={guestConnected}
        opponentLeft={opponentLeft}
        hostRoleLabel={roleLabel(hostRole)}
        hostRoleClassname={`connect4Badge ${
          hostRole === "red" ? "connect4RedBadge" : "connect4YellowBadge"
        }`}
        guestRoleLabel={roleLabel(guestRole)}
        guestRoleClassname={`connect4Badge ${
          guestRole === "red" ? "connect4RedBadge" : "connect4YellowBadge"
        }`}
        swapRolesNowLabel={t("games.connect4.actions.swapColors")}
        swapRolesNow={swapRolesNow}
        hint={t("games.connect4.hints.redAlwaysGoesFirst")}
      />

      {/* —— Bloc Paramètres —— */}
      <div className="ttt-wr-settingsBlock ttt-wr-commonBlock">
        <div className="ttt-wr-commonTitle ttt-wr-settingsTitle">
          {t("common.labels.settings")}{" "}
        </div>

        <div className="ttt-wr-settings commonBox">
          <div className="ttt-wr-settingsTable">
            {/* Ligne labels */}
            <div className="ttt-wr-settingsRow ttt-wr-settingsRow--labels">
              <div className="ttt-wr-settingsCell">
                {t("common.labels.roundsToWin")}
              </div>
              <div className="ttt-wr-settingsCell">
                {t("common.labels.turnTime")}
              </div>
            </div>

            {/* Ligne contrôles */}
            <div className="ttt-wr-settingsRow ttt-wr-settingsRow--controls">
              {/* Manches */}
              <div className="ttt-wr-settingsCell ttt-wr-settingsCell--control">
                {isHost ? (
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={rounds}
                    disabled={disabled}
                    onChange={(e) => applyRounds(Number(e.target.value))}
                    className="ttt-wr-field ttt-wr-input"
                  />
                ) : (
                  <div className="ttt-wr-pillValue">{rounds}</div>
                )}
              </div>

              {/* Temps par tour */}
              <div className="ttt-wr-settingsCell ttt-wr-settingsCell--control">
                {isHost ? (
                  <select
                    value={tms}
                    disabled={disabled}
                    onChange={(e) => applyTurnMs(Number(e.target.value))}
                    className="ttt-wr-field ttt-wr-select"
                  >
                    <option value={0}>{t("common.status.unlimited")}</option>
                    <option value={10_000}>10 s</option>
                    <option value={20_000}>20 s</option>
                    <option value={30_000}>30 s</option>
                    <option value={45_000}>45 s</option>
                    <option value={60_000}>60 s</option>
                  </select>
                ) : (
                  <div className="ttt-wr-pillValue">
                    {tms === 0
                      ? t("common.status.unlimited")
                      : `${tms / 1000} s`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bloc Infos */}
      <div className="ttt-wr-badgesRow">
        {lastError && (
          <span className="wr-alert error" onClick={clearError}>
            {lastError.message}
          </span>
        )}
      </div>

      {/* Bloc Actions */}
      <div className="ttt-wr-actions">
        <button
          className="commonButton commonMenuButton ttt-wr-btn"
          onClick={() => leave()}
        >
          {t("common.actions.leave")}
        </button>

        <button
          className={`commonButton commonMenuButton ttt-wr-btn ${
            isHost ? (canStart ? "" : "is-disabled") : "is-disabled"
          }`}
          onClick={() => {
            if (isHost && canStart) {
              clearError();
              startGame();
            }
          }}
          disabled={!isHost || !canStart}
        >
          {isHost
            ? `${t("common.actions.startGame")}`
            : `${t("common.status.waitingForHostToStart")}`}
        </button>
      </div>
    </div>
  );
}
