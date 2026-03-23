import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAYWRIGHT_COVERAGE_DURATION_MS,
  DEFAULT_PLAYWRIGHT_COVERAGE_MODE,
  DEFAULT_PLAYWRIGHT_COVERAGE_OUTPUT_DIR,
  DEFAULT_PLAYWRIGHT_MOCK_BROWSER_EXECUTABLE_ENV,
  DEFAULT_PLAYWRIGHT_HARNESS_COVERAGE_OUTPUT_DIR,
  DEFAULT_SIMULATOR_DEPLOYMENT_FRESHNESS_TOLERANCE_MS,
  buildCoverageRoots,
  buildCoverageRootsWithAdditionalRoots,
  getSimulatorAppSourceCandidates,
  getMockBrowserExecutableCandidates,
  isInspectablePageUrl,
  isSimulatorDeploymentForCurrentProject,
  isRelevantCoveragePath,
  isRelevantCoveragePathWithOptions,
  normalizeCoverageFilePathWithOptions,
  normalizeCoverageFilePath,
  parseDevToolsActivePort,
  parsePlaywrightCoverageArgs,
  toCoverageDisplayPath
} from "../scripts/playwright-coverage-helpers.mjs";

describe("playwright coverage helpers", () => {
  it("parses default simulator smoke args", () => {
    expect(parsePlaywrightCoverageArgs()).toEqual({
      mode: DEFAULT_PLAYWRIGHT_COVERAGE_MODE,
      durationMs: DEFAULT_PLAYWRIGHT_COVERAGE_DURATION_MS,
      outputDir: DEFAULT_PLAYWRIGHT_COVERAGE_OUTPUT_DIR,
      collectCoverage: false,
      verbose: false
    });
  });

  it("parses explicit simulator args", () => {
    expect(
      parsePlaywrightCoverageArgs([
        "--simulator",
        "--duration-ms",
        "5000",
        "--output-dir",
        "coverage/custom",
        "--verbose"
      ])
    ).toEqual({
      mode: "simulator",
      durationMs: 5000,
      outputDir: "coverage/custom",
      collectCoverage: false,
      verbose: true
    });
  });

  it("switches to module-harness mode and harness output dir", () => {
    expect(parsePlaywrightCoverageArgs(["--module-harness"])).toEqual({
      mode: "module-harness",
      durationMs: DEFAULT_PLAYWRIGHT_COVERAGE_DURATION_MS,
      outputDir: DEFAULT_PLAYWRIGHT_HARNESS_COVERAGE_OUTPUT_DIR,
      collectCoverage: false,
      verbose: false
    });
  });

  it("parses explicit harness coverage args", () => {
    expect(parsePlaywrightCoverageArgs(["--module-harness", "--coverage"])).toEqual({
      mode: "module-harness",
      durationMs: DEFAULT_PLAYWRIGHT_COVERAGE_DURATION_MS,
      outputDir: DEFAULT_PLAYWRIGHT_HARNESS_COVERAGE_OUTPUT_DIR,
      collectCoverage: true,
      verbose: false
    });
  });

  it("parses the simulator devtools port file", () => {
    expect(parseDevToolsActivePort("11120\r\n/devtools/browser/example")).toEqual({
      port: 11120,
      browserPath: "/devtools/browser/example"
    });
  });

  it("normalizes coverage file paths from file urls and raw paths", () => {
    const absoluteFile = path.resolve("page/home/index.js");
    expect(
      normalizePathForExpect(normalizeCoverageFilePath(`file:///${absoluteFile.replace(/\\/g, "/")}`) ?? "")
    ).toContain(
      normalizePathForExpect(absoluteFile)
    );
    expect(normalizeCoverageFilePath(absoluteFile)).toBe(path.resolve(absoluteFile));
    expect(normalizeCoverageFilePath("devtools://devtools/bundled/inspector.js")).toBeNull();
  });

  it("builds coverage roots from repo and simulator app paths", () => {
    const roots = buildCoverageRoots({
      cwd: "C:/Users/krzys/Projects/PourOverFlow",
      lastAppInfo: {
        user_app_path: "C:/Users/krzys/Projects/PourOverFlow",
        sim_app_path: "C:/Users/krzys/AppData/Roaming/simulator/apps/PourOverFlow20001"
      }
    });

    expect(roots).toContain("c:/users/krzys/projects/pouroverflow");
    expect(roots).toContain("c:/users/krzys/projects/pouroverflow/dist");
    expect(roots).toContain("c:/users/krzys/appdata/roaming/simulator/apps/pouroverflow20001");
  });

  it("adds extra roots for module-harness coverage", () => {
    const roots = buildCoverageRootsWithAdditionalRoots({
      cwd: "C:/Users/krzys/Projects/PourOverFlow",
      lastAppInfo: null,
      additionalRoots: ["C:/Users/krzys/Projects/PourOverFlow/test/fixtures/playwright-coverage"]
    });

    expect(roots).toContain("c:/users/krzys/projects/pouroverflow/test/fixtures/playwright-coverage");
  });

  it("lists the app-facing source paths used for simulator deployment freshness", () => {
    expect(getSimulatorAppSourceCandidates("C:/Users/krzys/Projects/PourOverFlow")).toEqual([
      path.resolve("C:/Users/krzys/Projects/PourOverFlow/app.json"),
      path.resolve("C:/Users/krzys/Projects/PourOverFlow/app.js"),
      path.resolve("C:/Users/krzys/Projects/PourOverFlow/page"),
      path.resolve("C:/Users/krzys/Projects/PourOverFlow/app-side"),
      path.resolve("C:/Users/krzys/Projects/PourOverFlow/setting"),
      path.resolve("C:/Users/krzys/Projects/PourOverFlow/shared"),
      path.resolve("C:/Users/krzys/Projects/PourOverFlow/assets")
    ]);
    expect(DEFAULT_SIMULATOR_DEPLOYMENT_FRESHNESS_TOLERANCE_MS).toBe(2000);
  });

  it("matches simulator deployment metadata to the current repo root", () => {
    expect(
      isSimulatorDeploymentForCurrentProject(
        {
          user_app_path: "C:/Users/krzys/Projects/PourOverFlow"
        },
        "C:/Users/krzys/Projects/PourOverFlow"
      )
    ).toBe(true);

    expect(
      isSimulatorDeploymentForCurrentProject(
        {
          user_app_path: "C:/Users/krzys/Projects/SomeOtherRepo"
        },
        "C:/Users/krzys/Projects/PourOverFlow"
      )
    ).toBe(false);
  });

  it("filters relevant coverage paths against project roots", () => {
    const roots = buildCoverageRoots({
      cwd: "C:/Users/krzys/Projects/PourOverFlow",
      lastAppInfo: {
        user_app_path: "C:/Users/krzys/Projects/PourOverFlow",
        sim_app_path: "C:/Users/krzys/AppData/Roaming/simulator/apps/PourOverFlow20001"
      }
    });

    expect(
      isRelevantCoveragePath(
        "file:///C:/Users/krzys/AppData/Roaming/simulator/apps/PourOverFlow20001/page/home/index.js",
        roots
      )
    ).toBe(true);
    expect(isRelevantCoveragePath("https://example.com/index.js", roots)).toBe(false);
  });

  it("maps local harness http urls back to repo files", () => {
    const mappedPath = normalizeCoverageFilePathWithOptions(
      "http://127.0.0.1:42000/shared/engine/recipe-engine.js",
      {
        httpUrlRoots: [
          {
            baseUrl: "http://127.0.0.1:42000",
            localRoot: "C:/Users/krzys/Projects/PourOverFlow"
          }
        ]
      }
    );

    expect(normalizePathForExpect(mappedPath ?? "")).toContain(
      "c:/users/krzys/projects/pouroverflow/shared/engine/recipe-engine.js"
    );
    expect(
      isRelevantCoveragePathWithOptions(
        "http://127.0.0.1:42000/shared/engine/recipe-engine.js",
        ["c:/users/krzys/projects/pouroverflow"],
        {
          httpUrlRoots: [
            {
              baseUrl: "http://127.0.0.1:42000",
              localRoot: "C:/Users/krzys/Projects/PourOverFlow"
            }
          ]
        }
      )
    ).toBe(true);
  });

  it("maps repo and simulator files to report-friendly display paths", () => {
    expect(
      toCoverageDisplayPath("C:/Users/krzys/Projects/PourOverFlow/shared/watch/sync-bridge.js", {
        cwd: "C:/Users/krzys/Projects/PourOverFlow",
        lastAppInfo: null
      })
    ).toBe("shared/watch/sync-bridge.js");

    expect(
      toCoverageDisplayPath("C:/Users/krzys/AppData/Roaming/simulator/apps/PourOverFlow20001/page/home/index.js", {
        cwd: "C:/Users/krzys/Projects/PourOverFlow",
        lastAppInfo: {
          sim_app_path: "C:/Users/krzys/AppData/Roaming/simulator/apps/PourOverFlow20001"
        }
      })
    ).toBe("simulator-app/page/home/index.js");
  });

  it("keeps only inspectable simulator pages", () => {
    expect(isInspectablePageUrl("about:blank")).toBe(true);
    expect(isInspectablePageUrl("file:///C:/Users/krzys/AppData/Roaming/simulator/index.html")).toBe(true);
    expect(isInspectablePageUrl("devtools://devtools/bundled/inspector.html")).toBe(false);
    expect(isInspectablePageUrl("chrome-extension://abc/background.html")).toBe(false);
  });

  it("prefers an override browser path for module-harness runs", () => {
    expect(
      getMockBrowserExecutableCandidates({
        [DEFAULT_PLAYWRIGHT_MOCK_BROWSER_EXECUTABLE_ENV]: "D:/Portable/Chrome/chrome.exe"
      } as NodeJS.ProcessEnv)[0]
    ).toBe("D:/Portable/Chrome/chrome.exe");
  });
});

function normalizePathForExpect(value: string) {
  return value.replace(/\\/g, "/").toLowerCase();
}
