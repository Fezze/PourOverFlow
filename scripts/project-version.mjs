import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

export const VERSION_FILES = ["package.json", "package-lock.json", "zepp-app/app.json"];
export const BUMP_MODES = ["patch", "minor", "major"];

function readVersionFiles(read) {
  const texts = VERSION_FILES.map(read);
  const [pkg, lock, manifest] = texts.map((text) => JSON.parse(text));
  const name = pkg.version;
  const code = manifest.app.version.code;
  if (typeof name !== "string" || !/^(0|[1-9]\d*)(\.(0|[1-9]\d*)){2}$/.test(name)) {
    throw new Error(`Expected a numeric major.minor.patch version, got ${name}.`);
  }
  if (lock.version !== name || lock.packages?.[""]?.version !== name || manifest.app.version.name !== name) {
    throw new Error(`Version names must agree in ${VERSION_FILES.join(", ")}.`);
  }
  if (!Number.isSafeInteger(code) || code < 0) {
    throw new Error("Expected a non-negative integer Zepp version code.");
  }
  return { texts, documents: [pkg, lock, manifest], name, code };
}

function withVersion(documents, { name, code }) {
  const [pkg, lock, manifest] = structuredClone(documents);
  pkg.version = name;
  lock.version = name;
  lock.packages[""].version = name;
  manifest.app.version.name = name;
  manifest.app.version.code = code;
  return [pkg, lock, manifest];
}

function nextVersion(current, mode) {
  const [major, minor, patch] = current.name.split(".").map(Number);
  const parts = {
    patch: [major, minor, patch + 1],
    minor: [major, minor + 1, 0],
    major: [major + 1, 0, 0]
  }[mode];
  const code = current.code + 1;
  if (!parts || ![...parts, code].every(Number.isSafeInteger)) {
    throw new Error(`Cannot increment version ${current.name} (code ${current.code}) with ${mode}.`);
  }
  return { name: parts.join("."), code };
}

function writeVersion(root, current, next, afterWrite) {
  const files = VERSION_FILES.map((file) => path.join(root, file));
  const texts = withVersion(current.documents, next).map((data) => `${JSON.stringify(data, null, 2)}\n`);
  const written = [];
  try {
    for (const [index, file] of files.entries()) {
      if (texts[index] === current.texts[index]) continue;
      written.push(index);
      writeFileSync(file, texts[index], "utf8");
    }
    afterWrite?.();
  } catch (error) {
    for (const index of written.reverse()) {
      if (readFileSync(files[index], "utf8") !== current.texts[index]) {
        writeFileSync(files[index], current.texts[index], "utf8");
      }
    }
    throw error;
  }
}

function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function readWorkingVersion(root) {
  return readVersionFiles((file) => readFileSync(path.join(root, file), "utf8"));
}

export function bumpVersion(root, mode, { dryRun = false, stage = false, afterWrite } = {}) {
  const current = readWorkingVersion(root);
  const next = nextVersion(current, mode);
  if (!dryRun) {
    writeVersion(root, current, next, () => {
      if (stage) git(root, "add", "--", ...VERSION_FILES);
      afterWrite?.(next);
    });
  }
  console.log(`${dryRun ? "Dry run" : "Version bumped"}: ${current.name} -> ${next.name} (code ${next.code})`);
  return next;
}

export function prepareCommitVersion(root) {
  const staged = readVersionFiles((file) => git(root, "show", `:${file}`));
  const addedManifest = git(root, "diff", "--cached", "--name-only", "--diff-filter=A", "--", VERSION_FILES[2]);
  if (addedManifest.trim()) return;

  const committed = JSON.parse(git(root, "show", `HEAD:${VERSION_FILES[2]}`)).app.version;
  if (staged.name !== committed.name || staged.code !== committed.code) return;

  const working = readWorkingVersion(root);
  if (!isDeepStrictEqual(working.documents, withVersion(staged.documents, working))) {
    throw new Error("Stage or set aside non-version edits in the version files before committing.");
  }

  const hasPendingVersion = working.name !== staged.name || working.code !== staged.code;
  const next = hasPendingVersion ? working : nextVersion(working, "patch");
  writeVersion(root, working, next, () => git(root, "add", "--", ...VERSION_FILES));
  console.log(`Staged version ${next.name} (code ${next.code}).`);
}
