import { z } from "zod";
import { DEFAULT_BEATS, DEFAULT_BPM, MAX_BPM, MIN_BPM } from "./constants";

const finiteNumberSchema = z.number();

const clampBpmSchema = finiteNumberSchema.transform((value) =>
  Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(value))),
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
  .pipe(z.number());

export const clampBpm = (value: number): number => clampBpmSchema.parse(value);

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
