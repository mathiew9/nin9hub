import { Difficulty } from "./types";
import { useTranslation } from "react-i18next";

type Props = {
  onStart: (level: Difficulty) => void;
};

export default function SudokuMenu({ onStart }: Props) {
  const { t } = useTranslation();
  return (
    <div className="commonMenu">
      <h2 className="commonMenuTitle">{t("common.selectDifficulty")}</h2>
      <div className="commonMenuButtons">
        <button
          className="commonButton commonMenuButton sudokuButtonOfTheDay"
          // onClick={() => onStart("daily")}
        >
          {t("common.ofTheDay", { game: "Sudoku" })}
        </button>
        <button
          className="commonButton commonMenuButton"
          onClick={() => onStart("easy")}
        >
          {t("common.easy")}
        </button>
        <button
          className="commonButton commonMenuButton"
          onClick={() => onStart("medium")}
        >
          {t("common.medium")}
        </button>
        <button
          className="commonButton commonMenuButton"
          onClick={() => onStart("hard")}
        >
          {t("common.hard")}
        </button>
      </div>
    </div>
  );
}
