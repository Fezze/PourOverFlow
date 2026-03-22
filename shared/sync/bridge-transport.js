import { extractAppBridgePayload } from "./bridge-frame.js";

export const BRIDGE_TRANSPORT_CONFIG = Object.freeze({
  magic: 0x504f4654, // POFT
  version: 1,
  headerSize: 24,
  maxChunkPayloadSize: 3000,
  assemblyTtlMs: 60_000
});

const BRIDGE_TRANSPORT_STATUS = Object.freeze({
  COMPLETE: "complete",
  PENDING: "pending",
  INVALID: "invalid"
});

let nextTransferId = 1;

function allocateTransferId() {
  const transferId = nextTransferId;
  nextTransferId = nextTransferId >= 0x7fffffff ? 1 : nextTransferId + 1;
  return transferId;
}

function clampChunkPayloadSize(chunkPayloadSize) {
  if (!Number.isFinite(chunkPayloadSize) || chunkPayloadSize <= 0) {
    return BRIDGE_TRANSPORT_CONFIG.maxChunkPayloadSize;
  }

  return Math.floor(chunkPayloadSize);
}

function copyArrayBuffer(buffer) {
  return buffer.slice(0);
}

function concatArrayBuffers(buffers, totalBytes) {
  const targetBuffer = new ArrayBuffer(totalBytes);
  const targetView = new Uint8Array(targetBuffer);
  let offset = 0;

  buffers.forEach((buffer) => {
    const chunkView = new Uint8Array(buffer);
    targetView.set(chunkView, offset);
    offset += chunkView.byteLength;
  });

  return targetBuffer;
}

function normalizeTransportBuffer(data, size) {
  return extractAppBridgePayload(data, size);
}

function parseChunkHeader(buffer) {
  if (!buffer || buffer.byteLength < BRIDGE_TRANSPORT_CONFIG.headerSize) {
    return null;
  }

  const view = new DataView(buffer);
  const magic = view.getUint32(0, true);

  if (magic !== BRIDGE_TRANSPORT_CONFIG.magic) {
    return null;
  }

  const version = view.getUint8(4);
  const transferId = view.getUint32(8, true);
  const chunkIndex = view.getUint16(12, true);
  const chunkCount = view.getUint16(14, true);
  const totalBytes = view.getUint32(16, true);
  const chunkBytes = view.getUint16(20, true);

  if (version !== BRIDGE_TRANSPORT_CONFIG.version) {
    return {
      invalid: true,
      reason: `Unsupported bridge transport version ${version}.`
    };
  }

  if (!transferId || chunkCount < 1 || chunkIndex >= chunkCount || totalBytes < 0 || chunkBytes < 0) {
    return {
      invalid: true,
      reason: "Bridge transport header carried invalid chunk metadata."
    };
  }

  if (BRIDGE_TRANSPORT_CONFIG.headerSize + chunkBytes !== buffer.byteLength) {
    return {
      invalid: true,
      reason: "Bridge transport chunk size did not match the payload length."
    };
  }

  return {
    transferId,
    chunkIndex,
    chunkCount,
    totalBytes,
    chunkBytes,
    payload: buffer.slice(BRIDGE_TRANSPORT_CONFIG.headerSize)
  };
}

function pruneTransportState(state, now = Date.now()) {
  state.assemblies.forEach((entry, transferId) => {
    if (now - entry.startedAt > BRIDGE_TRANSPORT_CONFIG.assemblyTtlMs) {
      state.assemblies.delete(transferId);
    }
  });
}

export function createBridgeTransportState() {
  return {
    assemblies: new Map()
  };
}

export function buildChunkedBridgeTransportPayloads(payload, options = {}) {
  const normalizedPayload = normalizeTransportBuffer(payload);

  if (!normalizedPayload) {
    return [];
  }

  const maxChunkPayloadSize = clampChunkPayloadSize(options.maxChunkPayloadSize);
  const transferId = Number.isFinite(options.transferId) ? options.transferId : allocateTransferId();
  const payloadView = new Uint8Array(normalizedPayload);
  const chunkCount = Math.max(1, Math.ceil(payloadView.byteLength / maxChunkPayloadSize));
  const frames = [];

  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
    const start = chunkIndex * maxChunkPayloadSize;
    const end = Math.min(start + maxChunkPayloadSize, payloadView.byteLength);
    const chunkBytes = end - start;
    const frameBuffer = new ArrayBuffer(BRIDGE_TRANSPORT_CONFIG.headerSize + chunkBytes);
    const frameView = new DataView(frameBuffer);
    const framePayload = new Uint8Array(frameBuffer, BRIDGE_TRANSPORT_CONFIG.headerSize, chunkBytes);

    frameView.setUint32(0, BRIDGE_TRANSPORT_CONFIG.magic, true);
    frameView.setUint8(4, BRIDGE_TRANSPORT_CONFIG.version);
    frameView.setUint8(5, 0);
    frameView.setUint16(6, 0, true);
    frameView.setUint32(8, transferId, true);
    frameView.setUint16(12, chunkIndex, true);
    frameView.setUint16(14, chunkCount, true);
    frameView.setUint32(16, payloadView.byteLength, true);
    frameView.setUint16(20, chunkBytes, true);
    frameView.setUint16(22, 0, true);
    framePayload.set(payloadView.subarray(start, end));
    frames.push(frameBuffer);
  }

  return frames;
}

export function readBridgeTransportPayload(state, data, size) {
  const normalizedPayload = normalizeTransportBuffer(data, size);

  if (!normalizedPayload) {
    return {
      status: BRIDGE_TRANSPORT_STATUS.INVALID,
      reason: "Missing bridge transport payload."
    };
  }

  const header = parseChunkHeader(normalizedPayload);

  if (!header) {
    return {
      status: BRIDGE_TRANSPORT_STATUS.COMPLETE,
      payload: copyArrayBuffer(normalizedPayload),
      chunked: false
    };
  }

  if (header.invalid) {
    return {
      status: BRIDGE_TRANSPORT_STATUS.INVALID,
      reason: header.reason
    };
  }

  pruneTransportState(state);

  let assembly = state.assemblies.get(header.transferId);

  if (!assembly) {
    assembly = {
      startedAt: Date.now(),
      totalBytes: header.totalBytes,
      chunkCount: header.chunkCount,
      receivedCount: 0,
      chunks: new Array(header.chunkCount)
    };
    state.assemblies.set(header.transferId, assembly);
  }

  if (assembly.totalBytes !== header.totalBytes || assembly.chunkCount !== header.chunkCount) {
    state.assemblies.delete(header.transferId);
    return {
      status: BRIDGE_TRANSPORT_STATUS.INVALID,
      reason: "Bridge transport chunk metadata changed mid-transfer."
    };
  }

  if (!assembly.chunks[header.chunkIndex]) {
    assembly.receivedCount += 1;
  }

  assembly.chunks[header.chunkIndex] = header.payload;

  if (assembly.receivedCount < assembly.chunkCount) {
    return {
      status: BRIDGE_TRANSPORT_STATUS.PENDING,
      transferId: header.transferId,
      chunkIndex: header.chunkIndex,
      chunkCount: header.chunkCount
    };
  }

  const payload = concatArrayBuffers(assembly.chunks, assembly.totalBytes);
  state.assemblies.delete(header.transferId);

  return {
    status: BRIDGE_TRANSPORT_STATUS.COMPLETE,
    payload,
    chunked: true,
    transferId: header.transferId,
    chunkCount: header.chunkCount
  };
}

export { BRIDGE_TRANSPORT_STATUS };
