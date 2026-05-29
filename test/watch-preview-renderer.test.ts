import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("watch preview renderer", () => {
  it("renders button styles from serialized hmUI widget properties", async () => {
    const rendererSource = await readFile("test/fixtures/watch-preview/renderer.js", "utf8");

    expect(rendererSource).toContain("widget.normal_color");
    expect(rendererSource).toContain("widget.color");
    expect(rendererSource).toContain("widget.radius");
    expect(rendererSource).toContain("widget.text_size");
  });
});
