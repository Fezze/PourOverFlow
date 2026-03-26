import { resetPageBrightTime, setPageBrightTime, setWakeUpRelaunch } from "@zos/display";

import { readActiveSession, writeActiveSession } from "../storage/watch-store";
import { logValidation } from "./validation-log";

const MIN_ACTIVE_BRIGHT_MS = 60 * 1000;
const MAX_ACTIVE_BRIGHT_MS = 10 * 60 * 1000;
const ACTIVE_BRIGHT_BUFFER_MS = 60 * 1000;

function clampBrightTime(value) {
  return Math.max(MIN_ACTIVE_BRIGHT_MS, Math.min(MAX_ACTIVE_BRIGHT_MS, value));
}

function getRecommendedBrightTime(activeSession) {
  const estimatedDurationMs = activeSession &&
    activeSession.recipeSnapshot &&
    Number.isFinite(activeSession.recipeSnapshot.estimatedTotalDurationMs)
    ? activeSession.recipeSnapshot.estimatedTotalDurationMs
    : MIN_ACTIVE_BRIGHT_MS;

  return clampBrightTime(estimatedDurationMs + ACTIVE_BRIGHT_BUFFER_MS);
}

export function enableActiveSessionDisplayGuard(activeSession = readActiveSession()) {
  if (!activeSession) {
    logValidation("display_guard_skip", {
      reason: "no_active_session"
    });
    return false;
  }

  let wakeEnabled = false;
  let brightEnabled = false;
  const recommendedBrightTime = getRecommendedBrightTime(activeSession);

  try {
    setWakeUpRelaunch(true);
    wakeEnabled = true;
  } catch (error) {
    console.log("Failed to enable wake-up relaunch", error);
  }

  try {
    setPageBrightTime({
      brightTime: recommendedBrightTime
    });
    brightEnabled = true;
  } catch (error) {
    console.log("Failed to extend page bright time", error);
  }

  if (
    activeSession.wakeUpResumeEnabled !== wakeEnabled ||
    activeSession.pageBrightModeEnabled !== brightEnabled
  ) {
    writeActiveSession({
      ...activeSession,
      wakeUpResumeEnabled: wakeEnabled,
      pageBrightModeEnabled: brightEnabled
    });
  }

  logValidation("display_guard_enable", {
    recipeId: activeSession.recipeId,
    wakeEnabled,
    brightEnabled,
    brightTime: recommendedBrightTime
  });

  return wakeEnabled || brightEnabled;
}

export function disableActiveSessionDisplayGuard() {
  let wakeDisabled = true;
  let brightReset = true;

  try {
    setWakeUpRelaunch(false);
  } catch (error) {
    console.log("Failed to disable wake-up relaunch", error);
    wakeDisabled = false;
  }

  try {
    resetPageBrightTime();
  } catch (error) {
    console.log("Failed to reset page bright time", error);
    brightReset = false;
  }

  logValidation("display_guard_disable", {
    wakeDisabled,
    brightReset
  });
}
