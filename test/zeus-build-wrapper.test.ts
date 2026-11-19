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
