import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { runGitPush } from "../scripts/git-push-proxy.mjs";
import { runVersionProxy } from "../scripts/version-proxy.mjs";

const source = path.resolve(__dirname, "..");
const versionFiles = ["package.json", "package-lock.json", "zepp-app/app.json"];
let sandbox: string;
let root: string;

function git(...args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function run(script: string, ...args: string[]) {
  if (script === "run-zeus-command") {
    return spawnSync(process.execPath, [path.join("scripts", `${script}.mjs`), ...args], { cwd: root, encoding: "utf8" });
  }
  const output = vi.spyOn(console, "log").mockImplementation(() => {});
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const command = script === "version-proxy" ? runVersionProxy : runGitPush;
    const status = command(args, root);
    return {
      status,
      stdout: output.mock.calls.map((args) => args.join(" ")).join("\n"),
      stderr: errors.mock.calls.map((args) => args.join(" ")).join("\n")
    };
  } finally {
    output.mockRestore();
    errors.mockRestore();
  }
}

function write(file: string, value: string, mode?: number) {
  writeFileSync(path.join(root, file), value, { mode });
}

function readVersions(ref?: string) {
  const [pkg, lock, manifest] = versionFiles.map((file) => JSON.parse(ref
    ? git("show", `${ref}:${file}`)
    : readFileSync(path.join(root, file), "utf8")));
  return [pkg.version, lock.version, lock.packages[""].version, manifest.app.version.name, manifest.app.version.code];
}

function expectVersion(name: string, code: number, ref?: string) {
  expect(readVersions(ref)).toEqual([name, name, name, name, code]);
}

function addRemote() {
  const remote = path.join(sandbox, "remote.git");
  git("init", "--bare", "--initial-branch=main", remote);
  git("remote", "add", "origin", remote);
  return remote;
}

beforeEach(() => {
  sandbox = mkdtempSync(path.join(tmpdir(), "pof-version-"));
  root = path.join(sandbox, "checkout");
  for (const dir of ["scripts", "zepp-app", ".githooks"]) mkdirSync(path.join(root, dir), { recursive: true });
  for (const file of [
    "scripts/project-version.mjs", "scripts/version-proxy.mjs", "scripts/git-push-proxy.mjs",
    "scripts/run-zeus-command.mjs", "scripts/zepp-app-root.mjs", "scripts/cli-entry.mjs", ".githooks/pre-commit"
  ]) {
    copyFileSync(path.join(source, file), path.join(root, file));
  }
  write("package.json", JSON.stringify({ name: "test-fixture", version: "1.2.3" }));
  write("package-lock.json", JSON.stringify({ version: "1.2.3", packages: { "": { version: "1.2.3" } } }));
  write("zepp-app/app.json", JSON.stringify({ app: { version: { name: "1.2.3", code: 42 } } }));
  git("init", "--initial-branch=main");
  git("config", "user.name", "Version Test");
  git("config", "user.email", "version@example.test");
  git("config", "commit.gpgsign", "false");
  git("config", "core.hooksPath", ".githooks");
  git("add", ".");
  git("commit", "-m", "Initial app");
});

afterEach(() => rmSync(sandbox, { recursive: true, force: true }));

test.each([["patch", "1.2.4"], ["minor", "1.3.0"], ["major", "2.0.0"]])(
  "%s increments synchronized versions and preserves the staged index unless requested",
  (mode, expected) => {
    const dryRun = run("version-proxy", mode, "--dry-run", "--stage");
    expect(dryRun.status, dryRun.stderr).toBe(0);
    expect(dryRun.stdout).toContain(expected);
    expect(git("status", "--porcelain")).toBe("");

    const actual = run("version-proxy", mode);
    expect(actual.status, actual.stderr).toBe(0);
    expectVersion(expected, 43);
    expect(git("diff", "--cached", "--name-only")).toBe("");
  }
);

test.skipIf(process.platform === "win32")("Zeus sees the patch build and dev versions with options forwarded", () => {
  mkdirSync(path.join(root, "node_modules", ".bin"), { recursive: true });
  write("node_modules/.bin/zeus", `#!/usr/bin/env node
const fs = require("node:fs");
const { name } = JSON.parse(fs.readFileSync("app.json", "utf8")).app.version;
console.log(name, ...process.argv.slice(2));
`, 0o755);

  for (const [args, name, output] of [
    [["build"], "1.2.4", "build"],
    [["dev", "-t", "Amazfit Balance"], "1.2.5", "dev -t Amazfit Balance"],
    [["build", "--no-version-bump"], "1.2.5", "build"],
    [["dev", "--no-version-bump"], "1.2.5", "dev"],
    [["preview"], "1.2.5", "preview"],
    [["bridge"], "1.2.5", "bridge"]
  ] as const) {
    const result = run("run-zeus-command", ...args);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(`${name} ${output}\n`);
  }
  const dryRun = run("run-zeus-command", "build", "--dry-run");
  expect(dryRun.status, dryRun.stderr).toBe(0);
  expect(dryRun.stdout).toContain("1.2.5 -> 1.2.6");
  expectVersion("1.2.5", 44);
});

test("commit patches the indexed metadata even when package.json contains staged edits", () => {
  write("package.json", JSON.stringify({ name: "renamed-fixture", version: "1.2.3" }));
  git("add", "package.json");
  git("commit", "-m", "Rename app package");
  expectVersion("1.2.4", 43, "HEAD");
  expect(JSON.parse(git("show", "HEAD:package.json")).name).toBe("renamed-fixture");
  expect(git("status", "--porcelain")).toBe("");
});

test.each([false, true])("commit reuses an existing bump (pre-staged=%s)", (staged) => {
  const result = run("version-proxy", "minor", ...(staged ? ["--stage"] : []));
  expect(result.status, result.stderr).toBe(0);
  write("feature.txt", "feature");
  git("add", "feature.txt");
  git("commit", "-m", "Add a feature");
  expectVersion("1.3.0", 43, "HEAD");
  expect(git("status", "--porcelain")).toBe("");
});

test("commit preserves unstaged metadata edits instead of including them in the bump", () => {
  write("package.json", JSON.stringify({ name: "unstaged-name", version: "1.2.3" }));
  write("feature.txt", "feature");
  git("add", "feature.txt");
  expect(() => git("commit", "-m", "Add a feature")).toThrow("Stage or set aside non-version edits");
  expectVersion("1.2.3", 42);
  expect(git("diff", "--cached", "--name-only")).toBe("feature.txt");
  expect(git("diff", "--name-only")).toBe("package.json");
});

test("version mismatch stops the bump before changing any file", () => {
  write("zepp-app/app.json", JSON.stringify({ app: { version: { name: "2.0.0", code: 42 } } }));
  const result = run("version-proxy", "patch");
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Version names must agree");
  expect(git("diff", "--name-only")).toBe("zepp-app/app.json");
});

test("a failed git add restores the original working versions", () => {
  write(".git/index.lock", "");
  const result = run("version-proxy", "patch", "--stage");
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("index.lock");
  expect(git("status", "--porcelain")).toBe("");
  expectVersion("1.2.3", 42);
});

test("push makes a minor-only commit and sends it to the same branch", () => {
  addRemote();
  write("feature.txt", "still staged");
  git("add", "feature.txt");
  const result = run("git-push-proxy", "-u", "origin", "main");
  expect(result.status, result.stderr).toBe(0);
  expectVersion("1.3.0", 43, "HEAD");
  expect(git("log", "-1", "--format=%s")).toBe("Bump version to 1.3.0");
  expect(git("diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD").split("\n")).toEqual([
    "package-lock.json", "package.json", "zepp-app/app.json"
  ]);
  expect(git("diff", "--cached", "--name-only")).toBe("feature.txt");
  expect(git("ls-remote", "origin", "refs/heads/main").split("\t")[0]).toBe(git("rev-parse", "HEAD"));
  const dryRun = run("git-push-proxy", "--dry-run");
  expect(dryRun.status, dryRun.stderr).toBe(0);
  expect(dryRun.stdout).toContain("HEAD:refs/heads/main");
  expectVersion("1.3.0", 43);
});

test("failed initial push leaves the version and commit untouched", () => {
  const original = git("rev-parse", "HEAD");
  const result = run("git-push-proxy", "absent-remote", "main");
  expect(result.status).toBe(1);
  expect(git("rev-parse", "HEAD")).toBe(original);
  expect(git("status", "--porcelain")).toBe("");
});

test.skipIf(process.platform === "win32")("failed version commit restores the working versions", () => {
  addRemote();
  write(".githooks/commit-msg", "#!/bin/sh\nexit 1\n", 0o755);
  const original = git("rev-parse", "HEAD");
  const result = run("git-push-proxy", "origin", "main");
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("git commit failed");
  expect(git("rev-parse", "HEAD")).toBe(original);
  expect(git("status", "--porcelain")).toBe("?? .githooks/commit-msg");
  expectVersion("1.2.3", 42);
});

test.skipIf(process.platform === "win32")("rejected second push preserves a retryable version commit", () => {
  const remote = addRemote();
  const initialHead = git("rev-parse", "HEAD");
  writeFileSync(path.join(remote, "hooks", "pre-receive"), `#!/bin/sh
read old new ref
test "$new" = "${initialHead}"
`, { mode: 0o755 });
  const result = run("git-push-proxy", "origin", "main");
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("The version commit is local");
  expectVersion("1.3.0", 43, "HEAD");
  expect(git("status", "--porcelain")).toBe("");
  expect(git("ls-remote", "origin", "refs/heads/main").split("\t")[0]).toBe(initialHead);
});


test("in-process versioning and push agree with the local repository and staged hook", () => {
  addRemote();
  expect(runVersionProxy(["patch", "--dry-run"], root)).toBe(0);
  expectVersion("1.2.3", 42);
  expect(runVersionProxy(["patch", "--stage"], root)).toBe(0);
  expectVersion("1.2.4", 43);
  expect(runVersionProxy(["commit"], root)).toBe(0);
  git("commit", "-m", "Release patch");
  expect(runGitPush(["--dry-run", "origin", "main"], root)).toBe(0);
  expect(runGitPush(["origin", "main"], root)).toBe(0);
  expectVersion("1.3.0", 44, "HEAD");
  expect(git("ls-remote", "origin", "refs/heads/main").split("\t")[0]).toBe(git("rev-parse", "HEAD"));
  expect(runGitPush(["absent-remote", "main"], root)).toBe(1);
  expectVersion("1.3.0", 44, "HEAD");
});
