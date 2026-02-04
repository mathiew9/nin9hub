import { useMemo } from "react";
import { useOnline } from "./TicTacToeOnlineProvider";
import { useTranslation } from "react-i18next";

import RoomCodeBlock from "../../_shared/online/waiting-room/RoomCodeBlock";
import PlayersBlock from "../../_shared/online/waiting-room/PlayersBlock";

import "./TicTacToeWR.css";

type Player = "X" | "O";
function otherRole(r: Player): Player {
  return r === "X" ? "O" : "X";
}

export default function TicTacToeWaitingRoom() {
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

  const hostRole: Player = useMemo(() => {
    if (role) return isHost ? role : otherRole(role);
    return "X";
  }, [role, isHost]);

  const guestRole: Player = hostRole === "X" ? "O" : "X";
  const guestConnected = playersCount === 2;

  // Helpers pour UI settings
  const gs = settings?.gridSize ?? 3;
  const rounds = settings?.roundsToWin ?? 1;
  const tms = settings?.turnTimeMs ?? 0;
  const swap = !!settings?.swapRolesOnRematch;

  const disabled = !isHost;

  const applyGrid = async (v: number) => {
    const gridSize = Math.max(3, Math.min(5, Math.floor(v)));
    await updateSettings({ gridSize });
  };
  const applyRounds = async (v: number) => {
    const roundsToWin = Math.max(1, Math.min(5, Math.floor(v)));
    await updateSettings({ roundsToWin });
  };
  const applySwap = async (v: boolean) => {
    await updateSettings({ swapRolesOnRematch: v });
  };
  const applyTurnMs = async (v: number) => {
    const ms = Math.max(0, Math.floor(v));
    await updateSettings({ turnTimeMs: ms });
  };

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
        hostRoleLabel={hostRole}
        hostRoleClassname={
          hostRole === "X" ? "ttt-wr-role--x" : "ttt-wr-role--o"
        }
        guestRoleLabel={guestRole}
        guestRoleClassname={
          guestRole === "X" ? "ttt-wr-role--x" : "ttt-wr-role--o"
        }
        swapRolesNowLabel={t("games.tictactoe.actions.swapRoles")}
        swapRolesNow={swapRolesNow}
        hint={t("games.tictactoe.hints.XAlwaysGoesFirst")}
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
                {t("common.labels.gridSize")}
              </div>
              <div className="ttt-wr-settingsCell">
                {t("common.labels.roundsToWin")}
              </div>
              <div className="ttt-wr-settingsCell">
                {t("common.labels.swapRolesOnRematch")}
              </div>
              <div className="ttt-wr-settingsCell">
                {t("common.labels.turnTime")}
              </div>
            </div>

            {/* Ligne contrôles */}
            <div className="ttt-wr-settingsRow ttt-wr-settingsRow--controls">
              {/* Taille de grille */}
              <div className="ttt-wr-settingsCell ttt-wr-settingsCell--control">
                {isHost ? (
                  <select
                    value={gs}
                    disabled={disabled}
                    onChange={(e) => applyGrid(Number(e.target.value))}
                    className="ttt-wr-field ttt-wr-select "
                  >
                    <option value={3}>3×3</option>
                    <option value={4}>4×4</option>
                    <option value={5}>5×5</option>
                  </select>
                ) : (
                  <div className="ttt-wr-pillValue">
                    {gs}×{gs}
                  </div>
                )}
              </div>

              {/* Manches */}
              <div className="ttt-wr-settingsCell ttt-wr-settingsCell--control">
                {isHost ? (
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={rounds}
                    disabled={disabled}
                    onChange={(e) => applyRounds(Number(e.target.value))}
                    className="ttt-wr-field ttt-wr-input"
                  />
                ) : (
                  <div className="ttt-wr-pillValue">{rounds}</div>
                )}
              </div>

              {/* Swap rôles au rematch */}
              <div className="ttt-wr-settingsCell ttt-wr-settingsCell--control">
                <label className="ttt-wr-toggle">
                  <input
                    type="checkbox"
                    checked={swap}
                    disabled={disabled}
                    onChange={(e) => applySwap(e.target.checked)}
                  />
                  <span className="ttt-wr-toggleTrack">
                    <span className="ttt-wr-toggleThumb" />
                  </span>
                </label>
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
                  </select>
                ) : (
                  <div className="ttt-wr-pillValue">
                    {tms === 0 ? "Illimité" : `${tms / 1000} s`}
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
