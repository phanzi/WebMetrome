export const MIN_CONTROL_INTERVAL_MS = 30;

export function createRateLimiter(options: {
  now: () => number;
  minIntervalMs?: number;
}) {
  const intervalMs = options.minIntervalMs ?? MIN_CONTROL_INTERVAL_MS;
  const lastByConnection = new Map<string, number>();

  return {
    allow(connectionId: string): boolean {
      const now = options.now();
      const prev = lastByConnection.get(connectionId) ?? 0;
      if (now - prev < intervalMs) {
        return false;
      }
      lastByConnection.set(connectionId, now);
      return true;
    },
    clear(connectionId: string): void {
      lastByConnection.delete(connectionId);
    },
  };
}
