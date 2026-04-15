import { resolvePort } from "@server/index";
import { describe, expect, it } from "bun:test";

describe("server bootstrap utilities", () => {
  it("returns fallback port when value is invalid", () => {
    expect(resolvePort(undefined)).toBe(4000);
    expect(resolvePort("abc")).toBe(4000);
    expect(resolvePort("0")).toBe(4000);
  });

  it("returns parsed port when value is valid", () => {
    expect(resolvePort("4001")).toBe(4001);
  });
});
