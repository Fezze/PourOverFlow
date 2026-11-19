import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { expect, it } from "vitest";
import { collectPhonePreviewCoverage } from "../scripts/phone-preview-coverage.mjs";

it("maps phone preview execution back to source files and combines both VM contexts", async () => {
  const bundlePath = resolve("phone-coverage-test.bundle.js");
  const sourcePath = resolve("coverage-fixture.js");
  const input = [
    "function english() { return 'en-US'; }",
    "function polish() { return 'pl-PL'; }",
    "function unused() { return 'unused'; }",
    "globalThis.choose = (language) => language === 'pl-PL' ? polish() : english();",
    "globalThis.unused = unused;"
  ].join("\n");
  const { outputFiles } = await build({
    stdin: { contents: input, sourcefile: sourcePath },
    bundle: true,
    outfile: bundlePath,
    sourcemap: "inline",
    write: false
  });
  const source = outputFiles[0].text;

  const report = await collectPhonePreviewCoverage(bundlePath, source, () => {
    for (const locale of ["en-US", "pl-PL"]) {
      const context = { choose: null as null | ((language: string) => string) };
      runInNewContext(source, context, { filename: bundlePath });
      expect(context.choose?.(locale)).toBe(locale);
    }
  });

  expect(report.files()).toEqual([sourcePath]);
  const { fnMap, f } = report.fileCoverageFor(sourcePath).data;
  const count = (name: string) => Object.keys(fnMap)
    .filter((key) => fnMap[key].name === name)
    .reduce((total, key) => total + f[key], 0);
  expect(Object.values(fnMap).map(({ name }) => name)).toEqual(expect.arrayContaining(["english", "polish", "unused"]));
  expect(count("english")).toBeGreaterThan(0);
  expect(count("polish")).toBeGreaterThan(0);
  expect(count("unused")).toBe(0);
});
