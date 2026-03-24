import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllGlobals();
  vi.doUnmock("@zos/sensor");
  vi.doUnmock("@zos/ble");
});

describe("dependency-gated edge branches", () => {
  it("covers the runtime-env battery read failure path", async () => {
    vi.doMock("@zos/sensor", () => ({
      Battery: class Battery {
        constructor() {
          throw new Error("battery unavailable");
        }
      }
    }));

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const runtimeEnv = await import("../shared/watch/runtime-env.js");

    expect(runtimeEnv.getDeviceRuntimeEnvironment()).toEqual({
      batteryLevel: null,
      isSimulatorHint: true
    });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("covers side-codec payload decoding branches that are unreachable through the normal bridge helper", async () => {
    const syncEnvelopeJson = JSON.stringify({
      schemaVersion: 1,
      messageType: "REQUEST_BOOTSTRAP",
      requestId: "req_mocked",
      sentAt: 10,
      payload: {
        knownToolCatalogRevision: 1,
        knownRecipeCatalogRevision: 2,
        knownHistoryRevision: 3
      }
    });
    const payloadView = new Uint8Array(new TextEncoder().encode(syncEnvelopeJson));

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const bridgeFrame = await import("../shared/sync/bridge-frame.js");
    const extractSpy = vi
      .spyOn(bridgeFrame, "extractAppBridgePayload")
      .mockReturnValueOnce(payloadView)
      .mockReturnValueOnce({
        unsupported: true
      });
    const sideCodec = await import("../shared/sync/side-codec.js");

    const decodedEnvelope = sideCodec.decodeEnvelopeFromPeerSocket("mocked");
    expect(decodedEnvelope).toMatchObject({
      requestId: "req_mocked"
    });

    vi.stubGlobal("Buffer", undefined);
    extractSpy.mockReset();
    extractSpy.mockReturnValueOnce(payloadView).mockReturnValueOnce({
      unsupported: true
    });
    expect(sideCodec.decodeEnvelopeFromPeerSocket("mocked")).toMatchObject({
      requestId: "req_mocked"
    });

    expect(sideCodec.decodeEnvelopeFromPeerSocket("mocked")).toBeNull();
    expect(consoleSpy).not.toHaveBeenCalled();
    extractSpy.mockRestore();
  });

  it("covers sync-bridge initialization failure and offline guard branches", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const bleModule = await import("@zos/ble");
    const watchStore = await import("../shared/storage/watch-store.js");
    const setConnectionSpy = vi.spyOn(watchStore, "setConnectionStatus");
    const createConnectSpy = vi.spyOn(bleModule, "createConnect").mockImplementation(() => {
      throw new Error("connect unavailable");
    });
    const syncBridge = await import("../shared/watch/sync-bridge.js");

    syncBridge.initWatchSyncBridge();
    expect(syncBridge.primeWatchSyncBridge()).toBe(false);
    expect(syncBridge.requestBootstrap()).toBe(false);
    expect(syncBridge.queueHistoryEntryForSync({ historyId: "hist_mock" })).toBe(false);
    expect(syncBridge.flushPendingHistoryQueue()).toBe(false);
    expect(createConnectSpy).toHaveBeenCalled();
    expect(setConnectionSpy).toHaveBeenCalledWith(false);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("covers feedback fallback when SystemSounds cannot be constructed", async () => {
    vi.doMock("@zos/sensor", () => ({
      Buzzer: class Buzzer {
        isEnabled() {
          return true;
        }
        getSourceType() {
          return { SUCCESS: 2 };
        }
        start() {
          return true;
        }
      },
      SystemSounds: class SystemSounds {
        constructor() {
          throw new Error("system sounds unavailable");
        }
      }
    }));

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const feedback = await import("../shared/engine/feedback.js?system-sounds-fallback");

    expect(feedback.playFeedbackCue("sound_soft")).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("covers sync-bridge guard branches when BLE send is unavailable even though the transport reports connected", async () => {
    vi.doMock("@zos/ble", () => ({
      addListener: vi.fn(),
      connectStatus: vi.fn(() => true),
      createConnect: vi.fn(),
      disConnect: vi.fn(),
      removeListener: vi.fn(),
      send: undefined
    }));

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const syncBridge = await import("../shared/watch/sync-bridge.js");

    syncBridge.initWatchSyncBridge();
    expect(syncBridge.primeWatchSyncBridge()).toBe(false);
    expect(syncBridge.requestBootstrap()).toBe(false);
    expect(syncBridge.queueHistoryEntryForSync({ historyId: "hist_missing_send" })).toBe(false);
    expect(syncBridge.flushPendingHistoryQueue()).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
  });
});
