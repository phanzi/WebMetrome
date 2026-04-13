import { normalizeRoomId } from "@server/domain/roomSync";
import { describe, expect, it } from "bun:test";

describe("normalizeRoomId", () => {
  it("normalizes lowercase room id", () => {
    expect(normalizeRoomId("ab12")).toBe("AB12");
  });

  it("trims surrounding spaces", () => {
    expect(normalizeRoomId("  AB12  ")).toBe("AB12");
  });

  it("rejects short room id", () => {
    expect(normalizeRoomId("A1")).toBeNull();
  });

  it("rejects non alphanumeric room id", () => {
    expect(normalizeRoomId("AB-12")).toBeNull();
  });
});
