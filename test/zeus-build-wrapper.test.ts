import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test.skipIf(process.platform === "win32").each([false, true])("build wrapper handles unresolved imports=%s despite Zeus exiting zero", (unresolved) => {
  const root = mkdtempSync(path.join(tmpdir(), "pof-zeus-"));
  try {
    mkdirSync(path.join(root, "zepp-app"));
    writeFileSync(path.join(root, "zepp-app", "app.json"), "{}");
    const bin = path.join(root, "node_modules", ".bin");
    mkdirSync(bin, { recursive: true });
    writeFileSync(path.join(bin, "zeus"), `#!/usr/bin/env node\nconsole.log(${JSON.stringify(unresolved ? "'zosLoader:./index.[pf].layout.js' could not be resolved" : "Build completed")});\n`, { mode: 0o755 });
    const result = spawnSync(process.execPath, [path.resolve(__dirname, "../scripts/run-zeus-command.mjs"), "build", "--no-version-bump"], { cwd: root, encoding: "utf8" });
    expect(result.status).toBe(unresolved ? 1 : 0);
    if (unresolved) expect(result.stderr).toContain("refusing to report success");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test.skipIf(process.platform === "win32")("build wrapper relays a real child exit and preserves the requested cwd", async () => {
  const { runZeusCommand } = await import("../scripts/run-zeus-command.mjs");
  const root = mkdtempSync(path.join(tmpdir(), "pof-zeus-process-"));
  try {
    const appRoot = path.join(root, "zepp-app");
    const bin = path.join(root, "node_modules", ".bin");
    for (const folder of [bin, path.join(appRoot, "page"), path.join(appRoot, "shared")]) {
      mkdirSync(folder, { recursive: true });
    }
    writeFileSync(path.join(appRoot, "app.json"), "{}");
    writeFileSync(path.join(appRoot, "app.js"), "");
    writeFileSync(path.join(bin, "zeus"), `#!/usr/bin/env node
if (!process.cwd().endsWith("zepp-app") || process.argv[2] !== "build") process.exit(5);
process.stderr.write("UNRESOLVED_");
process.stderr.write("IMPORT");
`, { mode: 0o755 });
    expect(await runZeusCommand(["build", "--no-version-bump"], root)).toBe(1);
    expect(await runZeusCommand(["dev", "--dry-run", "--no-version-bump", "-t", "Fixture"], root)).toBe(0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
