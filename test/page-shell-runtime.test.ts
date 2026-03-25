import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSupportedTools } from "../shared/constants/tool-catalog.js";
import { getSeedRecipeRecordById } from "../shared/domain/seed-library.js";
import { CURRENT_SCHEMA_VERSION, createRecipeSnapshot, createRecipeSummary } from "../shared/domain/schema.js";
import { createActiveBrewSession } from "../shared/engine/recipe-engine.js";
import { WATCH_STORAGE_KEYS } from "../shared/storage/keys.js";

function createCatalogFixture() {
  const primaryRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1_000);
  const secondaryRecord = getSeedRecipeRecordById("seed_ap_inverted_sweet", 1_100);
  const primarySummary = createRecipeSummary(primaryRecord);
  const secondarySummary = createRecipeSummary(secondaryRecord);
  const primarySnapshot = createRecipeSnapshot(primaryRecord);
  const secondarySnapshot = createRecipeSnapshot(secondaryRecord);

  return {
    primaryRecord,
    primarySummary,
    secondarySummary,
    primarySnapshot,
    secondarySnapshot,
    catalogCache: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      toolCatalogRevision: 3,
      recipeCatalogRevision: 7,
      tools: getSupportedTools(),
      recipesByTool: {
        tool_aeropress: [primarySummary, secondarySummary],
        tool_v60: [],
        tool_kalita_wave: [],
        tool_chemex: [],
        tool_clever_dripper: [],
        tool_french_press: []
      },
      recipeSnapshotsById: {
        [primarySnapshot.recipeId]: primarySnapshot,
        [secondarySnapshot.recipeId]: secondarySnapshot
      },
      cachedAt: 2_000
    },
    lastResult: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      historyId: "hist_1",
      toolId: "tool_aeropress",
      recipeName: primaryRecord.name,
      colorToken: primaryRecord.colorToken,
      status: "completed",
      endedAt: 3_000,
      elapsedMs: 120_000,
      totalDeltaMs: -1_500
    }
  };
}

function createLayoutMock(overrides = {}) {
  return {
    BACKGROUND: {},
    TITLE_TEXT: {},
    SUBTITLE_TEXT: {},
    BODY_TEXT: {},
    FOOTER_TEXT: {},
    ACTION_DOCK: {},
    LIST_PANEL: {},
    DETAIL_PANEL: {},
    STATUS_PANEL: {},
    STATUS_TEXT: {},
    LIST_FRAME: {
      x: 0,
      y: 0,
      w: 320,
      h: 220,
      itemHeight: 96,
      itemSpace: 8,
      itemRadius: 16,
      titleHeight: 40,
      metaHeight: 24
    },
    EMPTY_BUTTON: {},
    PRIMARY_BUTTON: {},
    HOME_BUTTON: {},
    BUTTONS: [{}, {}, {}],
    ...overrides
  };
}

async function loadPageHarness(modulePath: string, layoutMock: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock("zosLoader:./index.[pf].layout.js", () => layoutMock);

  const runtime = await import("./zeus-runtime/runtime.ts");
  runtime.resetZeppRuntime();
  await import(modulePath);
  const pageDefinition = runtime.getLastPageDefinition();

  expect(pageDefinition).toBeTruthy();

  return {
    runtime,
    pageDefinition
  };
}

function buildPage(pageDefinition: Record<string, unknown>) {
  const pageInstance: Record<string, unknown> = {};
  (pageDefinition.build as () => void).call(pageInstance);
  return pageInstance;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("page shell runtime coverage", () => {
  it("rebuilds the home shell on runtime events and unsubscribes on destroy", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../page/home/index.js", createLayoutMock());

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache),
      [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify(fixture.lastResult)
    });

    const pageInstance = buildPage(pageDefinition);
    const widgets = runtime.getCreatedWidgets();
    const buttons = widgets.filter((widget) => widget.type === "BUTTON");
    const textWidgets = widgets.filter((widget) => widget.type === "TEXT");

    expect(widgets.some((widget) => widget.type === "BUTTON" && widget.text === "Browse")).toBe(true);
    expect(widgets.some((widget) => widget.type === "BUTTON" && widget.text === "Last")).toBe(true);
    expect(textWidgets.some((widget) => String(widget.text).includes("Phone bridge connected"))).toBe(false);
    expect(textWidgets.some((widget) => String(widget.text).includes("cached recipes ready"))).toBe(false);

    buttons[0].click_func();
    expect(runtime.router.push).toHaveBeenCalledWith({
      url: "page/tool-list/index"
    });

    buttons[1].click_func();
    expect(runtime.ble.send).not.toHaveBeenCalled();

    runtime.router.push.mockClear();
    buttons[2].click_func();
    expect(runtime.router.push).toHaveBeenCalledWith({
      url: "page/result-summary/index"
    });

    const runtimeEvents = await import("../shared/watch/runtime-events.js");
    runtime.router.replace.mockClear();
    runtimeEvents.emitRuntimeEvent({
      type: "catalog",
      value: fixture.catalogCache
    });

    expect(runtime.router.replace).toHaveBeenCalledWith({
      url: "page/home/index"
    });

    runtime.router.replace.mockClear();
    (pageDefinition.onDestroy as () => void).call(pageInstance);
    runtimeEvents.emitRuntimeEvent({
      type: "last_result",
      value: fixture.lastResult
    });

    expect(runtime.router.replace).not.toHaveBeenCalled();
  });

  it("renders the tool list as a scroll list and routes into recipe selection", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../page/tool-list/index.js", createLayoutMock());

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
    });

    const pageInstance = buildPage(pageDefinition);
    const [scrollList] = runtime.findCreatedWidgetsByType("SCROLL_LIST");
    const textWidgets = runtime.getCreatedWidgets().filter((widget) => widget.type === "TEXT");
    const buttons = runtime.getCreatedWidgets().filter((widget) => widget.type === "BUTTON");

    expect(scrollList).toBeTruthy();
    expect(scrollList.item_common_focus).toBe(true);
    expect(scrollList.item_config[0].image_view_count).toBe(1);
    expect(scrollList.data_array[0]).toMatchObject({
      icon: "tool-aeropress.png",
      title: "AeroPress"
    });
    expect(textWidgets.some((widget) => String(widget.text).includes("synced tools on watch"))).toBe(false);
    expect(buttons).toHaveLength(0);

    scrollList.item_click_func(null, 0);

    expect(runtime.router.push).toHaveBeenCalledWith({
      url: "page/recipe-list/index"
    });

    const runtimeEvents = await import("../shared/watch/runtime-events.js");
    runtime.router.replace.mockClear();
    runtimeEvents.emitRuntimeEvent({
      type: "catalog",
      value: fixture.catalogCache
    });

    expect(runtime.router.replace).toHaveBeenCalledWith({
      url: "page/tool-list/index"
    });

    runtime.router.replace.mockClear();
    (pageDefinition.onDestroy as () => void).call(pageInstance);
    runtimeEvents.emitRuntimeEvent({
      type: "catalog",
      value: fixture.catalogCache
    });

    expect(runtime.router.replace).not.toHaveBeenCalled();
  });

  it("renders recipe rows from watch state and routes into recipe detail", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../page/recipe-list/index.js", createLayoutMock());
    const watchStore = await import("../shared/storage/watch-store.js");

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
    });

    watchStore.getRuntimeState().selectedToolId = fixture.primaryRecord.toolId;
    const pageInstance = buildPage(pageDefinition);
    const [scrollList] = runtime.findCreatedWidgetsByType("SCROLL_LIST");
    const buttons = runtime.getCreatedWidgets().filter((widget) => widget.type === "BUTTON");

    expect(scrollList).toBeTruthy();
    expect(scrollList.data_count).toBe(2);
    expect(buttons).toHaveLength(0);

    scrollList.item_click_func(null, 0);

    expect(runtime.router.push).toHaveBeenCalledWith({
      url: "page/recipe-detail/index"
    });
    expect(watchStore.readSelectedRecipeId()).toBe(fixture.primarySummary.recipeId);

    const runtimeEvents = await import("../shared/watch/runtime-events.js");
    runtime.router.replace.mockClear();
    runtimeEvents.emitRuntimeEvent({
      type: "catalog",
      value: fixture.catalogCache
    });

    expect(runtime.router.replace).toHaveBeenCalledWith({
      url: "page/recipe-list/index"
    });

    runtime.router.replace.mockClear();
    (pageDefinition.onDestroy as () => void).call(pageInstance);
    runtimeEvents.emitRuntimeEvent({
      type: "catalog",
      value: fixture.catalogCache
    });

    expect(runtime.router.replace).not.toHaveBeenCalled();
  });

  it("starts a selected recipe from the detail page and refreshes on catalog updates", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../page/recipe-detail/index.js", createLayoutMock());
    const watchStore = await import("../shared/storage/watch-store.js");

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
    });

    watchStore.getRuntimeState().selectedToolId = fixture.primaryRecord.toolId;
    watchStore.writeSelectedRecipeId(fixture.primarySummary.recipeId);
    const pageInstance = buildPage(pageDefinition);
    const buttons = runtime.getCreatedWidgets().filter((widget) => widget.type === "BUTTON");

    expect(buttons).toHaveLength(1);
    expect(buttons[0].text).toBe("Start brew");
    buttons[0].click_func();

    expect(runtime.router.push).toHaveBeenCalledWith({
      url: "page/brew-active/index"
    });
    expect(watchStore.readActiveSession()).toMatchObject({
      recipeId: fixture.primarySummary.recipeId
    });

    const runtimeEvents = await import("../shared/watch/runtime-events.js");
    runtime.router.replace.mockClear();
    runtimeEvents.emitRuntimeEvent({
      type: "catalog",
      value: fixture.catalogCache
    });

    expect(runtime.router.replace).toHaveBeenCalledWith({
      url: "page/recipe-detail/index"
    });

    runtime.router.replace.mockClear();
    (pageDefinition.onDestroy as () => void).call(pageInstance);
    runtimeEvents.emitRuntimeEvent({
      type: "catalog",
      value: fixture.catalogCache
    });

    expect(runtime.router.replace).not.toHaveBeenCalled();
  });

  it("refreshes the result summary page on latest-result events", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../page/result-summary/index.js", createLayoutMock());

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify(fixture.lastResult)
    });

    const pageInstance = buildPage(pageDefinition);
    const widgets = runtime.getCreatedWidgets();
    const buttons = widgets.filter((widget) => widget.type === "BUTTON");

    expect(widgets.some((widget) => widget.type === "TEXT" && widget.text === fixture.lastResult.recipeName)).toBe(true);
    expect(widgets.some((widget) => widget.type === "BUTTON" && widget.text === "Browse")).toBe(true);
    expect(widgets.some((widget) => widget.type === "BUTTON" && widget.text === "Home")).toBe(true);

    buttons[1].click_func();
    expect(runtime.router.replace).toHaveBeenCalledWith({
      url: "page/home/index"
    });

    const runtimeEvents = await import("../shared/watch/runtime-events.js");
    runtime.router.replace.mockClear();
    runtimeEvents.emitRuntimeEvent({
      type: "last_result",
      value: fixture.lastResult
    });

    expect(runtime.router.replace).toHaveBeenCalledWith({
      url: "page/result-summary/index"
    });

    runtime.router.replace.mockClear();
    (pageDefinition.onDestroy as () => void).call(pageInstance);
    runtimeEvents.emitRuntimeEvent({
      type: "last_result",
      value: fixture.lastResult
    });

    expect(runtime.router.replace).not.toHaveBeenCalled();
  });

  it("covers the home resume, discard, and latest-result button paths", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../page/home/index.js", createLayoutMock());
    const activeSession = createActiveBrewSession(fixture.primarySnapshot, { now: 1_000 });

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache),
      [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify(activeSession),
      [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify(fixture.lastResult)
    });

    buildPage(pageDefinition);
    const buttons = runtime.getCreatedWidgets().filter((widget) => widget.type === "BUTTON");
    const [primaryButton, secondaryButton, tertiaryButton] = buttons;

    expect(primaryButton.text).toBe("Resume");
    primaryButton.click_func();
    expect(runtime.router.replace).toHaveBeenCalledWith({
      url: "page/brew-active/index"
    });

    runtime.router.replace.mockClear();
    secondaryButton.click_func();
    expect(runtime.router.replace).toHaveBeenCalledWith({
      url: "page/home/index"
    });

    runtime.router.push.mockClear();
    tertiaryButton.click_func();
    expect(runtime.router.push).toHaveBeenCalledWith({
      url: "page/result-summary/index"
    });
  });

  it("keeps the tool list usable when device-info lookup fails", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../page/tool-list/index.js", createLayoutMock());

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
    });
    runtime.device.getDeviceInfo.mockImplementationOnce(() => {
      throw new Error("no device info");
    });

    buildPage(pageDefinition);
    const [scrollList] = runtime.findCreatedWidgetsByType("SCROLL_LIST");

    expect(scrollList.item_common_focus).toBe(false);
  });

  it("renders the recipe list empty state and lets the user request sync", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../page/recipe-list/index.js", createLayoutMock());
    const watchStore = await import("../shared/storage/watch-store.js");

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
    });

    watchStore.getRuntimeState().selectedToolId = "tool_v60";
    buildPage(pageDefinition);

    expect(runtime.findCreatedWidgetsByType("SCROLL_LIST")).toHaveLength(0);
    const buttons = runtime.getCreatedWidgets().filter((widget) => widget.type === "BUTTON");

    expect(buttons).toHaveLength(1);
    expect(buttons[0].text).toBe("Refresh library");
    buttons[0].click_func();
    expect(runtime.ble.send).not.toHaveBeenCalled();
  });

  it("shows fallback controls when the selected recipe snapshot is missing", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../page/recipe-detail/index.js", createLayoutMock());
    const watchStore = await import("../shared/storage/watch-store.js");

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
    });

    watchStore.getRuntimeState().selectedToolId = fixture.primaryRecord.toolId;
    watchStore.writeSelectedRecipeId("missing_recipe");
    buildPage(pageDefinition);

    const buttons = runtime.getCreatedWidgets().filter((widget) => widget.type === "BUTTON");

    expect(buttons).toHaveLength(1);
    expect(buttons[0].text).toBe("Back to recipes");
    buttons[0].click_func();
    expect(runtime.router.replace).toHaveBeenCalledWith({
      url: "page/recipe-list/index"
    });
  });

  it("renders the no-result summary state and keeps both exit paths usable", async () => {
    const { runtime, pageDefinition } = await loadPageHarness("../page/result-summary/index.js", createLayoutMock());

    buildPage(pageDefinition);
    const widgets = runtime.getCreatedWidgets();
    const buttons = widgets.filter((widget) => widget.type === "BUTTON");

    expect(widgets.some((widget) => widget.type === "TEXT" && widget.text === "No result yet")).toBe(true);

    buttons[0].click_func();
    expect(runtime.router.push).toHaveBeenCalledWith({
      url: "page/tool-list/index"
    });

    runtime.router.replace.mockClear();
    buttons[1].click_func();
    expect(runtime.router.replace).toHaveBeenCalledWith({
      url: "page/home/index"
    });
  });
});
