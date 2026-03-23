import { vi } from "vitest";

const appState = {
  globalData: {}
};

const routerState = {
  pushes: [],
  replaces: [],
  backs: 0
};

const bleState = {
  connected: false,
  messageListener: null,
  connectionListener: null,
  sentPayloads: []
};

const batteryState = {
  level: 75
};

const localStorageState = new Map();
const buzzerInstances = new Set();
const systemSoundInstances = new Set();

const router = {
  push: vi.fn((payload) => {
    routerState.pushes.push(payload);
  }),
  replace: vi.fn((payload) => {
    routerState.replaces.push(payload);
  }),
  back: vi.fn(() => {
    routerState.backs += 1;
  })
};

const display = {
  setWakeUpRelaunch: vi.fn(() => true),
  setPageBrightTime: vi.fn(() => true),
  resetPageBrightTime: vi.fn(() => true)
};

const ble = {
  createConnect: vi.fn((listener) => {
    bleState.messageListener = listener;
  }),
  disConnect: vi.fn(() => {
    bleState.connected = false;
  }),
  send: vi.fn((data, size) => {
    bleState.sentPayloads.push({ data, size });
    return true;
  }),
  connectStatus: vi.fn(() => bleState.connected),
  addListener: vi.fn((listener) => {
    bleState.connectionListener = listener;
  }),
  removeListener: vi.fn(() => {
    bleState.connectionListener = null;
  })
};

const localStorageApi = {
  getItem: vi.fn((key, defaultValue = null) => (
    localStorageState.has(key) ? localStorageState.get(key) : defaultValue
  )),
  setItem: vi.fn((key, value) => {
    localStorageState.set(key, value);
  }),
  removeItem: vi.fn((key) => {
    localStorageState.delete(key);
  }),
  clear: vi.fn(() => {
    localStorageState.clear();
  })
};

class LocalStorage {
  getItem(key, defaultValue = null) {
    return localStorageApi.getItem(key, defaultValue);
  }

  setItem(key, value) {
    return localStorageApi.setItem(key, value);
  }

  removeItem(key) {
    return localStorageApi.removeItem(key);
  }

  clear() {
    return localStorageApi.clear();
  }
}

class Battery {
  getCurrent = vi.fn(() => batteryState.level);
}

class Buzzer {
  constructor() {
    this.isEnabled = vi.fn(() => true);
    this.getSourceType = vi.fn(() => ({
      OPERATE: 1,
      SUCCESS: 2
    }));
    this.start = vi.fn(() => true);
    this.stop = vi.fn(() => true);
    buzzerInstances.add(this);
  }
}

class SystemSounds {
  constructor() {
    this.getEnabled = vi.fn(() => true);
    this.getSourceType = vi.fn(() => ({
      REGULAR: 10,
      MESSAGE: 11,
      ACHIEVE: 12
    }));
    this.start = vi.fn(() => true);
    systemSoundInstances.add(this);
  }
}

function installGlobals() {
  globalThis.getApp = () => appState;
  globalThis.App = vi.fn((definition) => definition);
  globalThis.Page = vi.fn((definition) => definition);
}

export function setBatteryLevel(level) {
  batteryState.level = level;
}

export function setBleConnected(connected) {
  bleState.connected = Boolean(connected);

  if (bleState.connectionListener) {
    bleState.connectionListener(bleState.connected);
  }
}

export function deliverBleMessage(data, size = data?.byteLength ?? 0) {
  if (bleState.messageListener) {
    bleState.messageListener(0, data, size);
  }
}

export function getLocalStorageSnapshot() {
  return Object.fromEntries(localStorageState.entries());
}

export function setLocalStorageState(entries = {}) {
  localStorageState.clear();

  Object.entries(entries).forEach(([key, value]) => {
    localStorageState.set(key, value);
  });
}

export function resetZeppRuntime() {
  installGlobals();
  appState.globalData = {};
  routerState.pushes = [];
  routerState.replaces = [];
  routerState.backs = 0;
  bleState.connected = false;
  bleState.messageListener = null;
  bleState.connectionListener = null;
  bleState.sentPayloads = [];
  batteryState.level = 75;
  setLocalStorageState();

  router.push.mockClear();
  router.replace.mockClear();
  router.back.mockClear();
  display.setWakeUpRelaunch.mockClear();
  display.setPageBrightTime.mockClear();
  display.resetPageBrightTime.mockClear();
  ble.createConnect.mockClear();
  ble.disConnect.mockClear();
  ble.send.mockClear();
  ble.connectStatus.mockClear();
  ble.addListener.mockClear();
  ble.removeListener.mockClear();
  localStorageApi.getItem.mockClear();
  localStorageApi.setItem.mockClear();
  localStorageApi.removeItem.mockClear();
  localStorageApi.clear.mockClear();

  buzzerInstances.forEach((instance) => {
    instance.isEnabled.mockClear();
    instance.getSourceType.mockClear();
    instance.start.mockClear();
    instance.stop.mockClear();
  });

  systemSoundInstances.forEach((instance) => {
    instance.getEnabled.mockClear();
    instance.getSourceType.mockClear();
    instance.start.mockClear();
  });
}

installGlobals();

export const __zeusRuntime = {
  appState,
  ble,
  bleState,
  buzzerInstances,
  display,
  localStorageApi,
  router,
  routerState,
  systemSoundInstances
};

export {
  Battery,
  Buzzer,
  LocalStorage,
  SystemSounds,
  ble,
  display,
  router
};
