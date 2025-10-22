import { HangmanMode } from "./HangmanWrapper";
import { ALL_WORDS, DAILY_WORDS } from "./HangmanWords";

export function getWord(mode: HangmanMode): string {
  if (mode === "daily") {
    const dateSeed = new Date().toISOString().split("T")[0];
    const index = hashCode(dateSeed) % DAILY_WORDS.length;
    return DAILY_WORDS[index];
  }

  return ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)];
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
  }
  return Math.abs(hash);
}
