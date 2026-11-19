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

    expect(textWidgets.some((widget) => widget.text === "Następna kawa")).toBe(true);
    expect(buttonWidgets.some((widget) => widget.text === "Przeglądaj")).toBe(true);
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
    expect(fillRects[0].h).toBeGreaterThanOrEqual(buttons[0].y + buttons[0].h);
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

    const note = runtime.findCreatedWidgetsByType("TEXT").find(w => w.text === longSnapshot.description);
    expect(runtime.findCreatedWidgetsByType("SCROLL_LIST")).toHaveLength(0);
    const reader = runtime.getCreatedWidgets()[note.parentIndex];
    expect(reader.type).toBe("VIEW_CONTAINER");
    expect(reader.y + reader.h).toBeLessThan(runtime.findCreatedWidgetsByType("BUTTON")[0].y);
    expect(runtime.getCreatedWidgets()[0].h).toBe(480);
  });

  it("renders the active-brew dock with Zepp-safe labels and separate countdown and session time", async () => {
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
      expect(textWidgets.some((widget) => String(widget.text).includes("Target 50 ml"))).toBe(true);
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

  it("measures the full instruction inside the reader above the stationary actions", async () => {
    const fixture = createCatalogFixture();
    const body = "Pour slowly from the center.\n".repeat(12) + "Keep pouring throughout the spiral.";
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/brew-active/index.js", createLayoutMock());
    const now = 260_000;
    const longSnapshot = {
      ...fixture.primarySnapshot,
      steps: fixture.primarySnapshot.steps.map((step, index) => (
        index === 1
          ? {
              ...step,
              body
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

      const text = runtime.findCreatedWidgetsByType("TEXT").find(w => w.text === body);
      expect(runtime.findCreatedWidgetsByType("SCROLL_LIST")).toHaveLength(0);
      const { getTextLayout } = await import("@zos/ui");
      const { height } = getTextLayout(body, {
        text_size: text.text_size,
        text_width: text.w,
        wrapped: 1
      });
      expect(text.h).toBeGreaterThanOrEqual(height);
      const [action] = runtime.findCreatedWidgetsByType("BUTTON");
      const reader = runtime.getCreatedWidgets()[text.parentIndex];
      expect(reader.type).toBe("VIEW_CONTAINER");
      expect(reader.y + reader.h).toBeLessThan(action.y);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    { languageCode: 2, prompt: "Stop brewing?" },
    { languageCode: 9, prompt: "Przerwać parzenie?" }
  ])("confirms or cancels an active brew stop in language $languageCode", async ({ languageCode, prompt }) => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/brew-active/index.js", createLayoutMock());
    const watchStore = await import("../zepp-app/shared/storage/watch-store.js");
    const activeSession = createActiveBrewSession(fixture.primarySnapshot, { now: 310_000 });
    runtime.setLanguageCode(languageCode);
    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify(activeSession)
    });

    const page = buildPage(pageDefinition);
    try {
      const stop = runtime.findCreatedWidgetsByType("BUTTON").find((button) => button.text === "Stop");
      stop.click_func();

      const { createModal, MODAL_CANCEL, MODAL_CONFIRM } = runtime.interaction;
      const [options] = createModal.mock.calls[0];
      const modal = createModal.mock.results[0].value;
      expect(options.content).toBe(prompt);
      expect(modal.show).toHaveBeenLastCalledWith(true);
      expect(watchStore.readActiveSession()).not.toBeNull();
      expect(runtime.router.replace).not.toHaveBeenCalled();

      options.onClick({ type: MODAL_CANCEL });
      expect(modal.show).toHaveBeenLastCalledWith(false);
      expect(watchStore.readActiveSession()).not.toBeNull();

      stop.click_func();
      expect(createModal).toHaveBeenCalledTimes(1);
      options.onClick({ type: MODAL_CONFIRM });
      expect(modal.show).toHaveBeenLastCalledWith(false);
      expect(runtime.router.replace).toHaveBeenCalledWith({ url: "page/home/index" });
      expect(watchStore.readActiveSession()).toBeNull();
      expect(watchStore.readLastResult()?.status).toBe("aborted");
    } finally {
      pageDefinition.onDestroy.call(page);
    }
  });

  it.each([
    { water: { waterMl: 35, targetTotalWaterMl: 120 }, waterLabel: "Cel 120 ml" },
    { water: { waterMl: 35 }, waterLabel: "Wlej 35 ml" }
  ])("renders Polish timing and water guidance with $waterLabel", async ({ water, waterLabel }) => {
    const fixture = createCatalogFixture("pl-PL");
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/brew-active/index.js", createLayoutMock());
    const startedAt = 310_000;
    const [firstStep, ...otherSteps] = fixture.primarySnapshot.steps;
    const recipe = {
      ...fixture.primarySnapshot,
      steps: [
        { ...firstStep, kind: "timed_action", durationMs: 10_000, targetTotalWaterMl: undefined, ...water },
        ...otherSteps
      ]
    };
    const session = createActiveBrewSession(recipe, { now: startedAt });
    runtime.setLanguageCode(9);
    runtime.setLocalStorageState({ [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify(session) });
    vi.useFakeTimers({ now: startedAt + 1_000 });

    const page = buildPage(pageDefinition);
    try {
      const text = runtime.findCreatedWidgetsByType("TEXT").map(({ text }) => text);
      expect(text).toContain(`Krok 1/${recipe.steps.length}`);
      expect(text).toContain(`${waterLabel} · Sesja 00:01`);
      expect(text).toContain("00:09");
    } finally {
      pageDefinition.onDestroy.call(page);
      vi.useRealTimers();
    }
  });

  it("closes the stop confirmation when the active brew page is destroyed", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/brew-active/index.js", createLayoutMock());
    const activeSession = createActiveBrewSession(fixture.primarySnapshot, { now: 310_000 });
    runtime.setLocalStorageState({ [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify(activeSession) });

    const page = buildPage(pageDefinition);
    const stop = runtime.findCreatedWidgetsByType("BUTTON").find((button) => button.text === "Stop");
    stop.click_func();
    const { createModal, MODAL_CONFIRM } = runtime.interaction;
    const [options] = createModal.mock.calls[0];
    const modal = createModal.mock.results[0].value;

    pageDefinition.onDestroy.call(page);
    options.onClick({ type: MODAL_CONFIRM });
    expect(modal.show).toHaveBeenLastCalledWith(false);
    expect(runtime.router.replace).not.toHaveBeenCalled();
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

  it("keeps the stop confirmation visible through timed transitions and disables the shortcut until dismissal", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/brew-active/index.js", createLayoutMock());
    const watchStore = await import("../zepp-app/shared/storage/watch-store.js");
    const now = 500_000;
    vi.useFakeTimers({ now });
    const session = createActiveBrewSession(fixture.primarySnapshot, { now });
    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify({
        ...session, currentStepIndex: 1, status: "running", expectedStepEndAt: now + 1_000
      })
    });
    const page = buildPage(pageDefinition);
    try {
      runtime.findCreatedWidgetsByType("BUTTON").find((button) => button.text === "Stop").click_func();
      const [modalOptions] = runtime.interaction.createModal.mock.calls[0];
      vi.advanceTimersByTime(1_000);
      expect(watchStore.readActiveSession()?.currentStepIndex).toBe(2);
      expect(runtime.router.replace).not.toHaveBeenCalled();
      runtime.triggerShortcutKey();
      expect(watchStore.readActiveSession()?.currentStepIndex).toBe(2);
      modalOptions.onClick({ type: runtime.interaction.MODAL_CANCEL });
      expect(runtime.router.replace).toHaveBeenLastCalledWith({ url: "page/brew-active/index" });
    } finally {
      pageDefinition.onDestroy.call(page);
      vi.useRealTimers();
    }
    expect(runtime.triggerShortcutKey()).toBe(false);
  });

  it("ignores taps and shortcut events for the step that just timed out", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/brew-active/index.js", createLayoutMock());
    const watchStore = await import("../zepp-app/shared/storage/watch-store.js");
    const now = 500_000;
    vi.useFakeTimers({ now });
    const session = createActiveBrewSession(fixture.primarySnapshot, { now });
    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify({
        ...session, currentStepIndex: 1, status: "running", expectedStepEndAt: now + 1_000
      })
    });

    const oldPage = buildPage(pageDefinition);
    try {
      const [staleSkip] = runtime.findCreatedWidgetsByType("BUTTON");
      expect(staleSkip.text).toBe("Skip");
      vi.advanceTimersByTime(1_000);
      expect(watchStore.readActiveSession()?.currentStepIndex).toBe(2);
      staleSkip.click_func();
      runtime.triggerShortcutKey();
      expect(watchStore.readActiveSession()?.currentStepIndex).toBe(2);
      expect(runtime.router.replace).toHaveBeenCalledTimes(1);
    } finally {
      pageDefinition.onDestroy.call(oldPage);
    }

    const nextPage = buildPage(pageDefinition);
    try {
      const activeSkip = runtime.findCreatedWidgetsByType("BUTTON").at(-2);
      activeSkip.click_func();
      activeSkip.click_func();
      expect(watchStore.readActiveSession()?.currentStepIndex).toBe(3);
    } finally {
      pageDefinition.onDestroy.call(nextPage);
      vi.useRealTimers();
    }
  });

  it("keeps one second visible until the countdown deadline", async () => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/brew-active/index.js", createLayoutMock());
    const start = 500_000;
    const session = createActiveBrewSession(fixture.primarySnapshot, { now: start });
    vi.useFakeTimers({ now: start + 500 });
    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify({
        ...session, currentStepIndex: 1, status: "running", expectedStepEndAt: start + 1_000
      })
    });
    const page = buildPage(pageDefinition);
    try {
      expect(runtime.findCreatedWidgetsByType("TEXT").some((widget) => widget.text === "00:01")).toBe(true);
    } finally {
      pageDefinition.onDestroy.call(page);
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
      const timerWidget = textWidgets.find((widget) => widget.text === "00:05");
      const sessionWidget = textWidgets.find((widget) => String(widget.text).includes("Session"));

      runtime.router.replace.mockClear();
      vi.advanceTimersByTime(1_000);

      expect(runtime.router.replace).not.toHaveBeenCalled();
      expect(timerWidget?.setProperty).toHaveBeenCalledWith(runtime.ui.prop.TEXT, "00:04");
      expect(timerWidget?.text).toBe("00:04");
      expect(String(sessionWidget?.text)).toContain("Session 00:01");

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

  it.each(["3.6", "3.7", "unknown"])("omits API 4 list fields on runtime %s", async (apiLevel) => {
    const fixture = createCatalogFixture();
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/recipe-list/index.js", createLayoutMock());
    runtime.settings.getSystemInfo.mockReturnValueOnce({ minAPI: apiLevel });
    runtime.setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
    });

    buildPage(pageDefinition);
    const [list] = runtime.findCreatedWidgetsByType("SCROLL_LIST");
    expect(list).toBeDefined();
    expect(list).not.toHaveProperty("item_common_focus");
    expect(list).not.toHaveProperty("enable_scroll_bar");
    list.item_click_func(list, 0);
    expect(runtime.router.push).toHaveBeenCalledWith({ url: "page/recipe-detail/index" });
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
    expect(runtime.router.replace).toHaveBeenCalledWith({
      url: "page/tool-list/index"
    });

    runtime.router.replace.mockClear();
    buttons[1].click_func();
    expect(runtime.router.replace).toHaveBeenCalledWith({
      url: "page/home/index"
    });
  });
});

it.each(["home", "tool-list", "recipe-list", "recipe-detail", "brew-active", "result-summary"])("hides the native title bar before building %s", async (page) => {
  const { runtime, pageDefinition } = await loadPageHarness(`../zepp-app/page/${page}/index.js`, createLayoutMock());
  const instance = buildPage(pageDefinition);
  expect(runtime.ui.setStatusBarVisible).toHaveBeenCalledWith(false);
  const firstWidgetCall = runtime.ui.createWidget.mock.invocationCallOrder[0];
  if (firstWidgetCall) expect(runtime.ui.setStatusBarVisible.mock.invocationCallOrder[0]).toBeLessThan(firstWidgetCall);
  if (typeof instance.onDestroy === "function") instance.onDestroy();
});
