import path from "node:path";
import http from "node:http";
import os from "node:os";
import { chromium } from "playwright-core";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import istanbulCoverage from "istanbul-lib-coverage";
import istanbulReport from "istanbul-lib-report";
import istanbulReports from "istanbul-reports";
import v8ToIstanbul from "v8-to-istanbul";
import {
  buildCoverageRoots,
  buildCoverageRootsWithAdditionalRoots,
  DEFAULT_SIMULATOR_DEPLOYMENT_FRESHNESS_TOLERANCE_MS,
  DEFAULT_PLAYWRIGHT_MOCK_BROWSER_EXECUTABLE_ENV,
  getSimulatorAppSourceCandidates,
  isInspectablePageUrl,
  isSimulatorDeploymentForCurrentProject,
  isRelevantCoveragePathWithOptions,
  getMockBrowserExecutableCandidates,
  resolveSimulatorRoot,
  normalizeCoverageFilePathWithOptions,
  parseDevToolsActivePort,
  parsePlaywrightCoverageArgs,
  toCoverageDisplayPath
} from "./playwright-coverage-helpers.mjs";
import { resolveZeppAppRoot } from "./zepp-app-root.mjs";

const PROJECT_ROOT = process.cwd();
const ZEPP_APP_ROOT = resolveZeppAppRoot({ cwd: PROJECT_ROOT });
const { createCoverageMap } = istanbulCoverage;
const { createContext } = istanbulReport;
const { create: createReport } = istanbulReports;

await main();

async function main() {
  let options = null;
  try {
    options = parsePlaywrightCoverageArgs(process.argv.slice(2));
    if (options.mode === "module-harness") {
      await runModuleHarnessCoverage(options);
      return;
    }

    if (options.collectCoverage) {
      throw new Error(
        "Simulator Playwright V8 coverage was removed from the repo-standard test menu because the current Zepp simulator exposes shell/framework/preload scripts instead of reliable PourOverFlow app-code coverage. Use `npm run test:playwright` for simulator smoke or `npm run test:playwright:coverage:harness` for meaningful Playwright coverage."
      );
    }

    await runSimulatorCoverage(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Playwright validation failed: ${message}`);
    if (options?.mode !== "module-harness" && message.includes("ECONNREFUSED")) {
      console.error(
        "The Zepp simulator DevTools endpoint was not reachable. Start the simulator, deploy with `zeus dev`, and then rerun `npm run test:playwright`."
      );
    }
    process.exitCode = 1;
  }
}

async function runSimulatorCoverage(options) {
  const simulatorRoot = resolveSimulatorRoot({
    env: process.env,
    platform: process.platform,
    homeDir: os.homedir()
  });
  const devToolsPortPath = path.join(simulatorRoot, "DevToolsActivePort");
  const lastAppInfoPath = path.join(simulatorRoot, "last_app_info.json");
  const outputDir = path.resolve(PROJECT_ROOT, options.outputDir);
  const metadata = {
    mode: "simulator",
    startedAt: new Date().toISOString(),
    durationMs: options.durationMs,
    outputDir,
    simulatorRoot
  };

  const devToolsInfo = parseDevToolsActivePort(await readFile(devToolsPortPath, "utf8"));
  metadata.devToolsPort = devToolsInfo.port;
  metadata.devToolsBrowserPath = devToolsInfo.browserPath;

  const lastAppInfo = await readJsonIfExists(lastAppInfoPath);
  const coverageRoots = buildCoverageRoots({ cwd: ZEPP_APP_ROOT, lastAppInfo });
  metadata.coverageRoots = coverageRoots;
  metadata.lastAppInfo = lastAppInfo;

  await assertFreshSimulatorDeployment({
    projectRoot: ZEPP_APP_ROOT,
    lastAppInfo
  });

  if (!options.collectCoverage) {
    const pageRegistry = await pollInspectableSimulatorPages({
      devToolsPort: devToolsInfo.port,
      durationMs: options.durationMs,
      verbose: options.verbose
    });

    if (pageRegistry.length === 0) {
      throw new Error(
        "Playwright simulator smoke run observed no inspectable simulator pages. Start the simulator, deploy with `zeus dev`, keep the app open, and rerun `npm run test:playwright`."
      );
    }

    console.log(
      `Playwright simulator smoke run observed ${pageRegistry.length} inspectable page(s) without collecting coverage.`
    );
    return;
  }

  const sessions = new Map();
  const pageRegistry = [];

  try {
    const deadline = Date.now() + options.durationMs;
    while (Date.now() < deadline) {
      await attachCoverageToNewSimulatorPages({
        devToolsPort: devToolsInfo.port,
        sessions,
        pageRegistry,
        verbose: options.verbose
      });
      await sleep(500);
    }

    metadata.observedPages = pageRegistry;

    const rawEntries = [];
    for (const coverageSession of sessions.values()) {
      const collected = await stopSimulatorCoverageSession(coverageSession);
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
    for (const coverageSession of sessions.values()) {
      await coverageSession.session.close();
    }
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
    if (options.collectCoverage) {
      await page.coverage.startJSCoverage({
        reportAnonymousScripts: false,
        resetOnNavigation: false
      });
    }
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
    if (!options.collectCoverage) {
      console.log("Playwright module harness smoke run completed without collecting coverage.");
      return;
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

async function pollInspectableSimulatorPages({ devToolsPort, durationMs, verbose }) {
  const pageRegistry = [];
  const deadline = Date.now() + durationMs;

  while (Date.now() < deadline) {
    const pages = await fetchInspectableSimulatorPages(devToolsPort);
    for (const page of pages) {
      if (!pageRegistry.some((entry) => entry.url === page.url)) {
        pageRegistry.push({
          url: page.url,
          title: page.title ?? null,
          observedAt: new Date().toISOString()
        });
        if (verbose) {
          console.log(`Observed simulator page: ${page.url || "about:blank"}`);
        }
      }
    }
    await sleep(500);
  }

  return pageRegistry;
}

async function fetchInspectableSimulatorPages(devToolsPort) {
  const response = await fetch(`http://127.0.0.1:${devToolsPort}/json/list`);
  if (!response.ok) {
    throw new Error(`Simulator DevTools list request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.filter((page) => isInspectablePageUrl(page?.url));
}

async function assertFreshSimulatorDeployment({ projectRoot, lastAppInfo }) {
  if (!lastAppInfo) {
    throw new Error(
      "Simulator deployment metadata is missing. Deploy the current repo with `zeus dev` before running simulator tests."
    );
  }

  if (!isSimulatorDeploymentForCurrentProject(lastAppInfo, projectRoot)) {
    throw new Error(
      `Simulator last_app_info.json points at ${lastAppInfo.user_app_path || "an unknown project"}, not ${projectRoot}. Deploy the current repo with \`zeus dev\` before running simulator tests.`
    );
  }

  if (!lastAppInfo.sim_app_path) {
    throw new Error(
      "Simulator deployment metadata does not contain sim_app_path. Deploy the current repo with `zeus dev` before running simulator tests."
    );
  }

  const latestSourceMtimeMs = await getLatestMtimeMs(getSimulatorAppSourceCandidates(projectRoot));
  const latestDeployedMtimeMs = await getLatestMtimeMs([lastAppInfo.sim_app_path]);

  if (!Number.isFinite(latestDeployedMtimeMs)) {
    throw new Error(
      `Simulator app path ${lastAppInfo.sim_app_path} does not contain a deployed app build. Deploy the current repo with \`zeus dev\` before running simulator tests.`
    );
  }

  if (
    Number.isFinite(latestSourceMtimeMs) &&
    latestSourceMtimeMs > latestDeployedMtimeMs + DEFAULT_SIMULATOR_DEPLOYMENT_FRESHNESS_TOLERANCE_MS
  ) {
    throw new Error(
      `Simulator deployment is stale. Latest local app source change is newer than the deployed simulator app by more than ${DEFAULT_SIMULATOR_DEPLOYMENT_FRESHNESS_TOLERANCE_MS}ms. Redeploy with \`zeus dev\` before running simulator tests.`
    );
  }
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

async function attachCoverageToNewSimulatorPages({ devToolsPort, sessions, pageRegistry, verbose }) {
  const pages = await fetchInspectableSimulatorPages(devToolsPort);
  for (const page of pages) {
    if (!page?.webSocketDebuggerUrl || sessions.has(page.webSocketDebuggerUrl)) {
      continue;
    }

    try {
      const session = await createCdpSession(page.webSocketDebuggerUrl);
      await session.send("Profiler.enable");
      await session.send("Profiler.startPreciseCoverage", {
        callCount: true,
        detailed: true
      });
      sessions.set(page.webSocketDebuggerUrl, {
        session,
        pageUrl: page.url,
        attachedAt: new Date().toISOString()
      });
      pageRegistry.push({
        url: page.url,
        attachedAt: new Date().toISOString()
      });
      if (verbose) {
        console.log(`Attached coverage to simulator page: ${page.url || "about:blank"}`);
      }
    } catch (error) {
      if (verbose) {
        console.warn(
          `Skipping simulator page that refused coverage attach: ${page.url} :: ${String(error)}`
        );
      }
    }
  }
}

async function stopSimulatorCoverageSession(coverageSession) {
  try {
    const { result } = await coverageSession.session.send("Profiler.takePreciseCoverage");
    return result ?? [];
  } catch {
    return [];
  } finally {
    await coverageSession.session.safelySend("Profiler.stopPreciseCoverage");
    await coverageSession.session.safelySend("Profiler.disable");
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
    if (metadata.mode === "simulator" && isShellOnlySimulatorObservation(metadata.observedPages)) {
      console.error(
        "Playwright simulator coverage could not capture any app scripts because the current simulator DevTools endpoint is only exposing the Electron shell page, not the Zepp app runtime. The simulator smoke check can still confirm the shell is up, but app-code V8 coverage is not available through this endpoint right now."
      );
      process.exitCode = 1;
      return;
    }

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

async function getLatestMtimeMs(pathsToInspect) {
  let latestMtimeMs = Number.NEGATIVE_INFINITY;

  for (const candidatePath of pathsToInspect) {
    const candidateMtimeMs = await getLatestPathMtimeMs(candidatePath);
    if (candidateMtimeMs > latestMtimeMs) {
      latestMtimeMs = candidateMtimeMs;
    }
  }

  return latestMtimeMs;
}

async function getLatestPathMtimeMs(candidatePath) {
  try {
    const fileStats = await stat(candidatePath);
    if (fileStats.isFile()) {
      return fileStats.mtimeMs;
    }

    if (!fileStats.isDirectory()) {
      return Number.NEGATIVE_INFINITY;
    }

    const queue = [candidatePath];
    let latestMtimeMs = fileStats.mtimeMs;
    while (queue.length > 0) {
      const currentPath = queue.shift();
      const entries = await readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);
        const entryStats = await stat(entryPath);
        if (entryStats.mtimeMs > latestMtimeMs) {
          latestMtimeMs = entryStats.mtimeMs;
        }
        if (entryStats.isDirectory()) {
          queue.push(entryPath);
        }
      }
    }

    return latestMtimeMs;
  } catch {
    return Number.NEGATIVE_INFINITY;
  }
}


function sleep(durationMs) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

async function createCdpSession(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let nextId = 1;

  const openedSocket = await new Promise((resolve, reject) => {
    const handleOpen = () => {
      cleanup();
      resolve(socket);
    };
    const handleError = (event) => {
      cleanup();
      reject(new Error(`Failed to open CDP socket: ${event.message || "unknown error"}`));
    };
    const cleanup = () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("error", handleError);
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("error", handleError);
  });

  openedSocket.addEventListener("message", (event) => {
    const message = parseCdpMessage(event.data);
    if (!message?.id || !pending.has(message.id)) {
      return;
    }

    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      reject(new Error(`CDP ${message.error.code ?? "ERR"}: ${message.error.message ?? "unknown error"}`));
      return;
    }

    resolve(message.result ?? {});
  });

  openedSocket.addEventListener("close", () => {
    for (const { reject } of pending.values()) {
      reject(new Error("CDP socket closed before a response was received."));
    }
    pending.clear();
  });

  return {
    async send(method, params = {}) {
      const id = nextId;
      nextId += 1;

      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        openedSocket.send(JSON.stringify({ id, method, params }));
      });
    },
    async safelySend(method, params = {}) {
      try {
        return await this.send(method, params);
      } catch {
        return null;
      }
    },
    async close() {
      if (openedSocket.readyState === WebSocket.OPEN || openedSocket.readyState === WebSocket.CONNECTING) {
        openedSocket.close();
      }
    }
  };
}

function parseCdpMessage(rawData) {
  try {
    if (typeof rawData === "string") {
      return JSON.parse(rawData);
    }

    if (rawData instanceof Buffer) {
      return JSON.parse(rawData.toString("utf8"));
    }

    if (rawData instanceof ArrayBuffer) {
      return JSON.parse(Buffer.from(rawData).toString("utf8"));
    }

    if (ArrayBuffer.isView(rawData)) {
      return JSON.parse(Buffer.from(rawData.buffer, rawData.byteOffset, rawData.byteLength).toString("utf8"));
    }
  } catch {
    return null;
  }

  return null;
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

function isShellOnlySimulatorObservation(observedPages = []) {
  return (
    Array.isArray(observedPages) &&
    observedPages.length > 0 &&
    observedPages.every((page) =>
      String(page?.url ?? "").startsWith("file:///C:/Program%20Files/simulator/resources/app.asar/")
    )
  );
}
