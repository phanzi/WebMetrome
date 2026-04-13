export const DEFAULT_BPM = 120;
export const DEFAULT_BEATS = 4;
export const DEFAULT_OFFSET_MS = 0;

export const MIN_BPM = 20;
export const MAX_BPM = 300;
export const MIN_OFFSET_MS = 0;
export const MAX_OFFSET_MS = 500;
export const ALLOWED_BEATS = [2, 3, 4, 6, 8] as const;

export const STORAGE_KEYS = {
  bpm: "ms-bpm",
  beats: "ms-beats",
  offset: "ms-offset",
};
