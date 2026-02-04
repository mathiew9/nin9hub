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
    <div className="ttt-wr-roomCodeBlock ttt-wr-commonBlock">
      <div className="ttt-wr-commonTitle">{t("common.labels.roomCode")}</div>

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
            {copied
              ? t("common.status.copied") + " ✓"
              : t("common.actions.copy")}
          </button>
        )}
      </div>

      <div className="ttt-wr-roomCodeBlock-hint">
        {isHost
          ? t("common.messages.shareThisCode")
          : t("common.labels.roomCode")}
      </div>
    </div>
  );
}
