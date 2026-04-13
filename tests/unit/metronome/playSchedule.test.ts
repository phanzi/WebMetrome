import { describe, expect, it } from "bun:test";
import { computeAlignedStart } from "../../../client/features/metronome/domain/playSchedule";

describe("computeAlignedStart", () => {
  it("starts at anchor with beat 0 when recv is before anchor", () => {
    const r = computeAlignedStart({
      anchorAtMs: 10_000,
      recvWallMs: 9000,
      bpm: 120,
      beatsPerMeasure: 4,
    });
    expect(r).toEqual({ startWallMs: 10_000, initialBeatIndex: 0 });
  });

  it("skips to next beat when recv is after anchor", () => {
    const period = 500;
    const r = computeAlignedStart({
      anchorAtMs: 10_000,
      recvWallMs: 10_000 + period * 2 + 10,
      bpm: 120,
      beatsPerMeasure: 4,
    });
    expect(r.startWallMs).toBe(10_000 + period * 3);
    expect(r.initialBeatIndex).toBe(3 % 4);
  });

  it("aligns when recv lands exactly on anchor", () => {
    const r = computeAlignedStart({
      anchorAtMs: 5000,
      recvWallMs: 5000,
      bpm: 60,
      beatsPerMeasure: 3,
    });
    expect(r.startWallMs).toBe(5000);
    expect(r.initialBeatIndex).toBe(0);
  });
});
