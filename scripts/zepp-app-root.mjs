import fs from "node:fs";
import path from "node:path";

export const ZEPP_APP_DIRNAME = "zepp-app";

export function resolveZeppAppRoot({ cwd = process.cwd() } = {}) {
  let currentDir = path.resolve(cwd);
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
      return path.join(path.resolve(cwd), ZEPP_APP_DIRNAME);
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
