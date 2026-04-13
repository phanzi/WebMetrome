import { z } from "zod";
import {
  DEFAULT_BEATS,
  DEFAULT_BPM,
  DEFAULT_OFFSET_MS,
  MAX_BPM,
  MAX_OFFSET_MS,
  MIN_BPM,
  MIN_OFFSET_MS,
} from "./constants";

const finiteNumberSchema = z.number().finite();

const clampBpmSchema = finiteNumberSchema.transform((value) =>
  Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(value))),
);

const offsetSchema = finiteNumberSchema.transform((value) =>
  Math.max(MIN_OFFSET_MS, Math.min(MAX_OFFSET_MS, Math.round(value))),
);

const allowedBeatsSchema = z.union([
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(6),
  z.literal(8),
]);

const storedNumberSchema = z
  .string()
  .transform((value) => Number(value))
  .pipe(z.number().finite());

export const clampBpm = (value: number): number => clampBpmSchema.parse(value);

export const normalizeOffset = (value: number): number =>
  offsetSchema.parse(value);

export const normalizeBeats = (value: number): number =>
  allowedBeatsSchema.safeParse(value).success ? value : DEFAULT_BEATS;

export const readStoredNumber = (
  rawValue: string | null,
  fallback: number,
): number => {
  if (!rawValue) {
    return fallback;
  }
  const parsed = storedNumberSchema.safeParse(rawValue);
  return parsed.success ? parsed.data : fallback;
};

export const sanitizeInitialBpm = (value: number): number =>
  finiteNumberSchema.safeParse(value).success ? clampBpm(value) : DEFAULT_BPM;

export const sanitizeInitialOffset = (value: number): number =>
  finiteNumberSchema.safeParse(value).success
    ? normalizeOffset(value)
    : DEFAULT_OFFSET_MS;
