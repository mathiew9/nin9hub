import { useState } from "react";
import HangmanMenu from "./HangmanMenu";
import HangmanGame from "./HangmanGame";

export type HangmanMode = "infinite" | "daily";

export default function HangmanWrapper() {
  const [mode, setMode] = useState<HangmanMode | null>(null);

  return mode ? (
    <HangmanGame mode={mode} />
  ) : (
    <HangmanMenu onSelectMode={setMode} />
  );
}
