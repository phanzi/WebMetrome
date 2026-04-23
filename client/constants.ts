export const PLAY_DELAY_MS = 50;

export const BPM = {
  DEFAULT: 120,
  MIN: 20,
  MAX: 300,
  PERSIST_KEY: "ms-bpm",
};

export const BEATS = {
  DEFAULT: 4,
  MIN: 2,
  MAX: 8,
  PERSIST_KEY: "ms-beats",
};

const SUB_DIVISION_S = ["quater", "quavers", "triplet", "semiquavers"] as const;
export const SUB_DIVISION = {
  S: SUB_DIVISION_S,
  DEFAULT: SUB_DIVISION_S[0],
  MIN: 2,
  MAX: 8,
  PERSIST_KEY: "ms-sub-division",
};

export const VOLUME = {
  DEFAULT: 100,
  MIN: 0,
  MAX: 100,
  PERSIST_KEY: "ms-volume",
};

export const OFFSET = {
  DEFAULT: 0 as number,
  MIN: -40,
  MAX: 40,
  PERSIST_KEY: "ms-offset",
};

export const SAVED_STATES = {
  DEFAULT: [],
  PERSIST_KEY: "ms-saved-states",
};
