import { beforeEach, describe, expect, it } from "vitest";

import { __zeusRuntime, deliverBleMessage, resetZeppRuntime, setBleConnected, setLocalStorageState } from "../zeus-runtime/runtime.ts";
import { getSupportedTools } from "../../shared/constants/tool-catalog.js";
import {
  CURRENT_SCHEMA_VERSION,
  createRecipeSnapshot,
  createRecipeSummary,
  normalizeRecipeSteps
} from "../../shared/domain/schema.js";
import { buildAppBridgeDataFrame, buildAppBridgeShakeFrame } from "../../shared/sync/bridge-frame.js";
import { buildChunkedBridgeTransportPayloads } from "../../shared/sync/bridge-transport.js";
import { createSyncEnvelope } from "../../shared/sync/contracts.js";
import { encodeEnvelopeForBle } from "../../shared/sync/device-codec.js";
import { SYNC_MESSAGE_TYPES } from "../../shared/sync/message-types.js";
import { WATCH_STORAGE_KEYS } from "../../shared/storage/keys.js";
import {
  getPendingHistoryQueue,
  getRecipesForTool,
  isCatalogReady,
  readActiveSession,
  readLastResult,
  readWatchSyncMeta,
  writeActiveSession
} from "../../shared/storage/watch-store.js";
import {
  abortActiveBrew,
  discardActiveSessionFromHome,
  PAGE_URLS,
  advanceOrCompleteActiveSession,
  goHome,
  goToResultSummary,
  goToToolList,
  getHomeScaffoldState,
  getRecipeListForSelectedTool,
  getToolList,
  refreshPhoneSnapshot,
  resumeActiveSession,
  retryPendingHistorySync,
  selectTool,
  startRecipe,
  tickActiveSession
} from "../../shared/watch/router.js";
import { destroyWatchSyncBridge, initWatchSyncBridge } from "../../shared/watch/sync-bridge.js";
import { createActiveBrewSession } from "../../shared/engine/recipe-engine.js";

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

beforeEach(() => {
  destroyWatchSyncBridge();
  resetZeppRuntime();
});

describe("mocked Zepp runtime watch flow", () => {
  it("uses cached catalog data and stays responsive while offline", () => {
    const fixture = seedCachedCatalog();

    const toolList = getToolList();
    const selectedToolRecipesBeforeSelection = getRecipeListForSelectedTool();

    expect(toolList.find((tool) => tool.toolId === fixture.recipeRecord.toolId)?.recipeCount).toBe(1);
    expect(getHomeScaffoldState()).toMatchObject({
      connected: false,
      catalogReady: true,
      pendingHistoryCount: 0
    });
    expect(refreshPhoneSnapshot()).toBe(false);
    expect(__zeusRuntime.ble.send).not.toHaveBeenCalled();
    expect(selectedToolRecipesBeforeSelection).toHaveLength(1);

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

    const sendCountBeforeReplay = __zeusRuntime.ble.send.mock.calls.length;
    expect(retryPendingHistorySync()).toBe(true);
    expect(__zeusRuntime.ble.send.mock.calls.length).toBeGreaterThan(sendCountBeforeReplay);

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

  it("covers missing-session guards and basic route helpers", () => {
    expect(startRecipe({
      recipeId: "missing_recipe",
      toolId: "tool_aeropress"
    })).toBe(false);
    expect(resumeActiveSession()).toBe(false);
    expect(discardActiveSessionFromHome()).toBe(false);
    expect(tickActiveSession()).toBeNull();
    expect(advanceOrCompleteActiveSession()).toBeNull();

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
