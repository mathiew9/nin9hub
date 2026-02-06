import { useTranslation } from "react-i18next";

type Props = {
  isHost: boolean;
  canStart: boolean;
  clearError: () => void;
  startGame: () => void;
  leave: () => void;
  lastError: { code: string; message: string } | null;
};

export default function ActionsBlock({
  isHost,
  canStart,
  clearError,
  startGame,
  leave,
  lastError,
}: Props) {
  const { t } = useTranslation();
  return (
    <>
      <div className="lobby-infos">
        {lastError && (
          <span className="lobby-alert error" onClick={clearError}>
            {lastError.message}
          </span>
        )}
      </div>

      <div className="lobby-actions">
        <button
          className="commonButton commonMenuButton lobby-btn"
          onClick={() => leave()}
        >
          {t("common.actions.leave")}
        </button>
        <button
          className={`commonButton commonMenuButton lobby-btn ${
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
    </>
  );
}
