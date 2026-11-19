import http from "node:http";
import path from "node:path";
import { access, mkdir, readFile, rm, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

import { isCliEntry } from "./cli-entry.mjs";
import { getMockBrowserExecutableCandidates } from "./playwright-coverage-helpers.mjs";

const PROJECT_ROOT = process.cwd();
const MIN_SCREENSHOT_BYTES = 4_096;

export async function runWatchPreview({
  previewRoot = path.resolve(process.env.WATCH_PREVIEW_OUTPUT || "output/playwright/watch-preview"),
  verify = process.argv.includes("--verify"),
  framed = process.argv.includes("--framed")
} = {}) {
  const fixtureRoot = path.join(previewRoot, "fixtures");
  const captureOptions = [{ root: path.join(previewRoot, verify ? "verify" : "screenshots"), selector: "#watch-face" }];
  if (framed) {
    captureOptions.push({ root: path.join(previewRoot, verify ? "verify-framed" : "framed"), selector: "#watch-shell" });
  }

  await exportPreviewFixtures(previewRoot);
  await Promise.all(captureOptions.map(({ root }) => rm(root, { recursive: true, force: true })));

  const executablePath = await resolveBrowserExecutable();
  const server = await startStaticServer(fixtureRoot);
  let browser;

  try {
    const scenarios = JSON.parse(await readFile(path.join(fixtureRoot, "manifest.json"), "utf8"));
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      throw new Error("Watch preview manifest is empty. Preview export did not produce any scenarios.");
    }

    browser = await chromium.launch({ executablePath, headless: true });
    const page = await browser.newPage({ viewport: { width: 760, height: 760 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(`console.error: ${message.text()}`);
      }
    });

    for (const scenario of scenarios) {
      errors.length = 0;
      const previewUrl = `${server.baseUrl}/test/fixtures/watch-preview/index.html?scenario=${encodeURIComponent(scenario.name)}`;
      await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__POF_WATCH_PREVIEW_READY__ || window.__POF_WATCH_PREVIEW_ERROR__);
      const bootstrapError = await page.evaluate(() => window.__POF_WATCH_PREVIEW_ERROR__);
      if (bootstrapError) {
        errors.push(bootstrapError);
      }
      if (errors.length) {
        throw new Error([`Preview scenario ${scenario.name} emitted runtime errors.`, ...errors].join("\n"));
      }

      if (scenario.page === "tool-list" && scenario.state === "populated") {
        const fixture = JSON.parse(await readFile(path.join(fixtureRoot, scenario.fixtureFile), "utf8"));
        await verifyBrewerRow(page, fixture);
      }

      if (["recipe-detail", "brew-active", "recipe-list"].includes(scenario.page)) {
        await verifyWrappedText(page, scenario, previewRoot);
      }
      for (const { root, selector } of captureOptions) {
        await page.locator("body").evaluate((body, framed) => {
          body.dataset.framed = String(framed);
        }, selector === "#watch-shell");
        const screenshotPath = resolveScreenshotPath(scenario, root);
        await mkdir(path.dirname(screenshotPath), { recursive: true });
        const screenshot = await page.locator(selector).screenshot({ path: screenshotPath });
        validateScreenshot(scenario, screenshot, selector === "#watch-face");
      }
      const longReadingPage = (scenario.page === "brew-active" && ["overflow", "long-manual"].includes(scenario.state)) ||
          (scenario.page === "recipe-detail" && scenario.state === "overflow");
      const buttons = page.locator("#watch-face > .button");
      const buttonBounds = () => buttons.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
      if (longReadingPage) await page.locator("body").evaluate(body => { body.dataset.framed = "false"; });
      const initialButtons = longReadingPage ? await buttonBounds() : [];
      const paragraphs = page.locator(".reading-page .text > span").filter({ hasText: /\n/ });
      if (longReadingPage) {
        await paragraphs.last().evaluate(copy => {
          const face = copy.closest(".reading-page");
          face.scrollTop += copy.getBoundingClientRect().top - face.getBoundingClientRect().top - 3;
        });
        const readingPath = resolveScreenshotPath(scenario, captureOptions[0].root).replace(/\.png$/, "-reading.png");
        await page.locator("#watch-face").screenshot({ path: readingPath });
      }
      const scrolled = await page.locator(".reading-page, .scroll-list").evaluateAll(lists => {
        let changed = false;
        for (const list of lists) {
          if (list.scrollHeight > list.clientHeight + 1) {
            list.scrollTop = list.scrollHeight;
            changed = true;
          }
        }
        return changed;
      });
      if (longReadingPage) {
        const tailVisible = await paragraphs.last().evaluate(text => {
          const lastLine = document.createRange();
          const content = text.firstChild;
          lastLine.setStart(content, content.textContent.lastIndexOf("\n") + 1);
          lastLine.setEndAfter(content);
          const list = text.closest(".reading-page");
          const textFrame = text.parentElement.getBoundingClientRect();
          const tail = lastLine.getBoundingClientRect();
          if (tail.height <= 0 || tail.bottom > textFrame.bottom + 1) return false;

          // Recipe attribution may follow the instruction. Bring the actual last
          // line into view, as a reader can, and check its full bounding box.
          const viewport = list.getBoundingClientRect();
          list.scrollTop += tail.bottom - viewport.bottom + 4;
          const visibleTail = lastLine.getBoundingClientRect();
          return visibleTail.top >= viewport.top - 1 && visibleTail.bottom <= viewport.bottom + 1 &&
            visibleTail.left >= viewport.left - 1 && visibleTail.right <= viewport.right + 1;
        });
        if (!initialButtons.length || JSON.stringify(await buttonBounds()) !== JSON.stringify(initialButtons)) {
          throw new Error(`Pinned controls moved in ${scenario.name}.`);
        }
        if (!scrolled || !tailVisible) {
          throw new Error(`Final text line is clipped in ${scenario.name}.`);
        }
      }
      if (scrolled) {
        if (scenario.width === scenario.height && ["recipe-list", "tool-list"].includes(scenario.page)) {
          const clipped = await page.locator(".scroll-card").last().evaluate(card => {
            const face = document.querySelector("#watch-face").getBoundingClientRect();
            const radius = face.width / 2;
            return [...card.children].some(child => {
              const range = document.createRange();
              range.selectNodeContents(child);
              const rect = child instanceof HTMLImageElement ? child.getBoundingClientRect() : range.getBoundingClientRect();
              return [rect.left, rect.right].some(x => [rect.top, rect.bottom].some(y =>
                Math.hypot(x - face.left - radius, y - face.top - radius) > radius));
            });
          });
          if (clipped) throw new Error(`Last list row is clipped by the circular mask in ${scenario.name}.`);
        }
        const root = captureOptions[0].root;
        await page.locator("body").evaluate(body => { body.dataset.framed = "false"; });
        const screenshotPath = resolveScreenshotPath(scenario, root).replace(/\.png$/, "-scrolled.png");
        await page.locator("#watch-face").screenshot({ path: screenshotPath });
      }
    }
    console.log(`Rendered ${scenarios.length} watch states to ${captureOptions.map(({ root }) => root).join(", ")}`);
  } finally {
    await browser?.close();
    await stopStaticServer(server.server);
  }
}

async function verifyWrappedText(page, scenario, previewRoot) {
  const clipped = await page.locator(".text > span").evaluateAll(spans => spans.flatMap(span => {
    if (getComputedStyle(span).whiteSpace !== "pre-wrap") return [];
    const range = document.createRange();
    range.selectNodeContents(span);
    // Line-box height excludes unused font ascent/descent around short labels.
    const textHeight = span.scrollHeight;
    const frame = span.parentElement.getBoundingClientRect();
    // CSS pre-wrap hangs trailing spaces outside a line. Check visible words,
    // not the union width of a range that includes those invisible spaces.
    const node = span.firstChild;
    const outside = [...span.textContent.matchAll(/\S+/g)].some(match => {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      return [...range.getClientRects()].some(rect => rect.left < frame.left - 1 || rect.right > frame.right + 1);
    });
    return textHeight > frame.height + 1 || outside
      ? [{ text: span.textContent.slice(0, 90), textHeight, frameHeight: frame.height, outside }] : [];
  }));
  if (clipped.length) {
    await page.locator("#watch-face").screenshot({ path: path.join(previewRoot, `${scenario.name}-failure.png`) });
    throw new Error(`Wrapped text is clipped in ${scenario.name}: ${JSON.stringify(clipped)}`);
  }
}

async function verifyBrewerRow(page, fixture) {
  const list = fixture.widgets.find((widget) => widget.type === "SCROLL_LIST");
  const firstType = list.data_type_config?.find(({ start, end }) => start <= 0 && end >= 0);
  const firstConfig = firstType
    ? list.item_config.find(({ type_id }) => type_id === firstType.type_id)
    : list.item_config[0];
  const actual = await page.locator(".scroll-list .scroll-card").first().evaluate((row) => {
    const rowBounds = row.getBoundingClientRect();
    return Array.from(row.children, (element) => {
      const bounds = element.getBoundingClientRect();
      return [
        bounds.x - rowBounds.x,
        bounds.y - rowBounds.y,
        bounds.width,
        bounds.height,
        element instanceof HTMLImageElement ? decodeURIComponent(new URL(element.src).pathname.split("/").at(-1)) : element.textContent
      ];
    });
  });
  const row = list.data_array[0];
  const expected = [...(firstConfig.image_view ?? []), ...firstConfig.text_view].map((view) => [
    view.x, view.y, view.w, view.h, row[view.key]
  ]);

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${fixture.scenario} row differs from the app widget configuration.\nExpected ${JSON.stringify(expected)}\nRendered ${JSON.stringify(actual)}`);
  }
}

function validateScreenshot(scenario, screenshot, isScreenOnly) {
  if (screenshot.length < MIN_SCREENSHOT_BYTES) {
    throw new Error(`Preview screenshot for ${scenario.name} is ${screenshot.length} bytes.`);
  }
  if (isScreenOnly) {
    const width = screenshot.readUInt32BE(16);
    const height = screenshot.readUInt32BE(20);
    if (width !== scenario.width || height !== scenario.height) {
      throw new Error(`Expected ${scenario.width}×${scenario.height} for ${scenario.name}, got ${width}×${height}.`);
    }
  }
}

function resolveScreenshotPath(scenario, root) {
  const relativeScreenshotPath = typeof scenario.screenshotFile === "string" && scenario.screenshotFile
    ? scenario.screenshotFile
    : buildFallbackScreenshotPath(scenario);

  const absoluteScreenshotPath = path.resolve(root, relativeScreenshotPath);
  const relativeToRoot = path.relative(root, absoluteScreenshotPath);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    throw new Error(`Preview scenario ${scenario.name} resolved outside the screenshot root.`);
  }

  return absoluteScreenshotPath;
}

function buildFallbackScreenshotPath(scenario) {
  const locale = scenario.locale || "unknown-locale";
  const targetName = scenario.targetName || scenario.shape || "unknown-target";
  const resolution = Number.isFinite(scenario.width) && Number.isFinite(scenario.height)
    ? `${scenario.width}x${scenario.height}`
    : "unknown-resolution";
  const pageName = scenario.page || "unknown-page";
  const stateName = scenario.state || "default";

  return path.join(
    sanitizePathSegment(locale),
    sanitizePathSegment(targetName),
    sanitizePathSegment(resolution),
    `${sanitizePathSegment(pageName)}-${sanitizePathSegment(stateName)}.png`
  );
}

function sanitizePathSegment(value) {
  return String(value || "unknown")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

async function exportPreviewFixtures(previewRoot) {
  await runNodeCommand([
    "node_modules/vitest/vitest.mjs",
    "run",
    "--config",
    "test/vitest.preview.config.ts",
    "test/watch-preview-fixtures.preview.ts"
  ], previewRoot);
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

async function runNodeCommand(args, previewRoot) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
      env: { ...process.env, WATCH_PREVIEW_OUTPUT: previewRoot }
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

async function startStaticServer(fixtureRoot) {
  const mounts = new Map([
    ["/watch-preview-fixtures/", fixtureRoot],
    ["/test/fixtures/watch-preview/", path.join(PROJECT_ROOT, "test", "fixtures", "watch-preview")],
    ["/zepp-app/assets/", path.join(PROJECT_ROOT, "zepp-app", "assets")]
  ]);
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      if (requestUrl.pathname === "/favicon.ico") {
        response.writeHead(204);
        response.end();
        return;
      }

      const mount = [...mounts].find(([prefix]) => requestUrl.pathname.startsWith(prefix));
      if (!mount) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      const [prefix, rootDir] = mount;
      const relativePath = decodeURIComponent(requestUrl.pathname.slice(prefix.length));
      const absolutePath = path.resolve(rootDir, relativePath);
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

  await new Promise((resolve, reject) => {
    server.once("error", reject);
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

if (isCliEntry(import.meta.url)) {
  await runWatchPreview();
}
