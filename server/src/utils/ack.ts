import type { Ack } from "../protocol/types";
import type { ErrorCode } from "../protocol/events";

export function ok<T>(ack: Ack<T> | undefined, data: T) {
  ack?.({ ok: true, data });
}

export function err(ack: Ack<any> | undefined, code: ErrorCode, message: string) {
  ack?.({ ok: false, code, message });
}
