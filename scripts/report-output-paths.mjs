import path from "node:path";

export const DEFAULT_REPORTS_ROOT_ENV = "POF_REPORTS_ROOT";
export const DEFAULT_INTERNAL_REPORTS_DIRNAME = "coverage";

export function resolveReportsRoot({
  env = process.env,
  cwd = process.cwd()
} = {}) {
  const explicitRoot = env[DEFAULT_REPORTS_ROOT_ENV];
  if (explicitRoot) {
    return path.resolve(explicitRoot);
  }

  return path.resolve(cwd, DEFAULT_INTERNAL_REPORTS_DIRNAME);
}

export function resolveVitestCoverageDir(options) {
  return resolveReportsRoot(options);
}

export function resolvePlaywrightCoverageDir(mode, options) {
  const normalizedMode = mode === "module-harness" ? "harness" : "simulator";
  return path.resolve(resolveReportsRoot(options), "playwright", normalizedMode);
}
