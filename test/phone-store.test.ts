import { expect, test, vi } from "vitest";

import { createRecipeSnapshot, createRecipeSummary } from "../zepp-app/shared/domain/schema.js";
import {
  SEED_LIBRARY_VERSION,
  getSeedRecipeRecordsForVersion
} from "../zepp-app/shared/domain/seed-library.js";
import {
  duplicateRecipeRecord,
  deleteRecipeRecord,
  ensurePhoneStorage,
  readHistoryEntry,
  readHistoryIndex,
  readPhoneSyncMeta,
  readRecipeRecord,
  safeParseJson,
  saveHistoryEntry,
  saveRecipeRecord,
  updateHistoryEntryFeedback
} from "../zepp-app/shared/storage/phone-store.js";
import { PHONE_STORAGE_KEYS, getPhoneRecipeRecordKey } from "../zepp-app/shared/storage/keys.js";

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

  expect(snapshot.tools).toHaveLength(6);
  expect(snapshot.recipeIndex).toHaveLength(24);
  expect(snapshot.historyIndex).toHaveLength(0);
  expect(snapshot.syncMeta.toolCatalogRevision).toBe(1);
  expect(snapshot.syncMeta.recipeCatalogRevision).toBe(1);
  expect(snapshot.syncMeta.seedCatalogVersion).toBe(SEED_LIBRARY_VERSION);
  expect(settingsStorage.getItem(getPhoneRecipeRecordKey("seed_ap_daily_clean"))).toBeTruthy();
  expect(settingsStorage.getItem(getPhoneRecipeRecordKey("seed_v60_high_sweet"))).toBeTruthy();
});

test("ensurePhoneStorage can seed starter recipes in Polish and records the seed locale", () => {
  const settingsStorage = createMockSettingsStorage();
  const snapshot = ensurePhoneStorage(settingsStorage, {
    preferredLocale: "pl-PL"
  });

  expect(snapshot.syncMeta.seedLocale).toBe("pl-PL");
  expect(readRecipeRecord(settingsStorage, "seed_ap_daily_clean")).toMatchObject({
    name: "AeroPress Daily Clean",
    filterLabel: "Papier",
    grindLabel: "Średnio-drobne"
  });
  expect(readRecipeRecord(settingsStorage, "seed_v60_high_sweet")).toMatchObject({
    name: "V60 High Sweet",
    notes: "Trzymaj wyższy, stabilny centralny strumień."
  });
});

test("ensurePhoneStorage backfills missing seedLocale for legacy installs with the legacy English baseline", () => {
  const settingsStorage = createMockSettingsStorage();
  const oldSeedTimestamp = 3_000;
  const versionOneSeeds = getSeedRecipeRecordsForVersion(1, oldSeedTimestamp);

  versionOneSeeds.forEach((recipeRecord) => {
    settingsStorage.setItem(getPhoneRecipeRecordKey(recipeRecord.recipeId), JSON.stringify(recipeRecord));
  });
  settingsStorage.setItem(
    PHONE_STORAGE_KEYS.recipeIndex,
    JSON.stringify(versionOneSeeds.map((recipeRecord) => createRecipeSummary(recipeRecord)))
  );
  settingsStorage.setItem(PHONE_STORAGE_KEYS.historyIndex, JSON.stringify([]));
  settingsStorage.setItem(
    PHONE_STORAGE_KEYS.syncMeta,
    JSON.stringify({
      schemaVersion: 1,
      toolCatalogRevision: 4,
      recipeCatalogRevision: 7,
      historyRevision: 2,
      seedCatalogVersion: 1,
      seededAt: oldSeedTimestamp
    })
  );

  const snapshot = ensurePhoneStorage(settingsStorage, {
    preferredLocale: "pl-PL"
  });

  expect(snapshot.syncMeta.seedLocale).toBe("en-US");
});

test("ensurePhoneStorage seeds an uneven library where every brewer has more than two recipes", () => {
  const settingsStorage = createMockSettingsStorage();
  const snapshot = ensurePhoneStorage(settingsStorage);
  const recipeCountsByTool = Object.fromEntries(
    Object.entries(snapshot.recipesByTool).map(([toolId, recipeSummaries]) => [toolId, recipeSummaries.length])
  );

  expect(Object.values(recipeCountsByTool).every((recipeCount) => recipeCount > 2)).toBe(true);
  expect(recipeCountsByTool).toEqual({
    tool_aeropress: 4,
    tool_v60: 5,
    tool_kalita_wave: 3,
    tool_chemex: 4,
    tool_clever_dripper: 3,
    tool_french_press: 5
  });
});

test("ensurePhoneStorage migrates existing installs by adding only newly introduced seed recipes", () => {
  const settingsStorage = createMockSettingsStorage();
  const oldSeedTimestamp = 1_000;
  const versionOneSeeds = getSeedRecipeRecordsForVersion(1, oldSeedTimestamp);

  versionOneSeeds.forEach((recipeRecord) => {
    settingsStorage.setItem(getPhoneRecipeRecordKey(recipeRecord.recipeId), JSON.stringify(recipeRecord));
  });
  settingsStorage.setItem(
    "pof_recipe_index_v1",
    JSON.stringify(versionOneSeeds.map((recipeRecord) => createRecipeSummary(recipeRecord)))
  );
  settingsStorage.setItem("pof_history_index_v1", JSON.stringify([]));
  settingsStorage.setItem(
    "pof_sync_meta_v1",
    JSON.stringify({
      schemaVersion: 1,
      toolCatalogRevision: 4,
      recipeCatalogRevision: 7,
      historyRevision: 2,
      seedCatalogVersion: 1,
      seededAt: oldSeedTimestamp
    })
  );

  const snapshot = ensurePhoneStorage(settingsStorage);

  expect(snapshot.recipeIndex).toHaveLength(24);
  expect(snapshot.syncMeta.seedCatalogVersion).toBe(SEED_LIBRARY_VERSION);
  expect(snapshot.syncMeta.recipeCatalogRevision).toBe(8);
  expect(readRecipeRecord(settingsStorage, "seed_ap_daily_clean")?.createdAt).toBe(oldSeedTimestamp);
  expect(readRecipeRecord(settingsStorage, "seed_v60_high_sweet")?.createdAt).not.toBe(oldSeedTimestamp);
});

test("ensurePhoneStorage does not resurrect deleted older seed recipes during a newer seed migration", () => {
  const settingsStorage = createMockSettingsStorage();
  const oldSeedTimestamp = 2_000;
  const retainedVersionOneSeeds = getSeedRecipeRecordsForVersion(1, oldSeedTimestamp)
    .filter((recipeRecord) => recipeRecord.recipeId !== "seed_ap_daily_clean");

  retainedVersionOneSeeds.forEach((recipeRecord) => {
    settingsStorage.setItem(getPhoneRecipeRecordKey(recipeRecord.recipeId), JSON.stringify(recipeRecord));
  });
  settingsStorage.setItem(
    PHONE_STORAGE_KEYS.recipeIndex,
    JSON.stringify(retainedVersionOneSeeds.map((recipeRecord) => createRecipeSummary(recipeRecord)))
  );
  settingsStorage.setItem(PHONE_STORAGE_KEYS.historyIndex, JSON.stringify([]));
  settingsStorage.setItem(
    PHONE_STORAGE_KEYS.syncMeta,
    JSON.stringify({
      schemaVersion: 1,
      toolCatalogRevision: 2,
      recipeCatalogRevision: 5,
      historyRevision: 0,
      seedCatalogVersion: 1,
      seededAt: oldSeedTimestamp
    })
  );

  const snapshot = ensurePhoneStorage(settingsStorage);

  expect(snapshot.recipeIndex).toHaveLength(23);
  expect(readRecipeRecord(settingsStorage, "seed_ap_daily_clean")).toBeNull();
  expect(snapshot.recipeIndex.some((recipeSummary) => recipeSummary.recipeId === "seed_ap_daily_clean")).toBe(false);
  expect(readRecipeRecord(settingsStorage, "seed_v60_high_sweet")).toBeTruthy();
  expect(snapshot.syncMeta.seedCatalogVersion).toBe(SEED_LIBRARY_VERSION);
  expect(snapshot.syncMeta.recipeCatalogRevision).toBe(6);
});

test("saveRecipeRecord persists a user recipe into index plus record storage", () => {
  const settingsStorage = createMockSettingsStorage();
  ensurePhoneStorage(settingsStorage);

  const result = saveRecipeRecord(settingsStorage, createValidDraft());

  expect(result.ok).toBe(true);
  expect(result.issues).toHaveLength(0);
  expect(result.recipeRecord.source).toBe("user");
  expect(result.recipeRecord.recipeId.startsWith("recipe_")).toBe(true);

  const storedRecipe = readRecipeRecord(settingsStorage, result.recipeRecord.recipeId);
  const syncMeta = readPhoneSyncMeta(settingsStorage);

  expect(storedRecipe.name).toBe("Test Recipe");
  expect(syncMeta.recipeCatalogRevision).toBe(2);
});

test("duplicateRecipeRecord creates a separate user recipe and bumps the recipe revision", () => {
  const settingsStorage = createMockSettingsStorage();
  ensurePhoneStorage(settingsStorage);
  const originalRecipe = readRecipeRecord(settingsStorage, "seed_ap_daily_clean");

  const duplicateResult = duplicateRecipeRecord(settingsStorage, originalRecipe.recipeId);

  expect(duplicateResult.ok).toBe(true);
  expect(duplicateResult.issues).toHaveLength(0);
  expect(duplicateResult.recipeRecord.recipeId).not.toBe(originalRecipe.recipeId);
  expect(duplicateResult.recipeRecord.name).toBe(`${originalRecipe.name} Copy`);
  expect(duplicateResult.recipeRecord.source).toBe("user");
  expect(duplicateResult.recipeRecord.steps).toHaveLength(originalRecipe.steps.length);
  expect(readRecipeRecord(settingsStorage, duplicateResult.recipeRecord.recipeId)).toMatchObject({
    name: `${originalRecipe.name} Copy`,
    source: "user"
  });
  expect(readPhoneSyncMeta(settingsStorage).recipeCatalogRevision).toBe(2);
  expect(duplicateRecipeRecord(settingsStorage, "missing_recipe")).toEqual({
    ok: false,
    issues: ["Recipe record not found."]
  });
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
  expect(saveHistoryResult.ok).toBe(true);

  const deleted = deleteRecipeRecord(settingsStorage, recipeRecord.recipeId);

  expect(deleted).toBe(true);
  expect(readRecipeRecord(settingsStorage, recipeRecord.recipeId)).toBeNull();
  expect(readHistoryIndex(settingsStorage)).toHaveLength(1);
  expect(readHistoryEntry(settingsStorage, historyEntry.historyId).recipeSnapshot.name).toBe(recipeRecord.name);
});

test("updateHistoryEntryFeedback persists notes and rating without losing the recipe snapshot", () => {
  const settingsStorage = createMockSettingsStorage();
  ensurePhoneStorage(settingsStorage);

  const recipeRecord = readRecipeRecord(settingsStorage, "seed_ap_daily_clean");
  const historyEntry = {
    schemaVersion: 1,
    historyId: "hist_feedback_1711111111111_ab12",
    sessionId: "sess_feedback_1711111111111_ab12",
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

  expect(saveHistoryEntry(settingsStorage, historyEntry).ok).toBe(true);

  const updateResult = updateHistoryEntryFeedback(settingsStorage, historyEntry.historyId, {
    userNote: "Sweet and balanced",
    userRating: "4"
  });

  expect(updateResult.ok).toBe(true);
  expect(readHistoryEntry(settingsStorage, historyEntry.historyId)).toMatchObject({
    historyId: historyEntry.historyId,
    userNote: "Sweet and balanced",
    userRating: 4
  });
  expect(readHistoryEntry(settingsStorage, historyEntry.historyId).recipeSnapshot.name).toBe(recipeRecord.name);
  expect(readPhoneSyncMeta(settingsStorage).historyRevision).toBe(2);
});

test("safeParseJson logs invalid JSON once but stays quiet for empty values", () => {
  const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

  try {
    expect(safeParseJson("{broken", ["fallback"])).toEqual(["fallback"]);
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    consoleSpy.mockClear();
    expect(safeParseJson("", ["fallback"])).toEqual(["fallback"]);
    expect(consoleSpy).not.toHaveBeenCalled();
  } finally {
    consoleSpy.mockRestore();
  }
});

test("deleteRecipeRecord and updateHistoryEntryFeedback fail cleanly for missing records", () => {
  const settingsStorage = createMockSettingsStorage();
  ensurePhoneStorage(settingsStorage);

  expect(deleteRecipeRecord(settingsStorage, "missing_recipe")).toBe(false);
  expect(updateHistoryEntryFeedback(settingsStorage, "missing_history", { userNote: "Nope" })).toEqual({
    ok: false,
    issues: ["History entry not found."]
  });
});

test("saveRecipeRecord rejects unsupported tools and updateHistoryEntryFeedback normalizes blank ratings", () => {
  const settingsStorage = createMockSettingsStorage();
  ensurePhoneStorage(settingsStorage);

  const invalidSave = saveRecipeRecord(settingsStorage, createValidDraft("tool_unknown"));
  expect(invalidSave.ok).toBe(false);
  expect(invalidSave.issues).toContain("Recipe toolId must point at the supported tool catalog.");

  const recipeRecord = readRecipeRecord(settingsStorage, "seed_ap_daily_clean");
  const historyEntry = {
    schemaVersion: 1,
    historyId: "hist_blank_rating_1711111111111_ab12",
    sessionId: "sess_blank_rating_1711111111111_ab12",
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

  expect(saveHistoryEntry(settingsStorage, historyEntry).ok).toBe(true);
  expect(
    updateHistoryEntryFeedback(settingsStorage, historyEntry.historyId, {
      userNote: "Rounded cup",
      userRating: ""
    }).ok
  ).toBe(true);
  expect(readHistoryEntry(settingsStorage, historyEntry.historyId)).toMatchObject({
    userNote: "Rounded cup"
  });
  expect(readHistoryEntry(settingsStorage, historyEntry.historyId)).not.toHaveProperty("userRating");
});
