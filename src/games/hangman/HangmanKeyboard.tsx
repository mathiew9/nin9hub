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
  const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");

  return (
    <div className="hangmanKeyboard">
      {alphabet.map((letter) => {
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
  );
}
