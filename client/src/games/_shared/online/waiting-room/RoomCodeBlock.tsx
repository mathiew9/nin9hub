import { useState } from "react";
import { useTranslation } from "react-i18next";

import "./WaitingRoom.css";

type Props = {
  roomId: string | null;
  isHost: boolean;
};

export default function RoomCodeBlock({ roomId, isHost }: Props) {
  const { t } = useTranslation();

  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!roomId) return;
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="lobby-roomCodeBlock lobby-commonBlock">
      <div className="lobby-commonTitle">{t("common.labels.roomCode")}</div>

      <div
        className={`lobby-roomCodeBox lobby-roomCodeBox--grid ${
          isHost ? "" : "lobby-roomCodeBox--readonly"
        }`}
      >
        <span className="lobby-roomCode">{roomId}</span>

        {isHost && (
          <button
            className="commonButton commonMenuButton lobby-btn"
            onClick={copy}
          >
            {copied
              ? t("common.status.copied") + " ✓"
              : t("common.actions.copy")}
          </button>
        )}
      </div>

      <div className="lobby-roomCodeBlock-hint">
        {isHost
          ? t("common.messages.shareThisCode")
          : t("common.labels.roomCode")}
      </div>
    </div>
  );
}
