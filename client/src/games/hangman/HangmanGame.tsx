import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import HangmanDrawing from "./HangmanDrawing";
import HangmanKeyboard from "./HangmanKeyboard";
import { getWord } from "./HangmanUtils";
import type { HangmanLang } from "./words"; // adapte le chemin si besoin

interface Props {
  mode: "infinite" | "daily";
  onBack: () => void;
}

function resolveHangmanLang(i18nLang: string): HangmanLang {
  const l = (i18nLang || "").toLowerCase();
  if (l.startsWith("fr")) return "fr";
  if (l.startsWith("es")) return "es";
  return "en";
}

export default function HangmanGame({ mode, onBack }: Props) {
  const { t, i18n } = useTranslation();
  const lang = useMemo(
    () => resolveHangmanLang(i18n.language),
    [i18n.language]
  );

  const [word, setWord] = useState(() => getWord(mode, lang));
  const [guesses, setGuesses] = useState<string[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);

  const handleLetterClick = (letter: string) => {
    if (guesses.includes(letter) || wrongGuesses.includes(letter)) return;
    if (isWon || isLost) return;

    if (word.includes(letter)) {
      setGuesses((prev) => [...prev, letter]);
    } else {
      setWrongGuesses((prev) => [...prev, letter]);
    }
  };

  const resetGame = () => {
    setWord(getWord(mode, lang));
    setGuesses([]);
    setWrongGuesses([]);
  };

  const isWon = word.split("").every((l) => guesses.includes(l));
  const isLost = wrongGuesses.length >= 6;

  return (
    <div className="hangmanGame">
      <div className="hangmanControls">
        <button className="btn-back" onClick={onBack} type="button">
          ← {t("common.actions.back")}
        </button>

        {mode === "infinite" && (
          <button className="btn-restart" onClick={resetGame} type="button">
            ↻ {t("common.actions.playAgain")}
          </button>
        )}
      </div>

      <HangmanDrawing errors={wrongGuesses.length} />

      <div className="hangmanWord">
        {word.split("").map((letter, idx) => (
          <span key={idx}>
            {guesses.includes(letter) || isLost ? letter : ""}
          </span>
        ))}
      </div>

      <HangmanKeyboard
        guessedLetters={[...guesses, ...wrongGuesses]}
        onLetterClick={handleLetterClick}
        disabled={isWon || isLost}
        wrongLetters={wrongGuesses}
      />
    </div>
  );
}
