import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSeedRecipeRecordById } from "../shared/domain/seed-library.js";
import { createActiveBrewSession } from "../shared/engine/recipe-engine.js";
import {
  clearActiveSession,
  readActiveSession,
  writeActiveSession
} from "../shared/storage/watch-store.js";
import {
  disableActiveSessionDisplayGuard,
  enableActiveSessionDisplayGuard
} from "../shared/watch/display-guard.js";
import {
  emitRuntimeEvent,
  subscribeRuntimeEvent
} from "../shared/watch/runtime-events.js";
import { __zeusRuntime, resetZeppRuntime } from "./zeus-runtime/runtime.ts";

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
    const originalConsoleLog = console.log;
    console.log = vi.fn();

    const unsubscribeGood = subscribeRuntimeEvent(goodListener);
    subscribeRuntimeEvent(noisyListener);

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
      expect(console.log).toHaveBeenCalled();

      unsubscribeGood();
      emitRuntimeEvent({
        type: "last_result",
        value: null
      });

      expect(goodListener).toHaveBeenCalledTimes(1);
    } finally {
      console.log = originalConsoleLog;
    }
  });
});
