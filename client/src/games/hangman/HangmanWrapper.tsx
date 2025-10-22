import { useState } from "react";
import HangmanMenu from "./HangmanMenu";
import HangmanGame from "./HangmanGame";
import "./Hangman.css";

export type HangmanMode = "infinite" | "daily";

export default function HangmanWrapper() {
  const [mode, setMode] = useState<HangmanMode | null>(null);

  return mode ? (
    <HangmanGame mode={mode} onBack={() => setMode(null)} />
  ) : (
    <HangmanMenu onSelectMode={setMode} />
  );
}
