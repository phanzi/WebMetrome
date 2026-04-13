import { createApp } from "@server/app";
import { describe, expect, it } from "bun:test";

describe("GET /health", () => {
  it("returns health status payload", async () => {
    const app = createApp();
    const response = await app.handle(new Request("http://localhost/health"));
    const body = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
