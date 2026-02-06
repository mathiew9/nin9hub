import { FR_WORDS } from "./fr";
import { EN_WORDS } from "./en";
import { ES_WORDS } from "./es";

export const HANGMAN_WORDS = {
  fr: { all: FR_WORDS },
  en: { all: EN_WORDS },
  es: { all: ES_WORDS },
} as const;

export type HangmanLang = keyof typeof HANGMAN_WORDS;
