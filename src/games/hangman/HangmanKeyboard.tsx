import { keyboardLayouts } from "./KeyboardLayouts";
import { useTranslation } from "react-i18next";

interface Props {
  guessedLetters: string[];
  onLetterClick: (letter: string) => void;
  disabled?: boolean;
}

export default function HangmanKeyboard({
  guessedLetters,
  onLetterClick,
  disabled = false,
}: Props) {
  const { i18n } = useTranslation();
  const lang = (i18n.language.split("-")[0] ??
    "en") as keyof typeof keyboardLayouts;

  const layout = keyboardLayouts[lang]?.rows;

  if (!layout) {
    return <p>Clavier non disponible pour cette langue : {lang}</p>;
  }

  return (
    <div className="hangmanKeyboard">
      {layout.map((row: string[], rowIndex: number) => (
        <div key={rowIndex} className="keyboardRow">
          {row.map((letter: string) => {
            const isGuessed = guessedLetters.includes(letter);

            return (
              <button
                key={letter}
                onClick={() => onLetterClick(letter)}
                disabled={isGuessed || disabled}
                className={`letterBtn ${isGuessed ? "guessed" : ""}`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
