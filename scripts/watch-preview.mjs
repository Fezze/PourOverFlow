import http from "node:http";
import path from "node:path";
import { access, mkdir, readFile, rm, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

import { getMockBrowserExecutableCandidates } from "./playwright-coverage-helpers.mjs";

const PROJECT_ROOT = process.cwd();
const PREVIEW_ROOT = path.join(PROJECT_ROOT, "output", "playwright", "watch-preview");
const FIXTURE_ROOT = path.join(PREVIEW_ROOT, "fixtures");
const SCREENSHOT_ROOT = path.join(PREVIEW_ROOT, "screenshots");
const VERIFY_SCREENSHOT_ROOT = path.join(PREVIEW_ROOT, "verify");
const VERIFY_MODE = process.argv.includes("--verify");
const ACTIVE_SCREENSHOT_ROOT = VERIFY_MODE ? VERIFY_SCREENSHOT_ROOT : SCREENSHOT_ROOT;
const MIN_SCREENSHOT_BYTES = 4_096;

await main();

async function main() {
  await exportPreviewFixtures();
  await rm(ACTIVE_SCREENSHOT_ROOT, { recursive: true, force: true });
  await mkdir(ACTIVE_SCREENSHOT_ROOT, { recursive: true });

  const executablePath = await resolveBrowserExecutable();
  const server = await startStaticServer(PROJECT_ROOT);
  const browser = await chromium.launch({ executablePath, headless: true });

  try {
    const scenarios = JSON.parse(await readFile(path.join(FIXTURE_ROOT, "manifest.json"), "utf8"));
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      throw new Error("Watch preview manifest is empty. Preview export did not produce any scenarios.");
    }

    for (const scenario of scenarios) {
      const page = await browser.newPage({ viewport: { width: 760, height: 760 } });
      const previewUrl = `${server.baseUrl}/test/fixtures/watch-preview/index.html?scenario=${encodeURIComponent(scenario.name)}`;
      const pageErrors = [];
      const consoleErrors = [];

      page.on("pageerror", (error) => {
        pageErrors.push(error instanceof Error ? error.message : String(error));
      });
      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(message.text());
        }
      });

      try {
        await page.goto(previewUrl, { waitUntil: "networkidle" });
        await page.waitForFunction(() => window.__POF_WATCH_PREVIEW_READY__ === true, undefined, {
          timeout: 30_000
        });

        if (pageErrors.length > 0 || consoleErrors.length > 0) {
          throw new Error(
            [
              `Preview scenario ${scenario.name} emitted runtime errors.`,
              ...pageErrors.map((entry) => `pageerror: ${entry}`),
              ...consoleErrors.map((entry) => `console.error: ${entry}`)
            ].join("\n")
          );
        }

        const screenshotPath = path.join(ACTIVE_SCREENSHOT_ROOT, `${scenario.name}.png`);
        await page.locator("#watch-shell").screenshot({ path: screenshotPath });
        await access(screenshotPath);
        const screenshotStat = await stat(screenshotPath);
        if (screenshotStat.size < MIN_SCREENSHOT_BYTES) {
          throw new Error(
            `Preview screenshot for ${scenario.name} looks suspiciously small (${screenshotStat.size} bytes).`
          );
        }

        if (!VERIFY_MODE) {
          console.log(`Saved watch preview screenshot: ${scenario.name}.png`);
        }
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await stopStaticServer(server.server);
  }
}

async function exportPreviewFixtures() {
  await runNodeCommand([
    "node_modules/vitest/vitest.mjs",
    "run",
    "--config",
    "test/vitest.preview.config.ts",
    "test/watch-preview-fixtures.preview.ts"
  ]);
}

async function resolveBrowserExecutable() {
  const candidates = getMockBrowserExecutableCandidates(process.env);

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(
    "No Chromium-family browser executable was found. Set PLAYWRIGHT_COVERAGE_BROWSER to a local Chromium, Chrome, or Edge binary."
  );
}

async function runNodeCommand(args) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
      env: process.env
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`Command failed with exit code ${code}.`));
    });
    child.on("error", reject);
  });
}

async function startStaticServer(rootDir) {
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      if (requestUrl.pathname === "/favicon.ico") {
        response.writeHead(204);
        response.end();
        return;
      }

      const relativePath = decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname);
      const absolutePath = path.resolve(rootDir, `.${relativePath}`);
      const relativeToRoot = path.relative(rootDir, absolutePath);
      if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      const fileStat = await stat(absolutePath);
      const filePath = fileStat.isDirectory() ? path.join(absolutePath, "index.html") : absolutePath;
      const payload = await readFile(filePath);
      response.writeHead(200, {
        "Content-Type": getContentType(filePath)
      });
      response.end(payload);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not resolve the preview server address.");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

async function stopStaticServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(undefined);
    });
  });
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

  if (filePath.endsWith(".png")) {
    return "image/png";
  }

  return "application/octet-stream";
}