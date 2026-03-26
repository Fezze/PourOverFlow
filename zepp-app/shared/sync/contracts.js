import { CURRENT_SCHEMA_VERSION, createGeneratedId } from "../domain/schema.js";
import { SYNC_MESSAGE_TYPES } from "./message-types.js";

export function isSyncMessageType(messageType) {
  return Object.values(SYNC_MESSAGE_TYPES).includes(messageType);
}

export function createSyncEnvelope(messageType, payload, options = {}) {
  const sentAt = Number.isFinite(options.sentAt) ? options.sentAt : Date.now();

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    messageType,
    requestId: options.requestId || createGeneratedId("req", sentAt),
    sentAt,
    payload
  };
}

export function validateSyncEnvelope(syncEnvelope) {
  const issues = [];

  if (!syncEnvelope || typeof syncEnvelope !== "object") {
    issues.push("Sync envelope must be an object.");
    return issues;
  }

  if (syncEnvelope.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    issues.push(`Sync envelope must carry schemaVersion ${CURRENT_SCHEMA_VERSION}.`);
  }

  if (!isSyncMessageType(syncEnvelope.messageType)) {
    issues.push("Sync envelope must use a supported messageType.");
  }

  if (!syncEnvelope.requestId || !String(syncEnvelope.requestId).trim()) {
    issues.push("Sync envelope must have a requestId.");
  }

  if (!Number.isFinite(syncEnvelope.sentAt)) {
    issues.push("Sync envelope sentAt must be a number.");
  }

  if (!("payload" in syncEnvelope)) {
    issues.push("Sync envelope must carry a payload.");
  }

  return issues;
}
