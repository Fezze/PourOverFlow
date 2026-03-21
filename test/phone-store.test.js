import test from "node:test";
import assert from "node:assert/strict";

import { createRecipeSnapshot } from "../shared/domain/schema.js";
import {
  deleteRecipeRecord,
  ensurePhoneStorage,
  readHistoryEntry,
  readHistoryIndex,
  readPhoneSyncMeta,
  readRecipeRecord,
  safeParseJson,
  saveHistoryEntry,
  saveRecipeRecord
} from "../shared/storage/phone-store.js";
import { getPhoneRecipeRecordKey } from "../shared/storage/keys.js";

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
    addListener() {},
    dump() {
      return values;
    }
  };
}

function createValidDraft(toolId = "tool_v60") {
  return {
    toolId,
    name: "Test Recipe",
    colorToken: "teal",
    description: "A user recipe for tests.",
    coffeeDoseG: "18",
    totalWaterMl: "300",
    waterTempC: "94",
    filterLabel: "Paper",
    grindLabel: "Medium",
    estimatedTotalDurationMs: "90000",
    notes: "Keep pours steady.",
    steps: [
      {
        stepId: "",
        order: 0,
        kind: "instruction",
        title: "Prep",
        body: "Rinse filter and add coffee.",
        requiresConfirm: "true",
        feedbackCue: "none"
      },
      {
        stepId: "",
        order: 1,
        kind: "timed_action",
        title: "Main pour",
        body: "Pour to full volume.",
        durationMs: "45000",
        waterMl: "300",
        targetTotalWaterMl: "300",
        requiresConfirm: "false",
        feedbackCue: "vibrate_short"
      },
      {
        stepId: "",
        order: 2,
        kind: "finish",
        title: "Done",
        body: "Serve the brew.",
        requiresConfirm: "false",
        feedbackCue: "combo_short"
      }
    ]
  };
}

test("ensurePhoneStorage seeds tool catalog, seed recipes and sync meta", () => {
  const settingsStorage = createMockSettingsStorage();
  const snapshot = ensurePhoneStorage(settingsStorage);

  assert.equal(snapshot.tools.length, 6);
  assert.equal(snapshot.recipeIndex.length, 12);
  assert.equal(snapshot.historyIndex.length, 0);
  assert.equal(snapshot.syncMeta.toolCatalogRevision, 1);
  assert.equal(snapshot.syncMeta.recipeCatalogRevision, 1);
  assert.ok(settingsStorage.getItem(getPhoneRecipeRecordKey("seed_ap_daily_clean")));
});

test("saveRecipeRecord persists a user recipe into index plus record storage", () => {
  const settingsStorage = createMockSettingsStorage();
  ensurePhoneStorage(settingsStorage);

  const result = saveRecipeRecord(settingsStorage, createValidDraft());

  assert.equal(result.ok, true);
  assert.equal(result.issues.length, 0);
  assert.equal(result.recipeRecord.source, "user");
  assert.ok(result.recipeRecord.recipeId.startsWith("recipe_"));

  const storedRecipe = readRecipeRecord(settingsStorage, result.recipeRecord.recipeId);
  const syncMeta = readPhoneSyncMeta(settingsStorage);

  assert.equal(storedRecipe.name, "Test Recipe");
  assert.equal(syncMeta.recipeCatalogRevision, 2);
});

test("deleteRecipeRecord keeps history entries intact", () => {
  const settingsStorage = createMockSettingsStorage();
  ensurePhoneStorage(settingsStorage);

  const recipeRecord = readRecipeRecord(settingsStorage, "seed_ap_daily_clean");
  const historyEntry = {
    schemaVersion: 1,
    historyId: "hist_1711111111111_ab12",
    sessionId: "sess_1711111111111_ab12",
    recipeId: recipeRecord.recipeId,
    toolId: recipeRecord.toolId,
    recipeSnapshot: createRecipeSnapshot(recipeRecord),
    status: "completed",
    startedAt: 1711111111111,
    endedAt: 1711111112222,
    elapsedMs: 1111,
    stepRunResults: [],
    deviationSummary: {
      totalDeltaMs: 0,
      worstStepDeltaMs: 0,
      completedSteps: recipeRecord.steps.length,
      totalSteps: recipeRecord.steps.length
    },
    syncedFrom: "watch",
    createdAt: 1711111112222,
    updatedAt: 1711111112222
  };

  const saveHistoryResult = saveHistoryEntry(settingsStorage, historyEntry);
  assert.equal(saveHistoryResult.ok, true);

  const deleted = deleteRecipeRecord(settingsStorage, recipeRecord.recipeId);

  assert.equal(deleted, true);
  assert.equal(readRecipeRecord(settingsStorage, recipeRecord.recipeId), null);
  assert.equal(readHistoryIndex(settingsStorage).length, 1);
  assert.equal(
    readHistoryEntry(settingsStorage, historyEntry.historyId).recipeSnapshot.name,
    recipeRecord.name
  );
});

test("safeParseJson falls back on invalid JSON", () => {
  const originalConsoleLog = console.log;
  console.log = () => {};

  try {
    assert.deepEqual(safeParseJson("{broken", ["fallback"]), ["fallback"]);
  } finally {
    console.log = originalConsoleLog;
  }
});
