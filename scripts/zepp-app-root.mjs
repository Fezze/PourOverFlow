import fs from "node:fs";
import path from "node:path";

export const ZEPP_APP_DIRNAME = "zepp-app";

export function stripWindowsNamespacePrefix(candidatePath) {
  if (typeof candidatePath !== "string") {
    return candidatePath;
  }

  if (candidatePath.startsWith("\\\\?\\UNC\\")) {
    return `\\\\${candidatePath.slice("\\\\?\\UNC\\".length)}`;
  }

  if (candidatePath.startsWith("\\\\?\\")) {
    return candidatePath.slice("\\\\?\\".length);
  }

  return candidatePath;
}

export function resolveZeppAppRoot({ cwd = process.cwd() } = {}) {
  const normalizedCwd = path.resolve(stripWindowsNamespacePrefix(cwd));
  let currentDir = normalizedCwd;
  while (true) {
    if (isZeppAppRoot(currentDir)) {
      return currentDir;
    }

    const nestedAppRoot = path.join(currentDir, ZEPP_APP_DIRNAME);
    if (isZeppAppRoot(nestedAppRoot)) {
      return nestedAppRoot;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return path.join(normalizedCwd, ZEPP_APP_DIRNAME);
    }

    currentDir = parentDir;
  }
}

function isZeppAppRoot(candidatePath) {
  return (
    fs.existsSync(path.join(candidatePath, "app.json")) &&
    fs.existsSync(path.join(candidatePath, "app.js")) &&
    fs.existsSync(path.join(candidatePath, "page")) &&
    fs.existsSync(path.join(candidatePath, "shared"))
  );
}
