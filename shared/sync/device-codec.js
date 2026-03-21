import { bufferToString, stringToBuffer } from "@zos/utils";
import { fromSyncEnvelopeJson } from "./decode";
import { toSyncEnvelopeJson } from "./encode";

function normalizeIncomingBuffer(data, size) {
  if (!data) {
    return null;
  }

  let buffer = null;

  if (data instanceof ArrayBuffer) {
    buffer = data;
  } else if (data.buffer instanceof ArrayBuffer) {
    buffer = data.buffer;
  }

  if (!buffer) {
    return null;
  }

  if (Number.isFinite(size) && size >= 0 && size < buffer.byteLength) {
    return buffer.slice(0, size);
  }

  return buffer;
}

export function encodeEnvelopeForBle(syncEnvelope) {
  const buffer = stringToBuffer(toSyncEnvelopeJson(syncEnvelope));

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

  return fromSyncEnvelopeJson(bufferToString(buffer));
}
