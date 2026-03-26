import { getSupportedTools, getToolById } from "../../../zepp-app/shared/constants/tool-catalog.js";
import { getSeedRecipeRecordById, getSeedRecipeRecords } from "../../../zepp-app/shared/domain/seed-library.js";
import {
  CURRENT_SCHEMA_VERSION,
  cloneRecipeRecord,
  cloneRecipeSteps,
  compareHistoryIndexEntries,
  compareRecipeSummaries,
  createEmptyRecipeRecord,
  createGeneratedId,
  createHistoryIndexEntry,
  createLastResultSummary,
  createRecipeSnapshot,
  createRecipeSummary,
  DEFAULT_RECIPE_COLOR_TOKEN,
  FEEDBACK_CUES,
  normalizeRecipeSteps
} from "../../../zepp-app/shared/domain/schema.js";
import {
  RECIPE_COLOR_TOKENS,
  RECIPE_SOURCES,
  RECIPE_STEP_KINDS,
  SESSION_STATUSES,
  sumRecipeStepDurations,
  toNumberOrFallback,
  toOptionalNumber,
  normalizeText,
  normalizeBoolean
} from "../../../zepp-app/shared/domain/schema.js";
import {
  isColorToken,
  isFeedbackCue,
  isHistoryStatus,
  isRecipeSource,
  isRecipeStepKind,
  isSupportedToolId,
  validateHistoryEntry,
  validateHistoryIndexEntry,
  validateRecipeRecord,
  validateRecipeSnapshot,
  validateRecipeStep,
  validateRecipeSummary
} from "../../../zepp-app/shared/domain/validators.js";
import {
  buildScaffoldResult,
  buildHistoryEntryFromSession,
  createActiveBrewSession,
  formatDurationLabel,
  getCurrentSessionStep,
  getCurrentStepElapsedMs,
  getCurrentStepRemainingMs,
  getElapsedSessionMs,
  getStepProgressLabel
} from "../../../zepp-app/shared/engine/recipe-engine.js";
import {
  abortSession,
  advanceSession,
  resumeSession,
  tickSession
} from "../../../zepp-app/shared/engine/session-reducer.js";
import {
  PHONE_SYNC_SLICES,
  getBootstrapResponseSlices,
  getOrderedPhoneSyncSlices,
  getStorageChangeSlices
} from "../../../zepp-app/shared/sync/phone-sync-plan.js";
import {
  createSyncEnvelope,
  isSyncMessageType,
  validateSyncEnvelope
} from "../../../zepp-app/shared/sync/contracts.js";
import { fromSyncEnvelopeJson } from "../../../zepp-app/shared/sync/decode.js";
import { toSyncEnvelopeJson } from "../../../zepp-app/shared/sync/encode.js";
import {
  APP_BRIDGE_CONFIG,
  APP_BRIDGE_MESSAGE_TYPES,
  buildAppBridgeDataFrame,
  buildAppBridgeShakeFrame,
  extractAppBridgePayload,
  parseAppBridgeFrame,
  readCurrentAppSidePort
} from "../../../zepp-app/shared/sync/bridge-frame.js";
import {
  BRIDGE_TRANSPORT_CONFIG,
  BRIDGE_TRANSPORT_STATUS,
  buildChunkedBridgeTransportPayloads,
  createBridgeTransportState,
  readBridgeTransportPayload
} from "../../../zepp-app/shared/sync/bridge-transport.js";
import {
  decodeEnvelopeFromBlePayload,
  encodeEnvelopeForBle
} from "../../../zepp-app/shared/sync/device-codec.js";
import {
  decodeEnvelopeFromPeerSocket,
  encodeEnvelopeForPeerSocket
} from "../../../zepp-app/shared/sync/side-codec.js";
import { SYNC_MESSAGE_TYPES } from "../../../zepp-app/shared/sync/message-types.js";
import {
  buildPhoneCatalogSnapshot,
  buildPhoneHistorySnapshot,
  buildPhoneToolCatalogSnapshot
} from "../../../zepp-app/shared/sync/normalize.js";
import {
  deleteRecipeRecord,
  duplicateRecipeRecord,
  ensurePhoneStorage,
  readHistoryEntry,
  readHistoryIndex,
  readPhoneSnapshot,
  readPhoneSyncMeta,
  readRecipeRecord,
  safeParseJson,
  saveHistoryEntry,
  saveRecipeRecord,
  updateHistoryEntryFeedback
} from "../../../zepp-app/shared/storage/phone-store.js";
import {
  PHONE_STORAGE_KEYS,
  getPhoneHistoryRecordKey,
  getPhoneRecipeRecordKey
} from "../../../zepp-app/shared/storage/keys.js";

const statusElement = document.querySelector("#status");
const resultsElement = document.querySelector("#results");

window.__POF_PLAYWRIGHT_COVERAGE_STATE__ = {
  done: false,
  status: "booting"
};

function createValidHistoryEntry() {
  const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1_111);
  const recipeSnapshot = createRecipeSnapshot(recipeRecord);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    historyId: "hist_1111_abcd",
    sessionId: "sess_1111_abcd",
    recipeId: recipeRecord.recipeId,
    toolId: recipeRecord.toolId,
    recipeSnapshot,
    status: "completed",
    startedAt: 1_111,
    endedAt: 2_222,
    elapsedMs: 1_111,
    stepRunResults: [],
    deviationSummary: {
      totalDeltaMs: 15,
      worstStepDeltaMs: 10,
      completedSteps: 2,
      totalSteps: recipeSnapshot.steps.length
    },
    syncedFrom: "watch",
    createdAt: 2_222,
    updatedAt: 2_222
  };
}

function withGlobal(name, value, callback) {
  const previous = globalThis[name];
  const hadProperty = Object.prototype.hasOwnProperty.call(globalThis, name);
  globalThis[name] = value;

  try {
    return callback();
  } finally {
    if (hadProperty) {
      globalThis[name] = previous;
    } else {
      delete globalThis[name];
    }
  }
}

function createBrowserBufferShim() {
  return {
    from(value, encodingOrOffset, maybeLength) {
      if (typeof value === "string") {
        const bytes = new TextEncoder().encode(value);
        bytes.toString = () => new TextDecoder("utf-8").decode(bytes);
        return bytes;
      }

      if (value instanceof ArrayBuffer) {
        const bytes = new Uint8Array(value);
        bytes.toString = () => new TextDecoder("utf-8").decode(bytes);
        return bytes;
      }

      if (ArrayBuffer.isView(value)) {
        const bytes = new Uint8Array(
          value.buffer,
          Number.isFinite(encodingOrOffset) ? encodingOrOffset : value.byteOffset,
          Number.isFinite(maybeLength) ? maybeLength : value.byteLength
        );
        bytes.toString = () => new TextDecoder("utf-8").decode(bytes);
        return bytes;
      }

      throw new Error("Unsupported Buffer shim input.");
    }
  };
}

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

    runFlow(state, "domain-schema-helpers", () => {
      const supportedTools = getSupportedTools();
      assert(supportedTools !== getSupportedTools(), "Supported tool helper should return a fresh array.", state);
      assert(getToolById("tool_v60")?.label === "Hario V60", "Tool lookup should resolve known ids.", state);
      assert(getToolById("tool_missing") === null, "Tool lookup should fall back to null.", state);

      const generatedId = createGeneratedId("recipe", 1_234);
      assert(/^recipe_1234_[a-z0-9]+$/.test(generatedId), "Generated ids should stay prefixed and random.", state);
      assert(toOptionalNumber(null) === undefined, "Optional number helper should drop null.", state);
      assert(toOptionalNumber("12.5") === 12.5, "Optional number helper should parse numeric strings.", state);
      assert(toNumberOrFallback(undefined, 9) === 9, "Fallback numbers should use the default.", state);
      assert(normalizeText("  hello  ") === "hello", "Text normalization should trim input.", state);
      assert(normalizeText("   ", "fallback") === "fallback", "Blank text should fall back.", state);
      assert(normalizeBoolean("true") === true, "Boolean normalization should parse true strings.", state);
      assert(normalizeBoolean("false") === false, "Boolean normalization should parse false strings.", state);

      const normalizedSteps = normalizeRecipeSteps([
        {
          stepId: "",
          order: 99,
          kind: "unsupported",
          title: "",
          body: "",
          durationMs: "1500",
          waterMl: "20",
          targetTotalWaterMl: "50",
          requiresConfirm: "true",
          feedbackCue: "missing"
        },
        {
          stepId: "step_finish",
          kind: "finish",
          title: "",
          body: "",
          durationMs: 99,
          requiresConfirm: false,
          feedbackCue: "combo_short"
        }
      ]);
      assert(normalizedSteps[0].kind === "instruction", "Invalid step kinds should normalize to instruction.", state);
      assert(normalizedSteps[0].requiresConfirm === true, "Step normalization should parse confirm flags.", state);
      assert(normalizedSteps[0].feedbackCue === "none", "Unknown cues should normalize to none.", state);
      assert(normalizedSteps[1].title === "Done", "Finish steps should keep the canonical title.", state);
      assert(sumRecipeStepDurations(normalizedSteps) === 1_500, "Step durations should sum correctly.", state);

      const defaultRecipe = createEmptyRecipeRecord({
        toolId: "tool_v60",
        now: 5_000
      });
      const recipeClone = cloneRecipeRecord(defaultRecipe);
      const stepClone = cloneRecipeSteps(defaultRecipe.steps);
      assert(defaultRecipe.colorToken === DEFAULT_RECIPE_COLOR_TOKEN, "Default recipes should keep the default color.", state);
      assert(defaultRecipe.steps.length === 2, "Default recipes should include two starter steps.", state);
      assert(recipeClone !== defaultRecipe, "Recipe cloning should return a new object.", state);
      assert(recipeClone.steps !== defaultRecipe.steps, "Recipe cloning should clone steps.", state);
      assert(stepClone !== defaultRecipe.steps, "Step clone helper should return a fresh array.", state);

      const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 7_000);
      const recipeSummary = createRecipeSummary(recipeRecord);
      const recipeSnapshot = createRecipeSnapshot(recipeRecord);
      const historyEntry = createValidHistoryEntry();
      const historyIndexEntry = createHistoryIndexEntry(historyEntry);
      assert(recipeSummary.recipeId === recipeRecord.recipeId, "Recipe summary should preserve ids.", state);
      assert(recipeSnapshot.recipeUpdatedAt === recipeRecord.updatedAt, "Recipe snapshot should preserve revision time.", state);
      assert(recipeSnapshot.steps !== recipeRecord.steps, "Recipe snapshots should clone step arrays.", state);
      assert(historyIndexEntry.recipeName === historyEntry.recipeSnapshot.name, "History index should derive the recipe name.", state);
      assert(
        createLastResultSummary({
          ...historyEntry,
          deviationSummary: undefined
        }).totalDeltaMs === 0,
        "Last-result summaries should fall back when deviation data is absent.",
        state
      );

      const laterRecipe = { ...recipeSummary, recipeId: "b", name: "B", updatedAt: 200 };
      const earlierRecipe = { ...recipeSummary, recipeId: "a", name: "A", updatedAt: 100 };
      const sameTimeRecipe = { ...recipeSummary, recipeId: "c", name: "C", updatedAt: 200 };
      assert(
        [earlierRecipe, sameTimeRecipe, laterRecipe].sort(compareRecipeSummaries).map((item) => item.name).join(",") === "B,C,A",
        "Recipe summaries should sort newest-first with name fallback.",
        state
      );

      const laterHistory = { ...historyIndexEntry, historyId: "hist_b", recipeName: "B", endedAt: 200, updatedAt: 200 };
      const earlierHistory = { ...historyIndexEntry, historyId: "hist_a", recipeName: "A", endedAt: 100, updatedAt: 100 };
      const sameEndHistory = { ...historyIndexEntry, historyId: "hist_c", recipeName: "C", endedAt: 200, updatedAt: 300 };
      assert(
        [earlierHistory, sameEndHistory, laterHistory]
          .sort(compareHistoryIndexEntries)
          .map((item) => item.historyId)
          .join(",") === "hist_c,hist_b,hist_a",
        "History indexes should sort by end time and update time.",
        state
      );

      const seedRecipes = getSeedRecipeRecords(9_000);
      const seedRecipe = getSeedRecipeRecordById("seed_v60_bloom_classic", 9_000);
      assert(seedRecipes.length === 12, "Seed helper should expose the full starter library.", state);
      assert(seedRecipe.createdAt === 9_000, "Seed helper should stamp the requested timestamp.", state);
      seedRecipe.name = "Mutated";
      assert(
        getSeedRecipeRecordById("seed_v60_bloom_classic", 9_000).name === "V60 Bloom Classic",
        "Seed records should be cloned per lookup.",
        state
      );
    });

    runFlow(state, "validator-shape-guards", () => {
      const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 3_000);
      const recipeSummary = createRecipeSummary(recipeRecord);
      const recipeSnapshot = createRecipeSnapshot(recipeRecord);
      const historyEntry = createValidHistoryEntry();

      assert(isSupportedToolId("tool_v60") === true, "Supported tools should be recognized.", state);
      assert(isSupportedToolId("tool_missing") === false, "Unsupported tools should be rejected.", state);
      assert(isRecipeStepKind(RECIPE_STEP_KINDS[0]) === true, "Known step kinds should be recognized.", state);
      assert(isRecipeStepKind("missing") === false, "Unknown step kinds should be rejected.", state);
      assert(isFeedbackCue(FEEDBACK_CUES[0]) === true, "Known feedback cues should be recognized.", state);
      assert(isFeedbackCue("missing") === false, "Unknown feedback cues should be rejected.", state);
      assert(isColorToken(RECIPE_COLOR_TOKENS[0]) === true, "Known color tokens should be recognized.", state);
      assert(isColorToken("missing") === false, "Unknown color tokens should be rejected.", state);
      assert(isRecipeSource(RECIPE_SOURCES[0]) === true, "Known recipe sources should be recognized.", state);
      assert(isRecipeSource("missing") === false, "Unknown recipe sources should be rejected.", state);
      assert(isHistoryStatus(SESSION_STATUSES[2]) === true, "Known history statuses should be recognized.", state);
      assert(isHistoryStatus("running") === false, "Unknown history statuses should be rejected.", state);

      assert(validateRecipeSummary(recipeSummary).length === 0, "Valid recipe summaries should pass.", state);
      assert(validateRecipeSummary(null).includes("Recipe summary must be an object."), "Null summaries should be rejected.", state);
      assert(
        validateRecipeSummary({
          ...recipeSummary,
          recipeId: "",
          toolId: "tool_missing",
          name: "",
          colorToken: "bad",
          source: "bad",
          archived: "false",
          updatedAt: Number.NaN
        }).length >= 7,
        "Invalid recipe summary fields should all be reported.",
        state
      );

      assert(validateRecipeStep(null, 0, 0, 1).includes("Step 0 must be an object."), "Null steps should be rejected.", state);
      assert(
        validateRecipeStep(
          {
            stepId: "",
            order: 9,
            kind: "bad",
            title: "",
            body: "",
            feedbackCue: "bad",
            requiresConfirm: "false",
            durationMs: -1,
            waterMl: -1,
            targetTotalWaterMl: -1
          },
          0,
          0,
          1
        ).length >= 10,
        "Invalid step fields should all be reported.",
        state
      );
      assert(
        validateRecipeStep(
          {
            ...recipeRecord.steps.at(-1),
            durationMs: 10
          },
          recipeRecord.steps.length - 1,
          recipeRecord.steps.length - 1,
          recipeRecord.steps.length
        ).some((issue) => issue.includes("finish step cannot define durationMs")),
        "Finish steps should reject durationMs.",
        state
      );
      assert(
        validateRecipeStep(
          {
            ...recipeRecord.steps[0],
            kind: "confirm",
            requiresConfirm: false
          },
          0,
          0,
          recipeRecord.steps.length
        ).some((issue) => issue.includes("must require confirmation")),
        "Confirm steps should require confirmation.",
        state
      );

      assert(validateRecipeRecord(recipeRecord).length === 0, "Valid recipe records should pass.", state);
      assert(validateRecipeSnapshot(recipeSnapshot).length === 0, "Valid recipe snapshots should pass.", state);
      assert(validateRecipeSnapshot(null).includes("Recipe snapshot must be an object."), "Null snapshots should fail.", state);
      assert(
        validateHistoryIndexEntry({
          historyId: "",
          toolId: "missing",
          recipeName: "",
          status: "missing",
          endedAt: Number.NaN,
          elapsedMs: Number.NaN,
          updatedAt: Number.NaN
        }).length >= 7,
        "Invalid history index fields should all be reported.",
        state
      );
      assert(validateHistoryEntry(historyEntry).length === 0, "Valid history entries should pass.", state);
      assert(validateHistoryEntry(null).includes("History entry must be an object."), "Null history entries should fail.", state);
      assert(
        validateHistoryEntry({
          ...historyEntry,
          schemaVersion: 0,
          historyId: "",
          sessionId: "",
          toolId: "missing",
          status: "bad",
          recipeSnapshot: null,
          startedAt: Number.NaN,
          endedAt: Number.NaN,
          elapsedMs: Number.NaN,
          createdAt: Number.NaN,
          updatedAt: Number.NaN,
          deviationSummary: null
        }).length >= 10,
        "Invalid history entries should report multiple issues.",
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
      assert(
        JSON.stringify(getOrderedPhoneSyncSlices(null)) === "[]",
        "Null sync slices should normalize to an empty list.",
        state
      );
      assert(
        JSON.stringify(getStorageChangeSlices(getPhoneRecipeRecordKey("id"))) === JSON.stringify([PHONE_SYNC_SLICES.CATALOG]),
        "Recipe record storage changes should map to the catalog slice.",
        state
      );
      assert(
        JSON.stringify(getStorageChangeSlices(getPhoneHistoryRecordKey("id"))) === JSON.stringify([PHONE_SYNC_SLICES.HISTORY]),
        "History record storage changes should map to the history slice.",
        state
      );
      assert(
        JSON.stringify(getStorageChangeSlices("unknown")) === "[]",
        "Unknown storage keys should not map to a sync slice.",
        state
      );
    });

    runFlow(state, "phone-store-and-normalize", () => {
      const settingsStorage = createMockSettingsStorage();
      const seededSnapshot = ensurePhoneStorage(settingsStorage);
      assert(seededSnapshot.tools.length === 6, "Seeding should populate six tools.", state);
      assert(seededSnapshot.recipeIndex.length === 12, "Seeding should populate twelve recipes.", state);
      assert(
        Array.isArray(
          safeParseJson({
            raw: true
          }, [])
        ),
        "safeParseJson should fall back when JSON.parse rejects non-string input.",
        state
      );
      assert(
        safeParseJson("{broken", ["fallback"]).at(0) === "fallback",
        "safeParseJson should fall back on invalid JSON.",
        state
      );

      const saveResult = saveRecipeRecord(settingsStorage, createDraftRecipe());
      assert(saveResult.ok === true, "Saving a user recipe should succeed.", state);

      const storedRecipe = readRecipeRecord(settingsStorage, saveResult.recipeRecord.recipeId);
      assert(storedRecipe?.name === "Harness Recipe", "Stored recipe should round-trip by id.", state);

      const duplicatedRecipe = saveRecipeRecord(settingsStorage, {
        ...storedRecipe,
        recipeId: storedRecipe.recipeId,
        name: "Harness Recipe Updated",
        notes: "Updated note"
      });
      assert(duplicatedRecipe.ok === true, "Saving an existing recipe id should update the record.", state);
      assert(
        readRecipeRecord(settingsStorage, storedRecipe.recipeId)?.name === "Harness Recipe Updated",
        "Recipe updates should overwrite existing records.",
        state
      );
      assert(
        duplicateRecipeRecord(settingsStorage, "missing_recipe").ok === false,
        "Duplicating a missing recipe should fail cleanly.",
        state
      );
      const duplicateResult = duplicateRecipeRecord(settingsStorage, storedRecipe.recipeId);
      assert(duplicateResult.ok === true, "Duplicating an existing recipe should succeed.", state);
      assert(
        duplicateResult.recipeRecord.name.endsWith("Copy"),
        "Duplicated recipes should receive a copy suffix.",
        state
      );

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

      saveHistoryEntry(settingsStorage, {
        ...historyEntry,
        userRating: 5,
        userNote: "Bright and sweet"
      });
      assert(
        readHistoryEntry(settingsStorage, historyEntry.historyId)?.userNote === "Bright and sweet",
        "History updates should overwrite stored notes.",
        state
      );
      assert(
        updateHistoryEntryFeedback(settingsStorage, "missing_history", {
          userNote: "Nope"
        }).ok === false,
        "Updating a missing history entry should fail cleanly.",
        state
      );
      const feedbackUpdate = updateHistoryEntryFeedback(settingsStorage, historyEntry.historyId, {
        userNote: "Rounded",
        userRating: ""
      });
      assert(feedbackUpdate.ok === true, "Updating history feedback should succeed for existing entries.", state);
      assert(
        readHistoryEntry(settingsStorage, historyEntry.historyId)?.userRating === undefined,
        "Blank history ratings should normalize to undefined.",
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
        readPhoneSyncMeta(settingsStorage).historyRevision >= 2,
        "History saves should keep advancing the history revision.",
        state
      );

      assert(
        deleteRecipeRecord(settingsStorage, saveResult.recipeRecord.recipeId) === true,
        "Deleting a recipe should return true for an existing record.",
        state
      );
      assert(deleteRecipeRecord(settingsStorage, "missing_recipe") === false, "Deleting a missing recipe should return false.", state);
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
      assert(getCurrentSessionStep(null) === null, "Missing sessions should have no current step.", state);
      assert(getCurrentStepElapsedMs(null, 2_000) === 0, "Missing sessions should have zero step elapsed time.", state);
      assert(getElapsedSessionMs(null, 2_000) === 0, "Missing sessions should have zero session elapsed time.", state);

      const runningSession = advanceSession(activeSession, {
        now: 1_500
      });
      assert(runningSession.status === "running", "Advancing should enter the timed step.", state);
      assert(getCurrentStepRemainingMs(runningSession, 2_000) === 14_500, "Remaining time should be computed.", state);
      assert(getCurrentStepElapsedMs(runningSession, 2_500) === 1_000, "Step elapsed time should be computed.", state);
      assert(getElapsedSessionMs(runningSession, 4_000) === 3_000, "Session elapsed time should be computed.", state);

      const autoAdvancedSession = tickSession(runningSession, {
        now: runningSession.expectedStepEndAt + 1
      });
      assert(autoAdvancedSession.currentStepIndex === 2, "Tick should auto-advance timed steps.", state);

      const resumedSession = resumeSession(runningSession, {
        now: runningSession.expectedStepEndAt + 5_000
      });
      assert(resumedSession.currentStepIndex === 2, "Resume should reconcile elapsed timed steps.", state);

      const guardedRecipe = {
        ...recipeRecord,
        steps: recipeRecord.steps.map((step) => ({ ...step }))
      };
      guardedRecipe.steps[1] = {
        ...guardedRecipe.steps[1],
        requiresConfirm: true
      };
      const guardedSession = advanceSession(createActiveBrewSession(guardedRecipe, { now: 1_000 }), {
        now: 1_500
      });
      const guardedTick = tickSession(guardedSession, {
        now: guardedSession.expectedStepEndAt + 1
      });
      assert(
        guardedTick.status === "waiting_for_confirm" && guardedTick.currentStepIndex === 1,
        "Timed steps that require confirmation should pause instead of auto-advancing.",
        state
      );
      const guardedResume = resumeSession(guardedSession, {
        now: guardedSession.expectedStepEndAt + 5_000
      });
      assert(
        guardedResume.status === "waiting_for_confirm" && guardedResume.currentStepIndex === 1,
        "Resume should also pause on elapsed steps that require confirmation.",
        state
      );

      assert(advanceSession(null) === null, "Advancing a missing session should return null.", state);
      assert(tickSession(null) === null, "Ticking a missing session should return null.", state);
      assert(abortSession(null) === null, "Aborting a missing session should return null.", state);
      assert(resumeSession(null) === null, "Resuming a missing session should return null.", state);

      const expiredAdvance = advanceSession(
        {
          ...activeSession,
          currentStepIndex: activeSession.recipeSnapshot.steps.length
        },
        {
          now: 8_000
        }
      );
      assert(expiredAdvance.status === "expired", "Advancing past the last step should expire the session.", state);

      const abortedSession = abortSession(activeSession, {
        now: 5_000
      });
      const abortedResult = buildScaffoldResult(abortedSession, {
        now: 5_000
      });
      assert(abortedResult.status === "aborted", "Aborted scaffold result should keep aborted status.", state);
      assert(
        buildHistoryEntryFromSession(abortedSession, {
          now: 5_000
        }).deviationSummary.completedSteps === 0,
        "History entries should keep aborted completion metrics honest.",
        state
      );
      assert(getStepProgressLabel({ kind: "confirm" }) === "Manual confirm", "Confirm step label should stay stable.", state);
      assert(formatDurationLabel(61_000) === "01:01", "Duration formatting should be stable.", state);
      assert(formatDurationLabel(Number.NaN) === "--:--", "Invalid durations should render as placeholders.", state);
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
      assert(decodeEnvelopeFromPeerSocket(null) === null, "PeerSocket codec should reject null payloads.", state);
      assert(isSyncMessageType(SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP) === true, "Known sync message types should be recognized.", state);
      assert(isSyncMessageType("bad_type") === false, "Unknown sync message types should be rejected.", state);
      assert(validateSyncEnvelope(null).includes("Sync envelope must be an object."), "Null sync envelopes should fail validation.", state);
      assert(
        validateSyncEnvelope({
          schemaVersion: 0,
          messageType: "bad_type",
          requestId: "",
          sentAt: Number.NaN
        }).length >= 4,
        "Malformed sync envelopes should report multiple issues.",
        state
      );
      assert(toSyncEnvelopeJson(syncEnvelope).includes(SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP), "Valid envelopes should serialize to JSON.", state);
      let invalidEnvelopeThrew = false;
      try {
        toSyncEnvelopeJson({
          messageType: "bad"
        });
      } catch (error) {
        invalidEnvelopeThrew = String(error).includes("Invalid sync envelope:");
      }
      assert(invalidEnvelopeThrew, "Invalid envelopes should throw during JSON serialization.", state);
      assert(fromSyncEnvelopeJson("") === null, "Empty sync JSON should decode to null.", state);
      assert(fromSyncEnvelopeJson("{broken") === null, "Broken sync JSON should decode to null.", state);

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

      const bufferShim = createBrowserBufferShim();
      withGlobal("Buffer", bufferShim, () => {
        const shimmedPayload = encodeEnvelopeForPeerSocket(syncEnvelope);
        const shimmedDecoded = decodeEnvelopeFromPeerSocket({
          data: buildAppBridgeDataFrame(shimmedPayload, {
            port2: 88
          }).buffer
        });
        assert(
          shimmedDecoded.requestId === "req_browser_harness",
          "PeerSocket codec should also work through the Buffer path.",
          state
        );
      });

      const framedForWatch = buildAppBridgeDataFrame(encodeEnvelopeForBle(syncEnvelope).buffer, {
        port2: 77
      });
      const framedWatchDecoded = decodeEnvelopeFromBlePayload(framedForWatch.buffer, framedForWatch.size);
      assert(
        framedWatchDecoded.payload.knownToolCatalogRevision === 4,
        "Watch app-frame path should preserve payload values.",
        state
      );

      withGlobal("TextEncoder", undefined, () => {
        withGlobal("TextDecoder", undefined, () => {
          const fallbackBlePayload = encodeEnvelopeForBle(syncEnvelope);
          const fallbackDecoded = decodeEnvelopeFromBlePayload(
            fallbackBlePayload.buffer,
            fallbackBlePayload.size
          );
          assert(
            fallbackDecoded.requestId === "req_browser_harness",
            "BLE codec should fall back without TextEncoder/TextDecoder.",
            state
          );
        });
      });
      assert(decodeEnvelopeFromBlePayload(null, 0) === null, "BLE codec should reject empty payloads.", state);

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
      assert(buildChunkedBridgeTransportPayloads(null).length === 0, "Chunk builder should reject missing payloads.", state);

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

      const invalidVersionChunk = chunkFrames[0].slice(0);
      new DataView(invalidVersionChunk).setUint8(4, 99);
      assert(
        readBridgeTransportPayload(createBridgeTransportState(), invalidVersionChunk).status === BRIDGE_TRANSPORT_STATUS.INVALID,
        "Chunk transport should reject invalid protocol versions.",
        state
      );

      const mismatchedChunk = chunkFrames[1].slice(0);
      new DataView(mismatchedChunk).setUint32(16, 999, true);
      const pendingState = createBridgeTransportState();
      readBridgeTransportPayload(pendingState, chunkFrames[0]);
      assert(
        readBridgeTransportPayload(pendingState, mismatchedChunk).status === BRIDGE_TRANSPORT_STATUS.INVALID,
        "Chunk transport should reject metadata changes mid-transfer.",
        state
      );

      const invalidFlagFrame = framedForPhone.buffer.slice(0);
      new DataView(invalidFlagFrame).setUint8(0, 0);
      assert(parseAppBridgeFrame(invalidFlagFrame) === null, "Bridge parser should reject invalid flags.", state);
      assert(parseAppBridgeFrame(new ArrayBuffer(2)) === null, "Bridge parser should reject undersized buffers.", state);
      assert(extractAppBridgePayload({ buffer: rawPayload, byteOffset: 1, byteLength: 2 }).byteLength === 2, "Bridge payload extraction should honor byte offsets.", state);
      assert(buildAppBridgeShakeFrame({ appId: APP_BRIDGE_CONFIG.appId, port2: 88 }).size > 0, "Shake frames should be constructible.", state);

      withGlobal("getApp", () => ({ port2: 123 }), () => {
        assert(readCurrentAppSidePort() === 123, "Bridge helper should read app-side port from getApp.", state);
      });
      withGlobal("getApp", () => {
        throw new Error("getApp failed");
      }, () => {
        assert(readCurrentAppSidePort() === 0, "Bridge helper should fall back when getApp throws.", state);
      });
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
