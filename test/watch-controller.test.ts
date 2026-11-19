import { beforeEach, expect, it, vi } from "vitest";
import { back, push, replace } from "@zos/router";
import { createActiveBrewSession } from "../zepp-app/shared/engine/recipe-engine.js";
import * as controller from "../zepp-app/shared/watch/router.js";
import { createCatalogFixture } from "./support/watch-page-harness.ts";
import { resetZeppRuntime } from "./zeus-runtime/runtime.ts";

const { store, reducer, cues, transport, disableDisplay, log } = vi.hoisted(() => ({
  store: {
    clearActiveSession: vi.fn(), enqueuePendingHistoryEntry: vi.fn(), getPendingHistoryQueue: vi.fn(),
    getRecipeSnapshotById: vi.fn(), getRecipesForTool: vi.fn(), getRuntimeState: vi.fn(), getToolCatalog: vi.fn(),
    isCatalogReady: vi.fn(), isWatchConnected: vi.fn(), readActiveSession: vi.fn(), readLastResult: vi.fn(),
    readSelectedRecipeId: vi.fn(), readSelectedToolId: vi.fn(), readWatchSyncMeta: vi.fn(),
    writeActiveSession: vi.fn(), writeLastResult: vi.fn(), writeSelectedRecipeId: vi.fn(), writeSelectedToolId: vi.fn()
  },
  reducer: { advanceSession: vi.fn(), abortSession: vi.fn(), resumeSession: vi.fn(), tickSession: vi.fn() },
  cues: vi.fn(), transport: { flushPendingHistoryQueue: vi.fn(), requestBootstrap: vi.fn() },
  disableDisplay: vi.fn(), log: vi.fn()
}));
vi.mock("../zepp-app/shared/storage/watch-store.js", () => store);
vi.mock("../zepp-app/shared/engine/session-reducer.js", () => reducer);
vi.mock("../zepp-app/shared/engine/feedback.js", () => ({ playFeedbackCue: cues }));
vi.mock("../zepp-app/shared/watch/sync-bridge.js", () => transport);
vi.mock("../zepp-app/shared/watch/display-guard.js", () => ({ disableActiveSessionDisplayGuard: disableDisplay }));
vi.mock("../zepp-app/shared/watch/validation-log.js", () => ({ logValidation: log }));

const { primarySummary, primarySnapshot, catalogCache, lastResult } = createCatalogFixture();
const tool = catalogCache.tools[0];
const session = createActiveBrewSession(primarySnapshot, { now: 5_000 });
const next = { ...session, currentStepIndex: 1, status: "running", expectedStepEndAt: 15_000 };
const complete = { ...next, status: "completed" };

beforeEach(() => {
  resetZeppRuntime();
  vi.resetAllMocks();
  store.getToolCatalog.mockReturnValue([tool]);
  store.getRecipesForTool.mockImplementation((toolId) => toolId === tool.toolId ? [primarySummary] : []);
  store.getRecipeSnapshotById.mockImplementation((id) => id === primarySummary.recipeId ? primarySnapshot : null);
  store.readSelectedToolId.mockReturnValue(tool.toolId);
  store.getPendingHistoryQueue.mockReturnValue([]);
});

it("selects only cached runnable recipes and reports independent home readiness", () => {
  const { PAGE_URLS } = controller;
  store.getToolCatalog.mockReturnValueOnce([]);
  expect(controller.getToolList()[0].recipeCount).toBe(1);
  expect(controller.startSelectedRecipe()).toBe(false);
  expect(controller.selectRecipe("absent")).toBe(false);
  expect(push).not.toHaveBeenCalled();
  controller.selectTool(tool.toolId);
  expect(store.writeSelectedRecipeId).toHaveBeenCalledWith(null);
  expect(push).toHaveBeenLastCalledWith({ url: PAGE_URLS.recipeList });
  expect(controller.selectRecipe(primarySummary.recipeId)).toBe(true);
  expect(push).toHaveBeenLastCalledWith({ url: PAGE_URLS.recipeDetail });

  store.readSelectedRecipeId.mockReturnValue(primarySummary.recipeId);
  store.getRecipeSnapshotById.mockReturnValue(null);
  expect(controller.startSelectedRecipe()).toBe(false);
  store.getRecipeSnapshotById.mockReturnValue(primarySnapshot);
  expect(controller.startSelectedRecipe()).toBe(true);
  expect(store.writeActiveSession).toHaveBeenCalledWith(expect.objectContaining({ recipeSnapshot: primarySnapshot }));
  expect(cues).toHaveBeenCalledWith(primarySnapshot.steps[0].feedbackCue);
  expect(push).toHaveBeenLastCalledWith({ url: PAGE_URLS.brewActive });

  store.getRuntimeState.mockReturnValue({ activeSession: session });
  store.readLastResult.mockReturnValue(lastResult);
  store.getPendingHistoryQueue.mockReturnValue(["pending"]);
  store.isWatchConnected.mockReturnValue(false);
  store.isCatalogReady.mockReturnValue(true);
  store.readWatchSyncMeta.mockReturnValue({ historyRevision: 12 });
  expect(controller.getHomeScaffoldState()).toMatchObject({
    activeSession: session, lastResult, selectedTool: tool, recipeCount: 1, pendingHistoryCount: 1,
    connected: false, catalogReady: true, syncMeta: { historyRevision: 12 }
  });
  transport.requestBootstrap.mockReturnValue(true);
  transport.flushPendingHistoryQueue.mockReturnValue(false);
  expect(controller.refreshPhoneSnapshot()).toBe(true);
  expect(controller.retryPendingHistorySync()).toBe(false);
  controller.goToToolList();
  expect(push).toHaveBeenLastCalledWith({ url: PAGE_URLS.toolList });
  controller.goToResultSummary();
  expect(push).toHaveBeenLastCalledWith({ url: PAGE_URLS.resultSummary });
  controller.goToRecipeList();
  expect(back).toHaveBeenCalledOnce();
  controller.goHome();
  expect(replace).toHaveBeenLastCalledWith({ url: PAGE_URLS.home });
});

it("persists only changed ticks, emits cues only on new steps and finalizes a completed tick once", () => {
  expect(controller.tickActiveSession(9_000)).toBeNull();
  store.readActiveSession.mockReturnValue(session);
  reducer.tickSession.mockReturnValueOnce(null).mockReturnValueOnce({ ...session })
    .mockReturnValueOnce({ ...session, status: "waiting_for_confirm", elapsedSessionMs: 1_000 })
    .mockReturnValueOnce(next).mockReturnValueOnce(complete);
  expect(controller.tickActiveSession(9_000)).toBeNull();
  expect(controller.tickActiveSession(9_000)).toEqual({ completed: false, activeSession: session });
  expect(store.writeActiveSession).not.toHaveBeenCalled();
  controller.tickActiveSession(9_000);
  expect(cues).not.toHaveBeenCalled();
  expect(controller.tickActiveSession(12_000)).toEqual({ completed: false, activeSession: next });
  expect(cues).toHaveBeenCalledWith(primarySnapshot.steps[1].feedbackCue);
  expect(reducer.tickSession).toHaveBeenLastCalledWith(session, { now: 12_000 });
  const result = controller.tickActiveSession(15_000);
  expect(result).toMatchObject({ completed: true, historyEntry: { status: "completed" } });
  expect(store.enqueuePendingHistoryEntry).toHaveBeenCalledWith(result.historyEntry);
  expect(store.writeLastResult).toHaveBeenCalledWith(expect.objectContaining({ historyId: result.historyEntry.historyId }), { notify: false });
  expect(store.clearActiveSession).toHaveBeenCalledOnce();
  expect(disableDisplay).toHaveBeenCalledOnce();
  expect(replace).toHaveBeenCalledWith({ url: controller.PAGE_URLS.resultSummary });
});

it("routes manual advancement and distinguishes cancellation of an active brew from an empty session", () => {
  expect(controller.advanceOrCompleteActiveSession()).toBeNull();
  expect(controller.discardActiveSessionFromHome()).toBe(false);
  controller.abortActiveBrew();
  expect(store.enqueuePendingHistoryEntry).not.toHaveBeenCalled();
  expect(disableDisplay).toHaveBeenCalledOnce();
  store.readActiveSession.mockReturnValue(session);
  reducer.advanceSession.mockReturnValue(next);
  expect(controller.advanceOrCompleteActiveSession()).toEqual({ completed: false, activeSession: next });
  expect(store.writeActiveSession).toHaveBeenCalledWith(next);
  expect(replace).toHaveBeenLastCalledWith({ url: controller.PAGE_URLS.brewActive });
  reducer.abortSession.mockReturnValue({ ...session, status: "aborted" });
  expect(controller.discardActiveSessionFromHome()).toBe(true);
  expect(store.enqueuePendingHistoryEntry).toHaveBeenLastCalledWith(expect.objectContaining({ status: "aborted" }));
  controller.abortActiveBrew();
  expect(log).toHaveBeenCalledWith("session_abort", expect.objectContaining({ recipeId: session.recipeId }));
  expect(replace).toHaveBeenLastCalledWith({ url: controller.PAGE_URLS.home });
});

it.each([
  [null, false], [{ ...session, status: "expired" }, false], [{ ...session, status: "aborted" }, false], [complete, true]
])("releases saved state after reconciliation produces %j", (outcome, finalized) => {
  store.readActiveSession.mockReturnValue(session);
  reducer.resumeSession.mockReturnValue(outcome);
  expect(controller.reconcileActiveSessionOnEntry(21_000)).toEqual({ activeSession: null, finalized });
  expect(reducer.resumeSession).toHaveBeenCalledWith(session, { now: 21_000 });
  expect(store.clearActiveSession).toHaveBeenCalledOnce();
  expect(disableDisplay).toHaveBeenCalledOnce();
  expect(store.enqueuePendingHistoryEntry).toHaveBeenCalledTimes(Number(finalized));
});

it("routes a usable restored session while leaving no-session launches alone", () => {
  expect(controller.resumeActiveSession()).toBe(false);
  expect(reducer.resumeSession).not.toHaveBeenCalled();
  store.readActiveSession.mockReturnValue(session);
  reducer.resumeSession.mockReturnValue(next);
  store.writeActiveSession.mockImplementation(store.readActiveSession.mockReturnValue.bind(store.readActiveSession));
  expect(controller.resumeActiveSession()).toBe(true);
  expect(store.writeActiveSession).toHaveBeenCalledWith(next);
  expect(replace).toHaveBeenCalledWith({ url: controller.PAGE_URLS.brewActive });
});
