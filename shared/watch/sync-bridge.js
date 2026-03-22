import {
  addListener,
  connectStatus,
  createConnect,
  disConnect,
  removeListener,
  send as bleSend
} from "@zos/ble";
import {
  ackPendingHistoryEntry,
  applyCatalogSnapshot,
  applyHistorySnapshot,
  applyToolCatalogSnapshot,
  getPendingHistoryQueue,
  isWatchConnected,
  readWatchSyncMeta,
  setConnectionStatus
} from "../storage/watch-store";
import { createSyncEnvelope } from "../sync/contracts.js";
import { decodeEnvelopeFromBlePayload, encodeEnvelopeForBle } from "../sync/device-codec";
import { SYNC_MESSAGE_TYPES } from "../sync/message-types";

let isInitialized = false;
let hasPrimedRuntimeSync = false;

function sendEnvelope(syncEnvelope) {
  const { buffer, size } = encodeEnvelopeForBle(syncEnvelope);

  if (typeof bleSend !== "function") {
    throw new TypeError("BLE send is unavailable in the current runtime");
  }

  bleSend(buffer, size);
}

function safeSendEnvelope(syncEnvelope) {
  if (!isWatchConnected() || typeof bleSend !== "function") {
    return false;
  }

  try {
    sendEnvelope(syncEnvelope);
    return true;
  } catch (error) {
    console.log("Failed to send watch sync envelope", error);
    return false;
  }
}

function handleIncomingMessage(index, data, size) {
  const syncEnvelope = decodeEnvelopeFromBlePayload(data, size);

  if (!syncEnvelope) {
    return;
  }

  switch (syncEnvelope.messageType) {
    case SYNC_MESSAGE_TYPES.PUSH_TOOL_CATALOG:
      applyToolCatalogSnapshot(syncEnvelope.payload);
      return;
    case SYNC_MESSAGE_TYPES.PUSH_CATALOG_SNAPSHOT:
      applyCatalogSnapshot(syncEnvelope.payload);
      return;
    case SYNC_MESSAGE_TYPES.PUSH_HISTORY_SNAPSHOT:
      applyHistorySnapshot(syncEnvelope.payload);
      return;
    case SYNC_MESSAGE_TYPES.ACK_HISTORY_ENTRY:
      ackPendingHistoryEntry(syncEnvelope.payload.historyId, syncEnvelope.payload.historyRevision);
      return;
    default:
      console.log(`Unhandled watch sync message: ${syncEnvelope.messageType} (index=${index})`);
  }
}

function handleConnectionStatus(status) {
  const connected = Boolean(status) && typeof bleSend === "function";
  setConnectionStatus(connected);

  if (!connected) {
    return;
  }

  requestBootstrap();
  flushPendingHistoryQueue();
}

export function initWatchSyncBridge() {
  if (isInitialized) {
    return;
  }

  try {
    createConnect(handleIncomingMessage);
    addListener(handleConnectionStatus);
    isInitialized = true;
    setConnectionStatus(Boolean(connectStatus()) && typeof bleSend === "function");
  } catch (error) {
    console.log("Failed to initialize watch sync bridge", error);
    setConnectionStatus(false);
  }
}

export function destroyWatchSyncBridge() {
  if (!isInitialized) {
    return;
  }

  removeListener();
  disConnect();
  setConnectionStatus(false);
  isInitialized = false;
  hasPrimedRuntimeSync = false;
}

export function primeWatchSyncBridge() {
  initWatchSyncBridge();

  if (hasPrimedRuntimeSync || !isWatchConnected()) {
    return false;
  }

  // Temporary Stage 6 debug posture:
  // keep first paint independent from an immediate bootstrap send while the
  // simulator-side @zos/ble.send path is being debugged.
  hasPrimedRuntimeSync = true;
  return true;
}

export function requestBootstrap() {
  const syncMeta = readWatchSyncMeta();

  return safeSendEnvelope(
    createSyncEnvelope(SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP, {
      knownToolCatalogRevision: syncMeta.toolCatalogRevision,
      knownRecipeCatalogRevision: syncMeta.recipeCatalogRevision,
      knownHistoryRevision: syncMeta.historyRevision
    })
  );
}

export function queueHistoryEntryForSync(historyEntry) {
  return safeSendEnvelope(
    createSyncEnvelope(SYNC_MESSAGE_TYPES.UPSERT_HISTORY_ENTRY, {
      entry: historyEntry
    })
  );
}

export function flushPendingHistoryQueue() {
  if (!isWatchConnected()) {
    return false;
  }

  const pendingHistoryQueue = getPendingHistoryQueue();
  let sentAny = false;

  pendingHistoryQueue.forEach((historyEntry) => {
    sentAny = queueHistoryEntryForSync(historyEntry) || sentAny;
  });

  return sentAny;
}
