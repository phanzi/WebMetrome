import { createRateLimiter, MIN_CONTROL_INTERVAL_MS } from "@server/app";
import { describe, expect, it } from "bun:test";

describe("createControlRateLimiter", () => {
  it("allows the first control per connection when last is zero", () => {
    const limiter = createRateLimiter({
      now: () => 1000,
    });
    expect(limiter.allow("a")).toBe(true);
  });

  it("rejects a second control within the interval at the same now", () => {
    const limiter = createRateLimiter({
      now: () => 5000,
    });
    expect(limiter.allow("c")).toBe(true);
    expect(limiter.allow("c")).toBe(false);
  });

  it("allows after the interval has elapsed", () => {
    let now = 1000;
    const limiter = createRateLimiter({
      now: () => now,
    });
    expect(limiter.allow("b")).toBe(true);
    now += MIN_CONTROL_INTERVAL_MS;
    expect(limiter.allow("b")).toBe(true);
  });

  it("shares one bucket across all control types for the same connection", () => {
    const limiter = createRateLimiter({
      now: () => 2000,
    });
    expect(limiter.allow("d")).toBe(true);
    expect(limiter.allow("d")).toBe(false);
  });

  it("allows the same connection again after clear", () => {
    const limiter = createRateLimiter({
      now: () => 3000,
    });
    expect(limiter.allow("e")).toBe(true);
    expect(limiter.allow("e")).toBe(false);
    limiter.clear("e");
    expect(limiter.allow("e")).toBe(true);
  });

  it("tracks connections independently", () => {
    const limiter = createRateLimiter({
      now: () => 4000,
    });
    expect(limiter.allow("x")).toBe(true);
    expect(limiter.allow("y")).toBe(true);
  });

  it("respects custom minIntervalMs", () => {
    let now = 1000;
    const limiter = createRateLimiter({
      now: () => now,
      minIntervalMs: 100,
    });
    expect(limiter.allow("f")).toBe(true);
    now += 50;
    expect(limiter.allow("f")).toBe(false);
    now += 50;
    expect(limiter.allow("f")).toBe(true);
  });
});
