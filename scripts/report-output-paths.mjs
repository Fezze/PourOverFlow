import path from "node:path";

export const DEFAULT_REPORTS_ROOT_ENV = "POF_REPORTS_ROOT";
export const DEFAULT_INTERNAL_REPORTS_DIRNAME = "coverage";

function isWindowsAbsolutePath(value) {
  return typeof value === "string" && /^[A-Za-z]:[\\/]/.test(value);
}

function resolvePortablePath(...segments) {
  const filteredSegments = segments.filter((segment) => segment !== undefined && segment !== null && segment !== "");
  const firstSegment = filteredSegments[0];
  if (isWindowsAbsolutePath(firstSegment)) {
    return path.win32.resolve(...filteredSegments);
  }

  return path.resolve(...filteredSegments);
}

export function resolveReportsRoot({
  env = process.env,
  cwd = process.cwd()
} = {}) {
  const explicitRoot = env[DEFAULT_REPORTS_ROOT_ENV];
  if (explicitRoot) {
    return resolvePortablePath(explicitRoot);
  }

  return resolvePortablePath(cwd, DEFAULT_INTERNAL_REPORTS_DIRNAME);
}

export function resolveVitestCoverageDir(options) {
  return resolveReportsRoot(options);
}

export function resolvePlaywrightCoverageDir(mode, options) {
  const normalizedMode = mode === "module-harness" ? "harness" : "simulator";
  return resolvePortablePath(resolveReportsRoot(options), "playwright", normalizedMode);
}
