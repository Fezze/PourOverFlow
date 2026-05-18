import path from "node:path";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { beforeAll, expect, it, vi } from "vitest";

import { createActiveBrewSession } from "../zepp-app/shared/engine/recipe-engine.js";
import { WATCH_STORAGE_KEYS } from "../zepp-app/shared/storage/keys.js";
import {
  buildPage,
  createCatalogFixture,
  createExpandedCatalogFixture,
  createPreviewLayoutMock,
  loadPageHarness,
  type PreviewPage
} from "./support/watch-page-harness.ts";

const OUTPUT_ROOT = path.resolve(process.cwd(), "output", "playwright", "watch-preview");
const FIXTURE_ROOT = path.join(OUTPUT_ROOT, "fixtures");
type PreviewLocale = "en-US" | "pl-PL";
type PreviewShape = "round" | "square";
type PreviewLayoutVariant = "round" | "square" | "compact-round";
type PreviewState =
  | "ready"
  | "empty"
  | "resume"
  | "populated"
  | "empty-brewer"
  | "normal"
  | "overflow"
  | "timed"
  | "waiting"
  | "empty-result";

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
  prepare: (runtime: any) => Promise<void>;
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
    createToolListScenario({ locale, target }),
    createRecipeListScenario({ locale, state: "populated", target }),
    createRecipeListScenario({ locale, state: "empty-brewer", target }),
    createRecipeDetailScenario({ locale, state: "normal", target }),
    createRecipeDetailScenario({ locale, state: "overflow", target }),
    createBrewActiveScenario({ locale, state: "timed", target }),
    createBrewActiveScenario({ locale, state: "waiting", target }),
    createBrewActiveScenario({ locale, state: "overflow", target }),
    createResultSummaryScenario({ locale, state: "normal", target }),
    createResultSummaryScenario({ locale, state: "empty-result", target })
  ])
));

beforeAll(async () => {
  await rm(FIXTURE_ROOT, { recursive: true, force: true });
  await mkdir(FIXTURE_ROOT, { recursive: true });
});

it("exports deterministic watch-preview fixture payloads with structural checks", async () => {
  const manifest = [] as Array<Record<string, unknown>>;

  for (const scenario of previewScenarios) {
    const layoutMock = createPreviewLayoutMock(scenario.page, {
      shape: scenario.shape,
      width: scenario.width,
      height: scenario.height
    });
    const { runtime, pageDefinition } = await loadPageHarness(scenario.modulePath, layoutMock);

    expect(pageDefinition).toBeTruthy();
    await scenario.prepare(runtime);

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
      screenshotFile: `${scenario.name}.png`,
      expectedButtonCount: scenario.expectedButtonCount
    });

    if (typeof pageDefinition.onDestroy === "function") {
      pageDefinition.onDestroy.call(pageInstance);
    }

    vi.useRealTimers();
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

    if (Number.isFinite(widget.y) && Number.isFinite(widget.h) && widget.type !== "SCROLL_LIST") {
      expect(widget.y + widget.h, `widget ${index} should stay within screen height`).toBeLessThanOrEqual(device.height + 40);
    }
  });

  textWidgets.forEach((widget, index) => {
    expect(String(widget.text || "").trim(), `text widget ${index} should not be empty`).not.toBe("");
  });

  buttonWidgets.forEach((widget, index) => {
    expect(String(widget.text || "").trim(), `button ${index} should not have an empty label`).not.toBe("");
  });

  scrollListWidgets.forEach((widget, index) => {
    expect(Array.isArray(widget.data_array), `scroll list ${index} should include items`).toBe(true);
  });

  const visibleTextOrScrollItems = textWidgets.length + scrollListWidgets.reduce((count, widget) => {
    return count + (Array.isArray(widget.data_array) ? widget.data_array.length : 0);
  }, 0);
  expect(visibleTextOrScrollItems, `${fixturePayload.scenario} should expose visible text or list content`).toBeGreaterThan(0);

  expect(buttonWidgets.length, `${fixturePayload.scenario} should have the expected button count`).toBe(expectedButtonCount);

  requiredTextSnippets.forEach((snippet) => {
    expect(
      widgets.some((widget) => String(widget.text || "").includes(snippet)),
      `${fixturePayload.scenario} should include text snippet: ${snippet}`
    ).toBe(true);
  });
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
        ? ["Wznow", "Odrzuc"]
        : ["Przegladaj", "Ostatni"]
      : options.state === "resume"
        ? ["Resume", "Discard"]
        : ["Browse", "Last"],
    async prepare(runtime) {
      const fixture = createCatalogFixture();
      runtime.setLanguageCode(options.locale === "pl-PL" ? 9 : 2);
      runtime.setDeviceInfo({ width: options.target.width, height: options.target.height, keyNumber: 3, keyType: "sport" });

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
  target: PreviewTarget;
}): PreviewScenario {
  return {
    name: buildScenarioName("tool-list", "populated", options.locale, options.target.shape, options.target.width, options.target.height),
    targetName: options.target.targetName,
    page: "tool-list",
    state: "populated",
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
      const fixture = createExpandedCatalogFixture();
      runtime.setLanguageCode(options.locale === "pl-PL" ? 9 : 2);
      runtime.setDeviceInfo({ width: options.target.width, height: options.target.height, keyNumber: 3, keyType: "sport" });
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
      });
    }
  };
}

function createRecipeListScenario(options: {
  locale: PreviewLocale;
  state: "populated" | "empty-brewer";
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
        ? ["Odswiez z telefonu"]
        : ["Refresh from phone"]
      : ["V60"],
    async prepare(runtime) {
      const watchStore = await import("../zepp-app/shared/storage/watch-store.js");
      runtime.setLanguageCode(options.locale === "pl-PL" ? 9 : 2);
      runtime.setDeviceInfo({ width: options.target.width, height: options.target.height, keyNumber: 3, keyType: "sport" });

      if (options.state === "empty-brewer") {
        const fixture = createCatalogFixture();
        runtime.setLocalStorageState({
          [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
        });
        watchStore.getRuntimeState().selectedToolId = "tool_v60";
        return;
      }

      const fixture = createExpandedCatalogFixture();
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
      });
      watchStore.getRuntimeState().selectedToolId = "tool_v60";
    }
  };
}

function createRecipeDetailScenario(options: {
  locale: PreviewLocale;
  state: "normal" | "overflow";
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
    requiredTextSnippets: options.state === "overflow"
      ? []
      : options.locale === "pl-PL"
        ? []
        : ["Start brew"],
    async prepare(runtime) {
      const fixture = createCatalogFixture();
      const watchStore = await import("../zepp-app/shared/storage/watch-store.js");

      runtime.setLanguageCode(options.locale === "pl-PL" ? 9 : 2);
      runtime.setDeviceInfo({ width: options.target.width, height: options.target.height, keyNumber: 3, keyType: "sport" });

      const snapshot = options.state === "overflow"
        ? {
            ...fixture.primarySnapshot,
            description: "This is a much longer tasting note intended to force the recipe detail surface into a real overflow case so the page keeps scrolling only when it genuinely needs more vertical space than the round layout can offer."
          }
        : fixture.primarySnapshot;

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
  state: "timed" | "waiting" | "overflow";
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
    expectedButtonCount: 2,
    requiredTextSnippets: options.locale === "pl-PL"
      ? options.state === "waiting"
        ? ["Dalej", "Stop"]
        : ["Stop"]
      : options.state === "waiting"
        ? ["Next", "Stop"]
        : options.state === "overflow"
          ? ["Stop"]
          : ["Skip", "Stop"],
    async prepare(runtime) {
      const fixture = createCatalogFixture();
      const now = options.state === "waiting" ? 240_000 : 250_000;
      const snapshot = options.state === "overflow"
        ? {
            ...fixture.primarySnapshot,
            steps: fixture.primarySnapshot.steps.map((step, index) => (
              index === 1
                ? {
                    ...step,
                    body: "Pour slowly from the center, keep the kettle low, and stay steady through the spiral. ".repeat(12)
                  }
                : { ...step }
            ))
          }
        : fixture.primarySnapshot;
      const activeSession = createActiveBrewSession(snapshot, { now });

      if (options.state === "waiting") {
        activeSession.currentStepIndex = 0;
        activeSession.status = "waiting_for_confirm";
        activeSession.currentStepStartedAt = now;
        activeSession.expectedStepEndAt = null;
      } else {
        activeSession.currentStepIndex = 1;
        activeSession.status = "running";
        activeSession.currentStepStartedAt = now;
        activeSession.expectedStepEndAt = now + 15_000;
      }

      runtime.setLanguageCode(options.locale === "pl-PL" ? 9 : 2);
      runtime.setDeviceInfo({ width: options.target.width, height: options.target.height, keyNumber: 3, keyType: "sport" });
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify(activeSession)
      });
      vi.useFakeTimers();
      vi.setSystemTime(now);
    }
  };
}

function createResultSummaryScenario(options: {
  locale: PreviewLocale;
  state: "normal" | "empty-result";
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
      runtime.setLanguageCode(options.locale === "pl-PL" ? 9 : 2);
      runtime.setDeviceInfo({ width: options.target.width, height: options.target.height, keyNumber: 3, keyType: "sport" });

      if (options.state === "empty-result") {
        runtime.setLocalStorageState({});
        return;
      }

      const fixture = createCatalogFixture();
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify(fixture.lastResult)
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
