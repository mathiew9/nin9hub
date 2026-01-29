// server/online-core/utils.ts

export function ok<T>(ack: ((p: any) => void) | undefined, data: T) {
  ack?.({ ok: true, data });
}

export function err(
  ack: ((p: any) => void) | undefined,
  code: string,
  message: string,
) {
  ack?.({ ok: false, code, message });
}

export function genRoomCode(len: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
