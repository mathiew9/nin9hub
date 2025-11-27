import { FaInfinity, FaCalendarAlt } from "react-icons/fa";
import { useTranslation } from "react-i18next";
interface Props {
  onSelectMode: (mode: "infinite" | "daily") => void;
}

export default function HangmanMenu({ onSelectMode }: Props) {
  const { t } = useTranslation();
  return (
    <div className="commonMenu">
      <h2 className="commonMenuTitle">{t("common.selectgamemode")}</h2>
      <div className="commonMenuButtons">
        <button
          className="commonButton commonMenuButton"
          onClick={() => onSelectMode("daily")}
        >
          <FaCalendarAlt /> {t("common.ofTheDay", { game: "Hangman" })}
        </button>
        <button
          className="commonButton commonMenuButton"
          onClick={() => onSelectMode("infinite")}
        >
          <FaInfinity /> {t("hangman.infiniteMode")}
        </button>
      </div>
    </div>
  );
}
