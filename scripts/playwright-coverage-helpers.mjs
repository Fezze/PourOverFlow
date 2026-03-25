import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_PLAYWRIGHT_COVERAGE_DURATION_MS = 15000;
export const DEFAULT_PLAYWRIGHT_COVERAGE_MODE = "simulator";
export const DEFAULT_PLAYWRIGHT_COVERAGE_OUTPUT_DIR = "coverage/playwright/simulator";
export const DEFAULT_PLAYWRIGHT_HARNESS_COVERAGE_OUTPUT_DIR = "coverage/playwright/harness";
export const DEFAULT_PLAYWRIGHT_MOCK_BROWSER_EXECUTABLE_ENV = "PLAYWRIGHT_COVERAGE_BROWSER";
export const DEFAULT_ZEPP_SIMULATOR_ROOT_ENV = "ZEPP_SIMULATOR_ROOT";
export const DEFAULT_SIMULATOR_DEPLOYMENT_FRESHNESS_TOLERANCE_MS = 2000;

const WINDOWS_CHROMIUM_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
];

export function parsePlaywrightCoverageArgs(argv = []) {
  const options = {
    mode: DEFAULT_PLAYWRIGHT_COVERAGE_MODE,
    durationMs: DEFAULT_PLAYWRIGHT_COVERAGE_DURATION_MS,
    outputDir: DEFAULT_PLAYWRIGHT_COVERAGE_OUTPUT_DIR,
    collectCoverage: false,
    verbose: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--verbose") {
      options.verbose = true;
      continue;
    }

    if (arg === "--coverage") {
      options.collectCoverage = true;
      continue;
    }

    if (arg === "--no-coverage") {
      options.collectCoverage = false;
      continue;
    }

    if (arg === "--module-harness") {
      options.mode = "module-harness";
      if (options.outputDir === DEFAULT_PLAYWRIGHT_COVERAGE_OUTPUT_DIR) {
        options.outputDir = DEFAULT_PLAYWRIGHT_HARNESS_COVERAGE_OUTPUT_DIR;
      }
      continue;
    }

    if (arg === "--simulator") {
      options.mode = "simulator";
      if (options.outputDir === DEFAULT_PLAYWRIGHT_HARNESS_COVERAGE_OUTPUT_DIR) {
        options.outputDir = DEFAULT_PLAYWRIGHT_COVERAGE_OUTPUT_DIR;
      }
      continue;
    }

    if (arg === "--duration-ms") {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error("Expected a positive number after --duration-ms.");
      }
      options.durationMs = value;
      index += 1;
      continue;
    }

    if (arg === "--output-dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Expected a path after --output-dir.");
      }
      options.outputDir = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown Playwright coverage argument: ${arg}`);
  }

  return options;
}

export function parseDevToolsActivePort(contents) {
  const lines = String(contents)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("DevToolsActivePort is empty.");
  }

  const port = Number(lines[0]);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid DevTools port: ${lines[0]}`);
  }

  return {
    port,
    browserPath: lines[1] ?? null
  };
}

export function isInspectablePageUrl(url) {
  if (!url || url === "about:blank") {
    return true;
  }

  const lower = String(url).toLowerCase();
  return !(
    lower.startsWith("devtools://") ||
    lower.startsWith("chrome://") ||
    lower.startsWith("chrome-extension://")
  );
}

export function normalizeCoverageFilePath(rawUrl) {
  return normalizeCoverageFilePathWithOptions(rawUrl);
}

export function normalizeCoverageFilePathWithOptions(rawUrl, options = {}) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  const undecorated = trimmed.split("#")[0].split("?")[0];
  if (undecorated.startsWith("file://")) {
    try {
      return path.resolve(fileURLToPath(undecorated));
    } catch {
      return null;
    }
  }

  const httpMappedPath = mapHttpCoverageUrlToPath(undecorated, options.httpUrlRoots);
  if (httpMappedPath) {
    return httpMappedPath;
  }

  if (/^[A-Za-z]:[\\/]/.test(undecorated) || undecorated.startsWith("/")) {
    return path.resolve(undecorated);
  }

  return null;
}

export function normalizeComparablePath(value) {
  return path.resolve(value).replace(/\\/g, "/").toLowerCase();
}

export function buildCoverageRoots({ cwd, lastAppInfo }) {
  const candidates = [
    cwd,
    path.join(cwd, "dist"),
    lastAppInfo?.user_app_path,
    lastAppInfo?.sim_app_path,
    ...(lastAppInfo?.additionalRoots ?? [])
  ].filter(Boolean);

  return Array.from(new Set(candidates.map(normalizeComparablePath)));
}

export function buildCoverageRootsWithAdditionalRoots({ cwd, lastAppInfo, additionalRoots = [] }) {
  return buildCoverageRoots({
    cwd,
    lastAppInfo: {
      ...lastAppInfo,
      additionalRoots
    }
  });
}

export function isRelevantCoveragePath(rawUrl, roots) {
  return isRelevantCoveragePathWithOptions(rawUrl, roots);
}

export function isRelevantCoveragePathWithOptions(rawUrl, roots, options = {}) {
  const resolvedPath = normalizeCoverageFilePathWithOptions(rawUrl, options);
  if (!resolvedPath) {
    return false;
  }

  const comparablePath = normalizeComparablePath(resolvedPath);
  return roots.some((root) => comparablePath.startsWith(root));
}

export function toCoverageDisplayPath(absolutePath, { cwd, lastAppInfo }) {
  const normalizedAbsolutePath = path.resolve(absolutePath);
  const userRoots = [cwd, lastAppInfo?.user_app_path].filter(Boolean).map((root) => path.resolve(root));
  for (const userRoot of userRoots) {
    if (isSubPathOf(normalizedAbsolutePath, userRoot)) {
      return normalizeDisplaySegment(path.relative(userRoot, normalizedAbsolutePath));
    }
  }

  if (lastAppInfo?.sim_app_path) {
    const simulatorRoot = path.resolve(lastAppInfo.sim_app_path);
    if (isSubPathOf(normalizedAbsolutePath, simulatorRoot)) {
      return path.posix.join(
        "simulator-app",
        normalizeDisplaySegment(path.relative(simulatorRoot, normalizedAbsolutePath))
      );
    }
  }

  return normalizeDisplaySegment(normalizedAbsolutePath);
}

export function getSimulatorAppSourceCandidates(cwd) {
  const root = path.resolve(cwd);
  return [
    path.join(root, "app.json"),
    path.join(root, "app.js"),
    path.join(root, "page"),
    path.join(root, "app-side"),
    path.join(root, "setting"),
    path.join(root, "shared"),
    path.join(root, "assets")
  ];
}

export function isSimulatorDeploymentForCurrentProject(lastAppInfo, cwd) {
  if (!lastAppInfo?.user_app_path) {
    return false;
  }

  return normalizeComparablePath(lastAppInfo.user_app_path) === normalizeComparablePath(cwd);
}

function isSubPathOf(candidatePath, rootPath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function normalizeDisplaySegment(value) {
  return value.replace(/\\/g, "/");
}

export function getMockBrowserExecutableCandidates(env = process.env) {
  const override = env[DEFAULT_PLAYWRIGHT_MOCK_BROWSER_EXECUTABLE_ENV];
  return [override, ...WINDOWS_CHROMIUM_CANDIDATES].filter(Boolean);
}

export function resolveSimulatorRoot({
  env = process.env,
  platform = process.platform,
  homeDir = env.HOME || env.USERPROFILE || ""
} = {}) {
  const explicitRoot = env[DEFAULT_ZEPP_SIMULATOR_ROOT_ENV];
  if (explicitRoot) {
    return path.resolve(explicitRoot);
  }

  if (platform === "win32") {
    if (!env.APPDATA) {
      throw new Error(
        `Could not resolve the Zepp simulator root. Set ${DEFAULT_ZEPP_SIMULATOR_ROOT_ENV} or make APPDATA available.`
      );
    }

    return path.resolve(env.APPDATA, "simulator");
  }

  const configHome = env.XDG_CONFIG_HOME || (homeDir ? path.join(homeDir, ".config") : "");
  if (!configHome) {
    throw new Error(
      `Could not resolve the Zepp simulator root. Set ${DEFAULT_ZEPP_SIMULATOR_ROOT_ENV}, XDG_CONFIG_HOME, or HOME.`
    );
  }

  return path.resolve(configHome, "simulator");
}

function mapHttpCoverageUrlToPath(rawUrl, httpUrlRoots = []) {
  if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
    return null;
  }

  for (const rootMapping of httpUrlRoots) {
    if (!rootMapping?.baseUrl || !rootMapping?.localRoot) {
      continue;
    }

    try {
      const candidateUrl = new URL(rawUrl);
      const baseUrl = new URL(rootMapping.baseUrl);

      if (candidateUrl.origin !== baseUrl.origin) {
        continue;
      }

      const basePathname = baseUrl.pathname.endsWith("/") ? baseUrl.pathname : `${baseUrl.pathname}/`;
      if (
        candidateUrl.pathname !== baseUrl.pathname &&
        !candidateUrl.pathname.startsWith(basePathname)
      ) {
        continue;
      }

      const relativePath = candidateUrl.pathname
        .slice(baseUrl.pathname.length)
        .replace(/^\/+/, "");
      return path.resolve(rootMapping.localRoot, decodeURIComponent(relativePath));
    } catch {
      continue;
    }
  }

  return null;
}
