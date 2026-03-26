export const APP_BRIDGE_CONFIG = Object.freeze({
  appId: 20001,
  appDevicePort: 20,
  headerSize: 16
});

export const APP_BRIDGE_MESSAGE_TYPES = Object.freeze({
  SHAKE: 0x1,
  CLOSE: 0x2,
  HEART: 0x3,
  DATA: 0x4,
  DATA_WITH_SYSTEM_TOOL: 0x5,
  LOG: 0x6
});

const MESSAGE_FLAG_APP = 0x1;
const MESSAGE_VERSION_1 = 0x1;

function extractEventPayload(data) {
  if (!data) {
    return null;
  }

  if (typeof data === "object" && "data" in data && data.data) {
    return extractEventPayload(data.data);
  }

  if (data instanceof ArrayBuffer) {
    return data;
  }

  if (ArrayBuffer.isView(data)) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }

  if (data.buffer instanceof ArrayBuffer) {
    const byteOffset = Number.isFinite(data.byteOffset) ? data.byteOffset : 0;
    const byteLength = Number.isFinite(data.byteLength) ? data.byteLength : data.buffer.byteLength;
    return data.buffer.slice(byteOffset, byteOffset + byteLength);
  }

  return null;
}

function normalizeBufferSlice(data, size) {
  const buffer = extractEventPayload(data);

  if (!buffer) {
    return null;
  }

  if (Number.isFinite(size) && size >= 0 && size < buffer.byteLength) {
    return buffer.slice(0, size);
  }

  return buffer;
}

function toUint8Array(buffer) {
  return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
}

export function buildAppBridgeFrame(payload, options = {}) {
  const payloadBuffer = normalizeBufferSlice(payload);
  const safePayloadBuffer = payloadBuffer || new ArrayBuffer(0);
  const frameBuffer = new ArrayBuffer(APP_BRIDGE_CONFIG.headerSize + safePayloadBuffer.byteLength);
  const frameView = new DataView(frameBuffer);
  const payloadView = toUint8Array(safePayloadBuffer);

  frameView.setUint8(0, MESSAGE_FLAG_APP);
  frameView.setUint8(1, MESSAGE_VERSION_1);
  frameView.setUint16(2, options.messageType || APP_BRIDGE_MESSAGE_TYPES.DATA, true);
  frameView.setUint16(4, options.port1 || APP_BRIDGE_CONFIG.appDevicePort, true);
  frameView.setUint16(6, options.port2 || 0, true);
  frameView.setUint32(8, options.appId || APP_BRIDGE_CONFIG.appId, true);
  frameView.setUint32(12, options.extra || 0, true);
  new Uint8Array(frameBuffer, APP_BRIDGE_CONFIG.headerSize).set(payloadView);

  return {
    buffer: frameBuffer,
    size: frameBuffer.byteLength
  };
}

export function buildAppBridgeDataFrame(payload, options = {}) {
  return buildAppBridgeFrame(payload, {
    ...options,
    messageType: APP_BRIDGE_MESSAGE_TYPES.DATA
  });
}

export function buildAppBridgeShakeFrame(options = {}) {
  return buildAppBridgeFrame(new Uint8Array([(options.appId || APP_BRIDGE_CONFIG.appId) & 0xff]).buffer, {
    ...options,
    messageType: APP_BRIDGE_MESSAGE_TYPES.SHAKE
  });
}

export function parseAppBridgeFrame(data, size) {
  const buffer = normalizeBufferSlice(data, size);

  if (!buffer || buffer.byteLength < APP_BRIDGE_CONFIG.headerSize) {
    return null;
  }

  const view = new DataView(buffer);
  const flag = view.getUint8(0);
  const version = view.getUint8(1);

  if (flag !== MESSAGE_FLAG_APP || version !== MESSAGE_VERSION_1) {
    return null;
  }

  return {
    flag,
    version,
    type: view.getUint16(2, true),
    port1: view.getUint16(4, true),
    port2: view.getUint16(6, true),
    appId: view.getUint32(8, true),
    extra: view.getUint32(12, true),
    payload: buffer.slice(APP_BRIDGE_CONFIG.headerSize)
  };
}

export function extractAppBridgePayload(data, size) {
  const frame = parseAppBridgeFrame(data, size);
  return frame ? frame.payload : normalizeBufferSlice(data, size);
}

export function readCurrentAppSidePort() {
  try {
    if (typeof getApp === "function") {
      const app = getApp();
      if (app && Number.isFinite(app.port2)) {
        return app.port2;
      }
    }
  } catch (error) {
    console.log("Failed to read app-side port from getApp()", error);
  }

  return 0;
}
