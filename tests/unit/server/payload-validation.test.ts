import { describe, expect, it } from "bun:test";
import { isValidControlPayload } from "../../../server/domain/roomSync";

describe("isValidControlPayload", () => {
  it("accepts valid payload", () => {
    expect(
      isValidControlPayload({
        bpm: 120,
        beats: 4,
        isPlaying: true,
      }),
    ).toBe(true);
  });

  it("rejects bpm outside allowed range", () => {
    expect(
      isValidControlPayload({
        bpm: 19,
        beats: 4,
        isPlaying: true,
      }),
    ).toBe(false);
    expect(
      isValidControlPayload({
        bpm: 301,
        beats: 4,
        isPlaying: true,
      }),
    ).toBe(false);
  });

  it("rejects beats not in allowed set", () => {
    expect(
      isValidControlPayload({
        bpm: 120,
        beats: 5,
        isPlaying: true,
      }),
    ).toBe(false);
  });

  it("rejects non-integer values", () => {
    expect(
      isValidControlPayload({
        bpm: 120.5,
        beats: 4,
        isPlaying: true,
      }),
    ).toBe(false);
    expect(
      isValidControlPayload({
        bpm: 120,
        beats: 3.2,
        isPlaying: true,
      }),
    ).toBe(false);
  });
});
