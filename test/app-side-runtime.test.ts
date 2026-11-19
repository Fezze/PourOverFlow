import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSeedRecipeRecordById } from "../zepp-app/shared/domain/seed-library.js";
import { PHONE_STORAGE_KEYS, SETTINGS_UI_STORAGE_KEY } from "../zepp-app/shared/storage/keys.js";
import { saveRecipeRecord } from "../zepp-app/shared/storage/phone-store.js";
import { SYNC_MESSAGE_TYPES } from "../zepp-app/shared/sync/message-types.js";
import { createMockPeerSocket, createMockSettingsStorage } from "./support/phone-runtime.ts";

let capturedAppSideDefinition;

beforeEach(() => {
  capturedAppSideDefinition = null;
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("app-side runtime lifecycle", () => {
  it("registers explicit listeners once and removes them on destroy when the API supports cleanup", async () => {
    const settingsStorage = createMockSettingsStorage();
    const peerSocket = createMockPeerSocket();

    vi.stubGlobal("settings", {
      settingsStorage
    });
    vi.stubGlobal("messaging", {
      peerSocket
    });
    vi.stubGlobal("AppSideService", (definition) => {
      capturedAppSideDefinition = definition;
      return definition;
    });

    await import("../zepp-app/app-side/index.js");

    const service = {};
    capturedAppSideDefinition.onInit.call(service);
    capturedAppSideDefinition.onRun.call(service);

    expect(peerSocket.addListener).toHaveBeenCalledTimes(1);
    expect(settingsStorage.addListener).toHaveBeenCalledTimes(1);
    expect(service.runtimeReady).toBe(true);

    const registeredPeerSocketListener = service.peerSocketMessageListener;
    const registeredSettingsListener = service.settingsStorageChangeListener;

    capturedAppSideDefinition.onDestroy.call(service);

    expect(peerSocket.removeListener).toHaveBeenCalledWith("message", registeredPeerSocketListener);
    expect(settingsStorage.removeListener).toHaveBeenCalledWith("change", registeredSettingsListener);
    expect(service.runtimeReady).toBe(false);
    expect(service.peerSocketMessageListener).toBeNull();
    expect(service.settingsStorageChangeListener).toBeNull();
  });

  it("still tears down safely when removeListener APIs are unavailable", async () => {
    const settingsStorage = {
      ...createMockSettingsStorage(),
      removeListener: undefined
    };
    const peerSocket = {
      ...createMockPeerSocket(),
      removeListener: undefined
    };

    vi.stubGlobal("settings", {
      settingsStorage
    });
    vi.stubGlobal("messaging", {
      peerSocket
    });
    vi.stubGlobal("AppSideService", (definition) => {
      capturedAppSideDefinition = definition;
      return definition;
    });

    await import("../zepp-app/app-side/index.js");

    const service = {};
    capturedAppSideDefinition.onInit.call(service);
    expect(service.runtimeReady).toBe(true);

    expect(() => capturedAppSideDefinition.onDestroy.call(service)).not.toThrow();
    expect(service.runtimeReady).toBe(false);
  });
});
async function startSyncRuntime() {
  const settingsStorage = createMockSettingsStorage();
  const peerSocket = createMockPeerSocket();
  vi.stubGlobal("settings", { settingsStorage });
  vi.stubGlobal("messaging", { peerSocket });
  vi.stubGlobal("AppSideService", (definition) => { capturedAppSideDefinition = definition; });
  await import("../zepp-app/app-side/index.js");
  const service = {};
  capturedAppSideDefinition.onInit.call(service);
  const { createSyncEnvelope } = await import("../zepp-app/shared/sync/contracts.js");
  const { encodeEnvelopeForPeerSocket, decodeEnvelopeFromPeerSocket } = await import("../zepp-app/shared/sync/side-codec.js");
  const { createBridgeTransportState, readBridgeTransportPayload } = await import("../zepp-app/shared/sync/bridge-transport.js");
  return {
    settingsStorage,
    receive(type, payload) {
      peerSocket.getMessageListener()(encodeEnvelopeForPeerSocket(createSyncEnvelope(type, payload)));
    },
    messages() {
      const state = createBridgeTransportState();
      return peerSocket.send.mock.calls.flatMap(([frame]) => {
        const result = readBridgeTransportPayload(state, frame);
        return result.status === "complete" ? [decodeEnvelopeFromPeerSocket(result.payload)] : [];
      });
    },
    destroy() { capturedAppSideDefinition.onDestroy.call(service); }
  };
}

async function createHistoryFixture() {
  const { getSeedRecipeRecords } = await import("../zepp-app/shared/domain/seed-library.js");
  const { createActiveBrewSession, buildHistoryEntryFromSession } = await import("../zepp-app/shared/engine/recipe-engine.js");
  const { abortSession } = await import("../zepp-app/shared/engine/session-reducer.js");
  return buildHistoryEntryFromSession(abortSession(createActiveBrewSession(getSeedRecipeRecords(1000)[0])));
}

describe("app-side sync regressions", () => {
  it("acknowledges replay without overwriting phone feedback or increasing revisions", async () => {
    const runtime = await startSyncRuntime();
    try {
      const entry = await createHistoryFixture();
      runtime.receive("UPSERT_HISTORY_ENTRY", { entry });
      const { updateHistoryEntryFeedback, readHistoryEntry, readPhoneSyncMeta } = await import("../zepp-app/shared/storage/phone-store.js");
      updateHistoryEntryFeedback(runtime.settingsStorage, entry.historyId, { userNote: "Sweeter with a finer grind", userRating: 5 });
      const saved = readHistoryEntry(runtime.settingsStorage, entry.historyId);
      const revision = readPhoneSyncMeta(runtime.settingsStorage).historyRevision;
      runtime.receive("UPSERT_HISTORY_ENTRY", { entry });
      expect(readHistoryEntry(runtime.settingsStorage, entry.historyId)).toEqual(saved);
      expect(readPhoneSyncMeta(runtime.settingsStorage).historyRevision).toBe(revision);
      expect(runtime.messages().filter((message) => message.messageType === "ACK_HISTORY_ENTRY").at(-1).payload)
        .toEqual({ historyId: entry.historyId, historyRevision: revision });
    } finally { runtime.destroy(); }
  });

  it("keeps pending catalog edits when history triggers an immediate flush", async () => {
    vi.useFakeTimers();
    const runtime = await startSyncRuntime();
    try {
      const { saveRecipeRecord } = await import("../zepp-app/shared/storage/phone-store.js");
      const { getSeedRecipeRecords } = await import("../zepp-app/shared/domain/seed-library.js");
      const recipe = getSeedRecipeRecords(1000)[0];
      saveRecipeRecord(runtime.settingsStorage, { ...recipe, name: "Edited before history arrived" });
      runtime.settingsStorage.emitChange("pof_recipe_index_v1");
      runtime.receive("UPSERT_HISTORY_ENTRY", { entry: await createHistoryFixture() });
      vi.runAllTimers();
      expect(runtime.messages().some((message) => message.messageType === "PUSH_CATALOG_SNAPSHOT"
        && message.payload.recipeSnapshotsById[recipe.recipeId].name === "Edited before history arrived")).toBe(true);
    } finally { runtime.destroy(); vi.useRealTimers(); }
  });

  it("ignores draft changes and coalesces rapid recipe saves into one catalog update", async () => {
    vi.useFakeTimers();
    const runtime = await startSyncRuntime();
    try {
      runtime.settingsStorage.emitChange(SETTINGS_UI_STORAGE_KEY);
      vi.runOnlyPendingTimers();
      expect(runtime.messages()).toEqual([]);

      const recipe = getSeedRecipeRecordById("seed_ap_daily_clean", 1_000);
      for (const name of ["First edit", "Second edit"]) {
        expect(saveRecipeRecord(runtime.settingsStorage, { ...recipe, name }).ok).toBe(true);
        runtime.settingsStorage.emitChange(PHONE_STORAGE_KEYS.recipeIndex);
      }
      expect(runtime.messages()).toEqual([]);
      vi.runOnlyPendingTimers();

      const messages = runtime.messages();
      expect(messages.map(({ messageType }) => messageType)).toEqual([SYNC_MESSAGE_TYPES.PUSH_CATALOG_SNAPSHOT]);
      expect(messages[0].payload.recipeSnapshotsById[recipe.recipeId].name).toBe("Second edit");
    } finally {
      runtime.destroy();
      vi.useRealTimers();
    }
  });

  it("cancels a pending storage push when the side service is destroyed", async () => {
    vi.useFakeTimers();
    const runtime = await startSyncRuntime();
    try {
      runtime.settingsStorage.emitChange(PHONE_STORAGE_KEYS.recipeIndex);
      expect(vi.getTimerCount()).toBe(1);
      runtime.destroy();
      vi.runOnlyPendingTimers();

      expect(vi.getTimerCount()).toBe(0);
      expect(runtime.messages()).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects a history envelope with a null payload without throwing", async () => {
    const runtime = await startSyncRuntime();
    try {
      expect(() => runtime.receive("UPSERT_HISTORY_ENTRY", null)).not.toThrow();
      expect(runtime.messages()).toEqual([]);
    } finally { runtime.destroy(); }
  });
});
