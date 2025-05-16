import { useState } from "react";
import HangmanDrawing from "./HangmanDrawing";
import HangmanKeyboard from "./HangmanKeyboard";
import { getWord } from "./HangmanUtils";

interface Props {
  mode: "infinite" | "daily";
}

export default function HangmanGame({ mode }: Props) {
  const [word] = useState(() => getWord(mode));
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

  const isWon = word.split("").every((l) => guesses.includes(l));
  const isLost = wrongGuesses.length >= 6;

  const displayWord = word
    .split("")
    .map((letter) => (guesses.includes(letter) || isLost ? letter : "_"))
    .join(" ");

  return (
    <div className="hangmanGame">
      <HangmanDrawing errors={wrongGuesses.length} />

      <p className="hangmanWord">{displayWord}</p>
      <p className="hangmanErrors">Erreurs : {wrongGuesses.join(", ")}</p>

      {isWon && <p className="win">Bravo, tu as trouvé le mot ! 🎉</p>}
      {isLost && <p className="lose">Perdu ! Le mot était : {word}</p>}

      <HangmanKeyboard
        guessedLetters={[...guesses, ...wrongGuesses]}
        onLetterClick={handleLetterClick}
        disabled={isWon || isLost}
      />
    </div>
  );
}
