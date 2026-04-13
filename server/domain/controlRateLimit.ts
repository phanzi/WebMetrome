export const MIN_CONTROL_INTERVAL_MS = 30;

export type ControlChannel = "metronome" | "playing";

type ChannelTimestamps = {
  metronome: number;
  playing: number;
};

export type ControlRateLimiter = {
  allow(connectionId: string, key: ControlChannel): boolean;
  clear(connectionId: string): void;
};

export function createControlRateLimiter(options: {
  now: () => number;
  minIntervalMs?: number;
}): ControlRateLimiter {
  const intervalMs = options.minIntervalMs ?? MIN_CONTROL_INTERVAL_MS;
  const lastByConnection = new Map<string, ChannelTimestamps>();

  return {
    allow(connectionId: string, key: ControlChannel): boolean {
      const now = options.now();
      const prev = lastByConnection.get(connectionId) ?? {
        metronome: 0,
        playing: 0,
      };
      if (now - prev[key] < intervalMs) {
        return false;
      }
      lastByConnection.set(connectionId, {
        ...prev,
        [key]: now,
      });
      return true;
    },
    clear(connectionId: string): void {
      lastByConnection.delete(connectionId);
    },
  };
}
