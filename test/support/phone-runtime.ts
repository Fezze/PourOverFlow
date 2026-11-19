import { vi } from "vitest";

export function createMockSettingsStorage() {
  const values = new Map();
  let changeListener: ((event: { key: string }) => void) | null = null;

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

export function createMockPeerSocket() {
  let messageListener: ((frame: ArrayBuffer) => void) | null = null;

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
    send: vi.fn<(frame: ArrayBuffer) => void>(),
    getMessageListener() {
      return messageListener;
    }
  };
}
