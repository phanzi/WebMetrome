import { clamp, round } from "es-toolkit";
import {
  ALLOWED_BEATS,
  DEFAULT_BEATS,
  DEFAULT_BPM,
  MAX_BPM,
  MIN_BPM,
} from "./constants";

export const clampBpm = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_BPM;
  }
  const rounded = round(value);
  return clamp(rounded, MIN_BPM, MAX_BPM);
};

export const normalizeBeats = (value: number): number =>
  (ALLOWED_BEATS as readonly number[]).includes(value) ? value : DEFAULT_BEATS;

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
