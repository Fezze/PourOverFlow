import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAYWRIGHT_COVERAGE_DURATION_MS,
  DEFAULT_PLAYWRIGHT_COVERAGE_MODE,
  DEFAULT_PLAYWRIGHT_COVERAGE_OUTPUT_DIR,
  DEFAULT_PLAYWRIGHT_MOCK_BROWSER_EXECUTABLE_ENV,
  DEFAULT_PLAYWRIGHT_HARNESS_COVERAGE_OUTPUT_DIR,
  DEFAULT_SIMULATOR_DEPLOYMENT_FRESHNESS_TOLERANCE_MS,
  DEFAULT_ZEPP_SIMULATOR_ROOT_ENV,
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
  resolveSimulatorRoot,
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

  it("rejects invalid CLI argument combinations", () => {
    expect(() => parsePlaywrightCoverageArgs(["--duration-ms", "0"])).toThrow(
      "Expected a positive number after --duration-ms."
    );
    expect(() => parsePlaywrightCoverageArgs(["--output-dir"])).toThrow(
      "Expected a path after --output-dir."
    );
    expect(() => parsePlaywrightCoverageArgs(["--unknown-flag"])).toThrow(
      "Unknown Playwright coverage argument: --unknown-flag"
    );
  });

  it("parses the simulator devtools port file", () => {
    expect(parseDevToolsActivePort("11120\r\n/devtools/browser/example")).toEqual({
      port: 11120,
      browserPath: "/devtools/browser/example"
    });
  });

  it("rejects empty or invalid devtools port files", () => {
    expect(() => parseDevToolsActivePort("")).toThrow("DevToolsActivePort is empty.");
    expect(() => parseDevToolsActivePort("abc")).toThrow("Invalid DevTools port: abc");
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
    const cwd = "C:/Users/krzys/Projects/PourOverFlow";
    const simAppPath = "C:/Users/krzys/AppData/Roaming/simulator/apps/PourOverFlow20001";
    const roots = buildCoverageRoots({
      cwd,
      lastAppInfo: {
        user_app_path: cwd,
        sim_app_path: simAppPath
      }
    });

    expect(roots).toContain(normalizePathForExpect(path.resolve(cwd)));
    expect(roots).toContain(normalizePathForExpect(path.resolve(cwd, "dist")));
    expect(roots).toContain(normalizePathForExpect(path.resolve(simAppPath)));
  });

  it("adds extra roots for module-harness coverage", () => {
    const cwd = "C:/Users/krzys/Projects/PourOverFlow";
    const additionalRoot = "C:/Users/krzys/Projects/PourOverFlow/test/fixtures/playwright-coverage";
    const roots = buildCoverageRootsWithAdditionalRoots({
      cwd,
      lastAppInfo: null,
      additionalRoots: [additionalRoot]
    });

    expect(roots).toContain(normalizePathForExpect(path.resolve(additionalRoot)));
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
    const cwd = "C:/Users/krzys/Projects/PourOverFlow";
    const simAppPath = "C:/Users/krzys/AppData/Roaming/simulator/apps/PourOverFlow20001";
    const roots = buildCoverageRoots({
      cwd,
      lastAppInfo: {
        user_app_path: cwd,
        sim_app_path: simAppPath
      }
    });
    const relevantFileUrl = new URL(`file://${toFileUrlPath(path.resolve(simAppPath, "page/home/index.js"))}`);

    expect(isRelevantCoveragePath(relevantFileUrl.toString(), roots)).toBe(true);
    expect(isRelevantCoveragePath("https://example.com/index.js", roots)).toBe(false);
  });

  it("maps local harness http urls back to repo files", () => {
    const localRoot = "C:/Users/krzys/Projects/PourOverFlow";
    const mappedPath = normalizeCoverageFilePathWithOptions(
      "http://127.0.0.1:42000/shared/engine/recipe-engine.js",
      {
        httpUrlRoots: [
          {
            baseUrl: "http://127.0.0.1:42000",
            localRoot
          }
        ]
      }
    );

    expect(normalizePathForExpect(mappedPath ?? "")).toContain(
      normalizePathForExpect(path.resolve(localRoot, "shared/engine/recipe-engine.js"))
    );
    expect(
      isRelevantCoveragePathWithOptions(
        "http://127.0.0.1:42000/shared/engine/recipe-engine.js",
        [normalizePathForExpect(path.resolve(localRoot))],
        {
          httpUrlRoots: [
            {
              baseUrl: "http://127.0.0.1:42000",
              localRoot
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

  it("resolves the simulator root from an explicit override", () => {
    expect(
      normalizePathForExpect(
        resolveSimulatorRoot({
          env: {
            [DEFAULT_ZEPP_SIMULATOR_ROOT_ENV]: "/tmp/custom-simulator-root"
          },
          platform: "linux",
          homeDir: "/home/deck"
        })
      )
    ).toBe(normalizePathForExpect(path.resolve("/tmp/custom-simulator-root")));
  });

  it("resolves the simulator root from APPDATA on Windows", () => {
    expect(
      normalizePathForExpect(
        resolveSimulatorRoot({
          env: {
            APPDATA: "C:/Users/krzys/AppData/Roaming"
          },
          platform: "win32",
          homeDir: "C:/Users/krzys"
        })
      )
    ).toBe(normalizePathForExpect(path.resolve("C:/Users/krzys/AppData/Roaming/simulator")));
  });

  it("resolves the simulator root from XDG config on Linux", () => {
    expect(
      normalizePathForExpect(
        resolveSimulatorRoot({
          env: {
            XDG_CONFIG_HOME: "/home/deck/.config"
          },
          platform: "linux",
          homeDir: "/home/deck"
        })
      )
    ).toBe(normalizePathForExpect(path.resolve("/home/deck/.config/simulator")));
  });

  it("falls back to ~/.config on Linux when XDG config is unset", () => {
    expect(
      normalizePathForExpect(
        resolveSimulatorRoot({
          env: {},
          platform: "linux",
          homeDir: "/home/deck"
        })
      )
    ).toBe(normalizePathForExpect(path.resolve("/home/deck/.config/simulator")));
  });

  it("prefers host ~/.config for Flatpak-hosted Linux sessions", () => {
    expect(
      normalizePathForExpect(
        resolveSimulatorRoot({
          env: {
            XDG_CONFIG_HOME: "/home/deck/.var/app/com.visualstudio.code/config"
          },
          platform: "linux",
          homeDir: "/home/deck"
        })
      )
    ).toBe(normalizePathForExpect(path.resolve("/home/deck/.config/simulator")));
  });

  it("rejects simulator root resolution when no required env is available", () => {
    expect(() =>
      resolveSimulatorRoot({
        env: {},
        platform: "win32",
        homeDir: ""
      })
    ).toThrow(`Could not resolve the Zepp simulator root. Set ${DEFAULT_ZEPP_SIMULATOR_ROOT_ENV} or make APPDATA available.`);

    expect(() =>
      resolveSimulatorRoot({
        env: {},
        platform: "linux",
        homeDir: ""
      })
    ).toThrow(
      `Could not resolve the Zepp simulator root. Set ${DEFAULT_ZEPP_SIMULATOR_ROOT_ENV}, XDG_CONFIG_HOME, or HOME.`
    );
  });
});

function normalizePathForExpect(value: string) {
  return value.replace(/\\/g, "/").toLowerCase();
}


function toFileUrlPath(value: string) {
  const normalized = value.replace(/\\/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}
