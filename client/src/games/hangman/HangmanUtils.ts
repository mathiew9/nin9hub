// HangmanUtils.ts
import { HangmanMode } from "./HangmanWrapper";
import { HANGMAN_WORDS, type HangmanLang } from "./words"; // adapte le chemin si besoin

const DAY_MS = 86_400_000;
// Date fixe pour que l’index ne change jamais (et soit identique pour tout le monde)
const EPOCH_UTC = Date.UTC(2025, 0, 1); // 2025-01-01

export function getWord(mode: HangmanMode, lang: HangmanLang): string {
  const pool = getPool(lang);

  if (pool.length === 0) return "";

  if (mode === "daily") {
    const idx = dayIndexUTC() % pool.length;
    return pool[idx];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

function getPool(lang: HangmanLang): string[] {
  // fallback safe (au cas où)
  const list = HANGMAN_WORDS[lang]?.all ?? HANGMAN_WORDS.en.all;
  return list;
}

function dayIndexUTC(date = new Date()): number {
  // On calcule "au jour près" en UTC pour éviter les différences de fuseau horaire
  const todayUTC = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  const days = Math.floor((todayUTC - EPOCH_UTC) / DAY_MS);
  return Math.max(0, days);
}
