import { clamp, round } from "es-toolkit";

export const MIN_CONTROL_INTERVAL_MS = 30;
const MIN_ALLOWED_INTERVAL_MS = 1;
const MAX_ALLOWED_INTERVAL_MS = 60_000;

export function createRateLimiter(options: {
  now: () => number;
  minIntervalMs?: number;
}) {
  const requested = options.minIntervalMs ?? MIN_CONTROL_INTERVAL_MS;
  const intervalMs = clamp(
    round(requested),
    MIN_ALLOWED_INTERVAL_MS,
    MAX_ALLOWED_INTERVAL_MS,
  );
  const lastByConnection = new Map<string, number>();

  return {
    allow(wsId: string): boolean {
      const now = options.now();
      const prev = lastByConnection.get(wsId) ?? 0;
      if (now - prev < intervalMs) {
        return false;
      }
      lastByConnection.set(wsId, now);
      return true;
    },
    clear(wsId: string): void {
      lastByConnection.delete(wsId);
    },
  };
}
