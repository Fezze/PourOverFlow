import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createMockPeerSocket, createMockSettingsStorage } from "./support/phone-runtime.ts";
import { PHONE_STORAGE_KEYS, SETTINGS_UI_STORAGE_KEY } from "../zepp-app/shared/storage/keys.js";
import { createSyncEnvelope } from "../zepp-app/shared/sync/contracts.js";
import { decodeEnvelopeFromPeerSocket, encodeEnvelopeForPeerSocket } from "../zepp-app/shared/sync/side-codec.js";
import { buildChunkedBridgeTransportPayloads, createBridgeTransportState, readBridgeTransportPayload } from "../zepp-app/shared/sync/bridge-transport.js";

const store = vi.hoisted(() => ({
  ensurePhoneStorage: vi.fn(), readPhoneSnapshot: vi.fn(), saveWatchHistoryEntry: vi.fn()
}));
const slices = vi.hoisted(() => ({
  buildPhoneToolCatalogSnapshot: vi.fn(), buildPhoneCatalogSnapshot: vi.fn(), buildPhoneHistorySnapshot: vi.fn()
}));
vi.mock("../zepp-app/shared/storage/phone-store.js", () => store);
vi.mock("../zepp-app/shared/sync/normalize.js", () => slices);

let definition;
let service;
const revisions = { toolCatalogRevision: 4, recipeCatalogRevision: 6, historyRevision: 8 };
beforeAll(async () => {
  vi.stubGlobal("AppSideService", (config) => { definition = config; });
  await import("../zepp-app/app-side/index.js");
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  service = { ...definition };
  store.readPhoneSnapshot.mockReturnValue({ syncMeta: revisions });
  slices.buildPhoneToolCatalogSnapshot.mockReturnValue({ toolCatalogRevision: 4, tools: [] });
  slices.buildPhoneCatalogSnapshot.mockReturnValue({ recipeCatalogRevision: 6, recipesByTool: {}, recipeSnapshotsById: {} });
  slices.buildPhoneHistorySnapshot.mockReturnValue({ historyRevision: 8, latestResult: null });
});
afterEach(() => {
  service.onDestroy();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setup() {
  const settingsStorage = createMockSettingsStorage();
  const peerSocket = createMockPeerSocket();
  vi.stubGlobal("settings", { settingsStorage });
  vi.stubGlobal("messaging", { peerSocket });
  service.onInit();
  const receive = (type, payload, requestId = "test-request") =>
    peerSocket.getMessageListener()!(encodeEnvelopeForPeerSocket(createSyncEnvelope(type, payload, { requestId })));
  const sent = () => {
    const transport = createBridgeTransportState();
    return peerSocket.send.mock.calls.flatMap(([frame]) => {
      const packet = readBridgeTransportPayload(transport, frame);
      return packet.status === "complete" ? [decodeEnvelopeFromPeerSocket(packet.payload)] : [];
    });
  };
  return { settingsStorage, peerSocket, receive, sent };
}

it("responds to a stale bootstrap in dependency order and skips matching revisions", () => {
  const { settingsStorage, peerSocket, receive, sent } = setup();
  service.onRun();
  expect(peerSocket.addListener).toHaveBeenCalledOnce();
  const matching = {
    knownToolCatalogRevision: 4, knownRecipeCatalogRevision: 6, knownHistoryRevision: 8, preferredLocale: "pl-PL"
  };
  receive("REQUEST_BOOTSTRAP", matching);
  expect(sent()).toEqual([]);
  expect(store.ensurePhoneStorage).toHaveBeenLastCalledWith(settingsStorage, { preferredLocale: "pl-PL" });
  receive("REQUEST_BOOTSTRAP", { knownToolCatalogRevision: 0, knownRecipeCatalogRevision: 0, knownHistoryRevision: 0 }, "bootstrap");
  expect(sent().map(({ messageType }) => messageType)).toEqual([
    "PUSH_TOOL_CATALOG", "PUSH_CATALOG_SNAPSHOT", "PUSH_HISTORY_SNAPSHOT"
  ]);
  expect(sent().map(({ requestId }) => requestId)).toEqual(["bootstrap", "bootstrap", "bootstrap"]);
});

it("waits for the final history chunk and ACKs only an accepted storage result", () => {
  const { settingsStorage, peerSocket, receive, sent } = setup();
  store.saveWatchHistoryEntry.mockReturnValueOnce({ ok: false, issues: ["No snapshot"] })
    .mockReturnValueOnce({ ok: true, historyEntry: { historyId: "accepted" }, syncMeta: { historyRevision: 10 } });
  receive("UPSERT_HISTORY_ENTRY", null);
  expect(sent()).toEqual([]);
  const entry = { historyId: "accepted" };
  const frame = encodeEnvelopeForPeerSocket(createSyncEnvelope("UPSERT_HISTORY_ENTRY", { entry }, { requestId: "history" }));
  const chunks = buildChunkedBridgeTransportPayloads(frame, { maxChunkPayloadSize: 45 });
  for (const chunk of chunks.slice(0, -1)) peerSocket.getMessageListener()!(chunk);
  expect(store.saveWatchHistoryEntry).toHaveBeenCalledTimes(1);
  peerSocket.getMessageListener()!(chunks.at(-1));
  expect(store.saveWatchHistoryEntry).toHaveBeenLastCalledWith(settingsStorage, entry);
  expect(sent()).toEqual([
    expect.objectContaining({ messageType: "ACK_HISTORY_ENTRY", requestId: "history", payload: { historyId: "accepted", historyRevision: 10 } }),
    expect.objectContaining({ messageType: "PUSH_HISTORY_SNAPSHOT", requestId: "history" })
  ]);
});

it("coalesces canonical slice changes, skips invalid traffic and stops pending work on destroy", () => {
  const { settingsStorage, peerSocket, sent } = setup();
  settingsStorage.emitChange(SETTINGS_UI_STORAGE_KEY);
  settingsStorage.emitChange("noncanonical_key");
  peerSocket.getMessageListener()!(null);
  peerSocket.getMessageListener()!(new TextEncoder().encode("not JSON").buffer);
  vi.advanceTimersByTime(200);
  expect(sent()).toEqual([]);
  for (const key of [PHONE_STORAGE_KEYS.recipeIndex, PHONE_STORAGE_KEYS.historyIndex, PHONE_STORAGE_KEYS.recipeIndex]) {
    settingsStorage.emitChange(key);
  }
  vi.advanceTimersByTime(200);
  expect(sent().map(({ messageType }) => messageType)).toEqual(["PUSH_CATALOG_SNAPSHOT", "PUSH_HISTORY_SNAPSHOT"]);
  settingsStorage.emitChange(PHONE_STORAGE_KEYS.recipeIndex);
  service.onDestroy();
  vi.advanceTimersByTime(200);
  expect(sent()).toHaveLength(2);
  expect(peerSocket.getMessageListener()).toBeNull();
});

it("leaves service uninitialized after registration failure, then tolerates a write exception", () => {
  const { settingsStorage, peerSocket } = setup();
  service.onDestroy();
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  settingsStorage.addListener.mockImplementationOnce(() => { throw new Error("Registration failed"); });
  service.onRun();
  expect(service.runtimeReady).toBe(false);
  expect(peerSocket.getMessageListener()).toBeNull();
  service.onRun();
  expect(service.runtimeReady).toBe(true);
  peerSocket.send.mockImplementationOnce(() => { throw new Error("Peer went away"); });
  settingsStorage.emitChange(PHONE_STORAGE_KEYS.recipeIndex);
  vi.advanceTimersByTime(200);
  expect(log).toHaveBeenCalledWith(expect.stringContaining("Failed to send phone sync envelope"), expect.any(Error));
});
