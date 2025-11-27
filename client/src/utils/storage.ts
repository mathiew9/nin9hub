const PREFIX = "ninehub.";

export function saveGame<T>(key: string, data: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save ${key} to localStorage`, e);
  }
}

export function loadGame<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error(`Failed to load ${key} from localStorage`, e);
    return null;
  }
}

export function clearGame(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch (e) {
    console.error(`Failed to clear ${key} from localStorage`, e);
  }
}

export function hasGame(key: string): boolean {
  return localStorage.getItem(PREFIX + key) !== null;
}
