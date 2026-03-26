import { extractAppBridgePayload } from "./bridge-frame.js";
import { fromSyncEnvelopeJson } from "./decode.js";
import { toSyncEnvelopeJson } from "./encode.js";

function encodeUtf8ToArrayBuffer(rawValue) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(rawValue).buffer;
  }

  const encoded = unescape(encodeURIComponent(rawValue));
  const bytes = new Uint8Array(encoded.length);

  for (let index = 0; index < encoded.length; index += 1) {
    bytes[index] = encoded.charCodeAt(index);
  }

  return bytes.buffer;
}

function decodeUtf8FromArrayBuffer(buffer) {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
  }

  let encoded = "";
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < bytes.length; index += 1) {
    encoded += String.fromCharCode(bytes[index]);
  }

  return decodeURIComponent(escape(encoded));
}

function normalizeIncomingBuffer(data, size) {
  return extractAppBridgePayload(data, size);
}

export function encodeEnvelopeForBle(syncEnvelope) {
  const buffer = encodeUtf8ToArrayBuffer(toSyncEnvelopeJson(syncEnvelope));

  return {
    buffer,
    size: buffer.byteLength
  };
}

export function decodeEnvelopeFromBlePayload(data, size) {
  const buffer = normalizeIncomingBuffer(data, size);

  if (!buffer) {
    return null;
  }

  return fromSyncEnvelopeJson(decodeUtf8FromArrayBuffer(buffer));
}
