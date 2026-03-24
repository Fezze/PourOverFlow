import { beforeEach, describe, expect, it, vi } from "vitest";

import { __zeusRuntime, deliverBleMessage, resetZeppRuntime, setBleConnected, setLocalStorageState } from "../zeus-runtime/runtime.ts";
import { getSupportedTools } from "../../shared/constants/tool-catalog.js";
import {
  CURRENT_SCHEMA_VERSION,
  createRecipeSnapshot,
  createRecipeSummary,
  normalizeRecipeSteps
} from "../../shared/domain/schema.js";
import {
  APP_BRIDGE_MESSAGE_TYPES,
  buildAppBridgeDataFrame,
  buildAppBridgeShakeFrame,
  parseAppBridgeFrame
} from "../../shared/sync/bridge-frame.js";
import {
  buildChunkedBridgeTransportPayloads,
  createBridgeTransportState,
  readBridgeTransportPayload
} from "../../shared/sync/bridge-transport.js";
import { createSyncEnvelope } from "../../shared/sync/contracts.js";
import { decodeEnvelopeFromBlePayload, encodeEnvelopeForBle } from "../../shared/sync/device-codec.js";
import { SYNC_MESSAGE_TYPES } from "../../shared/sync/message-types.js";
import { WATCH_STORAGE_KEYS } from "../../shared/storage/keys.js";
import { createActiveBrewSession } from "../../shared/engine/recipe-engine.js";
import * as sessionReducer from "../../shared/engine/session-reducer.js";
import {
  getPendingHistoryQueue,
  getRecipesForTool,
  isCatalogReady,
  readActiveSession,
  readLastResult,
  readSelectedRecipeId,
  readSelectedToolId,
  readWatchSyncMeta,
  writeSelectedRecipeId,
  writeActiveSession
} from "../../shared/storage/watch-store.js";
import {
  abortActiveBrew,
  discardActiveSessionFromHome,
  getSelectedRecipe,
  PAGE_URLS,
  advanceOrCompleteActiveSession,
  goHome,
  goToRecipeList,
  goToResultSummary,
  goToToolList,
  getHomeScaffoldState,
  getRecipeListForSelectedTool,
  getToolList,
  refreshPhoneSnapshot,
  resumeActiveSession,
  retryPendingHistorySync,
  selectRecipe,
  selectTool,
  startSelectedRecipe,
  startRecipe,
  tickActiveSession
} from "../../shared/watch/router.js";
import {
  destroyWatchSyncBridge,
  flushPendingHistoryQueue,
  initWatchSyncBridge,
  primeWatchSyncBridge,
  queueHistoryEntryForSync
} from "../../shared/watch/sync-bridge.js";

function buildFlowFixture() {
  const recipeRecord = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    recipeId: "runtime_flow_recipe",
    toolId: "tool_aeropress",
    name: "Runtime Flow Test",
    colorToken: "amber",
    description: "Short flow used by mocked runtime tests.",
    coffeeDoseG: 15,
    totalWaterMl: 220,
    waterTempC: 93,
    filterLabel: "Paper",
    grindLabel: "Medium-fine",
    estimatedTotalDurationMs: 12_000,
    notes: "Mocked runtime fixture.",
    steps: normalizeRecipeSteps([
      {
        kind: "instruction",
        title: "Prep",
        body: "Prepare the brewer.",
        requiresConfirm: true,
        feedbackCue: "none"
      },
      {
        kind: "timed_action",
        title: "Pour",
        body: "Pour water.",
        durationMs: 4_000,
        waterMl: 220,
        targetTotalWaterMl: 220,
        requiresConfirm: false,
        feedbackCue: "vibrate_short"
      },
      {
        kind: "finish",
        title: "Done",
        body: "Finish the brew.",
        requiresConfirm: false,
        feedbackCue: "combo_short"
      }
    ]),
    createdAt: 1_000,
    updatedAt: 1_000,
    source: "user",
    archived: false
  };

  const tools = getSupportedTools();
  const recipesByTool = Object.fromEntries(tools.map((tool) => [tool.toolId, []]));
  const recipeSummary = createRecipeSummary(recipeRecord);
  const recipeSnapshot = createRecipeSnapshot(recipeRecord);
  recipesByTool[recipeRecord.toolId] = [recipeSummary];

  return {
    recipeRecord,
    recipeSummary,
    recipeSnapshot,
    catalogCache: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      toolCatalogRevision: 3,
      recipeCatalogRevision: 5,
      tools,
      recipesByTool,
      recipeSnapshotsById: {
        [recipeSnapshot.recipeId]: recipeSnapshot
      },
      cachedAt: 2_000
    }
  };
}

function seedCachedCatalog(options = {}) {
  const fixture = buildFlowFixture();

  setLocalStorageState({
    [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache),
    ...(options.syncMeta
      ? {
          [WATCH_STORAGE_KEYS.syncMeta]: JSON.stringify(options.syncMeta)
        }
      : {})
  });
  __zeusRuntime.appState.globalData = {};

  return fixture;
}

function seedRichBrowseCatalog() {
  const fixture = buildFlowFixture();
  const secondRecipeRecord = {
    ...fixture.recipeRecord,
    recipeId: "runtime_flow_recipe_2",
    name: "Runtime Flow Second",
    updatedAt: 1_100
  };
  const thirdRecipeRecord = {
    ...fixture.recipeRecord,
    recipeId: "runtime_flow_recipe_3",
    name: "Runtime Flow Third",
    updatedAt: 1_200
  };
  const secondRecipeSummary = createRecipeSummary(secondRecipeRecord);
  const thirdRecipeSummary = createRecipeSummary(thirdRecipeRecord);
  const secondRecipeSnapshot = createRecipeSnapshot(secondRecipeRecord);
  const thirdRecipeSnapshot = createRecipeSnapshot(thirdRecipeRecord);

  setLocalStorageState({
    [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify({
      ...fixture.catalogCache,
      recipesByTool: {
        ...fixture.catalogCache.recipesByTool,
        [fixture.recipeRecord.toolId]: [
          fixture.recipeSummary,
          secondRecipeSummary,
          thirdRecipeSummary
        ]
      },
      recipeSnapshotsById: {
        ...fixture.catalogCache.recipeSnapshotsById,
        [secondRecipeSnapshot.recipeId]: secondRecipeSnapshot,
        [thirdRecipeSnapshot.recipeId]: thirdRecipeSnapshot
      }
    })
  });
  __zeusRuntime.appState.globalData = {};

  return {
    ...fixture,
    secondRecipeSummary,
    thirdRecipeSummary
  };
}

function connectWatchBridge() {
  initWatchSyncBridge();
  setBleConnected(true);

  const shakeFrame = buildAppBridgeShakeFrame({
    port2: 321
  });
  deliverBleMessage(shakeFrame.buffer, shakeFrame.size);
}

function deliverSyncEnvelope(messageType, payload) {
  const envelope = createSyncEnvelope(messageType, payload, {
    requestId: `req_${messageType}`,
    sentAt: 4_000
  });
  const { buffer } = encodeEnvelopeForBle(envelope);
  const chunks = buildChunkedBridgeTransportPayloads(buffer);

  chunks.forEach((chunk) => {
    const frame = buildAppBridgeDataFrame(chunk, {
      port2: 321
    });
    deliverBleMessage(frame.buffer, frame.size);
  });
}

function clearSentBridgeFrames() {
  __zeusRuntime.ble.send.mockClear();
  __zeusRuntime.bleState.sentPayloads.length = 0;
}

function readSentSyncEnvelopes() {
  const transportState = createBridgeTransportState();
  const envelopes = [];

  __zeusRuntime.bleState.sentPayloads.forEach(({ data, size }) => {
    const bridgeFrame = parseAppBridgeFrame(data, size);

    if (!bridgeFrame || bridgeFrame.type !== APP_BRIDGE_MESSAGE_TYPES.DATA) {
      return;
    }

    const transportResult = readBridgeTransportPayload(
      transportState,
      bridgeFrame.payload,
      bridgeFrame.payload.byteLength
    );

    if (transportResult.status !== "complete") {
      return;
    }

    const envelope = decodeEnvelopeFromBlePayload(
      transportResult.payload,
      transportResult.payload.byteLength
    );

    if (envelope) {
      envelopes.push(envelope);
    }
  });

  return envelopes;
}

beforeEach(() => {
  destroyWatchSyncBridge();
  resetZeppRuntime();
});

describe("mocked Zepp runtime watch flow", () => {
  it("uses cached catalog data and stays responsive while offline", () => {
    const fixture = seedCachedCatalog();

    const toolList = getToolList();

    expect(toolList.find((tool) => tool.toolId === fixture.recipeRecord.toolId)?.recipeCount).toBe(1);
    expect(getHomeScaffoldState()).toMatchObject({
      connected: false,
      catalogReady: true,
      pendingHistoryCount: 0
    });
    expect(refreshPhoneSnapshot()).toBe(false);
    expect(__zeusRuntime.ble.send).not.toHaveBeenCalled();

    selectTool(fixture.recipeRecord.toolId);

    expect(__zeusRuntime.router.push).toHaveBeenCalledWith({
      url: PAGE_URLS.recipeList
    });
    expect(getRecipeListForSelectedTool()).toHaveLength(1);
  });

  it("runs a full brew flow from cached snapshots and queues the result locally when offline", () => {
    seedCachedCatalog();

    const recipeSummary = getRecipeListForSelectedTool()[0];

    expect(startRecipe(recipeSummary)).toBe(true);
    expect(__zeusRuntime.router.push).toHaveBeenCalledWith({
      url: PAGE_URLS.brewActive
    });
    expect(readActiveSession()).toMatchObject({
      recipeId: recipeSummary.recipeId,
      status: "waiting_for_confirm",
      currentStepIndex: 0
    });

    advanceOrCompleteActiveSession();

    const runningSession = readActiveSession();
    expect(runningSession).toMatchObject({
      status: "running",
      currentStepIndex: 1
    });

    tickActiveSession(runningSession.expectedStepEndAt);

    expect(readActiveSession()).toMatchObject({
      status: "waiting_for_confirm",
      currentStepIndex: 2
    });

    const completion = advanceOrCompleteActiveSession();

    expect(completion).toMatchObject({
      completed: true
    });
    expect(readActiveSession()).toBeNull();
    expect(readLastResult()).toMatchObject({
      recipeName: recipeSummary.name,
      status: "completed"
    });
    expect(getPendingHistoryQueue()).toHaveLength(1);
    expect(__zeusRuntime.ble.send).not.toHaveBeenCalled();
    expect(__zeusRuntime.router.replace).toHaveBeenLastCalledWith({
      url: PAGE_URLS.resultSummary
    });
  });

  it("resumes a persisted active session back into the brew screen", () => {
    const fixture = seedCachedCatalog();
    const activeSession = createActiveBrewSession(fixture.recipeSnapshot, { now: 1_000 });

    writeActiveSession(activeSession);
    __zeusRuntime.router.replace.mockClear();

    expect(resumeActiveSession()).toBe(true);
    expect(__zeusRuntime.router.replace).toHaveBeenCalledWith({
      url: PAGE_URLS.brewActive
    });
  });

  it("discards an active session from home and stores an aborted summary", () => {
    seedCachedCatalog();

    const recipeSummary = getRecipeListForSelectedTool()[0];
    startRecipe(recipeSummary);
    __zeusRuntime.router.replace.mockClear();

    expect(discardActiveSessionFromHome()).toBe(true);
    expect(readActiveSession()).toBeNull();
    expect(readLastResult()).toMatchObject({
      recipeName: recipeSummary.name,
      status: "aborted"
    });
    expect(getPendingHistoryQueue()).toHaveLength(1);
    expect(__zeusRuntime.router.replace).toHaveBeenCalledWith({
      url: PAGE_URLS.home
    });
  });

  it("applies incoming catalog sync envelopes through the mocked bridge", () => {
    const fixture = buildFlowFixture();

    connectWatchBridge();

    deliverSyncEnvelope(SYNC_MESSAGE_TYPES.PUSH_TOOL_CATALOG, {
      toolCatalogRevision: fixture.catalogCache.toolCatalogRevision,
      tools: fixture.catalogCache.tools
    });
    deliverSyncEnvelope(SYNC_MESSAGE_TYPES.PUSH_CATALOG_SNAPSHOT, {
      recipeCatalogRevision: fixture.catalogCache.recipeCatalogRevision,
      recipesByTool: fixture.catalogCache.recipesByTool,
      recipeSnapshotsById: fixture.catalogCache.recipeSnapshotsById
    });

    expect(isCatalogReady()).toBe(true);
    expect(getRecipesForTool(fixture.recipeRecord.toolId)).toHaveLength(1);
    expect(getToolList().find((tool) => tool.toolId === fixture.recipeRecord.toolId)?.recipeCount).toBe(1);
  });

  it("replays queued history after reconnect and clears the queue on ACK", () => {
    seedCachedCatalog();

    const recipeSummary = getRecipeListForSelectedTool()[0];
    startRecipe(recipeSummary);
    advanceOrCompleteActiveSession();
    tickActiveSession(readActiveSession().expectedStepEndAt);
    advanceOrCompleteActiveSession();

    const pendingEntry = getPendingHistoryQueue()[0];
    expect(pendingEntry).toBeTruthy();
    expect(__zeusRuntime.ble.send).not.toHaveBeenCalled();

    connectWatchBridge();
    clearSentBridgeFrames();
    expect(retryPendingHistorySync()).toBe(true);
    expect(readSentSyncEnvelopes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          messageType: SYNC_MESSAGE_TYPES.UPSERT_HISTORY_ENTRY,
          payload: expect.objectContaining({
            entry: expect.objectContaining({
              historyId: pendingEntry.historyId
            })
          })
        })
      ])
    );

    deliverSyncEnvelope(SYNC_MESSAGE_TYPES.ACK_HISTORY_ENTRY, {
      historyId: pendingEntry.historyId,
      historyRevision: 9
    });

    expect(getPendingHistoryQueue()).toHaveLength(0);
    expect(readWatchSyncMeta()).toMatchObject({
      historyRevision: 9,
      lastAckedHistoryId: pendingEntry.historyId
    });
  });

  it("keeps neutral guard behavior when there is no active session or missing recipe snapshot", () => {
    seedCachedCatalog();

    expect(startRecipe({
      recipeId: "missing_recipe",
      toolId: "tool_aeropress"
    })).toBe(false);
    expect(readActiveSession()).toBeNull();
    expect(resumeActiveSession()).toBe(false);
    expect(discardActiveSessionFromHome()).toBe(false);
    expect(tickActiveSession()).toBeNull();
    expect(advanceOrCompleteActiveSession()).toBeNull();
    expect(__zeusRuntime.router.push).not.toHaveBeenCalled();
    expect(__zeusRuntime.router.replace).not.toHaveBeenCalled();
  });

  it("persists tool selection state and clears stale recipe selection before routing", () => {
    const fixture = seedCachedCatalog();

    writeSelectedRecipeId("stale_recipe");
    selectTool(fixture.recipeRecord.toolId);

    expect(readSelectedToolId()).toBe(fixture.recipeRecord.toolId);
    expect(readSelectedRecipeId()).toBeNull();
    expect(__zeusRuntime.router.push).toHaveBeenCalledWith({
      url: PAGE_URLS.recipeList
    });
  });

  it("requests bootstrap over the bridge once the watch is connected", () => {
    seedCachedCatalog();

    connectWatchBridge();
    clearSentBridgeFrames();

    expect(refreshPhoneSnapshot()).toBe(true);
    expect(readSentSyncEnvelopes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          messageType: SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP,
          payload: expect.objectContaining({
            knownToolCatalogRevision: 0,
            knownRecipeCatalogRevision: 0,
            knownHistoryRevision: 0
          })
        })
      ])
    );
  });

  it("routes from recipe list into a dedicated recipe detail selection step", () => {
    const fixture = seedRichBrowseCatalog();

    selectTool(fixture.recipeRecord.toolId);

    expect(getRecipeListForSelectedTool().map((recipe) => recipe.recipeId)).toEqual([
      fixture.recipeSummary.recipeId,
      fixture.secondRecipeSummary.recipeId,
      fixture.thirdRecipeSummary.recipeId
    ]);

    expect(selectRecipe(fixture.secondRecipeSummary.recipeId)).toBe(true);
    expect(readSelectedRecipeId()).toBe(fixture.secondRecipeSummary.recipeId);
    expect(getSelectedRecipe()).toMatchObject({
      recipeId: fixture.secondRecipeSummary.recipeId
    });
    expect(readActiveSession()).toBeNull();
    expect(__zeusRuntime.router.push).toHaveBeenCalledWith({
      url: PAGE_URLS.recipeDetail
    });

    expect(startSelectedRecipe()).toBe(true);
    expect(readActiveSession()).toMatchObject({
      recipeId: fixture.secondRecipeSummary.recipeId
    });
    expect(__zeusRuntime.router.push).toHaveBeenLastCalledWith({
      url: PAGE_URLS.brewActive
    });
    expect(getPendingHistoryQueue()).toEqual([]);
  });

  it("keeps recipe-detail helpers safe when the selected snapshot is missing", () => {
    seedCachedCatalog();
    selectTool("tool_aeropress");

    expect(selectRecipe("missing_recipe")).toBe(false);
    expect(getSelectedRecipe()).toBeNull();
    expect(startSelectedRecipe()).toBe(false);

    goToRecipeList();
    expect(__zeusRuntime.router.replace).toHaveBeenCalledWith({
      url: PAGE_URLS.recipeList
    });
  });

  it("keeps router state unchanged when ticking a still-running timed step", () => {
    seedCachedCatalog();

    const recipeSummary = getRecipeListForSelectedTool()[0];
    startRecipe(recipeSummary);
    advanceOrCompleteActiveSession();
    __zeusRuntime.router.replace.mockClear();

    const runningSession = readActiveSession();
    const tickResult = tickActiveSession(runningSession.currentStepStartedAt + 1_000);

    expect(tickResult).toMatchObject({
      completed: false,
      activeSession: expect.objectContaining({
        currentStepIndex: 1,
        status: "running"
      })
    });
    expect(readActiveSession()).toMatchObject({
      currentStepIndex: 1,
      status: "running"
    });
    expect(__zeusRuntime.router.replace).not.toHaveBeenCalled();
  });

  it("finalizes or clears resume paths when the reducer reports completed, expired, or invalid sessions", () => {
    seedCachedCatalog();

    const recipeSummary = getRecipeListForSelectedTool()[0];
    startRecipe(recipeSummary);
    const activeSession = readActiveSession();
    __zeusRuntime.router.replace.mockClear();

    const completeSpy = vi.spyOn(sessionReducer, "resumeSession").mockReturnValueOnce({
      ...activeSession,
      status: "completed",
      sessionEndedAt: 9_999
    });

    expect(resumeActiveSession()).toBe(false);
    expect(readActiveSession()).toBeNull();
    expect(__zeusRuntime.router.replace).toHaveBeenCalledWith({
      url: PAGE_URLS.resultSummary
    });
    completeSpy.mockRestore();

    startRecipe(recipeSummary);
    const activeSessionAgain = readActiveSession();
    const expiredSpy = vi.spyOn(sessionReducer, "resumeSession").mockReturnValueOnce({
      ...activeSessionAgain,
      status: "expired",
      sessionEndedAt: 10_000
    });

    expect(resumeActiveSession()).toBe(false);
    expect(readActiveSession()).toBeNull();
    expiredSpy.mockRestore();

    startRecipe(recipeSummary);
    const invalidSpy = vi.spyOn(sessionReducer, "resumeSession").mockReturnValueOnce(null);

    expect(resumeActiveSession()).toBe(false);
    expect(readActiveSession()).toBeNull();
    invalidSpy.mockRestore();
  });

  it("keeps sync bridge helper calls safe when offline and ignores unknown incoming messages", () => {
    seedCachedCatalog();

    expect(primeWatchSyncBridge()).toBe(false);
    expect(queueHistoryEntryForSync({ historyId: "hist_offline" })).toBe(false);
    expect(flushPendingHistoryQueue()).toBe(false);

    connectWatchBridge();
    clearSentBridgeFrames();
    const unknownEnvelope = new TextEncoder().encode(
      JSON.stringify({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        messageType: "UNKNOWN_MESSAGE_TYPE",
        requestId: "req_unknown",
        sentAt: 4_000,
        payload: {
          ignored: true
        }
      })
    ).buffer;
    const unknownFrame = buildAppBridgeDataFrame(unknownEnvelope, {
      port2: 321
    });
    deliverBleMessage(unknownFrame.buffer, unknownFrame.size);

    expect(getPendingHistoryQueue()).toEqual([]);
    expect(readLastResult()).toBeNull();
  });

  it("survives BLE send failures during shake and bootstrap attempts", () => {
    seedCachedCatalog();
    initWatchSyncBridge();

    __zeusRuntime.ble.send.mockImplementation(() => {
      throw new Error("ble send failed");
    });

    expect(setBleConnected(true)).toBeUndefined();
    expect(refreshPhoneSnapshot()).toBe(false);
    expect(primeWatchSyncBridge()).toBe(false);
    expect(queueHistoryEntryForSync({ historyId: "hist_send_fail" })).toBe(false);
  });

  it("ignores partial, invalid, and undecodable inbound bridge payloads", () => {
    seedCachedCatalog();
    connectWatchBridge();
    const initialRecipeCount = getRecipesForTool("tool_aeropress").length;

    const chunkedEnvelope = createSyncEnvelope(
      SYNC_MESSAGE_TYPES.PUSH_CATALOG_SNAPSHOT,
      {
        recipeCatalogRevision: 77,
        notes: "x".repeat(10_000)
      },
      {
        requestId: "req_partial_chunks",
        sentAt: 5_000
      }
    );
    const { buffer: chunkedPayload } = encodeEnvelopeForBle(chunkedEnvelope);
    const chunkFrames = buildChunkedBridgeTransportPayloads(chunkedPayload, {
      maxChunkPayloadSize: 256
    });

    const partialChunkFrame = buildAppBridgeDataFrame(chunkFrames[0], { port2: 321 });
    deliverBleMessage(partialChunkFrame.buffer, partialChunkFrame.size);

    const invalidTransportFrame = buildAppBridgeDataFrame(new Uint8Array([1, 2, 3]).buffer, {
      port2: 321
    });
    deliverBleMessage(invalidTransportFrame.buffer, invalidTransportFrame.size);

    const undecodablePayload = new TextEncoder().encode("{broken").buffer;
    const undecodableFrame = buildAppBridgeDataFrame(undecodablePayload, {
      port2: 321
    });
    deliverBleMessage(undecodableFrame.buffer, undecodableFrame.size);

    expect(readLastResult()).toBeNull();
    expect(getRecipesForTool("tool_aeropress")).toHaveLength(initialRecipeCount);
  });

  it("keeps the abort and route helpers wired to the expected page transitions", () => {
    abortActiveBrew();
    goHome();
    goToToolList();
    goToResultSummary();

    expect(__zeusRuntime.router.replace).toHaveBeenCalledWith({
      url: PAGE_URLS.home
    });
    expect(__zeusRuntime.router.push).toHaveBeenCalledWith({
      url: PAGE_URLS.toolList
    });
    expect(__zeusRuntime.router.push).toHaveBeenCalledWith({
      url: PAGE_URLS.resultSummary
    });
  });
});
