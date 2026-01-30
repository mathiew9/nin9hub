import type { Ack } from "./typesCore";

export function ok<T>(ack: Ack<T> | undefined, data: T) {
  ack?.({ ok: true, data });
}

export function err(ack: Ack<any> | undefined, code: string, message: string) {
  ack?.({ ok: false, code, message });
}
