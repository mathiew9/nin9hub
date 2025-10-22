import { useState } from "react";
import HangmanDrawing from "./HangmanDrawing";
import HangmanKeyboard from "./HangmanKeyboard";
import { getWord } from "./HangmanUtils";

interface Props {
  mode: "infinite" | "daily";
  onBack: () => void;
}

export default function HangmanGame({ mode, onBack }: Props) {
  const [word, setWord] = useState(() => getWord(mode));
  const [guesses, setGuesses] = useState<string[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);

  const handleLetterClick = (letter: string) => {
    if (guesses.includes(letter) || wrongGuesses.includes(letter)) return;

    if (word.includes(letter)) {
      setGuesses((prev) => [...prev, letter]);
    } else {
      setWrongGuesses((prev) => [...prev, letter]);
    }
  };

  const resetGame = () => {
    setWord(getWord(mode));
    setGuesses([]);
    setWrongGuesses([]);
  };

  const isWon = word.split("").every((l) => guesses.includes(l));
  const isLost = wrongGuesses.length >= 6;

  return (
    <div className="hangmanGame">
      <div className="hangmanControls">
        <button className="btn-back" onClick={onBack}>
          ← Retour
        </button>
        {mode === "infinite" && (
          <button className="btn-restart" onClick={resetGame}>
            ↻ Recommencer
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
