import {
  isValidMetronomeState,
  isValidPlayingState,
} from "@server/domain/roomSync";
import { describe, expect, it } from "bun:test";

describe("payload validation", () => {
  it("accepts valid metronome state", () => {
    expect(
      isValidMetronomeState({
        bpm: 120,
        beats: 4,
      }),
    ).toBe(true);
  });

  it("rejects metronome bpm outside allowed range", () => {
    expect(
      isValidMetronomeState({
        bpm: 19,
        beats: 4,
      }),
    ).toBe(false);
    expect(
      isValidMetronomeState({
        bpm: 301,
        beats: 4,
      }),
    ).toBe(false);
  });

  it("rejects beats not in allowed set", () => {
    expect(
      isValidMetronomeState({
        bpm: 120,
        beats: 5,
      }),
    ).toBe(false);
  });

  it("rejects non-integer values", () => {
    expect(
      isValidMetronomeState({
        bpm: 120.5,
        beats: 4,
      }),
    ).toBe(false);
    expect(
      isValidMetronomeState({
        bpm: 120,
        beats: 3.2,
      }),
    ).toBe(false);
  });

  it("accepts valid playing state", () => {
    expect(
      isValidPlayingState({
        updatedAt: Date.now(),
        isPlaying: true,
      }),
    ).toBe(true);
  });
});
