import {
  ALLOWED_BEATS,
  DEFAULT_BEATS,
  DEFAULT_BPM,
  DEFAULT_OFFSET_MS,
  MAX_BPM,
  MAX_OFFSET_MS,
  MIN_BPM,
  MIN_OFFSET_MS,
} from "./constants";

export const clampBpm = (value: number): number =>
  Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(value)));

export const normalizeOffset = (value: number): number =>
  Math.max(MIN_OFFSET_MS, Math.min(MAX_OFFSET_MS, Math.round(value)));

export const normalizeBeats = (value: number): number =>
  ALLOWED_BEATS.includes(value as (typeof ALLOWED_BEATS)[number])
    ? value
    : DEFAULT_BEATS;

export const readStoredNumber = (
  rawValue: string | null,
  fallback: number,
): number => {
  if (!rawValue) {
    return fallback;
  }
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const sanitizeInitialBpm = (value: number): number =>
  Number.isFinite(value) ? clampBpm(value) : DEFAULT_BPM;

export const sanitizeInitialOffset = (value: number): number =>
  Number.isFinite(value) ? normalizeOffset(value) : DEFAULT_OFFSET_MS;
