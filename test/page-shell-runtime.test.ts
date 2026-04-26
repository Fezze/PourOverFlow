import { beforeEach, describe, expect, it, vi } from "vitest";

import { createActiveBrewSession } from "../zepp-app/shared/engine/recipe-engine.js";
import { WATCH_STORAGE_KEYS } from "../zepp-app/shared/storage/keys.js";
import {
  buildPage,
  createCatalogFixture,
  createExpandedCatalogFixture,
  createLayoutMock,
  loadPageHarness
} from "./support/watch-page-harness.ts";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("page shell runtime coverage", () => {
  it("rebuilds the home shell on runtime events and unsubscribes on destroy", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/home/index.js", createLayoutMock());

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
    expect(textWidgets.some((widget) => String(widget.text).includes("Browse the library"))).toBe(false);
    expect(textWidgets.some((widget) => String(widget.text).includes("Start the next brew"))).toBe(false);

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

    const runtimeEvents = await import("../zepp-app/shared/watch/runtime-events.js");
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

  it("renders watch home copy in Polish when the runtime language is set to Polish", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/home/index.js", createLayoutMock());

    runtime.setLanguageCode(9);
    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache),
      [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify(fixture.lastResult)
    });

    buildPage(pageDefinition);
    const textWidgets = runtime.getCreatedWidgets().filter((widget) => widget.type === "TEXT");
    const buttonWidgets = runtime.getCreatedWidgets().filter((widget) => widget.type === "BUTTON");

    expect(textWidgets.some((widget) => widget.text === "Nastepna kawa")).toBe(true);
    expect(buttonWidgets.some((widget) => widget.text === "Przegladaj")).toBe(true);
    expect(buttonWidgets.some((widget) => widget.text === "Ostatni")).toBe(true);
  });

  it("renders the tool list as a scroll list and routes into recipe selection", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/tool-list/index.js", createLayoutMock());

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
    });

    const pageInstance = buildPage(pageDefinition);
    const [scrollList] = runtime.findCreatedWidgetsByType("SCROLL_LIST");
    const textWidgets = runtime.getCreatedWidgets().filter((widget) => widget.type === "TEXT");
    const buttons = runtime.getCreatedWidgets().filter((widget) => widget.type === "BUTTON");

    expect(scrollList).toBeTruthy();
    expect(scrollList.item_common_focus).toBe(true);
    expect(scrollList.enable_scroll_bar).toBe(false);
    expect(scrollList.item_config[0].image_view_count).toBe(1);
    expect(scrollList.data_array[0]).toMatchObject({
      icon: "tool-aeropress.png",
      title: "AeroPress"
    });
    expect(textWidgets.some((widget) => widget.text === "Brewers")).toBe(true);
    expect(textWidgets.some((widget) => String(widget.text).includes("synced tools on watch"))).toBe(false);
    expect(buttons).toHaveLength(0);

    scrollList.item_click_func(null, 0);

    expect(runtime.router.push).toHaveBeenCalledWith({
      url: "page/recipe-list/index"
    });

    const runtimeEvents = await import("../zepp-app/shared/watch/runtime-events.js");
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
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/recipe-list/index.js", createLayoutMock());
    const watchStore = await import("../zepp-app/shared/storage/watch-store.js");

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

    const runtimeEvents = await import("../zepp-app/shared/watch/runtime-events.js");
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
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/recipe-detail/index.js", createLayoutMock());
    const watchStore = await import("../zepp-app/shared/storage/watch-store.js");

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
    });

    watchStore.getRuntimeState().selectedToolId = fixture.primaryRecord.toolId;
    watchStore.writeSelectedRecipeId(fixture.primarySummary.recipeId);
    const pageInstance = buildPage(pageDefinition);
    const buttons = runtime.getCreatedWidgets().filter((widget) => widget.type === "BUTTON");
    const textWidgets = runtime.getCreatedWidgets().filter((widget) => widget.type === "TEXT");
    const fillRects = runtime.getCreatedWidgets().filter((widget) => widget.type === "FILL_RECT");

    expect(runtime.findCreatedWidgetsByType("SCROLL_LIST")).toHaveLength(0);
    expect(fillRects.length).toBeGreaterThanOrEqual(5);
    expect(textWidgets.some((widget) => String(widget.text).includes("Dose and water"))).toBe(true);
    expect(textWidgets.some((widget) => String(widget.text).includes("Brew profile"))).toBe(true);
    expect(textWidgets.some((widget) => String(widget.text).includes("Time and steps"))).toBe(true);
    expect(textWidgets.some((widget) => String(widget.text).includes("Notes"))).toBe(true);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].text).toBe("Start brew");
    expect(textWidgets.some((widget) => String(widget.text).includes("Scroll for details"))).toBe(false);
    buttons[0].click_func();

    expect(runtime.router.push).toHaveBeenCalledWith({
      url: "page/brew-active/index"
    });
    expect(watchStore.readActiveSession()).toMatchObject({
      recipeId: fixture.primarySummary.recipeId
    });

    const runtimeEvents = await import("../zepp-app/shared/watch/runtime-events.js");
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

  it("keeps recipe-detail scrollable only when the content really overflows", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/recipe-detail/index.js", createLayoutMock());
    const watchStore = await import("../zepp-app/shared/storage/watch-store.js");
    const longSnapshot = {
      ...fixture.primarySnapshot,
      description:
        "This is a much longer tasting note intended to force the recipe detail surface into a real overflow case so the page keeps scrolling only when it genuinely needs more vertical space than the round layout can offer."
    };
    const longCatalogCache = {
      ...fixture.catalogCache,
      recipeSnapshotsById: {
        ...fixture.catalogCache.recipeSnapshotsById,
        [fixture.primarySummary.recipeId]: longSnapshot
      }
    };

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(longCatalogCache)
    });

    watchStore.getRuntimeState().selectedToolId = fixture.primaryRecord.toolId;
    watchStore.writeSelectedRecipeId(fixture.primarySummary.recipeId);
    buildPage(pageDefinition);

    const [scrollList] = runtime.findCreatedWidgetsByType("SCROLL_LIST");
    expect(scrollList).toBeTruthy();
    expect(scrollList.enable_scroll_bar).toBe(false);
    expect(scrollList.data_count).toBeGreaterThanOrEqual(4);
  });

  it("renders the active-brew dock with Zepp-safe labels and ASCII step meta", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/brew-active/index.js", createLayoutMock());
    const watchStore = await import("../zepp-app/shared/storage/watch-store.js");
    const now = 250_000;
    const activeSession = createActiveBrewSession(fixture.primarySnapshot, { now });

    activeSession.currentStepIndex = 1;
    activeSession.status = "running";
    activeSession.currentStepStartedAt = now;
    activeSession.expectedStepEndAt = now + 15_000;

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify(activeSession)
    });

    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      const pageInstance = buildPage(pageDefinition);
      const buttons = runtime.getCreatedWidgets().filter((widget) => widget.type === "BUTTON");
      const textWidgets = runtime.getCreatedWidgets().filter((widget) => widget.type === "TEXT");
      const fillRects = runtime.getCreatedWidgets().filter((widget) => widget.type === "FILL_RECT");

      expect(buttons.map((widget) => widget.text)).toEqual(["Skip", "Stop"]);
      expect(buttons.every((widget) => /^[\x20-\x7E]+$/.test(String(widget.text)))).toBe(true);
      expect(textWidgets.some((widget) => String(widget.text).includes("Target 50 ml /"))).toBe(true);
      expect(textWidgets.some((widget) => String(widget.text).includes("Timed step."))).toBe(false);
      expect(textWidgets.some((widget) => String(widget.text).includes("Shortcut button"))).toBe(false);
      expect(fillRects.length).toBeGreaterThanOrEqual(2);
      expect(runtime.display.setWakeUpRelaunch).toHaveBeenCalled();
      buttons[0].click_func();
      expect(runtime.router.replace).toHaveBeenCalledWith({
        url: "page/brew-active/index"
      });
      expect(watchStore.readActiveSession()?.currentStepIndex).toBe(2);

      (pageDefinition.onDestroy as () => void).call(pageInstance);
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to an internal scroll area when the active-brew instruction body overflows", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/brew-active/index.js", createLayoutMock());
    const now = 260_000;
    const longSnapshot = {
      ...fixture.primarySnapshot,
      steps: fixture.primarySnapshot.steps.map((step, index) => (
        index === 1
          ? {
              ...step,
              body: "Pour slowly from the center, keep the kettle low, and stay steady through the spiral. ".repeat(12)
            }
          : { ...step }
      ))
    };
    const activeSession = createActiveBrewSession(longSnapshot, { now });

    activeSession.currentStepIndex = 1;
    activeSession.status = "running";
    activeSession.currentStepStartedAt = now;
    activeSession.expectedStepEndAt = now + 15_000;

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify(activeSession)
    });

    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      buildPage(pageDefinition);

      const [scrollList] = runtime.findCreatedWidgetsByType("SCROLL_LIST");
      expect(scrollList).toBeTruthy();
      expect(scrollList.enable_scroll_bar).toBe(false);
      expect(scrollList.data_count).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("aborts the active brew from the dock and returns home", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/brew-active/index.js", createLayoutMock());
    const watchStore = await import("../zepp-app/shared/storage/watch-store.js");
    const activeSession = createActiveBrewSession(fixture.primarySnapshot, { now: 310_000 });

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify(activeSession)
    });

    buildPage(pageDefinition);
    const buttons = runtime.getCreatedWidgets().filter((widget) => widget.type === "BUTTON");

    buttons[1].click_func();

    expect(runtime.router.replace).toHaveBeenCalledWith({
      url: "page/home/index"
    });
    expect(watchStore.readActiveSession()).toBeNull();
  });

  it("replaces the active-brew page when a timed tick advances the session", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/brew-active/index.js", createLayoutMock());
    const now = 410_000;
    const activeSession = createActiveBrewSession(fixture.primarySnapshot, { now });

    activeSession.currentStepIndex = 1;
    activeSession.status = "running";
    activeSession.currentStepStartedAt = now - 14_000;
    activeSession.expectedStepEndAt = now + 1_000;

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify(activeSession)
    });

    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      const pageInstance = buildPage(pageDefinition);

      runtime.router.replace.mockClear();
      vi.advanceTimersByTime(1_000);

      expect(runtime.router.replace).toHaveBeenCalledWith({
        url: "page/brew-active/index"
      });

      (pageDefinition.onDestroy as () => void).call(pageInstance);
    } finally {
      vi.useRealTimers();
    }
  });

  it("refreshes the active-brew widgets in place while a timed step is still running", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/brew-active/index.js", createLayoutMock());
    const now = 510_000;
    const activeSession = createActiveBrewSession(fixture.primarySnapshot, { now });

    activeSession.currentStepIndex = 1;
    activeSession.status = "running";
    activeSession.currentStepStartedAt = now;
    activeSession.expectedStepEndAt = now + 5_000;

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify(activeSession)
    });

    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      const pageInstance = buildPage(pageDefinition);
      const textWidgets = runtime.getCreatedWidgets().filter((widget) => widget.type === "TEXT");
      const metaWidget = textWidgets.find((widget) => String(widget.text).includes("left"));

      runtime.router.replace.mockClear();
      vi.advanceTimersByTime(1_000);

      expect(runtime.router.replace).not.toHaveBeenCalled();
      expect(String(metaWidget?.text)).toContain("0:04 left");

      (pageDefinition.onDestroy as () => void).call(pageInstance);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops the active-brew timer loop cleanly when the session disappears", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/brew-active/index.js", createLayoutMock());
    const watchStore = await import("../zepp-app/shared/storage/watch-store.js");
    const now = 610_000;
    const activeSession = createActiveBrewSession(fixture.primarySnapshot, { now });

    activeSession.currentStepIndex = 1;
    activeSession.status = "running";
    activeSession.currentStepStartedAt = now;
    activeSession.expectedStepEndAt = now + 5_000;

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify(activeSession)
    });

    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      const pageInstance = buildPage(pageDefinition);

      watchStore.clearActiveSession();
      vi.advanceTimersByTime(1_000);

      expect(pageInstance.activeTimer).toBeNull();
      expect(runtime.router.replace).not.toHaveBeenCalled();

      (pageDefinition.onDestroy as () => void).call(pageInstance);
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders the no-active-brew fallback and keeps its home action usable", async () => {
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/brew-active/index.js", createLayoutMock());

    buildPage(pageDefinition);
    const widgets = runtime.getCreatedWidgets();
    const buttons = widgets.filter((widget) => widget.type === "BUTTON");

    expect(widgets.some((widget) => widget.type === "TEXT" && widget.text === "No active brew")).toBe(true);
    expect(widgets.some((widget) => widget.type === "TEXT" && String(widget.text).includes("No session is stored"))).toBe(true);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].text).toBe("Go home");

    buttons[0].click_func();
    expect(runtime.router.replace).toHaveBeenCalledWith({
      url: "page/home/index"
    });
  });

  it("refreshes the result summary page on latest-result events", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/result-summary/index.js", createLayoutMock());

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify(fixture.lastResult)
    });

    const pageInstance = buildPage(pageDefinition);
    const widgets = runtime.getCreatedWidgets();
    const buttons = widgets.filter((widget) => widget.type === "BUTTON");
    const textWidgets = widgets.filter((widget) => widget.type === "TEXT");
    const fillRects = widgets.filter((widget) => widget.type === "FILL_RECT");

    expect(runtime.findCreatedWidgetsByType("SCROLL_LIST")).toHaveLength(0);
    expect(fillRects.length).toBeGreaterThanOrEqual(4);
    expect(textWidgets.some((widget) => widget.text === "Status")).toBe(true);
    expect(textWidgets.some((widget) => widget.text === "Total time")).toBe(true);
    expect(textWidgets.some((widget) => widget.text === "Timing delta")).toBe(true);
    expect(textWidgets.some((widget) => String(widget.text).includes("Full history stays on the phone."))).toBe(false);
    expect(widgets.some((widget) => widget.type === "TEXT" && widget.text === fixture.lastResult.recipeName)).toBe(true);
    expect(widgets.some((widget) => widget.type === "BUTTON" && widget.text === "Home")).toBe(true);
    expect(widgets.some((widget) => widget.type === "BUTTON" && widget.text === "Browse")).toBe(false);
    expect(buttons).toHaveLength(1);

    buttons[0].click_func();
    expect(runtime.router.replace).toHaveBeenCalledWith({
      url: "page/home/index"
    });

    const runtimeEvents = await import("../zepp-app/shared/watch/runtime-events.js");
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

  it("keeps result-summary scrollable only when future content really overflows", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/result-summary/index.js", createLayoutMock());

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify({
        ...fixture.lastResult,
        totalDeltaMs:
          "This is an intentionally long future-facing summary string that should force the result panel into a genuine overflow state instead of rendering as static rows. ".repeat(
            14
          )
      })
    });

    buildPage(pageDefinition);
    const [scrollList] = runtime.findCreatedWidgetsByType("SCROLL_LIST");

    expect(scrollList).toBeTruthy();
    expect(scrollList.enable_scroll_bar).toBe(false);
    expect(scrollList.data_count).toBe(3);
  });

  it("covers the home resume, discard, and latest-result button paths", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/home/index.js", createLayoutMock());
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
    expect(secondaryButton.text).toBe("Discard");
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
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/tool-list/index.js", createLayoutMock());

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
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/recipe-list/index.js", createLayoutMock());
    const watchStore = await import("../zepp-app/shared/storage/watch-store.js");

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
    });

    watchStore.getRuntimeState().selectedToolId = "tool_v60";
    buildPage(pageDefinition);

    expect(runtime.findCreatedWidgetsByType("SCROLL_LIST")).toHaveLength(0);
    const textWidgets = runtime.getCreatedWidgets().filter((widget) => widget.type === "TEXT");
    const buttons = runtime.getCreatedWidgets().filter((widget) => widget.type === "BUTTON");

    expect(textWidgets.some((widget) => String(widget.text).includes("No recipes yet"))).toBe(true);
    expect(textWidgets.some((widget) => String(widget.text).includes("After saving in Settings"))).toBe(false);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].text).toBe("Refresh from phone");
    buttons[0].click_func();
    expect(runtime.ble.send).not.toHaveBeenCalled();
  });

  it("renders expanded uneven seed counts across the watch browse flow", async () => {
    const fixture = createExpandedCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/tool-list/index.js", createLayoutMock());

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
    });

    buildPage(pageDefinition);
    const [scrollList] = runtime.findCreatedWidgetsByType("SCROLL_LIST");

    expect(scrollList).toBeTruthy();
    expect(scrollList.data_count).toBe(6);
    expect(scrollList.data_array).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "AeroPress", meta: "4 recipes" }),
        expect.objectContaining({ title: "Hario V60", meta: "5 recipes" }),
        expect.objectContaining({ title: "Kalita Wave", meta: "3 recipes" }),
        expect.objectContaining({ title: "Chemex", meta: "4 recipes" }),
        expect.objectContaining({ title: "Clever Dripper", meta: "3 recipes" }),
        expect.objectContaining({ title: "French Press", meta: "5 recipes" })
      ])
    );
  });

  it("shows more than two recipes for a brewer when the expanded seed cache is present", async () => {
    const fixture = createExpandedCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/recipe-list/index.js", createLayoutMock());
    const watchStore = await import("../zepp-app/shared/storage/watch-store.js");

    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
    });

    watchStore.getRuntimeState().selectedToolId = "tool_v60";
    buildPage(pageDefinition);

    const [scrollList] = runtime.findCreatedWidgetsByType("SCROLL_LIST");
    expect(scrollList).toBeTruthy();
    expect(scrollList.data_count).toBe(5);
    expect(scrollList.data_array.map((item) => item.title)).toEqual([
      "V60 Bloom Classic",
      "V60 Fast Morning",
      "V60 High Sweet",
      "V60 Low Agitation",
      "V60 Evening Balance"
    ]);
  });

  it("shows fallback controls when the selected recipe snapshot is missing", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/recipe-detail/index.js", createLayoutMock());
    const watchStore = await import("../zepp-app/shared/storage/watch-store.js");

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
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/result-summary/index.js", createLayoutMock());

    buildPage(pageDefinition);
    const widgets = runtime.getCreatedWidgets();
    const buttons = widgets.filter((widget) => widget.type === "BUTTON");
    const textWidgets = widgets.filter((widget) => widget.type === "TEXT");

    expect(widgets.some((widget) => widget.type === "TEXT" && widget.text === "No result yet")).toBe(true);
    expect(textWidgets.some((widget) => String(widget.text).includes("Full history stays on the phone."))).toBe(false);

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
