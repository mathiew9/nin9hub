import { useTranslation } from "react-i18next";
import { FaCheckCircle, FaPauseCircle } from "react-icons/fa";
import { useEffect, useState } from "react";
import { Difficulty } from "./types";
import { loadGame, clearGame } from "../../utils/storage";
import type { StoredSudokuGame } from "./types";

type Props = {
  onStart: (level: Difficulty) => void;
};

export default function SudokuMenu({ onStart }: Props) {
  const { t } = useTranslation();
  const [dailyStatus, setDailyStatus] = useState<"done" | "inprogress" | null>(
    null
  );
  const [savedClassic, setSavedClassic] = useState<StoredSudokuGame | null>(
    null
  );
  const [pendingLevel, setPendingLevel] = useState<Difficulty | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const daily = loadGame<StoredSudokuGame>("ninehub.sudoku.daily");
    if (daily?.date === today) {
      setDailyStatus(daily.gameFinished ? "done" : "inprogress");
    }

    const classic = loadGame<StoredSudokuGame>("ninehub.sudoku.current");
    setSavedClassic(classic ?? null);
  }, []);

  const renderIcon = (status: "done" | "inprogress" | null) => {
    if (status === "done")
      return <FaCheckCircle className="sudoku-menu-icon" />;
    if (status === "inprogress")
      return <FaPauseCircle className="sudoku-menu-icon" />;
    return null;
  };

  const handleClick = (lvl: Difficulty) => {
    if (
      savedClassic &&
      !savedClassic.gameFinished &&
      savedClassic.level !== "daily" &&
      lvl !== savedClassic.level
    ) {
      setPendingLevel(lvl); // Show confirmation
    } else {
      onStart(lvl);
    }
  };

  return (
    <div className="commonMenu">
      <h2 className="commonMenuTitle">{t("common.selectDifficulty")}</h2>
      <div className="commonMenuButtons">
        <button
          className="commonButton commonMenuButton sudokuButtonOfTheDay"
          onClick={() => onStart("daily")}
        >
          <span className="sudoku-menu-button-content">
            {t("common.ofTheDay", { game: "Sudoku" })}
            {renderIcon(dailyStatus)}
          </span>
        </button>

        {(["easy", "medium", "hard"] as Difficulty[]).map((lvl) => (
          <button
            key={lvl}
            className="commonButton commonMenuButton"
            onClick={() => handleClick(lvl)}
          >
            <span className="sudoku-menu-button-content">
              {t(`common.${lvl}`)}
              {savedClassic &&
                !savedClassic.gameFinished &&
                savedClassic.level === lvl && (
                  <FaPauseCircle className="sudoku-menu-icon" />
                )}
            </span>
          </button>
        ))}
      </div>
      {pendingLevel && (
        <div className="sudoku-confirm-popup">
          <div className="sudoku-confirm-popup-content">
            <p>{t("sudoku.popupWarning1")}</p>
            <p>{t("sudoku.popupWarning2")}</p>
            <p>{t("sudoku.popupWarning3")}</p>
            <div className="sudoku-confirm-buttons">
              <button
                className="commonButton"
                onClick={() => setPendingLevel(null)}
              >
                {t("sudoku.cancel")}
              </button>
              <button
                className="commonButton"
                onClick={() => {
                  clearGame("sudoku.current");
                  onStart(pendingLevel);
                  setPendingLevel(null);
                }}
              >
                {t("sudoku.continue")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
