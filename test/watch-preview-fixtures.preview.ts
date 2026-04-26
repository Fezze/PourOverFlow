import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { beforeAll, expect, it, vi } from "vitest";

import { createActiveBrewSession } from "../zepp-app/shared/engine/recipe-engine.js";
import { WATCH_STORAGE_KEYS } from "../zepp-app/shared/storage/keys.js";
import {
  buildPage,
  createCatalogFixture,
  createExpandedCatalogFixture,
  createLayoutMock,
  createSquareLayoutMock,
  loadPageHarness
} from "./support/watch-page-harness.ts";

const OUTPUT_ROOT = path.resolve(process.cwd(), "output", "playwright", "watch-preview");
const FIXTURE_ROOT = path.join(OUTPUT_ROOT, "fixtures");

type PreviewScenario = {
  name: string;
  locale: "en-US" | "pl-PL";
  shape: "round" | "square";
  page: "home" | "tool-list" | "recipe-detail" | "brew-active" | "result-summary";
  modulePath: string;
  prepare: (runtime: any) => Promise<void>;
};

const previewScenarios: PreviewScenario[] = [
  {
    name: "home-pl-round-480",
    locale: "pl-PL",
    shape: "round",
    page: "home",
    modulePath: "../zepp-app/page/home/index.js",
    async prepare(runtime) {
      const fixture = createCatalogFixture();
      runtime.setLanguageCode(9);
      runtime.setDeviceInfo({ width: 480, height: 480, keyNumber: 3, keyType: "sport" });
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache),
        [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify(fixture.lastResult)
      });
    }
  },
  {
    name: "tool-list-en-round-480",
    locale: "en-US",
    shape: "round",
    page: "tool-list",
    modulePath: "../zepp-app/page/tool-list/index.js",
    async prepare(runtime) {
      const fixture = createExpandedCatalogFixture();
      runtime.setLanguageCode(2);
      runtime.setDeviceInfo({ width: 480, height: 480, keyNumber: 3, keyType: "sport" });
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
      });
    }
  },
  {
    name: "recipe-detail-en-round-480",
    locale: "en-US",
    shape: "round",
    page: "recipe-detail",
    modulePath: "../zepp-app/page/recipe-detail/index.js",
    async prepare(runtime) {
      const fixture = createCatalogFixture();
      const watchStore = await import("../zepp-app/shared/storage/watch-store.js");

      runtime.setLanguageCode(2);
      runtime.setDeviceInfo({ width: 480, height: 480, keyNumber: 3, keyType: "sport" });
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
      });
      watchStore.getRuntimeState().selectedToolId = fixture.primaryRecord.toolId;
      watchStore.writeSelectedRecipeId(fixture.primarySummary.recipeId);
    }
  },
  {
    name: "brew-active-en-round-480",
    locale: "en-US",
    shape: "round",
    page: "brew-active",
    modulePath: "../zepp-app/page/brew-active/index.js",
    async prepare(runtime) {
      const fixture = createCatalogFixture();
      const now = 250_000;
      const activeSession = createActiveBrewSession(fixture.primarySnapshot, { now });

      activeSession.currentStepIndex = 1;
      activeSession.status = "running";
      activeSession.currentStepStartedAt = now;
      activeSession.expectedStepEndAt = now + 15_000;

      runtime.setLanguageCode(2);
      runtime.setDeviceInfo({ width: 480, height: 480, keyNumber: 3, keyType: "sport" });
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify(activeSession)
      });
      vi.useFakeTimers();
      vi.setSystemTime(now);
    }
  },
  {
    name: "result-summary-en-round-480",
    locale: "en-US",
    shape: "round",
    page: "result-summary",
    modulePath: "../zepp-app/page/result-summary/index.js",
    async prepare(runtime) {
      const fixture = createCatalogFixture();
      runtime.setLanguageCode(2);
      runtime.setDeviceInfo({ width: 480, height: 480, keyNumber: 3, keyType: "sport" });
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify(fixture.lastResult)
      });
    }
  },
  {
    name: "home-en-square-480",
    locale: "en-US",
    shape: "square",
    page: "home",
    modulePath: "../zepp-app/page/home/index.js",
    async prepare(runtime) {
      const fixture = createCatalogFixture();
      runtime.setLanguageCode(2);
      runtime.setDeviceInfo({ width: 480, height: 480, keyNumber: 3, keyType: "sport" });
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache),
        [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify(fixture.lastResult)
      });
    }
  },
  {
    name: "tool-list-en-square-480",
    locale: "en-US",
    shape: "square",
    page: "tool-list",
    modulePath: "../zepp-app/page/tool-list/index.js",
    async prepare(runtime) {
      const fixture = createExpandedCatalogFixture();
      runtime.setLanguageCode(2);
      runtime.setDeviceInfo({ width: 480, height: 480, keyNumber: 3, keyType: "sport" });
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
      });
    }
  },
  {
    name: "recipe-detail-en-square-480",
    locale: "en-US",
    shape: "square",
    page: "recipe-detail",
    modulePath: "../zepp-app/page/recipe-detail/index.js",
    async prepare(runtime) {
      const fixture = createCatalogFixture();
      const watchStore = await import("../zepp-app/shared/storage/watch-store.js");

      runtime.setLanguageCode(2);
      runtime.setDeviceInfo({ width: 480, height: 480, keyNumber: 3, keyType: "sport" });
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
      });
      watchStore.getRuntimeState().selectedToolId = fixture.primaryRecord.toolId;
      watchStore.writeSelectedRecipeId(fixture.primarySummary.recipeId);
    }
  },
  {
    name: "brew-active-en-square-480",
    locale: "en-US",
    shape: "square",
    page: "brew-active",
    modulePath: "../zepp-app/page/brew-active/index.js",
    async prepare(runtime) {
      const fixture = createCatalogFixture();
      const now = 250_000;
      const activeSession = createActiveBrewSession(fixture.primarySnapshot, { now });

      activeSession.currentStepIndex = 1;
      activeSession.status = "running";
      activeSession.currentStepStartedAt = now;
      activeSession.expectedStepEndAt = now + 15_000;

      runtime.setLanguageCode(2);
      runtime.setDeviceInfo({ width: 480, height: 480, keyNumber: 3, keyType: "sport" });
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify(activeSession)
      });
      vi.useFakeTimers();
      vi.setSystemTime(now);
    }
  },
  {
    name: "result-summary-en-square-480",
    locale: "en-US",
    shape: "square",
    page: "result-summary",
    modulePath: "../zepp-app/page/result-summary/index.js",
    async prepare(runtime) {
      const fixture = createCatalogFixture();
      runtime.setLanguageCode(2);
      runtime.setDeviceInfo({ width: 480, height: 480, keyNumber: 3, keyType: "sport" });
      runtime.setLocalStorageState({
        [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify(fixture.lastResult)
      });
    }
  }
];

beforeAll(async () => {
  await rm(FIXTURE_ROOT, { recursive: true, force: true });
  await mkdir(FIXTURE_ROOT, { recursive: true });
});

it("exports deterministic watch-preview fixture payloads", async () => {
  const manifest = [] as Array<Record<string, unknown>>;

  for (const scenario of previewScenarios) {
    const layoutMock = scenario.shape === "round"
      ? createLayoutMock()
      : createSquareLayoutMock(scenario.page);
    const { runtime, pageDefinition } = await loadPageHarness(scenario.modulePath, layoutMock);

    expect(pageDefinition).toBeTruthy();
    await scenario.prepare(runtime);

    const pageInstance = buildPage(pageDefinition);
    const fixturePayload = {
      scenario: scenario.name,
      locale: scenario.locale,
      device: {
        width: 480,
        height: 480,
        shape: scenario.shape
      },
      widgets: serializeWidgets(runtime.getCreatedWidgets())
    };

    await writeFile(
      path.join(FIXTURE_ROOT, `${scenario.name}.json`),
      JSON.stringify(fixturePayload, null, 2),
      "utf8"
    );
    manifest.push({
      name: scenario.name,
      locale: scenario.locale,
      shape: scenario.shape,
      fileName: `${scenario.name}.json`
    });

    if (typeof pageDefinition.onDestroy === "function") {
      pageDefinition.onDestroy.call(pageInstance);
    }
    vi.useRealTimers();
  }

  await writeFile(path.join(FIXTURE_ROOT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
});

function serializeWidgets(widgets: Array<Record<string, unknown>>) {
  return widgets.map((widget) => JSON.parse(JSON.stringify(widget, (_key, value) => {
    if (typeof value === "function" || typeof value === "symbol") {
      return undefined;
    }

    return value;
  })));
}