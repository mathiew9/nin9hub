import "./Connect4Menu.css";
import { useTranslation } from "react-i18next";

interface Props {
  onSelectMode: (mode: "ai" | "friend") => void;
}

export default function Connect4Menu({ onSelectMode }: Props) {
  const { t } = useTranslation();

  return (
    <div className="menuContainer">
      <h2>{t("general.selectgamemode")}</h2>

      <div className="selectModeButtonContainer">
        <button
          className="selectModeButton"
          onClick={() => onSelectMode("friend")}
        >
          {t("general.playwithfriend")}
        </button>
        <button className="selectModeButton" onClick={() => onSelectMode("ai")}>
          {t("general.playwithai")}
        </button>
      </div>
    </div>
  );
}
