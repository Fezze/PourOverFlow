import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSeedRecipeRecordById } from "../shared/domain/seed-library.js";
import { CURRENT_SCHEMA_VERSION, createRecipeSnapshot, createRecipeSummary } from "../shared/domain/schema.js";
import { createSyncEnvelope } from "../shared/sync/contracts.js";
import { decodeEnvelopeFromBlePayload, encodeEnvelopeForBle } from "../shared/sync/device-codec.js";
import { APP_BRIDGE_MESSAGE_TYPES, buildAppBridgeDataFrame, buildAppBridgeShakeFrame, parseAppBridgeFrame } from "../shared/sync/bridge-frame.js";
import { buildChunkedBridgeTransportPayloads, createBridgeTransportState, readBridgeTransportPayload } from "../shared/sync/bridge-transport.js";
import { SYNC_MESSAGE_TYPES } from "../shared/sync/message-types.js";
import {
  enqueuePendingHistoryEntry,
  readValidationNote,
  setConnectionStatus,
  writeLastResult
} from "../shared/storage/watch-store.js";
import { WATCH_STORAGE_KEYS } from "../shared/storage/keys.js";
import * as feedback from "../shared/engine/feedback.js";
import * as syncBridge from "../shared/watch/sync-bridge.js";
import { destroyWatchSyncBridge, initWatchSyncBridge } from "../shared/watch/sync-bridge.js";
import { getValidationScaffoldState, runValidationAction } from "../shared/watch/validation.js";
import {
  __zeusRuntime,
  deliverBleMessage,
  resetZeppRuntime,
  setBleConnected,
  setLocalStorageState
} from "./zeus-runtime/runtime.ts";

function buildValidationFixture() {
  const record = getSeedRecipeRecordById("seed_ap_daily_clean", 1_000);
  const summary = createRecipeSummary(record);
  const snapshot = createRecipeSnapshot(record);

  return {
    record,
    summary,
    snapshot,
    catalogCache: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      toolCatalogRevision: 3,
      recipeCatalogRevision: 7,
      tools: [
        {
          schemaVersion: 1,
          toolId: record.toolId,
          label: "AeroPress",
          iconStem: "tool-aeropress",
          sortOrder: 10,
          supported: true,
          description: "Pressure-assisted brewer"
        }
      ],
      recipesByTool: {
        [record.toolId]: [summary]
      },
      recipeSnapshotsById: {
        [snapshot.recipeId]: snapshot
      },
      cachedAt: 2_000
    },
    lastResult: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      historyId: "hist_validation",
      toolId: record.toolId,
      recipeName: record.name,
      colorToken: record.colorToken,
      status: "completed",
      endedAt: 3_000,
      elapsedMs: 120_000,
      totalDeltaMs: -750
    }
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

describe("watch validation helpers", () => {
  it("summarizes the current watch validation state", () => {
    const fixture = buildValidationFixture();

    setLocalStorageState({
      [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache)
    });
    setConnectionStatus(true);
    enqueuePendingHistoryEntry({
      historyId: "hist_pending",
      recipeName: fixture.record.name
    });
    writeLastResult(fixture.lastResult);

    expect(getValidationScaffoldState()).toMatchObject({
      connected: true,
      catalogReady: true,
      pendingHistoryCount: 1,
      toolCatalogRevision: 0,
      recipeCatalogRevision: 0,
      historyRevision: 0,
      lastResultName: fixture.record.name
    });
  });

  it("runs haptic and sound validation actions and stores readable notes", () => {
    expect(runValidationAction("haptic")).toMatchObject({
      success: true
    });
    expect(__zeusRuntime.buzzerInstances.size).toBeGreaterThan(0);
    expect(readValidationNote()).toMatch("haptic cue");

    expect(runValidationAction("sound")).toMatchObject({
      success: true
    });
    expect(__zeusRuntime.systemSoundInstances.size).toBeGreaterThan(0);
    expect(readValidationNote()).toMatch("system sound");
  });

  it("runs the sync validation action through the real bridge path", () => {
    const envelope = createSyncEnvelope(SYNC_MESSAGE_TYPES.PUSH_CATALOG_SNAPSHOT, {
      recipeCatalogRevision: 7,
      recipesByTool: {},
      recipeSnapshotsById: {}
    });
    const { buffer } = encodeEnvelopeForBle(envelope);
    expect(buildChunkedBridgeTransportPayloads(buffer)).toHaveLength(1);

    enqueuePendingHistoryEntry({
      historyId: "hist_sync_validation",
      recipeName: "Validation Brew"
    });
    connectWatchBridge();
    __zeusRuntime.ble.send.mockClear();
    __zeusRuntime.bleState.sentPayloads.length = 0;

    expect(runValidationAction("sync")).toMatchObject({
      success: true
    });

    const sentEnvelopes = readSentSyncEnvelopes();
    expect(sentEnvelopes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          messageType: SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP
        }),
        expect.objectContaining({
          messageType: SYNC_MESSAGE_TYPES.UPSERT_HISTORY_ENTRY,
          payload: expect.objectContaining({
            entry: expect.objectContaining({
              historyId: "hist_sync_validation"
            })
          })
        })
      ])
    );
    expect(readValidationNote()).toMatch("pending queue");
  });

  it("covers bootstrap-only, queue-only, and no-work sync notes", () => {
    const requestSpy = vi.spyOn(syncBridge, "requestBootstrap");
    const flushSpy = vi.spyOn(syncBridge, "flushPendingHistoryQueue");

    setConnectionStatus(true);

    requestSpy.mockReturnValueOnce(true);
    flushSpy.mockReturnValueOnce(false);
    expect(runValidationAction("sync")).toMatchObject({
      success: true,
      note: "Requested a fresh phone snapshot from the companion."
    });

    requestSpy.mockReturnValueOnce(false);
    flushSpy.mockReturnValueOnce(true);
    expect(runValidationAction("sync")).toMatchObject({
      success: true,
      note: "Retried the pending history queue."
    });

    requestSpy.mockReturnValueOnce(false);
    flushSpy.mockReturnValueOnce(false);
    expect(runValidationAction("sync")).toMatchObject({
      success: false,
      note: "Sync request finished without new work."
    });
  });

  it("covers failed validation cues and unknown actions", () => {
    const cueSpy = vi.spyOn(feedback, "playFeedbackCue");

    cueSpy.mockReturnValueOnce(false);
    expect(runValidationAction("haptic")).toMatchObject({
      success: false,
      note: "Haptic cue was unavailable on this runtime."
    });

    cueSpy.mockReturnValueOnce(false);
    expect(runValidationAction("sound")).toMatchObject({
      success: false,
      note: "System sound was unavailable on this runtime."
    });

    expect(runValidationAction("mystery")).toMatchObject({
      success: false,
      note: "Unknown validation action."
    });
  });
});
