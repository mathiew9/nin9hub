import { useMemo } from "react";
import { useOnline } from "./TicTacToeOnlineProvider";
import { useTranslation } from "react-i18next";

import RoomCodeBlock from "../../_shared/online/waiting-room/RoomCodeBlock";
import PlayersBlock from "../../_shared/online/waiting-room/PlayersBlock";
import SettingsBlock from "../../_shared/online/waiting-room/SettingsBlock";

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
      <SettingsBlock
        isHost={isHost}
        fields={[
          {
            key: "gridSize",
            label: t("common.labels.gridSize"),
            type: "select",
            value: gs,
            options: [
              { value: 3, label: "3×3" },
              { value: 4, label: "4×4" },
              { value: 5, label: "5×5" },
            ],
            onChange: (v) => applyGrid(Number(v)),
            disabled: disabled,
            readOnlyValue: `${gs}×${gs}`,
          },
          {
            key: "roundsToWin",
            label: t("common.labels.roundsToWin"),
            type: "number",
            value: rounds,
            min: 1,
            max: 5,
            step: 1,
            onChange: applyRounds,
            disabled: disabled,
            readOnlyValue: String(rounds),
          },
          {
            key: "swapRolesOnRematch",
            label: t("common.labels.swapRolesOnRematch"),
            type: "toggle",
            value: swap,
            onChange: (v) => applySwap(v),
            disabled: disabled,
            readOnlyValue: String(swap),
          },
          {
            key: "turnTimeMs",
            label: t("common.labels.turnTime"),
            type: "select",
            value: tms,
            options: [
              { value: 0, label: t("common.status.unlimited") },
              { value: 10_000, label: "10 s" },
              { value: 20_000, label: "20 s" },
              { value: 30_000, label: "30 s" },
            ],
            onChange: (v) => applyTurnMs(Number(v)),
            disabled: disabled,
            readOnlyValue:
              tms === 0 ? t("common.status.unlimited") : `${tms / 1000} s`,
          },
        ]}
      />

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
