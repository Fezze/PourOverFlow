import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createActiveBrewSession } from "../zepp-app/shared/engine/recipe-engine.js";
import { buildPage, createCatalogFixture, createLayoutMock, loadPageHarness, type PreviewPage } from "./support/watch-page-harness.ts";

const { controller, events, state, prime, display } = vi.hoisted(() => ({
  controller: {
    PAGE_URLS: Object.fromEntries([
      ["home", "home"], ["toolList", "tool-list"], ["recipeList", "recipe-list"],
      ["recipeDetail", "recipe-detail"], ["brewActive", "brew-active"], ["resultSummary", "result-summary"]
    ].map(([key, name]) => [key, `page/${name}/index`])),
    reconcileActiveSessionOnEntry: vi.fn(), getHomeScaffoldState: vi.fn(),
    getToolList: vi.fn(), getSelectedTool: vi.fn(), getRecipeListForSelectedTool: vi.fn(),
    getSelectedRecipe: vi.fn(), goHome: vi.fn(), goToToolList: vi.fn(), goToResultSummary: vi.fn(),
    goToRecipeList: vi.fn(), refreshPhoneSnapshot: vi.fn(), retryPendingHistorySync: vi.fn(),
    resumeActiveSession: vi.fn(), discardActiveSessionFromHome: vi.fn(), selectTool: vi.fn(),
    selectRecipe: vi.fn(), startSelectedRecipe: vi.fn(), tickActiveSession: vi.fn(),
    abortActiveBrew: vi.fn(), advanceOrCompleteActiveSession: vi.fn()
  },
  events: vi.fn(), state: { readActiveSession: vi.fn(), readLastResult: vi.fn() },
  prime: vi.fn(), display: { enableActiveSessionDisplayGuard: vi.fn(), disableActiveSessionDisplayGuard: vi.fn() }
}));

vi.mock("../zepp-app/shared/watch/router.js", () => controller);
vi.mock("../zepp-app/shared/watch/runtime-events.js", () => ({ subscribeRuntimeEvent: events }));
vi.mock("../zepp-app/shared/watch/sync-bridge.js", () => ({ primeWatchSyncBridge: prime }));
vi.mock("../zepp-app/shared/watch/display-guard.js", () => display);
vi.mock("../zepp-app/shared/storage/watch-store.js", () => state);

const fixture = createCatalogFixture();
const { primarySnapshot, primarySummary, lastResult } = fixture;
const selectedTool = fixture.catalogCache.tools[0];
const recipe = { ...primarySummary, recipeSnapshot: primarySnapshot };
const unsubscribe = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  events.mockReturnValue(unsubscribe);
  controller.reconcileActiveSessionOnEntry.mockReturnValue({});
});
afterEach(() => vi.useRealTimers());

async function load(page: PreviewPage, overrides = {}) {
  const { pageDefinition, runtime } = await loadPageHarness(`../zepp-app/page/${page}/index.js`, createLayoutMock(overrides));
  return {
    runtime, definition: pageDefinition!,
    draw() {
      const instance = buildPage(pageDefinition!);
      return {
        instance,
        dispose: () => pageDefinition!.onDestroy.call(instance),
        text: () => runtime.findCreatedWidgetsByType("TEXT").map(({ text }) => text),
        button: (label: string) => runtime.findCreatedWidgetsByType("BUTTON").find(({ text }) => text === label)!,
        list: () => runtime.findCreatedWidgetsByType("SCROLL_LIST")[0]
      };
    }
  };
}

it.each([
  { state: {}, body: "Ready", title: "Brewers" },
  { state: { selectedTool, recipeCount: 2 }, body: "2 recipes ready", title: "AeroPress" },
  { state: { selectedTool, lastResult }, body: `Last brew\n${lastResult.recipeName}`, title: "AeroPress" }
])("renders the idle home state with $body and routes each button", async ({ state, body, title }) => {
  const { runtime, draw } = await load("home");
  controller.getHomeScaffoldState.mockReturnValue(state);
  const rendered = draw();
  expect(prime).toHaveBeenCalledOnce();
  expect(rendered.text()).toEqual(expect.arrayContaining([body, title]));
  for (const label of ["Browse", "Sync", "Last"]) rendered.button(label).click_func();
  for (const callback of [controller.goToToolList, controller.refreshPhoneSnapshot, controller.retryPendingHistorySync, controller.goToResultSummary]) {
    expect(callback).toHaveBeenCalledOnce();
  }
  const [event] = events.mock.calls.at(-1)!;
  event({ type: "status" });
  expect(runtime.router.replace).not.toHaveBeenCalled();
  event({ type: "catalog" });
  expect(runtime.router.replace).toHaveBeenCalledWith({ url: controller.PAGE_URLS.home });
  rendered.dispose();
  expect(unsubscribe).toHaveBeenCalledOnce();
});

it("isolates home resume and discard from unrelated idle actions", async () => {
  const { draw } = await load("home");
  controller.getHomeScaffoldState.mockReturnValue({
    activeSession: createActiveBrewSession(primarySnapshot, { now: 12_000 })
  });
  const rendered = draw();
  expect(rendered.text()).toContain(`Step 1/${primarySnapshot.steps.length}`);
  rendered.button("Resume").click_func();
  rendered.button("Discard").click_func();
  expect(controller.resumeActiveSession).toHaveBeenCalledOnce();
  expect(controller.discardActiveSessionFromHome).toHaveBeenCalledOnce();
  expect(controller.refreshPhoneSnapshot).not.toHaveBeenCalled();
  rendered.dispose();
});

it.each(["home", "brew-active"] as const)("draws no obsolete state on %s after session reconciliation has finalized it", async (page) => {
  const { runtime, draw } = await load(page);
  controller.reconcileActiveSessionOnEntry.mockReturnValue({ finalized: true });
  draw().dispose();
  expect(runtime.getCreatedWidgets()).toEqual([]);
});

it.each(["tool-list", "recipe-list"] as const)("emits exactly the selected row from %s", async (page) => {
  const { runtime, draw } = await load(page);
  runtime.setDeviceInfo({ screenShape: 0, width: 390, height: 450 });
  controller.getToolList.mockReturnValue([{ ...selectedTool, recipeCount: 2 }]);
  controller.getSelectedTool.mockReturnValue(selectedTool);
  controller.getRecipeListForSelectedTool.mockReturnValue([recipe, { ...recipe, recipeId: "unavailable", recipeSnapshot: null }]);
  const rendered = draw();
  const list = rendered.list();
  expect(list.data_count).toBe(page === "tool-list" ? 1 : 2);
  list.item_click_func(null, 0);
  const command = page === "tool-list" ? controller.selectTool : controller.selectRecipe;
  expect(command).toHaveBeenCalledWith(page === "tool-list" ? selectedTool.toolId : recipe.recipeId);
  events.mock.calls[0][0]({ type: "catalog" });
  expect(runtime.router.replace).toHaveBeenCalledWith({ url: `page/${page}/index` });
  rendered.dispose();
  expect(unsubscribe).toHaveBeenCalledOnce();
});

it.each([
  ["tool-list", "Refresh library", "No synced brewers yet"],
  ["recipe-list", "Refresh from phone", "No recipes yet"]
] as const)("shows a refresh action for an empty %s", async (page, button, empty) => {
  const { draw } = await load(page);
  controller.getToolList.mockReturnValue([]);
  controller.getRecipeListForSelectedTool.mockReturnValue([]);
  const rendered = draw();
  expect(rendered.text()).toContain(empty);
  expect(rendered.list()).toBeUndefined();
  rendered.button(button).click_func();
  expect(controller.refreshPhoneSnapshot).toHaveBeenCalledOnce();
  rendered.dispose();
});

it.each([true, false])("renders recipe detail and dispatches the relevant action (has recipe %s)", async (available) => {
  const { runtime, draw } = await load("recipe-detail");
  controller.getSelectedRecipe.mockReturnValue(available ? { ...recipe, recipeSnapshot: { ...primarySnapshot, description: "" } } : null);
  const rendered = draw();
  if (available) {
    expect(rendered.text()).toContain(`${primarySnapshot.coffeeDoseG} g · ${primarySnapshot.totalWaterMl} ml`);
    expect(rendered.text()).toContain("Start when ready.");
    rendered.button("Start brew").click_func();
    expect(controller.startSelectedRecipe).toHaveBeenCalledOnce();
  } else {
    expect(rendered.text()).toContain("Recipe unavailable");
    rendered.button("Back to recipes").click_func();
    expect(controller.goToRecipeList).toHaveBeenCalledOnce();
  }
  events.mock.calls[0][0]({ type: "catalog" });
  expect(runtime.router.replace).toHaveBeenCalledWith({ url: controller.PAGE_URLS.recipeDetail });
  rendered.dispose();
});

it.each([true, false])("renders the latest result or offers browsing (has result %s)", async (available) => {
  const { runtime, draw } = await load("result-summary");
  state.readLastResult.mockReturnValue(available ? lastResult : null);
  const rendered = draw();
  expect(rendered.text()).toContain(available ? lastResult.recipeName : "No result yet");
  if (!available) {
    rendered.button("Browse").click_func();
    expect(controller.goToToolList).toHaveBeenCalledOnce();
  } else {
    expect(rendered.text()).toContain("Timing delta");
  }
  rendered.button("Home").click_func();
  expect(controller.goHome).toHaveBeenCalledOnce();
  events.mock.calls[0][0]({ type: "last_result" });
  expect(runtime.router.replace).toHaveBeenCalledWith({ url: controller.PAGE_URLS.resultSummary });
  rendered.dispose();
});

it("uses a scroll list when the result cannot fit its panel", async () => {
  const { draw } = await load("result-summary", { BUTTONS: [{ x: 50, y: 260, w: 360, h: 54 }, { x: 50, y: 220, w: 170, h: 38 }] });
  state.readLastResult.mockReturnValue({ ...lastResult, toolId: "legacy-tool" });
  const rendered = draw();
  expect(rendered.text()).toContain("legacy-tool");
  expect(rendered.list().data_count).toBe(3);
  rendered.dispose();
});

it("updates timer widgets through the controller and routes when a new step starts", async () => {
  const { runtime, draw } = await load("brew-active");
  const now = 91_000;
  vi.useFakeTimers({ now });
  const session = createActiveBrewSession(primarySnapshot, { now });
  const running = {
    ...session, currentStepIndex: 1, status: "running", expectedStepEndAt: now + 5_000
  };
  controller.reconcileActiveSessionOnEntry.mockReturnValue({ activeSession: running });
  state.readActiveSession.mockReturnValue(running);
  const rendered = draw();
  expect(display.enableActiveSessionDisplayGuard).toHaveBeenCalledWith(running);
  expect(rendered.text()).toContain("00:05");
  controller.tickActiveSession.mockImplementationOnce(() => {
    state.readActiveSession.mockReturnValue({ ...running, status: "waiting_for_confirm" });
  });
  vi.advanceTimersByTime(1_000);
  expect(rendered.text()).toContain("00:04");
  expect(runtime.router.replace).not.toHaveBeenCalled();
  controller.tickActiveSession.mockImplementationOnce(() => {
    state.readActiveSession.mockReturnValue({ ...running, currentStepIndex: 2 });
  });
  vi.advanceTimersByTime(1_000);
  expect(runtime.router.replace).toHaveBeenCalledWith({ url: controller.PAGE_URLS.brewActive });
  rendered.button("Next").click_func();
  expect(controller.advanceOrCompleteActiveSession).toHaveBeenCalledOnce();
  rendered.button("Stop").click_func();
  const [modal] = runtime.interaction.createModal.mock.calls[0];
  modal.onClick({ type: runtime.interaction.MODAL_CANCEL });
  expect(controller.abortActiveBrew).not.toHaveBeenCalled();
  modal.onClick({ type: runtime.interaction.MODAL_CONFIRM });
  expect(controller.abortActiveBrew).toHaveBeenCalledOnce();
  state.readActiveSession.mockReturnValue(null);
  vi.advanceTimersByTime(1_000);
  expect(rendered.instance.activeTimer).toBeNull();
  rendered.dispose();
});

it("returns home when there is no session to display", async () => {
  const { draw } = await load("brew-active");
  state.readActiveSession.mockReturnValue(null);
  const rendered = draw();
  expect(display.disableActiveSessionDisplayGuard).toHaveBeenCalledOnce();
  rendered.button("Go home").click_func();
  expect(controller.goHome).toHaveBeenCalledOnce();
  rendered.dispose();
});
