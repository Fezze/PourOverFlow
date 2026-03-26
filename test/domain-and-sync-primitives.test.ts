import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getSupportedTools,
  getToolById,
  TOOL_CATALOG
} from "../zepp-app/shared/constants/tool-catalog.js";
import {
  cloneRecipeRecord,
  cloneRecipeSteps,
  compareHistoryIndexEntries,
  compareRecipeSummaries,
  createDefaultRecipeSteps,
  createEmptyRecipeRecord,
  createGeneratedId,
  createHistoryIndexEntry,
  createLastResultSummary,
  createRecipeSnapshot,
  createRecipeSummary,
  DEFAULT_RECIPE_COLOR_TOKEN,
  FEEDBACK_CUES,
  normalizeBoolean,
  normalizeRecipeSteps,
  normalizeText,
  RECIPE_COLOR_TOKENS,
  RECIPE_SOURCES,
  RECIPE_STEP_KINDS,
  SESSION_STATUSES,
  sumRecipeStepDurations,
  toNumberOrFallback,
  toOptionalNumber
} from "../zepp-app/shared/domain/schema.js";
import {
  getSeedRecipeRecordById,
  getSeedRecipeRecords
} from "../zepp-app/shared/domain/seed-library.js";
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
} from "../zepp-app/shared/domain/validators.js";
import {
  createSyncEnvelope,
  isSyncMessageType,
  validateSyncEnvelope
} from "../zepp-app/shared/sync/contracts.js";
import { fromSyncEnvelopeJson } from "../zepp-app/shared/sync/decode.js";
import { toSyncEnvelopeJson } from "../zepp-app/shared/sync/encode.js";
import {
  APP_BRIDGE_CONFIG,
  APP_BRIDGE_MESSAGE_TYPES,
  buildAppBridgeDataFrame,
  buildAppBridgeShakeFrame,
  extractAppBridgePayload,
  parseAppBridgeFrame,
  readCurrentAppSidePort
} from "../zepp-app/shared/sync/bridge-frame.js";
import {
  BRIDGE_TRANSPORT_STATUS,
  buildChunkedBridgeTransportPayloads,
  createBridgeTransportState,
  readBridgeTransportPayload
} from "../zepp-app/shared/sync/bridge-transport.js";
import {
  decodeEnvelopeFromBlePayload,
  encodeEnvelopeForBle
} from "../zepp-app/shared/sync/device-codec.js";
import {
  decodeEnvelopeFromPeerSocket,
  encodeEnvelopeForPeerSocket
} from "../zepp-app/shared/sync/side-codec.js";
import { SYNC_MESSAGE_TYPES } from "../zepp-app/shared/sync/message-types.js";
import {
  PHONE_SYNC_SLICES,
  getBootstrapResponseSlices,
  getOrderedPhoneSyncSlices,
  getStorageChangeSlices
} from "../zepp-app/shared/sync/phone-sync-plan.js";
import {
  PHONE_STORAGE_KEYS,
  getPhoneHistoryRecordKey,
  getPhoneRecipeRecordKey
} from "../zepp-app/shared/storage/keys.js";

function createValidHistoryEntry() {
  const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1_111);
  const recipeSnapshot = createRecipeSnapshot(recipeRecord);

  return {
    schemaVersion: 1,
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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("domain catalog and schema helpers", () => {
  it("keeps tool helpers stable and sorted", () => {
    const supportedTools = getSupportedTools();

    expect(supportedTools.map((tool) => tool.toolId)).toEqual(
      [...TOOL_CATALOG].sort((left, right) => left.sortOrder - right.sortOrder).map((tool) => tool.toolId)
    );
    expect(getToolById("tool_v60")?.label).toBe("Hario V60");
    expect(getToolById("missing_tool")).toBeNull();
    expect(supportedTools).not.toBe(TOOL_CATALOG);

    supportedTools.pop();
    expect(getSupportedTools()).toHaveLength(TOOL_CATALOG.length);
  });

  it("normalizes primitive recipe helpers and generated ids", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.123456);

    expect(createGeneratedId("recipe", 1234)).toBe("recipe_1234_4fzy");
    expect(toOptionalNumber(null)).toBeUndefined();
    expect(toOptionalNumber("")).toBeUndefined();
    expect(toOptionalNumber("12.5")).toBe(12.5);
    expect(toOptionalNumber("abc")).toBeUndefined();
    expect(toNumberOrFallback(undefined, 9)).toBe(9);
    expect(toNumberOrFallback("7", 9)).toBe(7);
    expect(normalizeText("  hello  ")).toBe("hello");
    expect(normalizeText("   ", "fallback")).toBe("fallback");
    expect(normalizeBoolean(true)).toBe(true);
    expect(normalizeBoolean("true")).toBe(true);
    expect(normalizeBoolean("false")).toBe(false);
  });

  it("normalizes steps, clones recipe structures, and creates default recipe records", () => {
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

    expect(normalizedSteps).toMatchObject([
      {
        order: 0,
        kind: "instruction",
        title: "Step",
        body: "Complete the step and continue.",
        durationMs: 1500,
        waterMl: 20,
        targetTotalWaterMl: 50,
        requiresConfirm: true,
        feedbackCue: "none"
      },
      {
        stepId: "step_finish",
        order: 1,
        kind: "finish",
        title: "Done",
        body: "Finish the brew.",
        requiresConfirm: false,
        feedbackCue: "combo_short"
      }
    ]);
    expect(normalizedSteps[1]).not.toHaveProperty("durationMs");
    expect(sumRecipeStepDurations(normalizedSteps)).toBe(1500);

    const defaultRecipe = createEmptyRecipeRecord({
      toolId: "tool_v60",
      now: 5_000
    });
    const recipeClone = cloneRecipeRecord(defaultRecipe);
    const stepClone = cloneRecipeSteps(defaultRecipe.steps);

    expect(defaultRecipe.colorToken).toBe(DEFAULT_RECIPE_COLOR_TOKEN);
    expect(defaultRecipe.createdAt).toBe(5_000);
    expect(defaultRecipe.steps).toHaveLength(2);
    expect(defaultRecipe.steps[0].stepId).not.toBe("");
    expect(recipeClone).not.toBe(defaultRecipe);
    expect(recipeClone.steps).not.toBe(defaultRecipe.steps);
    expect(stepClone).not.toBe(defaultRecipe.steps);
  });

  it("builds summaries, snapshots, and stable sort orders", () => {
    const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 7_000);
    const recipeSummary = createRecipeSummary(recipeRecord);
    const recipeSnapshot = createRecipeSnapshot(recipeRecord);
    const historyEntry = createValidHistoryEntry();
    const historyIndexEntry = createHistoryIndexEntry(historyEntry);

    expect(recipeSummary).toMatchObject({
      recipeId: recipeRecord.recipeId,
      toolId: recipeRecord.toolId,
      name: recipeRecord.name
    });
    expect(recipeSnapshot).toMatchObject({
      recipeId: recipeRecord.recipeId,
      recipeUpdatedAt: recipeRecord.updatedAt
    });
    expect(recipeSnapshot.steps).not.toBe(recipeRecord.steps);
    expect(historyIndexEntry).toMatchObject({
      historyId: historyEntry.historyId,
      recipeName: historyEntry.recipeSnapshot.name
    });
    expect(createLastResultSummary({ ...historyEntry, deviationSummary: undefined }).totalDeltaMs).toBe(0);

    const laterRecipe = { ...recipeSummary, recipeId: "b", name: "B", updatedAt: 200 };
    const earlierRecipe = { ...recipeSummary, recipeId: "a", name: "A", updatedAt: 100 };
    const sameTimeRecipe = { ...recipeSummary, recipeId: "c", name: "C", updatedAt: 200 };
    expect([earlierRecipe, sameTimeRecipe, laterRecipe].sort(compareRecipeSummaries).map((item) => item.name)).toEqual([
      "B",
      "C",
      "A"
    ]);

    const laterHistory = { ...historyIndexEntry, historyId: "hist_b", recipeName: "B", endedAt: 200, updatedAt: 200 };
    const earlierHistory = { ...historyIndexEntry, historyId: "hist_a", recipeName: "A", endedAt: 100, updatedAt: 100 };
    const sameEndHistory = { ...historyIndexEntry, historyId: "hist_c", recipeName: "C", endedAt: 200, updatedAt: 300 };
    expect([earlierHistory, sameEndHistory, laterHistory].sort(compareHistoryIndexEntries).map((item) => item.historyId)).toEqual([
      "hist_c",
      "hist_b",
      "hist_a"
    ]);
  });

  it("keeps the seed library cloned and stable by id", () => {
    const seedRecipes = getSeedRecipeRecords(9_000);
    const v60Recipe = getSeedRecipeRecordById("seed_v60_bloom_classic", 9_000);

    expect(seedRecipes).toHaveLength(12);
    expect(v60Recipe?.createdAt).toBe(9_000);
    expect(getSeedRecipeRecordById("missing_seed", 9_000)).toBeNull();

    v60Recipe.name = "Mutated";
    expect(getSeedRecipeRecordById("seed_v60_bloom_classic", 9_000)?.name).toBe("V60 Bloom Classic");
  });
});

describe("validator coverage", () => {
  it("covers supported enum and catalog guards", () => {
    expect(isSupportedToolId("tool_v60")).toBe(true);
    expect(isSupportedToolId("tool_missing")).toBe(false);
    expect(isRecipeStepKind(RECIPE_STEP_KINDS[0])).toBe(true);
    expect(isRecipeStepKind("missing")).toBe(false);
    expect(isFeedbackCue(FEEDBACK_CUES[0])).toBe(true);
    expect(isFeedbackCue("missing")).toBe(false);
    expect(isColorToken(RECIPE_COLOR_TOKENS[0])).toBe(true);
    expect(isColorToken("missing")).toBe(false);
    expect(isRecipeSource(RECIPE_SOURCES[0])).toBe(true);
    expect(isRecipeSource("missing")).toBe(false);
    expect(isHistoryStatus(SESSION_STATUSES[2])).toBe(true);
    expect(isHistoryStatus("running")).toBe(false);
  });

  it("validates recipe summaries, steps, snapshots, and history shapes", () => {
    const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 3_000);
    const recipeSummary = createRecipeSummary(recipeRecord);
    const recipeSnapshot = createRecipeSnapshot(recipeRecord);
    const historyEntry = createValidHistoryEntry();

    expect(validateRecipeSummary(recipeSummary)).toEqual([]);
    expect(validateRecipeSummary(null)).toContain("Recipe summary must be an object.");
    expect(
      validateRecipeSummary({
        ...recipeSummary,
        recipeId: "",
        toolId: "tool_missing",
        name: "",
        colorToken: "bad",
        source: "bad",
        archived: "false",
        updatedAt: Number.NaN
      })
    ).toEqual(
      expect.arrayContaining([
        "Recipe summary must have a recipeId.",
        "Recipe summary toolId must point at the supported tool catalog.",
        "Recipe summary name cannot be empty.",
        "Recipe summary color token must come from the locked palette.",
        "Recipe summary source must be seed or user.",
        "Recipe summary archived must be a boolean.",
        "Recipe summary updatedAt must be a number."
      ])
    );

    expect(validateRecipeStep(null, 0, 0, 1)).toContain("Step 0 must be an object.");
    expect(
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
      )
    ).toEqual(
      expect.arrayContaining([
        "Step 0 must have a stepId.",
        "Step 0 has an unsupported kind.",
        "Step 0 must have sequential order 0.",
        "Step 0 must have a title.",
        "Step 0 must have body text.",
        "Step 0 has an unsupported feedback cue.",
        "Step 0 requiresConfirm must be boolean.",
        "Step 0 durationMs must be a non-negative number when present.",
        "Step 0 waterMl must be a non-negative number when present.",
        "Step 0 targetTotalWaterMl must be a non-negative number when present.",
        "Recipe must end with a finish step."
      ])
    );

    expect(
      validateRecipeStep(
        {
          ...recipeRecord.steps.at(-1),
          durationMs: 10
        },
        recipeRecord.steps.length - 1,
        recipeRecord.steps.length - 1,
        recipeRecord.steps.length
      )
    ).toContain(`Step ${recipeRecord.steps.length - 1} finish step cannot define durationMs.`);

    expect(
      validateRecipeStep(
        {
          ...recipeRecord.steps[0],
          kind: "confirm",
          requiresConfirm: false
        },
        0,
        0,
        recipeRecord.steps.length
      )
    ).toContain("Step 0 of kind confirm must require confirmation.");

    expect(validateRecipeRecord(recipeRecord)).toEqual([]);
    expect(validateRecipeSnapshot(recipeSnapshot)).toEqual([]);
    expect(validateRecipeSnapshot(null)).toContain("Recipe snapshot must be an object.");
    expect(
      validateHistoryIndexEntry({
        historyId: "",
        toolId: "missing",
        recipeName: "",
        status: "missing",
        endedAt: Number.NaN,
        elapsedMs: Number.NaN,
        updatedAt: Number.NaN
      })
    ).toEqual(
      expect.arrayContaining([
        "History index entry must have a historyId.",
        "History index toolId must belong to the supported catalog.",
        "History index entry must have a recipe name.",
        "History index entry must have a valid status.",
        "History index endedAt must be a number.",
        "History index elapsedMs must be a number.",
        "History index updatedAt must be a number."
      ])
    );

    expect(validateHistoryEntry(historyEntry)).toEqual([]);
    expect(validateHistoryEntry(null)).toContain("History entry must be an object.");
    expect(
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
      })
    ).toEqual(
      expect.arrayContaining([
        "History entry must carry schemaVersion 1.",
        "History entry must have a historyId.",
        "History entry must have a sessionId.",
        "History entry toolId must belong to the supported catalog.",
        "History entry must have a valid status.",
        "History entry must carry a recipe snapshot.",
        "History entry startedAt must be a number.",
        "History entry endedAt must be a number.",
        "History entry elapsedMs must be a number.",
        "History entry createdAt must be a number.",
        "History entry updatedAt must be a number.",
        "History entry must include a valid deviationSummary."
      ])
    );
  });
});

describe("sync primitives", () => {
  it("covers envelope creation, validation, and JSON encoding rules", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.4321);
    const envelope = createSyncEnvelope(SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP, { ok: true }, { sentAt: 1234 });

    expect(isSyncMessageType(SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP)).toBe(true);
    expect(isSyncMessageType("bad_type")).toBe(false);
    expect(envelope.requestId).toMatch(/^req_1234_[a-z0-9]+$/);
    expect(validateSyncEnvelope(envelope)).toEqual([]);
    expect(validateSyncEnvelope(null)).toContain("Sync envelope must be an object.");
    expect(
      validateSyncEnvelope({
        schemaVersion: 0,
        messageType: "bad_type",
        requestId: "",
        sentAt: Number.NaN
      })
    ).toEqual(
      expect.arrayContaining([
        "Sync envelope must carry schemaVersion 1.",
        "Sync envelope must use a supported messageType.",
        "Sync envelope must have a requestId.",
        "Sync envelope sentAt must be a number.",
        "Sync envelope must carry a payload."
      ])
    );

    expect(toSyncEnvelopeJson(envelope)).toContain(SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP);
    expect(() => toSyncEnvelopeJson({ messageType: "bad" })).toThrow("Invalid sync envelope:");
  });

  it("covers JSON decode fallbacks", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      expect(fromSyncEnvelopeJson("")).toBeNull();
      expect(fromSyncEnvelopeJson("{broken")).toBeNull();
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("covers peer socket codec Buffer and browser-style fallbacks", () => {
    const envelope = createSyncEnvelope(SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP, {
      knownToolCatalogRevision: 1,
      knownRecipeCatalogRevision: 2,
      knownHistoryRevision: 3
    }, {
      requestId: "req_peer_codec",
      sentAt: 11
    });

    expect(decodeEnvelopeFromPeerSocket(encodeEnvelopeForPeerSocket(envelope))).toMatchObject({
      requestId: "req_peer_codec"
    });

    const originalBuffer = globalThis.Buffer;
    vi.stubGlobal("Buffer", undefined);
    try {
      const browserEncoded = encodeEnvelopeForPeerSocket(envelope);
      expect(browserEncoded instanceof ArrayBuffer).toBe(true);
      expect(
        decodeEnvelopeFromPeerSocket(
          buildAppBridgeDataFrame(new Uint8Array(browserEncoded), { port2: 99 })
        )
      ).toMatchObject({
        requestId: "req_peer_codec"
      });
    } finally {
      vi.stubGlobal("Buffer", originalBuffer);
    }

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      expect(decodeEnvelopeFromPeerSocket({ nope: true })).toBeNull();
      expect(decodeEnvelopeFromPeerSocket(new Uint8Array([1, 2, 3]))).toBeNull();
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("covers BLE codec raw, framed, and no-TextEncoder fallback paths", () => {
    const envelope = createSyncEnvelope(SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP, {
      knownToolCatalogRevision: 4,
      knownRecipeCatalogRevision: 5,
      knownHistoryRevision: 6
    }, {
      requestId: "req_ble_codec",
      sentAt: 22
    });

    const rawEncoded = encodeEnvelopeForBle(envelope);
    expect(decodeEnvelopeFromBlePayload(rawEncoded.buffer, rawEncoded.size)).toMatchObject({
      requestId: "req_ble_codec"
    });
    expect(
      decodeEnvelopeFromBlePayload(
        buildAppBridgeDataFrame(rawEncoded.buffer, { port2: 7 }).buffer,
        buildAppBridgeDataFrame(rawEncoded.buffer, { port2: 7 }).size
      )
    ).toMatchObject({
      requestId: "req_ble_codec"
    });

    const originalTextEncoder = globalThis.TextEncoder;
    const originalTextDecoder = globalThis.TextDecoder;
    vi.stubGlobal("TextEncoder", undefined);
    vi.stubGlobal("TextDecoder", undefined);

    try {
      const fallbackEncoded = encodeEnvelopeForBle(envelope);
      expect(decodeEnvelopeFromBlePayload(fallbackEncoded.buffer, fallbackEncoded.size)).toMatchObject({
        requestId: "req_ble_codec"
      });
    } finally {
      vi.stubGlobal("TextEncoder", originalTextEncoder);
      vi.stubGlobal("TextDecoder", originalTextDecoder);
    }

    expect(decodeEnvelopeFromBlePayload(null, 0)).toBeNull();
  });

  it("covers app-bridge frame helpers and app-side port lookup", () => {
    const rawPayload = new Uint8Array([1, 2, 3, 4]).buffer;
    const frame = buildAppBridgeDataFrame(rawPayload, {
      appId: 30000,
      port1: 55,
      port2: 66,
      extra: 77
    });
    const parsedFrame = parseAppBridgeFrame(frame.buffer, frame.size);

    expect(parsedFrame).toMatchObject({
      type: APP_BRIDGE_MESSAGE_TYPES.DATA,
      appId: 30000,
      port1: 55,
      port2: 66,
      extra: 77
    });
    expect(new Uint8Array(parsedFrame.payload)).toEqual(new Uint8Array(rawPayload));

    const shakeFrame = buildAppBridgeShakeFrame({ appId: APP_BRIDGE_CONFIG.appId, port2: 88 });
    expect(parseAppBridgeFrame(shakeFrame.buffer, shakeFrame.size)?.type).toBe(APP_BRIDGE_MESSAGE_TYPES.SHAKE);
    expect(extractAppBridgePayload({ data: shakeFrame.buffer }, shakeFrame.size)?.byteLength).toBeGreaterThan(0);
    expect(extractAppBridgePayload(new Uint8Array(rawPayload))?.byteLength).toBe(4);
    expect(extractAppBridgePayload({ buffer: rawPayload, byteOffset: 1, byteLength: 2 })?.byteLength).toBe(2);
    expect(parseAppBridgeFrame(new ArrayBuffer(2))).toBeNull();

    const invalidFlagFrame = frame.buffer.slice(0);
    new DataView(invalidFlagFrame).setUint8(0, 0);
    expect(parseAppBridgeFrame(invalidFlagFrame)).toBeNull();

    vi.stubGlobal("getApp", () => ({ port2: 123 }));
    expect(readCurrentAppSidePort()).toBe(123);
    vi.stubGlobal("getApp", () => {
      throw new Error("getApp failed");
    });
    expect(readCurrentAppSidePort()).toBe(0);
  });

  it("covers chunk transport complete, invalid, and metadata-mismatch paths", () => {
    const rawPayload = new TextEncoder().encode("transport-payload").buffer;
    const chunkFrames = buildChunkedBridgeTransportPayloads(rawPayload, {
      maxChunkPayloadSize: 4,
      transferId: 9
    });

    expect(buildChunkedBridgeTransportPayloads(null)).toEqual([]);

    const rawState = createBridgeTransportState();
    expect(readBridgeTransportPayload(rawState, null).status).toBe(BRIDGE_TRANSPORT_STATUS.INVALID);
    expect(readBridgeTransportPayload(rawState, rawPayload)).toMatchObject({
      status: BRIDGE_TRANSPORT_STATUS.COMPLETE,
      chunked: false
    });

    const state = createBridgeTransportState();
    const firstChunk = readBridgeTransportPayload(state, chunkFrames[0]);
    expect(firstChunk.status).toBe(BRIDGE_TRANSPORT_STATUS.PENDING);

    const mismatchedChunk = chunkFrames[1].slice(0);
    new DataView(mismatchedChunk).setUint32(16, 999, true);
    expect(readBridgeTransportPayload(state, mismatchedChunk).status).toBe(BRIDGE_TRANSPORT_STATUS.INVALID);

    const invalidVersionChunk = chunkFrames[0].slice(0);
    new DataView(invalidVersionChunk).setUint8(4, 99);
    expect(readBridgeTransportPayload(createBridgeTransportState(), invalidVersionChunk).status).toBe(
      BRIDGE_TRANSPORT_STATUS.INVALID
    );

    const badLengthChunk = chunkFrames[0].slice(0);
    new DataView(badLengthChunk).setUint16(20, 999, true);
    expect(readBridgeTransportPayload(createBridgeTransportState(), badLengthChunk).status).toBe(
      BRIDGE_TRANSPORT_STATUS.INVALID
    );

    const staleState = createBridgeTransportState();
    staleState.assemblies.set(77, {
      startedAt: 0,
      totalBytes: 2,
      chunkCount: 1,
      receivedCount: 0,
      chunks: new Array(1)
    });
    vi.spyOn(Date, "now").mockReturnValue(120_000);
    readBridgeTransportPayload(staleState, chunkFrames[0]);
    expect(staleState.assemblies.has(77)).toBe(false);
  });

  it("covers phone sync slice planning and storage key routing", () => {
    expect(getOrderedPhoneSyncSlices(new Set([PHONE_SYNC_SLICES.HISTORY, PHONE_SYNC_SLICES.TOOLS]))).toEqual([
      PHONE_SYNC_SLICES.TOOLS,
      PHONE_SYNC_SLICES.HISTORY
    ]);
    expect(getOrderedPhoneSyncSlices(null)).toEqual([]);
    expect(getStorageChangeSlices("unknown")).toEqual([]);
    expect(getStorageChangeSlices(PHONE_STORAGE_KEYS.tools)).toEqual([PHONE_SYNC_SLICES.TOOLS]);
    expect(getStorageChangeSlices(PHONE_STORAGE_KEYS.recipeIndex)).toEqual([PHONE_SYNC_SLICES.CATALOG]);
    expect(getStorageChangeSlices(getPhoneRecipeRecordKey("id"))).toEqual([PHONE_SYNC_SLICES.CATALOG]);
    expect(getStorageChangeSlices(PHONE_STORAGE_KEYS.historyIndex)).toEqual([PHONE_SYNC_SLICES.HISTORY]);
    expect(getStorageChangeSlices(getPhoneHistoryRecordKey("id"))).toEqual([PHONE_SYNC_SLICES.HISTORY]);
    expect(getStorageChangeSlices(PHONE_STORAGE_KEYS.syncMeta)).toEqual([]);

    expect(getBootstrapResponseSlices(null, null)).toEqual([
      PHONE_SYNC_SLICES.TOOLS,
      PHONE_SYNC_SLICES.CATALOG,
      PHONE_SYNC_SLICES.HISTORY
    ]);
    expect(
      getBootstrapResponseSlices(
        {
          knownToolCatalogRevision: 1,
          knownRecipeCatalogRevision: 2,
          knownHistoryRevision: 3
        },
        {
          toolCatalogRevision: 1,
          recipeCatalogRevision: 2,
          historyRevision: 3
        }
      )
    ).toEqual([]);
  });
});
