import { getSeedRecipeRecordById } from "../../../shared/domain/seed-library.js";
import {
  CURRENT_SCHEMA_VERSION,
  createRecipeSnapshot,
  normalizeRecipeSteps
} from "../../../shared/domain/schema.js";
import { validateRecipeRecord } from "../../../shared/domain/validators.js";
import {
  buildScaffoldResult,
  createActiveBrewSession,
  formatDurationLabel,
  getCurrentStepRemainingMs,
  getStepProgressLabel
} from "../../../shared/engine/recipe-engine.js";
import {
  abortSession,
  advanceSession,
  resumeSession,
  tickSession
} from "../../../shared/engine/session-reducer.js";
import {
  PHONE_SYNC_SLICES,
  getBootstrapResponseSlices,
  getOrderedPhoneSyncSlices,
  getStorageChangeSlices
} from "../../../shared/sync/phone-sync-plan.js";
import {
  createSyncEnvelope,
  validateSyncEnvelope
} from "../../../shared/sync/contracts.js";
import { buildAppBridgeDataFrame } from "../../../shared/sync/bridge-frame.js";
import {
  BRIDGE_TRANSPORT_CONFIG,
  buildChunkedBridgeTransportPayloads,
  createBridgeTransportState,
  readBridgeTransportPayload
} from "../../../shared/sync/bridge-transport.js";
import {
  decodeEnvelopeFromBlePayload,
  encodeEnvelopeForBle
} from "../../../shared/sync/device-codec.js";
import {
  decodeEnvelopeFromPeerSocket,
  encodeEnvelopeForPeerSocket
} from "../../../shared/sync/side-codec.js";
import { SYNC_MESSAGE_TYPES } from "../../../shared/sync/message-types.js";
import {
  buildPhoneCatalogSnapshot,
  buildPhoneHistorySnapshot,
  buildPhoneToolCatalogSnapshot
} from "../../../shared/sync/normalize.js";
import {
  deleteRecipeRecord,
  ensurePhoneStorage,
  readHistoryEntry,
  readHistoryIndex,
  readPhoneSnapshot,
  readPhoneSyncMeta,
  readRecipeRecord,
  safeParseJson,
  saveHistoryEntry,
  saveRecipeRecord
} from "../../../shared/storage/phone-store.js";
import {
  PHONE_STORAGE_KEYS
} from "../../../shared/storage/keys.js";

const statusElement = document.querySelector("#status");
const resultsElement = document.querySelector("#results");

window.__POF_PLAYWRIGHT_COVERAGE_STATE__ = {
  done: false,
  status: "booting"
};

runHarness();

async function runHarness() {
  const state = {
    assertions: 0,
    flows: []
  };

  try {
    runFlow(state, "validators", () => {
      const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1_000);
      assert(validateRecipeRecord(recipeRecord).length === 0, "Seed recipe should be valid.", state);

      const invalidToolIssues = validateRecipeRecord({
        ...recipeRecord,
        toolId: "tool_unknown"
      });
      assert(
        invalidToolIssues.some((issue) => issue.includes("supported tool catalog")),
        "Invalid tool id should be rejected.",
        state
      );

      const brokenSteps = recipeRecord.steps.map((step) => ({ ...step }));
      brokenSteps[brokenSteps.length - 1] = {
        ...brokenSteps[brokenSteps.length - 1],
        kind: "confirm",
        requiresConfirm: true
      };
      const brokenFinishIssues = validateRecipeRecord({
        ...recipeRecord,
        steps: brokenSteps
      });
      assert(
        brokenFinishIssues.some((issue) => issue.includes("finish step")),
        "Recipe should reject a non-finish final step.",
        state
      );
    });

    runFlow(state, "phone-sync-plan", () => {
      const slices = getBootstrapResponseSlices(
        {
          knownToolCatalogRevision: 3,
          knownRecipeCatalogRevision: 5,
          knownHistoryRevision: 11
        },
        {
          toolCatalogRevision: 3,
          recipeCatalogRevision: 7,
          historyRevision: 11
        }
      );

      assert(
        slices.length === 1 && slices[0] === PHONE_SYNC_SLICES.CATALOG,
        "Bootstrap should request only the stale catalog slice.",
        state
      );

      const orderedSlices = getOrderedPhoneSyncSlices([
        PHONE_SYNC_SLICES.HISTORY,
        PHONE_SYNC_SLICES.CATALOG,
        PHONE_SYNC_SLICES.CATALOG,
        PHONE_SYNC_SLICES.TOOLS
      ]);
      assert(
        orderedSlices.join(",") === "tools,catalog,history",
        "Ordered sync slices should be deduplicated.",
        state
      );

      assert(
        getStorageChangeSlices(PHONE_STORAGE_KEYS.tools)[0] === PHONE_SYNC_SLICES.TOOLS,
        "Tool storage changes should map to the tools slice.",
        state
      );
    });

    runFlow(state, "phone-store-and-normalize", () => {
      const settingsStorage = createMockSettingsStorage();
      const seededSnapshot = ensurePhoneStorage(settingsStorage);
      assert(seededSnapshot.tools.length === 6, "Seeding should populate six tools.", state);
      assert(seededSnapshot.recipeIndex.length === 12, "Seeding should populate twelve recipes.", state);
      assert(
        safeParseJson("{broken", ["fallback"]).at(0) === "fallback",
        "safeParseJson should fall back on invalid JSON.",
        state
      );

      const saveResult = saveRecipeRecord(settingsStorage, createDraftRecipe());
      assert(saveResult.ok === true, "Saving a user recipe should succeed.", state);

      const storedRecipe = readRecipeRecord(settingsStorage, saveResult.recipeRecord.recipeId);
      assert(storedRecipe?.name === "Harness Recipe", "Stored recipe should round-trip by id.", state);

      const historyEntry = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        historyId: "hist_browser_harness",
        sessionId: "sess_browser_harness",
        recipeId: saveResult.recipeRecord.recipeId,
        toolId: saveResult.recipeRecord.toolId,
        recipeSnapshot: createRecipeSnapshot(saveResult.recipeRecord),
        status: "completed",
        startedAt: 10_000,
        endedAt: 11_111,
        elapsedMs: 1_111,
        stepRunResults: [],
        deviationSummary: {
          totalDeltaMs: 0,
          worstStepDeltaMs: 0,
          completedSteps: saveResult.recipeRecord.steps.length,
          totalSteps: saveResult.recipeRecord.steps.length
        },
        syncedFrom: "watch",
        createdAt: 11_111,
        updatedAt: 11_111
      };

      const historySave = saveHistoryEntry(settingsStorage, historyEntry);
      assert(historySave.ok === true, "Saving history should succeed.", state);
      assert(readHistoryIndex(settingsStorage).length === 1, "History index should include the new entry.", state);
      assert(
        readHistoryEntry(settingsStorage, historyEntry.historyId)?.recipeSnapshot?.name === "Harness Recipe",
        "History entry should be readable after save.",
        state
      );

      const snapshotAfterHistory = readPhoneSnapshot(settingsStorage);
      const toolSnapshot = buildPhoneToolCatalogSnapshot(snapshotAfterHistory);
      const catalogSnapshot = buildPhoneCatalogSnapshot(settingsStorage, snapshotAfterHistory);
      const historySnapshot = buildPhoneHistorySnapshot(snapshotAfterHistory);

      assert(toolSnapshot.tools.length === 6, "Tool catalog snapshot should be populated.", state);
      assert(
        Object.keys(catalogSnapshot.recipeSnapshotsById).includes(saveResult.recipeRecord.recipeId),
        "Catalog snapshot should include the saved recipe snapshot.",
        state
      );
      assert(
        historySnapshot.latestResult?.historyId === historyEntry.historyId,
        "History snapshot should expose the latest result.",
        state
      );
      assert(
        readPhoneSyncMeta(settingsStorage).historyRevision === 1,
        "History save should advance the history revision.",
        state
      );

      assert(
        deleteRecipeRecord(settingsStorage, saveResult.recipeRecord.recipeId) === true,
        "Deleting a recipe should return true for an existing record.",
        state
      );
      assert(readRecipeRecord(settingsStorage, saveResult.recipeRecord.recipeId) === null, "Recipe should be deleted.", state);
      assert(
        readHistoryEntry(settingsStorage, historyEntry.historyId)?.historyId === historyEntry.historyId,
        "Deleting a recipe must keep history intact.",
        state
      );
    });

    runFlow(state, "engine-and-session", () => {
      const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1_000);
      const activeSession = createActiveBrewSession(recipeRecord, {
        now: 1_000
      });
      assert(activeSession.status === "waiting_for_confirm", "Initial instruction step should wait for confirm.", state);

      const runningSession = advanceSession(activeSession, {
        now: 1_500
      });
      assert(runningSession.status === "running", "Advancing should enter the timed step.", state);
      assert(getCurrentStepRemainingMs(runningSession, 2_000) === 14_500, "Remaining time should be computed.", state);

      const autoAdvancedSession = tickSession(runningSession, {
        now: runningSession.expectedStepEndAt + 1
      });
      assert(autoAdvancedSession.currentStepIndex === 2, "Tick should auto-advance timed steps.", state);

      const resumedSession = resumeSession(runningSession, {
        now: runningSession.expectedStepEndAt + 5_000
      });
      assert(resumedSession.currentStepIndex === 2, "Resume should reconcile elapsed timed steps.", state);

      const abortedSession = abortSession(activeSession, {
        now: 5_000
      });
      const abortedResult = buildScaffoldResult(abortedSession, {
        now: 5_000
      });
      assert(abortedResult.status === "aborted", "Aborted scaffold result should keep aborted status.", state);
      assert(getStepProgressLabel({ kind: "confirm" }) === "Manual confirm", "Confirm step label should stay stable.", state);
      assert(formatDurationLabel(61_000) === "01:01", "Duration formatting should be stable.", state);
    });

    runFlow(state, "sync-codecs-and-transport", () => {
      const syncEnvelope = createSyncEnvelope(
        SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP,
        {
          knownToolCatalogRevision: 4,
          knownRecipeCatalogRevision: 5,
          knownHistoryRevision: 6
        },
        {
          requestId: "req_browser_harness",
          sentAt: 20_000
        }
      );

      const peerDecoded = decodeEnvelopeFromPeerSocket(encodeEnvelopeForPeerSocket(syncEnvelope));
      assert(validateSyncEnvelope(peerDecoded).length === 0, "PeerSocket codec should round-trip envelopes.", state);

      const framedForPhone = buildAppBridgeDataFrame(encodeEnvelopeForPeerSocket(syncEnvelope), {
        port2: 77
      });
      const framedPhoneDecoded = decodeEnvelopeFromPeerSocket({
        data: framedForPhone.buffer
      });
      assert(
        framedPhoneDecoded.payload.knownHistoryRevision === 6,
        "Phone app-frame path should preserve payload values.",
        state
      );

      const framedForWatch = buildAppBridgeDataFrame(encodeEnvelopeForBle(syncEnvelope).buffer, {
        port2: 77
      });
      const framedWatchDecoded = decodeEnvelopeFromBlePayload(framedForWatch.buffer, framedForWatch.size);
      assert(
        framedWatchDecoded.payload.knownToolCatalogRevision === 4,
        "Watch app-frame path should preserve payload values.",
        state
      );

      const chunkedEnvelope = createSyncEnvelope(
        SYNC_MESSAGE_TYPES.PUSH_CATALOG_SNAPSHOT,
        {
          recipeCatalogRevision: 99,
          notes: "x".repeat(BRIDGE_TRANSPORT_CONFIG.maxChunkPayloadSize * 2)
        },
        {
          requestId: "req_chunked_browser_harness",
          sentAt: 21_000
        }
      );
      const rawPayload = encodeEnvelopeForPeerSocket(chunkedEnvelope);
      const chunkFrames = buildChunkedBridgeTransportPayloads(rawPayload, {
        maxChunkPayloadSize: 512
      });
      assert(chunkFrames.length > 1, "Large sync payloads should be chunked.", state);

      const phoneTransportState = createBridgeTransportState();
      let phonePayload = null;
      chunkFrames.forEach((frameBuffer) => {
        const result = readBridgeTransportPayload(phoneTransportState, frameBuffer);
        if (result.status === "complete") {
          phonePayload = result.payload;
        }
      });
      const phoneChunkDecoded = decodeEnvelopeFromPeerSocket(phonePayload);
      assert(
        phoneChunkDecoded.payload.recipeCatalogRevision === 99,
        "Chunked transport should reassemble payloads on the phone path.",
        state
      );

      const watchTransportState = createBridgeTransportState();
      let watchPayload = null;
      chunkFrames.forEach((frameBuffer) => {
        const wrappedFrame = buildAppBridgeDataFrame(frameBuffer, {
          port2: 0
        });
        const result = readBridgeTransportPayload(watchTransportState, wrappedFrame.buffer, wrappedFrame.size);
        if (result.status === "complete") {
          watchPayload = result.payload;
        }
      });
      const watchChunkDecoded = decodeEnvelopeFromBlePayload(watchPayload, watchPayload.byteLength);
      assert(
        watchChunkDecoded.payload.recipeCatalogRevision === 99,
        "Chunked transport should reassemble payloads on the watch path.",
        state
      );
    });

    markReady(state);
  } catch (error) {
    markFailure(error);
  }
}

function runFlow(state, name, callback) {
  callback();
  state.flows.push(name);
}

function createMockSettingsStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
    addListener() {}
  };
}

function createDraftRecipe() {
  return {
    toolId: "tool_v60",
    name: "Harness Recipe",
    colorToken: "teal",
    description: "Recipe created by the Playwright module harness.",
    coffeeDoseG: "18",
    totalWaterMl: "300",
    waterTempC: "94",
    filterLabel: "Paper",
    grindLabel: "Medium",
    estimatedTotalDurationMs: "90000",
    notes: "Keep pours controlled.",
    steps: normalizeRecipeSteps([
      {
        kind: "instruction",
        title: "Prep",
        body: "Rinse filter and add coffee.",
        requiresConfirm: true,
        feedbackCue: "none"
      },
      {
        kind: "timed_action",
        title: "Main pour",
        body: "Pour to full volume.",
        durationMs: 45_000,
        waterMl: 300,
        targetTotalWaterMl: 300,
        requiresConfirm: false,
        feedbackCue: "vibrate_short"
      },
      {
        kind: "finish",
        title: "Done",
        body: "Serve the brew.",
        requiresConfirm: false,
        feedbackCue: "combo_short"
      }
    ])
  };
}

function assert(condition, message, state) {
  if (!condition) {
    throw new Error(message);
  }

  state.assertions += 1;
}

function markReady(state) {
  const payload = {
    done: true,
    status: "ready",
    assertions: state.assertions,
    flows: state.flows
  };
  window.__POF_PLAYWRIGHT_COVERAGE_STATE__ = payload;
  statusElement.textContent = `ready:${state.assertions}`;
  resultsElement.textContent = JSON.stringify(payload, null, 2);
}

function markFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  const payload = {
    done: true,
    status: "error",
    error: message
  };
  window.__POF_PLAYWRIGHT_COVERAGE_STATE__ = payload;
  statusElement.textContent = `error:${message}`;
  resultsElement.textContent = JSON.stringify(payload, null, 2);
  console.error(error);
}
