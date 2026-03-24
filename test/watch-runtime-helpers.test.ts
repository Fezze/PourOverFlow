import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSeedRecipeRecordById } from "../shared/domain/seed-library.js";
import { createActiveBrewSession } from "../shared/engine/recipe-engine.js";
import {
  ackPendingHistoryEntry,
  enqueuePendingHistoryEntry,
  getPendingHistoryQueue,
  getRecipeSnapshotById,
  getRecipesForTool,
  getRuntimeState,
  getToolCatalog,
  isCatalogReady,
  isWatchConnected,
  markCatalogReady,
  readLastResult,
  readSelectedRecipeId,
  readSelectedToolId,
  clearActiveSession,
  readActiveSession,
  readWatchSyncMeta,
  setConnectionStatus,
  applyHistorySnapshot,
  readRecipeBrowsePageIndex,
  writeCatalogCache,
  writeActiveSession,
  readToolBrowsePageIndex,
  writeRecipeBrowsePageIndex,
  writeToolBrowsePageIndex
} from "../shared/storage/watch-store.js";
import {
  disableActiveSessionDisplayGuard,
  enableActiveSessionDisplayGuard
} from "../shared/watch/display-guard.js";
import { isProbablySimulatorDevice } from "../shared/watch/runtime-env.js";
import {
  emitRuntimeEvent,
  subscribeRuntimeEvent
} from "../shared/watch/runtime-events.js";
import {
  __zeusRuntime,
  resetZeppRuntime,
  setBatteryLevel,
  setLocalStorageState
} from "./zeus-runtime/runtime.ts";
import { WATCH_STORAGE_KEYS } from "../shared/storage/keys.js";

beforeEach(() => {
  resetZeppRuntime();
  clearActiveSession();
});

describe("watch runtime helpers", () => {
  it("does nothing when display guard is enabled without an active session", () => {
    expect(enableActiveSessionDisplayGuard()).toBe(false);
    expect(__zeusRuntime.display.setWakeUpRelaunch).not.toHaveBeenCalled();
    expect(__zeusRuntime.display.setPageBrightTime).not.toHaveBeenCalled();
  });

  it("enables display guard and persists wake and bright flags onto the active session", () => {
    const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1_000);
    const activeSession = createActiveBrewSession({
      ...recipeRecord,
      estimatedTotalDurationMs: 999_999
    }, { now: 1_000 });

    writeActiveSession(activeSession);

    expect(enableActiveSessionDisplayGuard()).toBe(true);
    expect(__zeusRuntime.display.setWakeUpRelaunch).toHaveBeenCalledWith(true);
    expect(__zeusRuntime.display.setPageBrightTime).toHaveBeenCalledWith({
      brightTime: 600_000
    });
    expect(readActiveSession()).toMatchObject({
      wakeUpResumeEnabled: true,
      pageBrightModeEnabled: true
    });
  });

  it("persists disabled guard flags when Zepp display calls fail", () => {
    const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1_000);
    const activeSession = createActiveBrewSession(recipeRecord, { now: 1_000 });

    writeActiveSession({
      ...activeSession,
      wakeUpResumeEnabled: true,
      pageBrightModeEnabled: true
    });
    __zeusRuntime.display.setWakeUpRelaunch.mockImplementation(() => {
      throw new Error("wake unavailable");
    });
    __zeusRuntime.display.setPageBrightTime.mockImplementation(() => {
      throw new Error("bright unavailable");
    });

    expect(enableActiveSessionDisplayGuard()).toBe(false);
    expect(readActiveSession()).toMatchObject({
      wakeUpResumeEnabled: false,
      pageBrightModeEnabled: false
    });
  });

  it("disables the display guard cleanly", () => {
    disableActiveSessionDisplayGuard();

    expect(__zeusRuntime.display.setWakeUpRelaunch).toHaveBeenCalledWith(false);
    expect(__zeusRuntime.display.resetPageBrightTime).toHaveBeenCalled();
  });

  it("delivers runtime events to listeners and isolates listener failures", () => {
    const goodListener = vi.fn();
    const noisyListener = vi.fn(() => {
      throw new Error("listener failure");
    });
    const lateListener = vi.fn();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const unsubscribeGood = subscribeRuntimeEvent(goodListener);
    subscribeRuntimeEvent(noisyListener);
    const unsubscribeLate = subscribeRuntimeEvent(lateListener);

    try {
      emitRuntimeEvent({
        type: "catalog",
        value: {
          recipeCount: 1
        }
      });

      expect(goodListener).toHaveBeenCalledWith({
        type: "catalog",
        value: {
          recipeCount: 1
        }
      });
      expect(noisyListener).toHaveBeenCalled();
      expect(lateListener).toHaveBeenCalledWith({
        type: "catalog",
        value: {
          recipeCount: 1
        }
      });
      expect(consoleSpy).toHaveBeenCalled();

      unsubscribeGood();
      emitRuntimeEvent({
        type: "last_result",
        value: null
      });

      expect(goodListener).toHaveBeenCalledTimes(1);
      expect(lateListener).toHaveBeenCalledTimes(2);
    } finally {
      unsubscribeLate();
      consoleSpy.mockRestore();
    }
  });

  it("falls back safely from corrupted persisted watch state", () => {
    setLocalStorageState({
      [WATCH_STORAGE_KEYS.activeSession]: "{broken",
      [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify({
        historyId: "",
        recipeName: ""
      }),
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify({
        cachedAt: 0,
        tools: [],
        recipesByTool: null,
        recipeSnapshotsById: null
      })
    });

    const runtimeState = getRuntimeState();

    expect(runtimeState.activeSession).toBeNull();
    expect(readLastResult()).toBeNull();
    expect(readSelectedToolId()).toBe("tool_aeropress");
    expect(__zeusRuntime.localStorageApi.removeItem).toHaveBeenCalledWith(WATCH_STORAGE_KEYS.activeSession);
    expect(__zeusRuntime.localStorageApi.removeItem).toHaveBeenCalledWith(WATCH_STORAGE_KEYS.lastResult);
  });

  it("resets stale selection when a new catalog drops the selected tool", () => {
    const tools = [
      {
        schemaVersion: 1,
        toolId: "tool_v60",
        label: "Hario V60",
        iconStem: "tool-v60",
        sortOrder: 20,
        supported: true,
        description: "Classic conical pour-over"
      }
    ];

    const runtimeState = getRuntimeState();
    runtimeState.selectedToolId = "tool_aeropress";
    runtimeState.selectedRecipeId = "stale_recipe";

    writeCatalogCache({
      schemaVersion: 1,
      toolCatalogRevision: 9,
      recipeCatalogRevision: 10,
      tools,
      recipesByTool: {
        tool_v60: []
      },
      recipeSnapshotsById: {},
      cachedAt: 5_000
    });

    expect(readSelectedToolId()).toBe("tool_v60");
    expect(readSelectedRecipeId()).toBeNull();
  });

  it("deduplicates and trims the pending history queue", () => {
    for (let index = 0; index < 22; index += 1) {
      enqueuePendingHistoryEntry({
        historyId: `hist_${index}`,
        recipeName: `Recipe ${index}`
      });
    }

    enqueuePendingHistoryEntry({
      historyId: "hist_21",
      recipeName: "Recipe 21 updated"
    });

    const pendingQueue = getPendingHistoryQueue();

    expect(pendingQueue).toHaveLength(20);
    expect(pendingQueue[0].historyId).toBe("hist_2");
    expect(pendingQueue.at(-1)).toMatchObject({
      historyId: "hist_21",
      recipeName: "Recipe 21 updated"
    });
  });

  it("acks pending history without clobbering a valid prior revision", () => {
    enqueuePendingHistoryEntry({
      historyId: "hist_keep",
      recipeName: "Keep"
    });
    enqueuePendingHistoryEntry({
      historyId: "hist_drop",
      recipeName: "Drop"
    });

    getRuntimeState().syncMeta = {
      ...readWatchSyncMeta(),
      historyRevision: 7,
      pendingHistoryQueue: getPendingHistoryQueue()
    };

    ackPendingHistoryEntry("hist_drop", Number.NaN);

    expect(readWatchSyncMeta()).toMatchObject({
      historyRevision: 7,
      lastAckedHistoryId: "hist_drop"
    });
    expect(getPendingHistoryQueue()).toEqual([
      expect.objectContaining({
        historyId: "hist_keep"
      })
    ]);
  });

  it("detects the simulator battery heuristic without crashing", () => {
    setBatteryLevel(0);
    expect(isProbablySimulatorDevice()).toBe(true);

    setBatteryLevel(72);
    expect(isProbablySimulatorDevice()).toBe(false);
  });

  it("keeps simple catalog and connection helpers stable", () => {
    expect(isCatalogReady()).toBe(false);
    markCatalogReady();
    expect(isCatalogReady()).toBe(true);

    expect(getToolCatalog()).toHaveLength(6);
    expect(getRecipesForTool("missing_tool")).toEqual([]);
    expect(getRecipeSnapshotById("missing_recipe")).toBeNull();

    expect(isWatchConnected()).toBe(false);
    setConnectionStatus(true);
    expect(isWatchConnected()).toBe(true);
  });

  it("normalizes watch browse page indices in runtime state", () => {
    expect(readToolBrowsePageIndex()).toBe(0);
    expect(readRecipeBrowsePageIndex()).toBe(0);

    expect(writeToolBrowsePageIndex(2)).toBe(2);
    expect(writeRecipeBrowsePageIndex(3)).toBe(3);
    expect(readToolBrowsePageIndex()).toBe(2);
    expect(readRecipeBrowsePageIndex()).toBe(3);

    expect(writeToolBrowsePageIndex(-1)).toBe(0);
    expect(writeRecipeBrowsePageIndex(Number.NaN)).toBe(0);
    expect(readToolBrowsePageIndex()).toBe(0);
    expect(readRecipeBrowsePageIndex()).toBe(0);
  });

  it("applies history snapshots that clear the latest result", () => {
    writeActiveSession(null);
    expect(
      applyHistorySnapshot({
        historyRevision: 11,
        latestResult: null
      })
    ).toMatchObject({
      historyRevision: 11
    });
    expect(readLastResult()).toBeNull();
    expect(readWatchSyncMeta()).toMatchObject({
      historyRevision: 11
    });
  });
});
