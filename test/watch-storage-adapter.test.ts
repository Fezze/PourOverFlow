import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as store from "../zepp-app/shared/storage/watch-store.js";
import { WATCH_STORAGE_KEYS as keys } from "../zepp-app/shared/storage/keys.js";
import { buildHistoryEntryFromSession, createActiveBrewSession } from "../zepp-app/shared/engine/recipe-engine.js";
import { abortSession } from "../zepp-app/shared/engine/session-reducer.js";
import { createCatalogFixture } from "./support/watch-page-harness.ts";
import { getLocalStorageSnapshot, resetZeppRuntime, setLocalStorageState } from "./zeus-runtime/runtime.ts";

const emit = vi.hoisted(() => vi.fn());
vi.mock("../zepp-app/shared/watch/runtime-events.js", () => ({ emitRuntimeEvent: emit }));

const { catalogCache, primarySnapshot, primarySummary, lastResult } = createCatalogFixture();
const session = createActiveBrewSession(primarySnapshot, { now: 100 });
beforeEach(() => {
  resetZeppRuntime();
  emit.mockClear();
});
afterEach(() => vi.restoreAllMocks());

it("normalizes corrupted watch cache without leaving invalid persisted sessions or results", () => {
  const warn = vi.spyOn(console, "log").mockImplementation(() => {});
  setLocalStorageState({
    [keys.catalogCache]: "[]",
    [keys.syncMeta]: "bad!",
    [keys.activeSession]: JSON.stringify({ recipeSnapshot: { steps: [] } }),
    [keys.lastResult]: JSON.stringify({ historyId: "missing name" })
  });
  expect(store.isCatalogReady()).toBe(false);
  expect(store.getToolCatalog()).toHaveLength(6);
  expect(store.getRecipesForTool("missing")).toEqual([]);
  expect(store.readWatchSyncMeta()).toMatchObject({ pendingHistoryQueue: [], historyRevision: 0 });
  expect(store.readActiveSession()).toBeNull();
  expect(store.readLastResult()).toBeNull();
  const disk = getLocalStorageSnapshot();
  expect(disk[keys.activeSession]).toBeUndefined();
  expect(disk[keys.lastResult]).toBeUndefined();
  expect(warn).toHaveBeenCalledWith("Failed to parse watch storage JSON", expect.anything());
  expect(emit).not.toHaveBeenCalled();
});

it("clamps legacy session pointers, clones mutable fields and removes cleared state", () => {
  const normalized = store.writeActiveSession({
    ...session, currentStepIndex: 999, elapsedSessionMs: NaN, completedStepIds: ["start"], stepRunResults: [],
    wakeUpResumeEnabled: true, pageBrightModeEnabled: "true"
  });
  expect(normalized).toMatchObject({
    currentStepIndex: primarySnapshot.steps.length - 1, elapsedSessionMs: 0, completedStepIds: ["start"],
    wakeUpResumeEnabled: true, pageBrightModeEnabled: false
  });
  expect(normalized.recipeSnapshot.steps[0]).not.toBe(session.recipeSnapshot.steps[0]);
  expect(JSON.parse(getLocalStorageSnapshot()[keys.activeSession])).toMatchObject({ currentStepIndex: normalized.currentStepIndex });
  store.clearActiveSession();
  expect(store.readActiveSession()).toBeNull();
  expect(getLocalStorageSnapshot()[keys.activeSession]).toBeUndefined();
  expect(store.writeActiveSession({ ...session, recipeSnapshot: null })).toBeNull();
});

it("writes each synchronized slice and invalidates stale selections independently", () => {
  const [first, second] = catalogCache.tools;
  store.markCatalogReady();
  expect(store.isCatalogReady()).toBe(true);
  store.writeSelectedToolId(first.toolId);
  store.writeSelectedRecipeId(primarySummary.recipeId);
  expect(store.readSelectedToolId()).toBe(first.toolId);
  expect(store.readSelectedRecipeId()).toBe(primarySummary.recipeId);
  store.applyToolCatalogSnapshot({ tools: [second], toolCatalogRevision: 30 });
  expect(store.readSelectedToolId()).toBe(second.toolId);
  expect(store.readSelectedRecipeId()).toBeNull();
  store.writeSelectedRecipeId("stale");
  store.applyCatalogSnapshot({
    recipeCatalogRevision: 31, recipesByTool: { [second.toolId]: [primarySummary] },
    recipeSnapshotsById: { [primarySummary.recipeId]: primarySnapshot }
  });
  expect(store.getRecipesForTool(second.toolId)).toEqual([primarySummary]);
  store.applyCatalogSnapshot({
    recipeCatalogRevision: 31, recipesByTool: { [second.toolId]: [primarySummary] },
    recipeSnapshotsById: {}
  });
  expect(store.getRecipesForTool(second.toolId)).toEqual([]);
  store.applyCatalogSnapshot({
    recipeCatalogRevision: 31, recipesByTool: { [second.toolId]: [primarySummary] },
    recipeSnapshotsById: { [primarySnapshot.recipeId]: primarySnapshot }
  });
  expect(store.getRecipeSnapshotById(primarySummary.recipeId)).toEqual(primarySnapshot);
  expect(store.readSelectedRecipeId()).toBeNull();
  store.applyHistorySnapshot({ historyRevision: 33, latestResult: lastResult });
  expect(emit).toHaveBeenCalledWith({ type: "last_result", value: lastResult });
  expect(store.readLastResult()).toEqual(lastResult);
  store.applyHistorySnapshot({ historyRevision: 34, latestResult: null });
  expect(store.readLastResult()).toBeNull();
  expect(store.readWatchSyncMeta()).toMatchObject({
    toolCatalogRevision: 30, recipeCatalogRevision: 31, historyRevision: 34
  });
  expect(getLocalStorageSnapshot()[keys.lastResult]).toBeUndefined();
});

it("limits the durable queue, updates duplicate entries and leaves the snapshot revision unchanged on ACK", () => {
  store.writeWatchSyncMeta({ historyRevision: 41, pendingHistoryQueue: [] });
  for (let index = 0; index < 21; index += 1) store.enqueuePendingHistoryEntry({ historyId: `result-${index}` });
  const queue = store.getPendingHistoryQueue();
  expect(queue).toHaveLength(20);
  expect(queue[0].historyId).toBe("result-1");
  queue.pop();
  expect(store.getPendingHistoryQueue()).toHaveLength(20);
  store.enqueuePendingHistoryEntry({ historyId: "result-1", status: "completed" });
  expect(store.getPendingHistoryQueue().at(-1)).toEqual({ historyId: "result-1", status: "completed" });
  store.ackPendingHistoryEntry("result-1");
  expect(store.readWatchSyncMeta()).toMatchObject({ historyRevision: 41, lastAckedHistoryId: "result-1" });
  expect(store.getPendingHistoryQueue().find(({ historyId }) => historyId === "result-1")).toBeUndefined();
  store.setConnectionStatus(true);
  expect(store.isWatchConnected()).toBe(true);
  expect(emit).toHaveBeenLastCalledWith({ type: "connection", value: true });
});

it("keeps the last good catalog after malformed snapshots and resyncs lost cache slices on startup", () => {
  setLocalStorageState({
    [keys.catalogCache]: JSON.stringify({ ...catalogCache, tools: [null], recipeSnapshotsById: [] }),
    [keys.syncMeta]: JSON.stringify({ toolCatalogRevision: 100, recipeCatalogRevision: 101 })
  });
  expect(store.getToolCatalog()).toHaveLength(6);
  expect(store.readWatchSyncMeta()).toMatchObject({ toolCatalogRevision: 0, recipeCatalogRevision: 0 });

  store.writeCatalogCache(catalogCache);
  expect(store.applyToolCatalogSnapshot({ toolCatalogRevision: 100, tools: [null] })).toBeNull();
  expect(store.applyCatalogSnapshot({ recipeCatalogRevision: 101, recipesByTool: [] })).toBeNull();
  expect(store.applyHistorySnapshot({ historyRevision: 102 })).toBeNull();
  expect(store.getRecipeSnapshotById(primarySnapshot.recipeId)).toEqual(primarySnapshot);
  expect(store.readWatchSyncMeta().historyRevision).toBe(0);
});

it("ignores damaged restored sessions and entries without dropping valid pending results", () => {
  const entry = buildHistoryEntryFromSession(abortSession(session, { now: 200 }), { now: 200 });
  setLocalStorageState({
    [keys.activeSession]: JSON.stringify({ ...session, currentStepStartedAt: null }),
    [keys.lastResult]: JSON.stringify({ ...lastResult, recipeName: {} }),
    [keys.syncMeta]: JSON.stringify({ pendingHistoryQueue: [null, { historyId: "unusable" }, entry] })
  });
  expect(store.readActiveSession()).toBeNull();
  expect(store.readLastResult()).toBeNull();
  expect(store.getPendingHistoryQueue()).toEqual([entry]);
  store.applyHistorySnapshot({ historyRevision: 1, latestResult: null });
  expect(store.readLastResult()?.historyId).toBe(entry.historyId);
});
