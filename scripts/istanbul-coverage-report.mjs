import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import istanbulReport from "istanbul-lib-report";
import istanbulReports from "istanbul-reports";

export async function writeIstanbulReports(coverageMap, outputDir) {
  await mkdir(outputDir, { recursive: true });
  const context = istanbulReport.createContext({ dir: outputDir, coverageMap });
  for (const format of ["html", "json", "lcovonly", "text-summary"]) {
    istanbulReports.create(format).execute(context);
  }
  const summary = coverageMap.getCoverageSummary().toJSON();
  await writeFile(join(outputDir, "summary.json"), JSON.stringify(summary, null, 2));
  return summary;
}
