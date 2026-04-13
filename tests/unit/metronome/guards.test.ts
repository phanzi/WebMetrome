import { DEFAULT_BPM } from "@/features/metronome/domain/constants";
import {
  clampBpm,
  normalizeBeats,
  readStoredNumber,
  sanitizeInitialBpm,
} from "@/features/metronome/domain/guards";
import { describe, expect, it } from "bun:test";

describe("metronome guards", () => {
  it("clamps and rounds bpm values", () => {
    expect(clampBpm(19.2)).toBe(20);
    expect(clampBpm(120.6)).toBe(121);
    expect(clampBpm(301)).toBe(300);
  });

  it("falls back when bpm input is non-finite", () => {
    expect(clampBpm(Number.NaN)).toBe(DEFAULT_BPM);
    expect(clampBpm(Number.POSITIVE_INFINITY)).toBe(DEFAULT_BPM);
  });

  it("normalizes beats to allowed values", () => {
    expect(normalizeBeats(4)).toBe(4);
    expect(normalizeBeats(5)).toBe(4);
  });

  it("reads stored numbers and falls back on invalid values", () => {
    expect(readStoredNumber("123", 90)).toBe(123);
    expect(readStoredNumber("abc", 90)).toBe(90);
    expect(readStoredNumber("", 90)).toBe(90);
    expect(readStoredNumber(null, 90)).toBe(90);
  });

  it("sanitizes initial bpm values", () => {
    expect(sanitizeInitialBpm(140)).toBe(140);
    expect(sanitizeInitialBpm(Number.NaN)).toBe(DEFAULT_BPM);
  });
});
