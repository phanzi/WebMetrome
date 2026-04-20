export const ROOM_ID_GENERATE_STEPS = 30;
export const READY_ROOM_TIMEOUT_MS = 1000;

export const DEFAULT_BPM = 120;
export const DEFAULT_BEATS = 4;
export const MIN_BPM = 20;
export const MAX_BPM = 300;
export const ALLOWED_BEATS = new Set([2, 3, 4, 6, 8]);

export const PLAY_SCHEDULE_PAST_TOLERANCE_MS = 120_000;
export const PLAY_SCHEDULE_FUTURE_LIMIT_MS = 3_600_000;

export const ROOM_ID_MIN_LENGTH = 6;
export const ROOM_ID_REGEX = /^[A-Za-z0-9_-]{6,}$/;
