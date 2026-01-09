import { useState } from "react";
import { useOnline } from "./TicTacToeOnlineProvider";
import { useTranslation } from "react-i18next";

type Props = {
  onBack: () => void;
};

export default function TicTacToeOnlineSetup({ onBack }: Props) {
  const { t } = useTranslation();
  const { createRoom, joinRoom, lastError, clearError, roomId, status, leave } =
    useOnline();
  const [code, setCode] = useState("");

  const onCreate = async () => {
    clearError();
    await createRoom();
  };

  const onJoin = async () => {
    clearError();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) await joinRoom(trimmed);
  };

  const handleBack = async () => {
    // safe: even if not in a room, leave() resets local state
    await leave();
    onBack();
  };

  return (
    <div className="commonMenu">
      <h2 className="commonMenuTitle">{t("tictactoe.onlineTitle")}</h2>

      <div className="commonMenuButtons">
        <div className="ttt-online-joinRoom">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("common.roomCode")}
            className="multiInput"
            onFocus={clearError}
          />
          <button className="commonButton commonMenuButton" onClick={onJoin}>
            {t("common.join")}
          </button>
        </div>
        <button className="commonButton commonMenuButton" onClick={onCreate}>
          {t("common.hostGame")}
        </button>
        <button
          className="commonButton commonMenuButton ttt-online-backBtn"
          onClick={handleBack}
        >
          {t("common.back")}
        </button>
      </div>

      {lastError && (
        <div className="text-red-600 text-sm">{lastError.message}</div>
      )}

      {roomId && status === "waiting" && (
        <div className="text-gray-600 text-sm">Room créée : {roomId}</div>
      )}
    </div>
  );
}
