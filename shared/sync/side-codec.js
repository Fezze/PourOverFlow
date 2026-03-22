import { extractAppBridgePayload } from "./bridge-frame.js";
import { fromSyncEnvelopeJson } from "./decode.js";
import { toSyncEnvelopeJson } from "./encode.js";

function bufferToArrayBuffer(nodeBuffer) {
  return nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength);
}

function arrayBufferToString(payload) {
  if (typeof Buffer !== "undefined") {
    if (payload instanceof ArrayBuffer) {
      return Buffer.from(payload).toString("utf-8");
    }

    if (ArrayBuffer.isView(payload)) {
      return Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength).toString("utf-8");
    }
  }

  const decoder = new TextDecoder("utf-8");
  if (payload instanceof ArrayBuffer) {
    return decoder.decode(new Uint8Array(payload));
  }

  if (ArrayBuffer.isView(payload)) {
    return decoder.decode(payload);
  }

  return "";
}

export function encodeEnvelopeForPeerSocket(syncEnvelope) {
  const rawValue = toSyncEnvelopeJson(syncEnvelope);

  if (typeof Buffer !== "undefined") {
    return bufferToArrayBuffer(Buffer.from(rawValue, "utf-8"));
  }

  return new TextEncoder().encode(rawValue).buffer;
}

export function decodeEnvelopeFromPeerSocket(payload) {
  const normalizedPayload = extractAppBridgePayload(payload);

  if (!normalizedPayload) {
    return null;
  }

  return fromSyncEnvelopeJson(arrayBufferToString(normalizedPayload));
}
