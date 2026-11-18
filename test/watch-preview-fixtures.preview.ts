import path from "node:path";
import { LONG_WATCH_COPY } from "./support/watch-long-content.js";
import { createRecipeSnapshot } from "../zepp-app/shared/domain/schema.js";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { afterEach, beforeAll, expect, it, vi } from "vitest";

import { createActiveBrewSession } from "../zepp-app/shared/engine/recipe-engine.js";
import { getSupportedTools } from "../zepp-app/shared/constants/tool-catalog.js";
import { WATCH_STORAGE_KEYS } from "../zepp-app/shared/storage/keys.js";
import {
  buildPage,
  createCatalogFixture,
  createExpandedCatalogFixture,
  type PreviewPage
} from "./support/watch-page-harness.ts";

const OUTPUT_ROOT = path.resolve(process.env.WATCH_PREVIEW_OUTPUT || "output/playwright/watch-preview");
const FIXTURE_ROOT = path.join(OUTPUT_ROOT, "fixtures");
type PreviewLocale = "en-US" | "pl-PL";
type PreviewShape = "round" | "square";
type PreviewLayoutVariant = "round" | "square" | "compact-round";
type PreviewState =
  | "ready"
  | "empty"
  | "resume"
  | "populated"
  | "no-catalog"
  | "no-session"
  | "empty-brewer"
  | "normal"
  | "overflow"
  | "long-title"
  | "medium-copy"
  | "long-manual"
  | "timed"
  | "waiting"
  | "confirm"
  | "finish"
  | "aborted"
  | "expired"
  | "empty-result";

const LONG_RECIPE_TITLES = {
  "en-US": "AeroPress Honey and Apricot with a Floral Finish",
  "pl-PL": "AeroPress z miodem i morelą oraz kwiatowym finiszem"
};

type PreviewScenario = {
  name: string;
  targetName: string;
  page: PreviewPage;
  state: PreviewState;
  locale: PreviewLocale;
  shape: PreviewShape;
  layoutVariant: PreviewLayoutVariant;
  width: number;
  height: number;
  assetDirectory: string;
  modulePath: string;
  expectedButtonCount: number;
  requiredTextSnippets: string[];
  prepare: (runtime: typeof import("./zeus-runtime/runtime.ts")) => Promise<void>;
};

type PreviewTarget = {
  targetName: string;
  shape: PreviewShape;
  layoutVariant: PreviewLayoutVariant;
  width: number;
  height: number;
  assetDirectory: string;
};

const PREVIEW_LOCALES: PreviewLocale[] = ["en-US", "pl-PL"];
const PREVIEW_TARGETS: PreviewTarget[] = [
  createPreviewTarget("round-416", "round", 416, 416),
  createPreviewTarget("round-454", "round", 454, 454),
  createPreviewTarget("round-466", "round", 466, 466),
  createPreviewTarget("round-480", "round", 480, 480),
  createPreviewTarget("square-390x450", "square", 390, 450)
];

const previewScenarios: PreviewScenario[] = PREVIEW_LOCALES.flatMap((locale) => (
  PREVIEW_TARGETS.flatMap((target) => [
    createHomeScenario({ locale, state: "ready", target }),
    createHomeScenario({ locale, state: "empty", target }),
    createHomeScenario({ locale, state: "resume", target }),
    createToolListScenario({ locale, state: "populated", target }),
    createToolListScenario({ locale, state: "no-catalog", target }),
    createRecipeListScenario({ locale, state: "populated", target }),
    createRecipeListScenario({ locale, state: "long-title", target }),
    createRecipeListScenario({ locale, state: "empty-brewer", target }),
    createRecipeDetailScenario({ locale, state: "normal", target }),
    createRecipeDetailScenario({ locale, state: "overflow", target }),
    createRecipeDetailScenario({ locale, state: "long-title", target }),
    createBrewActiveScenario({ locale, state: "timed", target }),
    createBrewActiveScenario({ locale, state: "waiting", target }),
    createBrewActiveScenario({ locale, state: "confirm", target }),
    createBrewActiveScenario({ locale, state: "finish", target }),
    createBrewActiveScenario({ locale, state: "no-session", target }),
    createBrewActiveScenario({ locale, state: "overflow", target }),
    createBrewActiveScenario({ locale, state: "medium-copy", target }),
    createBrewActiveScenario({ locale, state: "long-manual", target }),
    createResultSummaryScenario({ locale, state: "normal", target }),
    createResultSummaryScenario({ locale, state: "long-title", target }),
    createResultSummaryScenario({ locale, state: "aborted", target }),
    createResultSummaryScenario({ locale, state: "expired", target }),
    createResultSummaryScenario({ locale, state: "empty-result", target })
  ])
));

beforeAll(async () => {
  await rm(FIXTURE_ROOT, { recursive: true, force: true });
  await mkdir(FIXTURE_ROOT, { recursive: true });
});

afterEach(() => vi.useRealTimers());

it("exports deterministic watch-preview fixture payloads with structural checks", async () => {
  const manifest = [] as Array<Record<string, unknown>>;

  for (const scenario of previewScenarios) {
    // Layout modules read the device dimensions and select their shape at import time.
    vi.resetModules();
    const runtime = await import("./zeus-runtime/runtime.ts");
    const device = await import("./zeus-runtime/zos-device.ts");
    runtime.resetZeppRuntime();
    runtime.setLanguageCode(scenario.locale === "pl-PL" ? 9 : 2);
    runtime.setDeviceInfo({
      width: scenario.width,
      height: scenario.height,
      screenShape: scenario.shape === "square" ? device.SCREEN_SHAPE_SQUARE : device.SCREEN_SHAPE_ROUND,
      keyNumber: 3,
      keyType: "sport"
    });
    vi.useFakeTimers();
    vi.setSystemTime(4_000);
    await scenario.prepare(runtime);
    const moduleUrl = new URL(scenario.modulePath, import.meta.url);
    await import(moduleUrl.href);
    const pageDefinition = runtime.getLastPageDefinition();
    if (!pageDefinition) {
      throw new Error(`Preview page did not register: ${scenario.modulePath}`);
    }

    const pageInstance = buildPage(pageDefinition);
    const widgets = serializeWidgets(runtime.getCreatedWidgets());
    const fixturePayload = {
      scenario: scenario.name,
      page: scenario.page,
      state: scenario.state,
      locale: scenario.locale,
      targetName: scenario.targetName,
      device: {
        width: scenario.width,
        height: scenario.height,
        shape: scenario.shape,
        layoutVariant: scenario.layoutVariant,
        targetName: scenario.targetName,
        assetDirectory: scenario.assetDirectory
      },
      expectedButtonCount: scenario.expectedButtonCount,
      requiredTextSnippets: scenario.requiredTextSnippets,
      widgets
    };

    validatePreviewFixture(fixturePayload);

    const fileName = `${scenario.name}.json`;
    await writeFile(path.join(FIXTURE_ROOT, fileName), JSON.stringify(fixturePayload, null, 2), "utf8");
    manifest.push({
      name: scenario.name,
      page: scenario.page,
      state: scenario.state,
      locale: scenario.locale,
      targetName: scenario.targetName,
      shape: scenario.shape,
      layoutVariant: scenario.layoutVariant,
      width: scenario.width,
      height: scenario.height,
      assetDirectory: scenario.assetDirectory,
      fixtureFile: fileName,
      screenshotFile: buildScreenshotFilePath(scenario),
      expectedButtonCount: scenario.expectedButtonCount
    });

    if (typeof pageDefinition.onDestroy === "function") {
      pageDefinition.onDestroy.call(pageInstance);
    }
  }

  await writeFile(path.join(FIXTURE_ROOT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  for (const entry of manifest) {
    await access(path.join(FIXTURE_ROOT, String(entry.fixtureFile)));
  }

  const manifestFromDisk = JSON.parse(await readFile(path.join(FIXTURE_ROOT, "manifest.json"), "utf8"));
  expect(manifestFromDisk).toHaveLength(previewScenarios.length);
});

function validatePreviewFixture(fixturePayload: Record<string, any>) {
  const { device, widgets, expectedButtonCount, requiredTextSnippets } = fixturePayload;
  const textWidgets = widgets.filter((widget) => widget.type === "TEXT");
  const buttonWidgets = widgets.filter((widget) => widget.type === "BUTTON");
  const scrollListWidgets = widgets.filter((widget) => widget.type === "SCROLL_LIST");

  expect(device.width, `${fixturePayload.scenario} should have a sane device width`).toBeGreaterThanOrEqual(300);
  expect(device.height, `${fixturePayload.scenario} should have a sane device height`).toBeGreaterThanOrEqual(300);
  expect(["round", "square"], `${fixturePayload.scenario} should use a supported shape`).toContain(device.shape);
  expect(["round", "square", "compact-round"], `${fixturePayload.scenario} should use a supported layout variant`).toContain(device.layoutVariant);
  expect(
    fixturePayload.scenario,
    "scenario name should match page/state/locale/shape/size metadata"
  ).toBe(buildScenarioName(fixturePayload.page, fixturePayload.state, fixturePayload.locale, fixturePayload.device.shape, fixturePayload.device.width, fixturePayload.device.height));

  const pageHeight = device.height;
  expect(pageHeight).toBeGreaterThanOrEqual(device.height);
  expect(widgets[0], `${fixturePayload.scenario} should use the target-sized background`).toMatchObject({
    type: "FILL_RECT",
    x: 0,
    y: 0,
    w: device.width,
    h: pageHeight
  });

  widgets.forEach((widget, index) => {
    if (Number.isFinite(widget.w)) {
      expect(widget.w, `widget ${index} width should not be negative`).toBeGreaterThanOrEqual(0);
    }

    if (Number.isFinite(widget.h)) {
      expect(widget.h, `widget ${index} height should not be negative`).toBeGreaterThanOrEqual(0);
    }

    if (Number.isFinite(widget.x) && Number.isFinite(widget.w) && widget.type !== "SCROLL_LIST") {
      expect(widget.x + widget.w, `widget ${index} should stay within screen width`).toBeLessThanOrEqual(device.width + 1);
    }

    if (widget.parentIndex === undefined && Number.isFinite(widget.y) && Number.isFinite(widget.h) && widget.type !== "SCROLL_LIST") {
      expect(widget.y + widget.h, `widget ${index} should stay within screen height`).toBeLessThanOrEqual(pageHeight + 40);
    }
  });

  textWidgets.forEach((widget, index) => {
    expect(String(widget.text || "").trim(), `text widget ${index} should not be empty`).not.toBe("");
  });

  buttonWidgets.forEach((widget, index) => {
    expect(String(widget.text || "").trim(), `button ${index} should not have an empty label`).not.toBe("");

    if (device.shape === "round" && Number.isFinite(widget.y) && Number.isFinite(widget.h)) {
      expect(
        widget.y + widget.h,
        `button ${index} should clear the lower round-screen mask`
      ).toBeLessThanOrEqual(pageHeight - 20);
    }
  });

  scrollListWidgets.forEach((widget, index) => {
    expect(Array.isArray(widget.data_array), `scroll list ${index} should include items`).toBe(true);
  });

  const visibleTextOrScrollItems = textWidgets.length + scrollListWidgets.reduce((count, widget) => {
    return count + (Array.isArray(widget.data_array) ? widget.data_array.length : 0);
  }, 0);
  expect(visibleTextOrScrollItems, `${fixturePayload.scenario} should expose visible text or list content`).toBeGreaterThan(0);

  expect(buttonWidgets.length, `${fixturePayload.scenario} should have the expected button count`).toBe(expectedButtonCount);

  const listText = scrollListWidgets.flatMap((widget) =>
    widget.data_array.flatMap((row) => widget.item_config.flatMap((config) =>
      (config.text_view ?? []).map((view) => row[view.key])
    ))
  );
  const renderedText = [...textWidgets, ...buttonWidgets].map((widget) => widget.text).concat(listText);
  requiredTextSnippets.forEach((snippet) => {
    expect(
      renderedText.some((text) => String(text ?? "").includes(snippet)),
      `${fixturePayload.scenario} should include text snippet: ${snippet}`
    ).toBe(true);
  });

  if (fixturePayload.page === "tool-list") {
    const rows = scrollListWidgets[0]?.data_array;
    expect(rows.map((row) => row.toolId)).toEqual(getSupportedTools().map((tool) => tool.toolId));
    if (fixturePayload.state === "no-catalog") {
      expect(rows.every((row) => String(row.meta).startsWith("0"))).toBe(true);
    }
  }

  if (["tool-list", "result-summary"].includes(fixturePayload.page)) {
    const marks = widgets.slice(1, 3);
    expect(marks).toHaveLength(2);
    marks.forEach((mark) => {
      expect(mark).toMatchObject({ type: "FILL_RECT", w: 16, h: 4 });
    });
    expect(marks[0].color).not.toBe(marks[1].color);
  }

  if (fixturePayload.page === "brew-active" && fixturePayload.state !== "no-session") {
    const timer = textWidgets.find((widget) => /^\d+:\d{2}$/.test(widget.text) && widget.text_size >= 48);
    const elapsed = textWidgets.find((widget) => /(?:Session|Sesja) \d+:\d{2}/.test(widget.text));
    const instructionsTop = widgets.find(widget => widget.type === "VIEW_CONTAINER").y;
    expect(timer, `${fixturePayload.scenario} should have a prominent timer`).toBeDefined();
    expect(elapsed, `${fixturePayload.scenario} should keep elapsed session time visible`).toBeDefined();
    expect(timer.y + timer.h).toBeLessThanOrEqual(elapsed.y);
    expect(elapsed.y + elapsed.h).toBeLessThanOrEqual(instructionsTop);
  }
}

function serializeWidgets(widgets: Array<Record<string, unknown>>) {
  return widgets.map((widget) => JSON.parse(JSON.stringify(widget, (_key, value) => {
    if (typeof value === "function" || typeof value === "symbol") {
      return undefined;
    }

    return value;
  })));
}

function createPreviewTarget(
  targetName: string,
  shape: PreviewShape,
  width: number,
  height: number
): PreviewTarget {
  return {
    targetName,
    shape,
    layoutVariant: shape === "square" ? "square" : width < 480 || height < 480 ? "compact-round" : "round",
    width,
    height,
    assetDirectory: `zepp-app/assets/${targetName}`
  };
}

function buildScreenshotFilePath(scenario: PreviewScenario) {
  return path.posix.join(
    scenario.locale,
    scenario.targetName,
    `${scenario.width}x${scenario.height}`,
    `${scenario.page}-${scenario.state}.png`
  );
}

function createHomeScenario(options: {
  locale: PreviewLocale;
  state: "ready" | "empty" | "resume";
  target: PreviewTarget;
}): PreviewScenario {
  return {
    name: buildScenarioName("home", options.state, options.locale, options.target.shape, options.target.width, options.target.height),
    targetName: options.target.targetName,
    page: "home",
    state: options.state,
    locale: options.locale,
    shape: options.target.shape,
    layoutVariant: options.target.layoutVariant,
    width: options.target.width,
    height: options.target.height,
    assetDirectory: options.target.assetDirectory,
    modulePath: "../zepp-app/page/home/index.js",
    expectedButtonCount: 3,
    requiredTextSnippets: options.locale === "pl-PL"
      ? options.state === "resume"
        ? ["Wznow", "Odrzuć"]
        : ["Przeglądaj", "Ostatni"]
      : options.state === "resume"
        ? ["Resume", "Discard"]
        : ["Browse", "Last"],
    async prepare(runtime) {
      const fixture = createCatalogFixture(options.locale);

      if (options.state === "empty") {
        runtime.setLocalStorageState({});
        return;
      }

      if (options.state === "resume") {
        const activeSession = createActiveBrewSession(fixture.primarySnapshot, { now: 1_000 });
        runtime.setLocalStorageState({
          [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache),
          [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify(activeSession),
          [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify(fixture.lastResult)
        });
        return;
      }

      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache),
        [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify(fixture.lastResult)
      });
    }
  };
}

function createToolListScenario(options: {
  locale: PreviewLocale;
  state: "populated" | "no-catalog";
  target: PreviewTarget;
}): PreviewScenario {
  return {
    name: buildScenarioName("tool-list", options.state, options.locale, options.target.shape, options.target.width, options.target.height),
    targetName: options.target.targetName,
    page: "tool-list",
    state: options.state,
    locale: options.locale,
    shape: options.target.shape,
    layoutVariant: options.target.layoutVariant,
    width: options.target.width,
    height: options.target.height,
    assetDirectory: options.target.assetDirectory,
    modulePath: "../zepp-app/page/tool-list/index.js",
    expectedButtonCount: 0,
    requiredTextSnippets: options.locale === "pl-PL" ? ["Zaparzacze"] : ["Brewers"],
    async prepare(runtime) {
      if (options.state === "no-catalog") {
        runtime.setLocalStorageState({});
        return;
      }
      const fixture = createExpandedCatalogFixture(options.locale);
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
      });
    }
  };
}

function createRecipeListScenario(options: {
  locale: PreviewLocale;
  state: "populated" | "empty-brewer" | "long-title";
  target: PreviewTarget;
}): PreviewScenario {
  return {
    name: buildScenarioName("recipe-list", options.state, options.locale, options.target.shape, options.target.width, options.target.height),
    targetName: options.target.targetName,
    page: "recipe-list",
    state: options.state,
    locale: options.locale,
    shape: options.target.shape,
    layoutVariant: options.target.layoutVariant,
    width: options.target.width,
    height: options.target.height,
    assetDirectory: options.target.assetDirectory,
    modulePath: "../zepp-app/page/recipe-list/index.js",
    expectedButtonCount: options.state === "empty-brewer" ? 1 : 0,
    requiredTextSnippets: options.state === "empty-brewer"
      ? options.locale === "pl-PL"
        ? ["Odśwież z telefonu"]
        : ["Refresh from phone"]
      : options.state === "long-title" ? [LONG_WATCH_COPY[options.locale].recipeName] : ["V60"],
    async prepare(runtime) {
      const watchStore = await import("../zepp-app/shared/storage/watch-store.js");

      if (options.state === "empty-brewer") {
        const fixture = createCatalogFixture(options.locale);
        runtime.setLocalStorageState({
          [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
        });
        watchStore.getRuntimeState().selectedToolId = "tool_v60";
        return;
      }

      const fixture = createExpandedCatalogFixture(options.locale);
      if (options.state === "long-title") {
        const summary = fixture.catalogCache.recipesByTool.tool_v60[0];
        summary.name = LONG_WATCH_COPY[options.locale].recipeName;
        fixture.catalogCache.recipeSnapshotsById[summary.recipeId].name = summary.name;
      }
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
      });
      watchStore.getRuntimeState().selectedToolId = "tool_v60";
    }
  };
}

function createRecipeDetailScenario(options: {
  locale: PreviewLocale;
  state: "normal" | "overflow" | "long-title";
  target: PreviewTarget;
}): PreviewScenario {
  return {
    name: buildScenarioName("recipe-detail", options.state, options.locale, options.target.shape, options.target.width, options.target.height),
    targetName: options.target.targetName,
    page: "recipe-detail",
    state: options.state,
    locale: options.locale,
    shape: options.target.shape,
    layoutVariant: options.target.layoutVariant,
    width: options.target.width,
    height: options.target.height,
    assetDirectory: options.target.assetDirectory,
    modulePath: "../zepp-app/page/recipe-detail/index.js",
    expectedButtonCount: 1,
    requiredTextSnippets: [
      options.locale === "pl-PL" ? "Start" : "Start brew",
      ...(options.state === "long-title" ? [LONG_RECIPE_TITLES[options.locale]] : [])
    ],
    async prepare(runtime) {
      const fixture = createCatalogFixture(options.locale);
      const watchStore = await import("../zepp-app/shared/storage/watch-store.js");
      const snapshot = { ...fixture.primarySnapshot };
      if (options.state === "overflow") {
        Object.assign(snapshot, createRecipeSnapshot({
          ...fixture.primaryRecord,
          description: LONG_WATCH_COPY[options.locale].description,
          grindLabel: LONG_WATCH_COPY[options.locale].grindLabel,
          filterLabel: LONG_WATCH_COPY[options.locale].filterLabel
        }));
      }
      if (options.state === "long-title") {
        snapshot.name = LONG_RECIPE_TITLES[options.locale];
        fixture.primarySummary.name = snapshot.name;
      }

      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify({
          ...fixture.catalogCache,
          recipeSnapshotsById: {
            ...fixture.catalogCache.recipeSnapshotsById,
            [fixture.primarySummary.recipeId]: snapshot
          }
        })
      });
      watchStore.getRuntimeState().selectedToolId = fixture.primaryRecord.toolId;
      watchStore.writeSelectedRecipeId(fixture.primarySummary.recipeId);
    }
  };
}

function createBrewActiveScenario(options: {
  locale: PreviewLocale;
  state: "timed" | "waiting" | "overflow" | "medium-copy" | "long-manual" | "confirm" | "finish" | "no-session";
  target: PreviewTarget;
}): PreviewScenario {
  return {
    name: buildScenarioName("brew-active", options.state, options.locale, options.target.shape, options.target.width, options.target.height),
    targetName: options.target.targetName,
    page: "brew-active",
    state: options.state,
    locale: options.locale,
    shape: options.target.shape,
    layoutVariant: options.target.layoutVariant,
    width: options.target.width,
    height: options.target.height,
    assetDirectory: options.target.assetDirectory,
    modulePath: "../zepp-app/page/brew-active/index.js",
    expectedButtonCount: options.state === "no-session" ? 1 : 2,
    requiredTextSnippets: options.state === "no-session"
      ? [options.locale === "pl-PL" ? "Do domu" : "Go home"]
      : [options.locale === "pl-PL" ? "Stop" : "Stop"],
    async prepare(runtime) {
      if (options.state === "no-session") {
        runtime.setLocalStorageState({});
        return;
      }
      const fixture = createCatalogFixture(options.locale);
      const now = options.state === "waiting" ? 240_000 : 250_000;
      const copy = LONG_WATCH_COPY[options.locale];
      const snapshot = createRecipeSnapshot(fixture.primaryRecord);
      if (["overflow", "long-manual", "medium-copy"].includes(options.state)) {
        const index = options.state === "long-manual" ? 0 : 1;
        snapshot.steps[index].body = options.state === "medium-copy" ? copy.mediumInstruction : copy.instruction;
        if (options.state !== "medium-copy") {
          snapshot.name = copy.recipeName;
          snapshot.steps[index].title = copy.stepTitle;
        }
      }
      const activeSession = createActiveBrewSession(snapshot, { now });

      if (["waiting", "confirm", "finish", "long-manual"].includes(options.state)) {
        activeSession.currentStepIndex = options.state === "finish" ? snapshot.steps.length - 1 : 0;
        if (options.state === "confirm") activeSession.recipeSnapshot.steps[0].kind = "confirm";
        activeSession.status = "waiting_for_confirm";
        activeSession.currentStepStartedAt = now;
        activeSession.expectedStepEndAt = null;
      } else {
        activeSession.currentStepIndex = 1;
        activeSession.status = "running";
        activeSession.currentStepStartedAt = now;
        activeSession.expectedStepEndAt = now + 15_000;
      }

      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify(activeSession)
      });
      vi.setSystemTime(now);
    }
  };
}

function createResultSummaryScenario(options: {
  locale: PreviewLocale;
  state: "normal" | "aborted" | "expired" | "empty-result" | "long-title";
  target: PreviewTarget;
}): PreviewScenario {
  return {
    name: buildScenarioName("result-summary", options.state, options.locale, options.target.shape, options.target.width, options.target.height),
    targetName: options.target.targetName,
    page: "result-summary",
    state: options.state,
    locale: options.locale,
    shape: options.target.shape,
    layoutVariant: options.target.layoutVariant,
    width: options.target.width,
    height: options.target.height,
    assetDirectory: options.target.assetDirectory,
    modulePath: "../zepp-app/page/result-summary/index.js",
    expectedButtonCount: options.state === "empty-result" ? 2 : 1,
    requiredTextSnippets: options.state === "empty-result"
      ? options.locale === "pl-PL"
        ? ["Brak wyniku", "Dom"]
        : ["No result yet", "Home"]
      : options.locale === "pl-PL"
        ? ["Status", "Dom"]
        : ["Status", "Home"],
    async prepare(runtime) {

      if (options.state === "empty-result") {
        runtime.setLocalStorageState({});
        return;
      }

      const fixture = createCatalogFixture(options.locale);
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify({ ...fixture.lastResult, recipeName: options.state === "long-title" ? LONG_WATCH_COPY[options.locale].recipeName : fixture.lastResult.recipeName, status: ["normal", "long-title"].includes(options.state) ? "completed" : options.state })
      });
    }
  };
}

function buildScenarioName(
  page: PreviewPage,
  state: PreviewState,
  locale: PreviewLocale,
  shape: PreviewShape,
  width: number,
  height: number
) {
  return [page, state, locale, shape, `${width}x${height}`].join("-");
}
