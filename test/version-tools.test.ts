import { EventEmitter } from "node:events";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { runGitPush } from "../scripts/git-push-proxy.mjs";
import { bumpVersion, prepareCommitVersion, VERSION_FILES } from "../scripts/project-version.mjs";
import { runVersionProxy } from "../scripts/version-proxy.mjs";
import { runZeusCommand } from "../scripts/run-zeus-command.mjs";

const { existsSync, readFileSync, writeFileSync, execFileSync, spawnSync, spawn } = vi.hoisted(() => ({
  existsSync: vi.fn(), readFileSync: vi.fn(), writeFileSync: vi.fn(),
  execFileSync: vi.fn(), spawnSync: vi.fn(), spawn: vi.fn()
}));
vi.mock("node:fs", () => ({ default: { existsSync }, readFileSync, writeFileSync }));
vi.mock("node:child_process", () => ({ execFileSync, spawnSync, spawn }));

const root = resolve("version-fixture");
const manifest = "zepp-app/app.json";
const pathFor = (relative: string) => resolve(root, relative);
const encode = (object: unknown) => `${JSON.stringify(object, null, 2)}\n`;
let files: Map<string, string>;

function resetVersions(name = "1.2.3", code = 42) {
  files = new Map([
    [pathFor("package.json"), encode({ version: name, description: "Keep me" })],
    [pathFor("package-lock.json"), encode({ version: name, packages: { "": { version: name } } })],
    [pathFor(manifest), encode({ app: { version: { name, code } } })]
  ]);
}

function readVersions() {
  return VERSION_FILES.map((file) => JSON.parse(files.get(pathFor(file))!));
}

beforeEach(() => {
  vi.resetAllMocks();
  resetVersions();
  writeFileSync.mockImplementation((file, value) => { files.set(file, value); });
  readFileSync.mockImplementation((file) => files.get(file));
  existsSync.mockImplementation((file) => file.startsWith(pathFor("zepp-app")) || file.startsWith(pathFor("node_modules")));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

it.each([
  ["patch", "1.2.4"], ["minor", "1.3.0"], ["major", "2.0.0"]
])("updates every version file and stages only requested files for %s", (mode, expected) => {
  expect(runVersionProxy([mode, "--dry-run"], root)).toBe(0);
  expect(writeFileSync).not.toHaveBeenCalled();
  expect(execFileSync).not.toHaveBeenCalled();
  expect(runVersionProxy([mode, "--stage"], root)).toBe(0);
  const [pkg, lock, app] = readVersions();
  expect([pkg.version, lock.version, lock.packages[""].version, app.app.version.name]).toEqual(Array(4).fill(expected));
  expect(app.app.version.code).toBe(43);
  expect(pkg.description).toBe("Keep me");
  expect(execFileSync).toHaveBeenCalledWith("git", ["add", "--", ...VERSION_FILES], expect.objectContaining({ cwd: root }));
});

it("rejects bad versions and restores both partial writes and failed staging", () => {
  const original = new Map(files);
  expect(runVersionProxy(["patch", "--bogus"], root)).toBe(1);
  expect(() => bumpVersion(root, "unknown")).toThrow("Cannot increment");
  writeFileSync.mockImplementationOnce((file, text) => files.set(file, text))
    .mockImplementationOnce(() => { throw new Error("Disk stopped accepting writes"); });
  expect(() => bumpVersion(root, "patch")).toThrow("Disk stopped");
  expect(files).toEqual(original);
  execFileSync.mockImplementationOnce(() => { throw new Error("Index locked"); });
  expect(() => bumpVersion(root, "patch", { stage: true })).toThrow("Index locked");
  expect(files).toEqual(original);
  resetVersions("draft");
  expect(() => bumpVersion(root, "patch")).toThrow("numeric major.minor.patch");
  resetVersions("1.2.3", -1);
  expect(() => bumpVersion(root, "patch")).toThrow("non-negative integer");
  resetVersions();
  files.set(pathFor("package-lock.json"), encode({ version: "0.0.1" }));
  expect(() => bumpVersion(root, "patch")).toThrow("Version names must agree");
});

it("stages a pending version once and rejects mixed unstaged metadata", () => {
  const staged = new Map(files);
  execFileSync.mockImplementation((_command, args) => {
    if (args[0] === "show") return staged.get(pathFor(args[1].split(":")[1]));
    if (args[0] === "diff") return "";
    if (args[0] === "add") {
      for (const [file, text] of files) staged.set(file, text);
      return "";
    }
    throw new Error(`Unexpected command: ${args.join(" ")}`);
  });
  bumpVersion(root, "patch");
  prepareCommitVersion(root);
  expect(readVersions()[0].version).toBe("1.2.4");
  expect(staged.get(pathFor("package.json"))).toBe(files.get(pathFor("package.json")));
  prepareCommitVersion(root);
  expect(readVersions()[0].version).toBe("1.2.5");
  files.set(pathFor("package.json"), encode({ version: "1.2.5", description: "New content" }));
  expect(runVersionProxy(["commit"], root)).toBe(1);
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining("non-version edits"));
});

function stubGit({ changedBranch = false, failSecondPush = false, dirty = false } = {}) {
  let pushes = 0;
  const success = (stdout = "") => ({ status: 0, stdout });
  spawnSync.mockImplementation((_command, args) => {
    switch (args[0]) {
      case "symbolic-ref": return success("main");
      case "config": return success(args[2].endsWith(".remote") ? "origin" : "refs/heads/main");
      case "status": return success(dirty ? "M package.json" : "");
      case "rev-parse": return success(changedBranch && pushes ? "moved" : "initial");
      case "check-ref-format": return success();
      case "commit": return success();
      case "push":
        pushes += 1;
        return failSecondPush && pushes === 2 ? { status: 1, stderr: "Remote rejected update" } : success();
      default: throw new Error(`Unexpected git ${args.join(" ")}`);
    }
  });
}

it("pushes the same ref twice and keeps a successful version commit when the retry fails", () => {
  stubGit({ failSecondPush: true });
  expect(runGitPush(["--dry-run"], root)).toBe(0);
  expect(readVersions()[0].version).toBe("1.2.3");
  expect(runGitPush(["--set-upstream", "mirror", "release"], root)).toBe(1);
  const pushes = spawnSync.mock.calls.map(([, args]) => args).filter(([cmd]) => cmd === "push");
  expect(pushes).toEqual(Array(2).fill(["push", "--set-upstream", "--", "mirror", "HEAD:refs/heads/release"]));
  expect(readVersions()[0].version).toBe("1.3.0");
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining("The version commit is local"));
});

it("refuses dirty version files and a changed checkout without creating a version commit", () => {
  stubGit({ dirty: true });
  expect(runGitPush(["origin", "main"], root)).toBe(1);
  stubGit({ changedBranch: true });
  expect(runGitPush(["origin", "HEAD"], root)).toBe(1);
  expect(runGitPush(["--unsupported"], root)).toBe(1);
  expect(readVersions()[0].version).toBe("1.2.3");
  expect(spawnSync.mock.calls.some(([, args]) => args[0] === "commit")).toBe(false);
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining("checked-out branch changed"));
});

it.each([
  ["Build complete", 0], ["UNRESOLVED_IMPORT", 1], ["could not be resolved", 1]
])("returns Zeus build status for split child output %s", async (output, expected) => {
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() });
  spawn.mockImplementation(() => {
    queueMicrotask(() => {
      child.stdout.emit("data", output.slice(0, 5));
      child.stdout.emit("data", output.slice(5));
      child.emit("close", 0, null);
    });
    return child;
  });
  expect(await runZeusCommand(["build", "--no-version-bump", "-t", "Fixture"], root)).toBe(expected);
  expect(spawn).toHaveBeenCalledWith(expect.stringContaining(join("node_modules", ".bin")), ["build", "-t", "Fixture"],
    expect.objectContaining({ cwd: pathFor("zepp-app") }));
  expect(stdout.mock.calls.map(([chunk]) => chunk).join("")).toBe(output);
});

it("validates argv, leaves versions intact for a dry run, and forwards signals", async () => {
  expect(await runZeusCommand([], root)).toBe(1);
  expect(await runZeusCommand(["dev", "--dry-run", "-t", "Fixture"], root)).toBe(0);
  expect(spawn).not.toHaveBeenCalled();
  expect(readVersions()[0].version).toBe("1.2.3");
  const child = new EventEmitter();
  spawn.mockImplementation(() => {
    queueMicrotask(() => {
      child.emit("error", new Error("Missing executable"));
      child.emit("close", null, "SIGTERM");
    });
    return child;
  });
  expect(await runZeusCommand(["dev"], root)).toBe("SIGTERM");
  expect(readVersions()[0].version).toBe("1.2.4");
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Missing executable"));
});
