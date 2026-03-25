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
import {
  APP_BRIDGE_MESSAGE_TYPES,
  buildAppBridgeDataFrame,
  buildAppBridgeShakeFrame,
  parseAppBridgeFrame
} from "../sync/bridge-frame.js";
import {
  buildChunkedBridgeTransportPayloads,
  createBridgeTransportState,
  readBridgeTransportPayload
} from "../sync/bridge-transport.js";
import { SYNC_MESSAGE_TYPES } from "../sync/message-types";
import { logValidation } from "./validation-log";

let isInitialized = false;
let hasPrimedRuntimeSync = false;
let appSidePort = 0;
let hasResolvedShake = false;
let shouldBootstrapAfterShake = false;
let shouldFlushQueueAfterShake = false;
const inboundBridgeTransportState = createBridgeTransportState();

function canAttemptBridgeSend() {
  return typeof bleSend === "function";
}

function isBridgeTransportConnected() {
  return Boolean(connectStatus()) || isWatchConnected();
}

function markBridgeHandshakeResolved(reason, options = {}) {
  hasResolvedShake = true;

  if (options.markConnected) {
    setConnectionStatus(true);
  }
}

function sendBuffer(buffer, size, label) {
  if (typeof bleSend !== "function") {
    throw new TypeError("BLE send is unavailable in the current runtime");
  }

  return bleSend(buffer, size);
}

function sendShake() {
  const { buffer, size } = buildAppBridgeShakeFrame({
    port2: appSidePort
  });

  try {
    sendBuffer(buffer, size, "SHAKE");
    markBridgeHandshakeResolved("local-shake-send");
    return true;
  } catch (error) {
    console.log("Failed to send watch sync shake", error);
    if (error && error.stack) {
      console.log(error.stack);
    }
    return false;
  }
}

function hasBridgeHandshake() {
  return hasResolvedShake;
}

function sendEnvelope(syncEnvelope) {
  const { buffer: payloadBuffer } = encodeEnvelopeForBle(syncEnvelope);
  const transportFrames = buildChunkedBridgeTransportPayloads(payloadBuffer);

  transportFrames.forEach((transportFrame, chunkIndex) => {
    const { buffer, size } = buildAppBridgeDataFrame(transportFrame, {
      port2: appSidePort
    });

    sendBuffer(buffer, size, `${syncEnvelope.messageType}#${chunkIndex + 1}/${transportFrames.length}`);
  });

  return transportFrames.length > 0;
}

function safeSendEnvelope(syncEnvelope) {
  if (!canAttemptBridgeSend()) {
    return false;
  }

  if (!hasBridgeHandshake()) {
    sendShake();
    return false;
  }

  try {
    sendEnvelope(syncEnvelope);
    return true;
  } catch (error) {
    console.log(`Failed to send watch sync envelope type=${syncEnvelope.messageType}`, error);
    if (error && error.stack) {
      console.log(error.stack);
    }
    return false;
  }
}

function flushStartupSyncIfReady() {
  if (!hasBridgeHandshake()) {
    sendShake();
    return false;
  }

  const requestedBootstrap = shouldBootstrapAfterShake ? requestBootstrap() : false;
  const flushedQueue = shouldFlushQueueAfterShake ? flushPendingHistoryQueue() : false;

  shouldBootstrapAfterShake = false;
  shouldFlushQueueAfterShake = false;

  return requestedBootstrap || flushedQueue;
}

function handleIncomingMessage(index, data, size) {
  const bridgeFrame = parseAppBridgeFrame(data, size);

  if (bridgeFrame && Number.isFinite(bridgeFrame.port2)) {
    appSidePort = bridgeFrame.port2;
  }

  if (bridgeFrame && bridgeFrame.type === APP_BRIDGE_MESSAGE_TYPES.SHAKE) {
    markBridgeHandshakeResolved("remote-shake", { markConnected: true });
    flushStartupSyncIfReady();
    return;
  }

  const transportResult = readBridgeTransportPayload(
    inboundBridgeTransportState,
    bridgeFrame ? bridgeFrame.payload : data,
    bridgeFrame ? bridgeFrame.payload.byteLength : size
  );

  if (transportResult.status === "pending") {
    return;
  }

  if (transportResult.status !== "complete") {
    console.log(`Watch sync bridge rejected transport payload index=${index} size=${size}: ${transportResult.reason}`);
    return;
  }

  const syncEnvelope = decodeEnvelopeFromBlePayload(
    transportResult.payload,
    transportResult.payload.byteLength
  );

  if (!syncEnvelope) {
    console.log(`Watch sync bridge ignored undecodable payload index=${index} size=${size}`);
    return;
  }

  markBridgeHandshakeResolved("incoming-sync-envelope", { markConnected: true });

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
    appSidePort = 0;
    hasResolvedShake = false;
    return;
  }

  shouldBootstrapAfterShake = true;
  shouldFlushQueueAfterShake = true;
  sendShake();
  flushStartupSyncIfReady();
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

    if (Boolean(connectStatus()) && typeof bleSend === "function") {
      shouldBootstrapAfterShake = true;
      shouldFlushQueueAfterShake = true;
      sendShake();
      flushStartupSyncIfReady();
    }
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
  appSidePort = 0;
  hasResolvedShake = false;
  shouldBootstrapAfterShake = false;
  shouldFlushQueueAfterShake = false;
}

export function primeWatchSyncBridge() {
  if (hasPrimedRuntimeSync) {
    return false;
  }

  hasPrimedRuntimeSync = true;

  shouldBootstrapAfterShake = true;
  shouldFlushQueueAfterShake = true;

  if (!canAttemptBridgeSend() || !isBridgeTransportConnected()) {
    return false;
  }

  if (!hasBridgeHandshake()) {
    sendShake();
    return false;
  }

  return flushStartupSyncIfReady();
}

export function requestBootstrap() {
  if (!canAttemptBridgeSend() || !isBridgeTransportConnected()) {
    logValidation("bootstrap_skip", {
      connected: isBridgeTransportConnected(),
      bleSendType: typeof bleSend
    });
    return false;
  }

  if (!hasBridgeHandshake()) {
    sendShake();
  }

  if (!hasBridgeHandshake()) {
    return false;
  }

  const syncMeta = readWatchSyncMeta();

  logValidation("bootstrap_request", {
    knownToolCatalogRevision: syncMeta.toolCatalogRevision,
    knownRecipeCatalogRevision: syncMeta.recipeCatalogRevision,
    knownHistoryRevision: syncMeta.historyRevision
  });

  return safeSendEnvelope(
    createSyncEnvelope(SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP, {
      knownToolCatalogRevision: syncMeta.toolCatalogRevision,
      knownRecipeCatalogRevision: syncMeta.recipeCatalogRevision,
      knownHistoryRevision: syncMeta.historyRevision
    })
  );
}

export function queueHistoryEntryForSync(historyEntry) {
  if (!canAttemptBridgeSend() || !isBridgeTransportConnected()) {
    logValidation("history_send_skip", {
      historyId: historyEntry && historyEntry.historyId ? historyEntry.historyId : null,
      connected: isBridgeTransportConnected(),
      bleSendType: typeof bleSend
    });
    return false;
  }

  if (!hasBridgeHandshake()) {
    sendShake();
  }

  if (!hasBridgeHandshake()) {
    return false;
  }

  logValidation("history_send_attempt", {
    historyId: historyEntry.historyId,
    status: historyEntry.status
  });

  return safeSendEnvelope(
    createSyncEnvelope(SYNC_MESSAGE_TYPES.UPSERT_HISTORY_ENTRY, {
      entry: historyEntry
    })
  );
}

export function flushPendingHistoryQueue() {
  if (!canAttemptBridgeSend() || !isBridgeTransportConnected()) {
    logValidation("history_flush_skip", {
      connected: isBridgeTransportConnected(),
      bleSendType: typeof bleSend,
      pendingHistoryCount: getPendingHistoryQueue().length
    });
    return false;
  }

  if (!hasBridgeHandshake()) {
    sendShake();
  }

  if (!hasBridgeHandshake()) {
    return false;
  }

  const pendingHistoryQueue = getPendingHistoryQueue();
  let sentAny = false;

  logValidation("history_flush_attempt", {
    pendingHistoryCount: pendingHistoryQueue.length
  });

  pendingHistoryQueue.forEach((historyEntry) => {
    sentAny = queueHistoryEntryForSync(historyEntry) || sentAny;
  });

  logValidation("history_flush_result", {
    pendingHistoryCount: pendingHistoryQueue.length,
    sentAny
  });

  return sentAny;
}
