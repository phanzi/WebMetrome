import {
  MIN_CONTROL_INTERVAL_MS,
  createControlRateLimiter,
} from "@server/domain/controlRateLimit";
import { describe, expect, it } from "bun:test";

describe("createControlRateLimiter", () => {
  it("allows the first control per channel when last is zero", () => {
    const limiter = createControlRateLimiter({
      now: () => 1000,
    });
    expect(limiter.allow("a", "metronome")).toBe(true);
    expect(limiter.allow("a", "playing")).toBe(true);
  });

  it("rejects a second metronome tick within the interval at the same now", () => {
    const limiter = createControlRateLimiter({
      now: () => 5000,
    });
    expect(limiter.allow("c", "metronome")).toBe(true);
    expect(limiter.allow("c", "metronome")).toBe(false);
  });

  it("allows after the interval has elapsed", () => {
    let now = 1000;
    const limiter = createControlRateLimiter({
      now: () => now,
    });
    expect(limiter.allow("b", "metronome")).toBe(true);
    now += MIN_CONTROL_INTERVAL_MS;
    expect(limiter.allow("b", "metronome")).toBe(true);
  });

  it("tracks metronome and playing channels independently", () => {
    const limiter = createControlRateLimiter({
      now: () => 2000,
    });
    expect(limiter.allow("d", "metronome")).toBe(true);
    expect(limiter.allow("d", "playing")).toBe(true);
  });

  it("allows the same channel again after clear", () => {
    const limiter = createControlRateLimiter({
      now: () => 3000,
    });
    expect(limiter.allow("e", "metronome")).toBe(true);
    expect(limiter.allow("e", "metronome")).toBe(false);
    limiter.clear("e");
    expect(limiter.allow("e", "metronome")).toBe(true);
  });

  it("respects custom minIntervalMs", () => {
    let now = 1000;
    const limiter = createControlRateLimiter({
      now: () => now,
      minIntervalMs: 100,
    });
    expect(limiter.allow("f", "playing")).toBe(true);
    now += 50;
    expect(limiter.allow("f", "playing")).toBe(false);
    now += 50;
    expect(limiter.allow("f", "playing")).toBe(true);
  });
});
