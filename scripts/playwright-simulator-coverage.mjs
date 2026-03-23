import path from "node:path";
import http from "node:http";
import { chromium } from "playwright-core";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import istanbulCoverage from "istanbul-lib-coverage";
import istanbulReport from "istanbul-lib-report";
import istanbulReports from "istanbul-reports";
import v8ToIstanbul from "v8-to-istanbul";
import {
  buildCoverageRoots,
  buildCoverageRootsWithAdditionalRoots,
  DEFAULT_PLAYWRIGHT_MOCK_BROWSER_EXECUTABLE_ENV,
  isInspectablePageUrl,
  isRelevantCoveragePathWithOptions,
  getMockBrowserExecutableCandidates,
  normalizeCoverageFilePathWithOptions,
  parseDevToolsActivePort,
  parsePlaywrightCoverageArgs,
  toCoverageDisplayPath
} from "./playwright-coverage-helpers.mjs";

const PROJECT_ROOT = process.cwd();
const { createCoverageMap } = istanbulCoverage;
const { createContext } = istanbulReport;
const { create: createReport } = istanbulReports;

await main();

async function main() {
  try {
    const options = parsePlaywrightCoverageArgs(process.argv.slice(2));
    if (options.mode === "module-harness") {
      await runModuleHarnessCoverage(options);
      return;
    }

    await runSimulatorCoverage(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Playwright simulator coverage failed: ${message}`);
    if (message.includes("ECONNREFUSED")) {
      console.error(
        "The Zepp simulator DevTools endpoint was not reachable. Start the simulator, deploy with `zeus dev`, and then rerun `npm run test:playwright:coverage`."
      );
    }
    process.exitCode = 1;
  }
}

async function runSimulatorCoverage(options) {
  const simulatorRoot = path.join(resolveAppData(), "simulator");
  const devToolsPortPath = path.join(simulatorRoot, "DevToolsActivePort");
  const lastAppInfoPath = path.join(simulatorRoot, "last_app_info.json");
  const outputDir = path.resolve(PROJECT_ROOT, options.outputDir);
  const metadata = {
    mode: "simulator",
    startedAt: new Date().toISOString(),
    durationMs: options.durationMs,
    outputDir
  };

  const devToolsInfo = parseDevToolsActivePort(await readFile(devToolsPortPath, "utf8"));
  metadata.devToolsPort = devToolsInfo.port;
  metadata.devToolsBrowserPath = devToolsInfo.browserPath;

  const lastAppInfo = await readJsonIfExists(lastAppInfoPath);
  const coverageRoots = buildCoverageRoots({ cwd: PROJECT_ROOT, lastAppInfo });
  metadata.coverageRoots = coverageRoots;
  metadata.lastAppInfo = lastAppInfo;

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${devToolsInfo.port}`);

  try {
    const sessions = new Map();
    const pageRegistry = [];
    const deadline = Date.now() + options.durationMs;
    while (Date.now() < deadline) {
      await attachCoverageToNewPages(browser, sessions, pageRegistry, options.verbose);
      await sleep(500);
    }

    const rawEntries = [];
    for (const coverageSession of sessions.values()) {
      const collected = await stopCoverageSession(coverageSession);
      rawEntries.push(...collected);
    }

    await writeCoverageArtifacts({
      metadata,
      outputDir,
      rawEntries,
      coverageRoots,
      lastAppInfo,
      verbose: options.verbose,
      emptyMessage:
        "Playwright simulator coverage found no relevant app scripts. Keep the simulator app open and interact with the flow while coverage is collecting."
    });
  } finally {
    await browser.close();
  }
}

async function runModuleHarnessCoverage(options) {
  const outputDir = path.resolve(PROJECT_ROOT, options.outputDir);
  const fixtureRoot = path.join(PROJECT_ROOT, "test", "fixtures", "playwright-coverage");
  const harnessPagePath = path.join(fixtureRoot, "module-harness.html");
  const harnessScriptPath = path.join(fixtureRoot, "module-harness.js");
  const executablePath = await resolveMockBrowserExecutable();
  const harnessServer = await startStaticFileServer(PROJECT_ROOT);
  const harnessBaseUrl = `${harnessServer.baseUrl}/test/fixtures/playwright-coverage/module-harness.html`;
  const normalizeOptions = {
    httpUrlRoots: [
      {
        baseUrl: harnessServer.baseUrl,
        localRoot: PROJECT_ROOT
      }
    ]
  };
  const coverageRoots = buildCoverageRootsWithAdditionalRoots({
    cwd: PROJECT_ROOT,
    lastAppInfo: null,
    additionalRoots: [fixtureRoot]
  });
  const metadata = {
    mode: "module-harness",
    startedAt: new Date().toISOString(),
    durationMs: options.durationMs,
    outputDir,
    harnessPagePath,
    harnessScriptPath,
    harnessBaseUrl,
    executablePath,
    coverageRoots
  };

  const browser = await chromium.launch({
    executablePath,
    headless: true
  });

  try {
    const page = await browser.newPage();
    await page.coverage.startJSCoverage({
      reportAnonymousScripts: false,
      resetOnNavigation: false
    });
    await page.goto(harnessBaseUrl);
    await page.waitForFunction(() => window.__POF_PLAYWRIGHT_COVERAGE_STATE__?.done === true, undefined, {
      timeout: options.durationMs
    });
    const harnessState = await page.evaluate(() => window.__POF_PLAYWRIGHT_COVERAGE_STATE__);
    if (!harnessState || harnessState.status !== "ready") {
      const statusText = await page.textContent("#status").catch(() => "unknown error");
      throw new Error(
        `Module harness failed: ${harnessState?.error || statusText || "unknown error"}`
      );
    }
    const rawEntries = await page.coverage.stopJSCoverage();
    await writeCoverageArtifacts({
      metadata,
      outputDir,
      rawEntries,
      coverageRoots,
      lastAppInfo: null,
      normalizeOptions,
      verbose: options.verbose,
      emptyMessage:
        "Playwright module harness coverage found no relevant scripts. Check that the harness page loaded and executed the project scenarios."
    });
  } finally {
    await browser.close();
    await stopStaticFileServer(harnessServer.server);
  }
}

function resolveAppData() {
  if (!process.env.APPDATA) {
    throw new Error("APPDATA is not available, so the simulator DevTools port file could not be located.");
  }

  return process.env.APPDATA;
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function resolveMockBrowserExecutable() {
  for (const candidatePath of getMockBrowserExecutableCandidates(process.env)) {
    if (await fileExists(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error(
    `No Chromium-family browser executable was found for module-harness coverage. Set ${DEFAULT_PLAYWRIGHT_MOCK_BROWSER_EXECUTABLE_ENV} to a valid browser path.`
  );
}

async function attachCoverageToNewPages(browser, sessions, pageRegistry, verbose) {
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      if (sessions.has(page) || !isInspectablePageUrl(page.url())) {
        continue;
      }

      try {
        const session = await context.newCDPSession(page);
        await session.send("Profiler.enable");
        await session.send("Profiler.startPreciseCoverage", {
          callCount: true,
          detailed: true
        });
        sessions.set(page, {
          session,
          pageUrl: page.url(),
          attachedAt: new Date().toISOString()
        });
        pageRegistry.push({
          url: page.url(),
          attachedAt: new Date().toISOString()
        });
        if (verbose) {
          console.log(`Attached coverage to page: ${page.url() || "about:blank"}`);
        }
      } catch (error) {
        if (verbose) {
          console.warn(`Skipping page that refused coverage attach: ${page.url()} :: ${String(error)}`);
        }
      }
    }
  }
}

async function stopCoverageSession(coverageSession) {
  try {
    const { result } = await coverageSession.session.send("Profiler.takePreciseCoverage");
    return result ?? [];
  } catch {
    return [];
  } finally {
    await safelySend(coverageSession.session, "Profiler.stopPreciseCoverage");
    await safelySend(coverageSession.session, "Profiler.disable");
  }
}

async function safelySend(session, method) {
  try {
    await session.send(method);
  } catch {
    // Ignore teardown errors for pages that vanished during collection.
  }
}

async function convertCoverageEntry(entry, { cwd, lastAppInfo, normalizeOptions, verbose }) {
  const absolutePath = normalizeCoverageFilePathWithOptions(entry.url, normalizeOptions);
  if (!absolutePath || !(await fileExists(absolutePath))) {
    if (verbose) {
      console.warn(`Skipping coverage entry with unreadable file path: ${entry.url}`);
    }
    return null;
  }

  const displayPath = toCoverageDisplayPath(absolutePath, { cwd, lastAppInfo });
  const converter = v8ToIstanbul(absolutePath, 0, {
    source: await readFile(absolutePath, "utf8")
  });

  await converter.load();
  converter.applyCoverage(entry.functions);

  const istanbulCoverage = converter.toIstanbul();
  const remappedCoverage = {};
  for (const [key, value] of Object.entries(istanbulCoverage)) {
    const mappedPath = key === absolutePath ? displayPath : toCoverageDisplayPath(key, { cwd, lastAppInfo });
    remappedCoverage[mappedPath] = {
      ...value,
      path: mappedPath
    };
  }

  return {
    absolutePath,
    displayPath,
    coverage: remappedCoverage
  };
}

async function writeCoverageArtifacts({
  metadata,
  outputDir,
  rawEntries,
  coverageRoots,
  lastAppInfo,
  normalizeOptions,
  verbose,
  emptyMessage
}) {
  const coverageMap = createCoverageMap({});
  const relevantEntries = rawEntries.filter((entry) =>
    isRelevantCoveragePathWithOptions(entry.url, coverageRoots, normalizeOptions)
  );
  const convertedFiles = [];
  for (const entry of relevantEntries) {
    const converted = await convertCoverageEntry(entry, {
      cwd: PROJECT_ROOT,
      lastAppInfo,
      normalizeOptions,
      verbose
    });
    if (!converted) {
      continue;
    }

    coverageMap.merge(converted.coverage);
    convertedFiles.push({
      url: entry.url,
      absolutePath: converted.absolutePath,
      displayPath: converted.displayPath
    });
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, "metadata.json"),
    JSON.stringify(
      {
        ...metadata,
        rawEntryCount: rawEntries.length,
        relevantEntryCount: relevantEntries.length,
        convertedFiles
      },
      null,
      2
    )
  );
  await writeFile(path.join(outputDir, "v8-coverage.json"), JSON.stringify(rawEntries, null, 2));

  if (convertedFiles.length === 0) {
    console.warn(emptyMessage);
    process.exitCode = 0;
    return;
  }

  const reportContext = createContext({
    dir: outputDir,
    coverageMap
  });

  createReport("html").execute(reportContext);
  createReport("json").execute(reportContext);
  createReport("lcovonly").execute(reportContext);
  createReport("text-summary").execute(reportContext);

  const summary = coverageMap.getCoverageSummary().toJSON();
  await writeFile(path.join(outputDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(`Playwright coverage written to ${outputDir}`);
  console.log(
    `Statements ${summary.statements.pct}% | Branches ${summary.branches.pct}% | Functions ${summary.functions.pct}% | Lines ${summary.lines.pct}%`
  );
}

async function fileExists(filePath) {
  try {
    const fileStats = await stat(filePath);
    return fileStats.isFile();
  } catch {
    return false;
  }
}

function sleep(durationMs) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

function pathToFileUrl(filePath) {
  return `file:///${path.resolve(filePath).replace(/\\/g, "/")}`;
}

async function startStaticFileServer(rootDir) {
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
      const filePath = path.resolve(rootDir, relativePath || "index.html");

      if (!isSubPath(filePath, rootDir) || !(await fileExists(filePath))) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      const content = await readFile(filePath);
      response.writeHead(200, {
        "Content-Type": getContentType(filePath),
        "Cache-Control": "no-store"
      });
      response.end(content);
    } catch (error) {
      response.writeHead(500);
      response.end(String(error));
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

async function stopStaticFileServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

function isSubPath(candidatePath, rootPath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function getContentType(filePath) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }

  if (filePath.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }

  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }

  return "text/plain; charset=utf-8";
}
