import type { Seat, Room } from "../typesCore";
import type { GameAdapter } from "./roomService";

type RoomGetter<TState, TGameSettings> = (
  roomId: string,
) => Room<TState, TGameSettings> | undefined;

type RoomSaver<TState, TGameSettings> = (
  room: Room<TState, TGameSettings>,
) => void;

type Broadcaster<TState, TGameSettings> = (
  room: Room<TState, TGameSettings>,
) => void;

export class RoomTimers<TState, TGameSettings, TMove> {
  private turnTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private adapter: GameAdapter<TState, TGameSettings, TMove>,
    private getRoom: RoomGetter<TState, TGameSettings>,
    private saveRoom: RoomSaver<TState, TGameSettings>,
    private broadcastState: Broadcaster<TState, TGameSettings>,
  ) {}

  clearTurnTimer(roomId: string) {
    const t = this.turnTimers.get(roomId);
    if (t) clearTimeout(t);
    this.turnTimers.delete(roomId);
  }

  armTurnTimerIfSupported(room: Room<TState, TGameSettings>) {
    const s = room.state as any;
    if (!("turnDeadlineAt" in s) || !("turnStartedAt" in s)) return;

    const ms = Math.max(0, Math.floor(room.settingsBase.turnTimeMs ?? 0));
    if (ms > 0) {
      s.turnDeadlineAt = Date.now() + ms;
      s.turnStartedAt = null;
    } else {
      s.turnDeadlineAt = null;
      s.turnStartedAt = Date.now();
    }
  }

  private getDeadline(room: Room<TState, TGameSettings>): number | null {
    const s = room.state as any;
    return typeof s.turnDeadlineAt === "number" ? s.turnDeadlineAt : null;
  }

  scheduleTurnTimeout(room: Room<TState, TGameSettings>) {
    if (!this.adapter.onTurnTimeout) return;

    const deadlineAt = this.getDeadline(room);
    this.clearTurnTimer(room.id);
    if (!deadlineAt) return;

    const delayMs = Math.max(0, deadlineAt - Date.now());

    const timer = setTimeout(() => {
      const live = this.getRoom(room.id);
      if (!live) return;

      if (live.gameKey !== this.adapter.gameKey) return;
      if (!live.started) return;

      const s = live.state as any;
      if (s?.winner) return;

      const stillDeadline =
        typeof s.turnDeadlineAt === "number" ? s.turnDeadlineAt : null;
      if (stillDeadline !== deadlineAt) return;

      const res = this.adapter.onTurnTimeout?.({ room: live });
      if (!res || !res.ok) return;

      const seat = (live.state as any).turn as Seat;

      const v = this.adapter.validateMove({ room: live, seat, move: res.move });
      if (!v.ok) return;

      this.adapter.applyMove({ room: live, seat, move: res.move });

      live.stateVersion++;
      this.saveRoom(live);
      this.broadcastState(live);

      this.scheduleTurnTimeout(live);
    }, delayMs + 15);

    this.turnTimers.set(room.id, timer);
  }
}
