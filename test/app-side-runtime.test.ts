import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createMockSettingsStorage() {
  const values = new Map();
  let changeListener = null;

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
    addListener: vi.fn((eventName, listener) => {
      if (eventName === "change") {
        changeListener = listener;
      }
    }),
    removeListener: vi.fn((eventName, listener) => {
      if (eventName === "change" && changeListener === listener) {
        changeListener = null;
      }
    }),
    emitChange(key) {
      if (typeof changeListener === "function") {
        changeListener({ key });
      }
    }
  };
}

function createMockPeerSocket() {
  let messageListener = null;

  return {
    addListener: vi.fn((eventName, listener) => {
      if (eventName === "message") {
        messageListener = listener;
      }
    }),
    removeListener: vi.fn((eventName, listener) => {
      if (eventName === "message" && messageListener === listener) {
        messageListener = null;
      }
    }),
    send: vi.fn(),
    getMessageListener() {
      return messageListener;
    }
  };
}

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