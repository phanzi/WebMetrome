export const DEFAULT_BPM = 120;
export const DEFAULT_BEATS = 4;

export const MIN_BPM = 20;
export const MAX_BPM = 300;
export const ALLOWED_BEATS = [2, 3, 4, 6, 8] as const;
export const PLAY_SCHEDULE_LEAD_MS = 0;

export const STORAGE_KEYS = {
  bpm: "ms-bpm",
  beats: "ms-beats",
  offset: "ms-offset",
  savedStates: "ms-saved-states",
};
