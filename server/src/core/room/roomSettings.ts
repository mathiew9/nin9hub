import type { Room, RoomSettingsBase } from "../typesCore";
import { ROOM_SETTINGS_BASE_KEYS } from "../typesCore";
import type { GameAdapter } from "./roomService";

export class RoomSettings<TState, TGameSettings, TMove> {
  private baseKeySet = new Set<string>(
    ROOM_SETTINGS_BASE_KEYS as unknown as string[],
  );

  constructor(private adapter: GameAdapter<TState, TGameSettings, TMove>) {}

  buildClientSettings(room: Room<TState, TGameSettings>) {
    return {
      ...(room.settingsBase as any),
      ...(room.gameSettings as any),
    };
  }

  mergeBaseSettings(
    current: RoomSettingsBase | undefined,
    partial: Partial<RoomSettingsBase> | undefined,
  ): RoomSettingsBase {
    const baseDefaults = this.adapter.defaultBaseSettings();
    return this.adapter.sanitizeBaseSettings({
      ...baseDefaults,
      ...(current ?? {}),
      ...(partial ?? {}),
    });
  }

  mergeGameSettings(
    current: TGameSettings | undefined,
    partial: Partial<TGameSettings> | undefined,
  ): TGameSettings {
    const gameDefaults = this.adapter.defaultGameSettings();
    return this.adapter.sanitizeGameSettings({
      ...gameDefaults,
      ...(current ?? {}),
      ...(partial ?? {}),
    });
  }

  splitFlatSettings(partialFlat: any): {
    base: Partial<RoomSettingsBase>;
    game: Partial<TGameSettings>;
  } {
    const base: Partial<RoomSettingsBase> = {};
    const game: Partial<TGameSettings> = {};

    if (!partialFlat || typeof partialFlat !== "object") return { base, game };

    for (const [k, v] of Object.entries(partialFlat)) {
      if (this.baseKeySet.has(k)) (base as any)[k] = v;
      else (game as any)[k] = v;
    }

    return { base, game };
  }
}
