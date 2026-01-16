import { useTranslation } from "react-i18next";

interface Props {
  onSelectMode: (mode: "ai" | "friend") => void;
}

export default function Connect4Menu({ onSelectMode }: Props) {
  const { t } = useTranslation();

  return (
    <div className="commonMenu">
      <h2 className="commonMenuTitle">{t("common.modes.selectGameMode")}</h2>

      <div className="commonMenuButtons">
        <button
          className="commonButton commonMenuButton"
          onClick={() => onSelectMode("friend")}
        >
          {t("common.modes.playWithFriend")}
        </button>
        <button
          className="commonButton commonMenuButton"
          onClick={() => onSelectMode("ai")}
        >
          {t("common.modes.playWithAi")}
        </button>
      </div>
    </div>
  );
}
