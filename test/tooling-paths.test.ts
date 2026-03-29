import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_INTERNAL_REPORTS_DIRNAME,
  resolvePlaywrightCoverageDir,
  resolveReportsRoot,
  resolveVitestCoverageDir
} from "../scripts/report-output-paths.mjs";
import { resolveZeppAppRoot } from "../scripts/zepp-app-root.mjs";

const repoRoot = path.resolve(__dirname, "..");
const zeppAppRoot = path.join(repoRoot, "zepp-app");

describe("tooling path helpers", () => {
  it("resolves the zepp app root from the repo root", () => {
    expect(resolveZeppAppRoot({ cwd: repoRoot })).toBe(zeppAppRoot);
  });

  it("resolves the zepp app root from a nested repo folder", () => {
    expect(resolveZeppAppRoot({ cwd: path.join(repoRoot, "scripts") })).toBe(zeppAppRoot);
    expect(resolveZeppAppRoot({ cwd: path.join(repoRoot, "test", "fixtures") })).toBe(zeppAppRoot);
  });

  it("keeps the zepp app root when already inside it", () => {
    expect(resolveZeppAppRoot({ cwd: zeppAppRoot })).toBe(zeppAppRoot);
    expect(resolveZeppAppRoot({ cwd: path.join(zeppAppRoot, "page", "home") })).toBe(zeppAppRoot);
  });

  it("keeps coverage repo-local by default", () => {
    expect(resolveReportsRoot({ cwd: repoRoot, env: {} })).toBe(path.join(repoRoot, DEFAULT_INTERNAL_REPORTS_DIRNAME));
    expect(resolveVitestCoverageDir({ cwd: repoRoot, env: {} })).toBe(path.join(repoRoot, DEFAULT_INTERNAL_REPORTS_DIRNAME));
    expect(resolvePlaywrightCoverageDir("module-harness", { cwd: repoRoot, env: {} })).toBe(
      path.join(repoRoot, DEFAULT_INTERNAL_REPORTS_DIRNAME, "playwright", "harness")
    );
  });

  it("respects an explicit reports-root override", () => {
    const customRoot = path.join(repoRoot, ".reports-custom");
    const env = {
      POF_REPORTS_ROOT: customRoot
    };

    expect(resolveReportsRoot({ cwd: repoRoot, env })).toBe(customRoot);
    expect(resolveVitestCoverageDir({ cwd: repoRoot, env })).toBe(customRoot);
    expect(resolvePlaywrightCoverageDir("simulator", { cwd: repoRoot, env })).toBe(
      path.join(customRoot, "playwright", "simulator")
    );
  });
});
