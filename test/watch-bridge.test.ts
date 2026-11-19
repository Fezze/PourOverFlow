import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as bridge from "../zepp-app/shared/watch/sync-bridge.js";
import { buildAppBridgeDataFrame, buildAppBridgeShakeFrame, parseAppBridgeFrame } from "../zepp-app/shared/sync/bridge-frame.js";
import { buildChunkedBridgeTransportPayloads, createBridgeTransportState, readBridgeTransportPayload } from "../zepp-app/shared/sync/bridge-transport.js";
import { decodeEnvelopeFromBlePayload, encodeEnvelopeForBle } from "../zepp-app/shared/sync/device-codec.js";
import { createSyncEnvelope } from "../zepp-app/shared/sync/contracts.js";
import { __zeusRuntime, deliverBleMessage, resetZeppRuntime, setBleConnected, setLanguageCode } from "./zeus-runtime/runtime.ts";

const store = vi.hoisted(() => ({
  ackPendingHistoryEntry: vi.fn(),
  applyCatalogSnapshot: vi.fn(),
  applyHistorySnapshot: vi.fn(),
  applyToolCatalogSnapshot: vi.fn(),
  getPendingHistoryQueue: vi.fn(),
  isWatchConnected: vi.fn(),
  readWatchSyncMeta: vi.fn(),
  setConnectionStatus: vi.fn()
}));
vi.mock("../zepp-app/shared/storage/watch-store.js", () => store);

const pending = { historyId: "pending-1", status: "completed" };
beforeEach(() => {
  resetZeppRuntime();
  for (const stub of Object.values(store)) stub.mockReset();
  store.getPendingHistoryQueue.mockReturnValue([pending]);
  store.readWatchSyncMeta.mockReturnValue({ recipeCatalogRevision: 11, toolCatalogRevision: 7, historyRevision: 8, historySnapshotApplied: true });
});
afterEach(() => {
  bridge.destroyWatchSyncBridge();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function messages() {
  const transport = createBridgeTransportState();
  return __zeusRuntime.bleState.sentPayloads.flatMap(({ data, size }) => {
    const frame = parseAppBridgeFrame(data, size);
    if (frame?.type !== 4) return [];
    const result = readBridgeTransportPayload(transport, frame.payload);
    return result.status === "complete" ? [decodeEnvelopeFromBlePayload(result.payload)] : [];
  });
}

it("gates bootstrap and queued history on the remote handshake, then reports exact revisions", () => {
  setLanguageCode(9);
  bridge.initWatchSyncBridge();
  bridge.initWatchSyncBridge();
  expect(__zeusRuntime.ble.addListener).toHaveBeenCalledOnce();
  expect(bridge.primeWatchSyncBridge()).toBe(false);
  expect(bridge.primeWatchSyncBridge()).toBe(false);
  expect(bridge.queueHistoryEntryForSync(pending)).toBe(false);
  expect(bridge.flushPendingHistoryQueue()).toBe(false);
  setBleConnected(true);
  expect(bridge.requestBootstrap()).toBe(false);
  expect(messages()).toEqual([]);
  const shake = buildAppBridgeShakeFrame({ port2: 55 });
  deliverBleMessage(shake.buffer, shake.size);
  expect(messages()).toEqual([
    expect.objectContaining({
      messageType: "REQUEST_BOOTSTRAP", payload: {
        knownRecipeCatalogRevision: 11, knownToolCatalogRevision: 7, knownHistoryRevision: 8, preferredLocale: "pl-PL"
      }
    }),
    expect.objectContaining({ messageType: "UPSERT_HISTORY_ENTRY", payload: { entry: pending } })
  ]);
  expect(store.setConnectionStatus).toHaveBeenLastCalledWith(true);
  expect(store.ackPendingHistoryEntry).not.toHaveBeenCalled();
  setBleConnected(false);
  expect(bridge.requestBootstrap()).toBe(false);
  expect(store.setConnectionStatus).toHaveBeenLastCalledWith(false);
});

it("dispatches decoded slices only after complete assembly and routes ACK by history id", () => {
  bridge.initWatchSyncBridge();
  const actions = [
    ["PUSH_TOOL_CATALOG", { toolCatalogRevision: 3, tools: [] }, store.applyToolCatalogSnapshot],
    ["PUSH_CATALOG_SNAPSHOT", { recipeCatalogRevision: 7, recipesByTool: {} }, store.applyCatalogSnapshot],
    ["PUSH_HISTORY_SNAPSHOT", { historyRevision: 6, latestResult: null }, store.applyHistorySnapshot],
    ["ACK_HISTORY_ENTRY", { historyId: pending.historyId, historyRevision: 9 }, store.ackPendingHistoryEntry]
  ] as const;
  for (const [type, payload, receiver] of actions) {
    const chunks = buildChunkedBridgeTransportPayloads(encodeEnvelopeForBle(createSyncEnvelope(type, payload)).buffer, {
      maxChunkPayloadSize: 45
    });
    for (const chunk of chunks.slice(0, -1)) {
      const framed = buildAppBridgeDataFrame(chunk, { port2: 42 });
      deliverBleMessage(framed.buffer, framed.size);
      expect(receiver).not.toHaveBeenCalled();
    }
    const final = buildAppBridgeDataFrame(chunks.at(-1), { port2: 42 });
    deliverBleMessage(final.buffer, final.size);
    expect(receiver).toHaveBeenCalledOnce();
    if (type === "ACK_HISTORY_ENTRY") expect(receiver).toHaveBeenCalledWith(pending.historyId);
    else expect(receiver).toHaveBeenCalledWith(payload);
  }
  const bad = new TextEncoder().encode("bad payload");
  deliverBleMessage(bad.buffer, bad.byteLength);
  expect(store.ackPendingHistoryEntry).toHaveBeenCalledOnce();
});

it("allows a ready connection to recover from an unsuccessful write without acknowledging it", () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  setBleConnected(true);
  bridge.initWatchSyncBridge();
  const hello = buildAppBridgeShakeFrame();
  deliverBleMessage(hello.buffer, hello.size);
  __zeusRuntime.ble.send.mockImplementationOnce(() => { throw new Error("Write failed"); });
  expect(bridge.queueHistoryEntryForSync(pending)).toBe(false);
  expect(store.ackPendingHistoryEntry).not.toHaveBeenCalled();
  expect(bridge.flushPendingHistoryQueue()).toBe(true);
  expect(messages().at(-1)).toMatchObject({ messageType: "UPSERT_HISTORY_ENTRY" });
});

it("retries dropped shakes, re-arms on manual sync, and flushes when the first reply is a snapshot", () => {
  vi.useFakeTimers();
  bridge.initWatchSyncBridge();
  setBleConnected(true);

  vi.advanceTimersByTime(9_000);
  expect(__zeusRuntime.bleState.sentPayloads).toHaveLength(3);
  expect(messages()).toEqual([]);
  expect(bridge.requestBootstrap()).toBe(false);
  expect(__zeusRuntime.bleState.sentPayloads).toHaveLength(4);

  const payload = { historyRevision: 12, latestResult: null };
  store.applyHistorySnapshot.mockImplementation(() => {
    store.readWatchSyncMeta.mockReturnValue({ historyRevision: 12, historySnapshotApplied: true });
  });
  const frame = buildAppBridgeDataFrame(encodeEnvelopeForBle(createSyncEnvelope(
    "PUSH_HISTORY_SNAPSHOT", payload
  )).buffer);
  deliverBleMessage(frame.buffer, frame.size);
  expect(messages()).toEqual([
    expect.objectContaining({ messageType: "REQUEST_BOOTSTRAP", payload: expect.objectContaining({
      knownHistoryRevision: 12
    }) }),
    expect.objectContaining({ messageType: "UPSERT_HISTORY_ENTRY" })
  ]);
  const frameCount = __zeusRuntime.bleState.sentPayloads.length;
  vi.advanceTimersByTime(9_000);
  expect(__zeusRuntime.bleState.sentPayloads).toHaveLength(frameCount);
});

it("cancels handshake retries on disconnect and teardown", () => {
  vi.useFakeTimers();
  bridge.initWatchSyncBridge();
  setBleConnected(true);
  setBleConnected(false);
  vi.advanceTimersByTime(9_000);
  expect(__zeusRuntime.bleState.sentPayloads).toHaveLength(1);
  setBleConnected(true);
  bridge.destroyWatchSyncBridge();
  vi.advanceTimersByTime(9_000);
  expect(__zeusRuntime.bleState.sentPayloads).toHaveLength(2);
});
