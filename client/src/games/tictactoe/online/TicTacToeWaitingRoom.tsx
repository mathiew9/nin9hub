import { useState, useMemo } from "react";
import { useOnline } from "./TicTacToeOnlineProvider";
import { useTranslation } from "react-i18next";
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
  const hostConnected = true;
  const guestConnected = playersCount === 2;

  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!roomId) return;
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      <h3 className="commonMenuTitle">{t("tictactoe.waitingRoom")}</h3>

      {/* Bloc Code room */}
      <div className="ttt-wr-roomCodeBlock ttt-wr-commonBlock">
        <div className="ttt-wr-commonTitle">{t("common.roomCode")}</div>

        <div
          className={`ttt-wr-roomBox ttt-wr-roomBox--grid ${
            isHost ? "" : "ttt-wr-roomBox--readonly"
          }`}
        >
          <span className="ttt-wr-roomCode">{roomId}</span>

          {isHost && (
            <button
              className="commonButton commonMenuButton ttt-wr-btn"
              onClick={copy}
            >
              {copied ? t("common.copied") + " ✓" : t("common.copy")}
            </button>
          )}
        </div>

        <div className="ttt-wr-roomCodeBlock-hint">
          {isHost ? t("common.shareThisCode") : t("common.roomCode")}
        </div>
      </div>

      {/* Bloc Joueurs */}
      <div className="ttt-wr-playersBlock ttt-wr-commonBlock">
        <div className="ttt-wr-commonTitle ttt-wr-playersTitle">
          <span className="ttt-wr-colTitle ttt-wr-colTitle--player">
            {t("common.players")}
          </span>
          <span className="ttt-wr-colTitle ttt-wr-colTitle--role">
            {t("common.role")}
          </span>
        </div>

        {/* Hôte */}
        <div className="ttt-wr-playerRow commonBox ttt-wr-playerRow--host">
          <div className="ttt-wr-cell ttt-wr-cell--player">
            <span
              className={`ttt-wr-dot ${hostConnected ? "online" : "offline"}`}
            />
            <span className="ttt-wr-playerName">
              {t("common.labels.host")}{" "}
              {isHost ? `(${t("common.labels.you")})` : ""}
            </span>
          </div>
          <div className="ttt-wr-cell ttt-wr-cell--role">
            <span
              className={`ttt-wr-role ${
                hostRole === "X" ? "ttt-wr-role--x" : "ttt-wr-role--o"
              }`}
            >
              {hostRole}
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
                  ? ` ${t("common.labels.guest")}`
                  : `${t("common.labels.guest")} (${t("common.labels.you")})`
                : `${t("common.actions.waiting")}…`}
            </span>
          </div>

          {/* Opponent left */}
          <div className="ttt-wr-cell ttt-wr-cell--status">
            {opponentLeft && (
              <span className="ttt-wr-miniAlert">
                {t("common.yourOpponentHasLeftTheGame")}
              </span>
            )}
          </div>

          <div className="ttt-wr-cell ttt-wr-cell--role">
            <span
              className={`ttt-wr-role ${
                guestConnected
                  ? guestRole === "X"
                    ? "ttt-wr-role--x"
                    : "ttt-wr-role--o"
                  : "ttt-wr-role--ghost"
              }`}
            >
              {guestRole}
            </span>
          </div>
        </div>

        {/* Footer Joueurs : hint + bouton swap */}
        <div className="ttt-wr-playersFooter">
          <div className="ttt-wr-playersBlock-hint">
            {t("tictactoe.hints.XAlwaysGoesFirst")}
          </div>

          {isHost && (
            <button
              className="commonButton ttt-wr-swapRolesBtn"
              onClick={() => swapRolesNow()}
              disabled={!guestConnected}
              title="Inverser X ↔ O"
            >
              {t("tictactoe.actions.swapRoles")}
            </button>
          )}
        </div>
      </div>

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
                {t("common.labels.roundstoWin")}
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
                    <option value={0}>{t("common.labels.unlimited")}</option>
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
            : `${t("common.actions.waitingForHostToStart")}`}
        </button>
      </div>
    </div>
  );
}
