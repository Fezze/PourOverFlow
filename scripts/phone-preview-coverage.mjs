import { Session } from "node:inspector/promises";
import { pathToFileURL } from "node:url";
import istanbulCoverage from "istanbul-lib-coverage";
import v8ToIstanbul from "v8-to-istanbul";

export async function collectPhonePreviewCoverage(bundlePath, source, runFlows) {
  const session = new Session();
  session.connect();
  let scripts;
  try {
    await session.post("Profiler.enable");
    await session.post("Profiler.startPreciseCoverage", { callCount: true, detailed: true });
    await runFlows();
    ({ result: scripts } = await session.post("Profiler.takePreciseCoverage"));
    await session.post("Profiler.stopPreciseCoverage");
  } finally {
    session.disconnect();
  }

  const bundleUrl = pathToFileURL(bundlePath).href;
  const coverageMap = istanbulCoverage.createCoverageMap({});
  for (const script of scripts) {
    if (script.url !== bundlePath && script.url !== bundleUrl) continue;
    // Each locale runs the same bundle in a distinct VM context.
    const converter = v8ToIstanbul(bundlePath, 0, { source });
    await converter.load();
    converter.applyCoverage(script.functions);
    coverageMap.merge(converter.toIstanbul());
  }
  if (!coverageMap.files().length) {
    throw new Error("Phone preview coverage did not capture the Settings bundle.");
  }
  return coverageMap;
}
