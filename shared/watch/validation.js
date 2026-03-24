import {
  getPendingHistoryQueue,
  isCatalogReady,
  isWatchConnected,
  readActiveSession,
  readLastResult,
  readValidationNote,
  readWatchSyncMeta,
  writeValidationNote
} from "../storage/watch-store";
import { playFeedbackCue } from "../engine/feedback";
import { flushPendingHistoryQueue, requestBootstrap } from "./sync-bridge";

function buildSyncActionNote(requestedBootstrap, flushedQueue, connected) {
  if (!connected && !requestedBootstrap && !flushedQueue) {
    return "Sync skipped because the phone bridge is offline.";
  }

  if (requestedBootstrap && flushedQueue) {
    return "Requested a fresh phone snapshot and retried the pending queue.";
  }

  if (requestedBootstrap) {
    return "Requested a fresh phone snapshot from the companion.";
  }

  if (flushedQueue) {
    return "Retried the pending history queue.";
  }

  return "Sync request finished without new work.";
}

export function getValidationScaffoldState() {
  const syncMeta = readWatchSyncMeta();
  const activeSession = readActiveSession();
  const lastResult = readLastResult();
  const pendingHistoryQueue = getPendingHistoryQueue();

  return {
    connected: isWatchConnected(),
    catalogReady: isCatalogReady(),
    pendingHistoryCount: pendingHistoryQueue.length,
    toolCatalogRevision: syncMeta.toolCatalogRevision,
    recipeCatalogRevision: syncMeta.recipeCatalogRevision,
    historyRevision: syncMeta.historyRevision,
    activeSessionName: activeSession ? activeSession.recipeName : null,
    lastResultName: lastResult ? lastResult.recipeName : null,
    note: readValidationNote()
  };
}

export function runValidationAction(actionId) {
  switch (actionId) {
    case "haptic": {
      const success = playFeedbackCue("vibrate_short");
      const note = success
        ? "Requested a short haptic cue on the watch."
        : "Haptic cue was unavailable on this runtime.";
      writeValidationNote(note);
      return {
        success,
        note
      };
    }
    case "sound": {
      const success = playFeedbackCue("sound_soft");
      const note = success
        ? "Requested a soft system sound on the watch."
        : "System sound was unavailable on this runtime.";
      writeValidationNote(note);
      return {
        success,
        note
      };
    }
    case "sync": {
      const requestedBootstrap = requestBootstrap();
      const flushedQueue = flushPendingHistoryQueue();
      const note = buildSyncActionNote(requestedBootstrap, flushedQueue, isWatchConnected());
      const success = requestedBootstrap || flushedQueue;
      writeValidationNote(note);
      return {
        success,
        note
      };
    }
    default: {
      const note = "Unknown validation action.";
      writeValidationNote(note);
      return {
        success: false,
        note
      };
    }
  }
}
