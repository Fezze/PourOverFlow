import {
  ensurePhoneStorage,
  readPhoneSnapshot,
  saveHistoryEntry
} from "../shared/storage/phone-store";
import { SETTINGS_UI_STORAGE_KEY } from "../shared/storage/keys";
import { createSyncEnvelope } from "../shared/sync/contracts.js";
import { decodeEnvelopeFromPeerSocket, encodeEnvelopeForPeerSocket } from "../shared/sync/side-codec.js";
import { SYNC_MESSAGE_TYPES } from "../shared/sync/message-types";
import {
  buildPhoneCatalogSnapshot,
  buildPhoneHistorySnapshot,
  buildPhoneToolCatalogSnapshot
} from "../shared/sync/normalize";
import {
  getBootstrapResponseSlices,
  getOrderedPhoneSyncSlices,
  getStorageChangeSlices,
  PHONE_SYNC_SLICES
} from "../shared/sync/phone-sync-plan.js";
import {
  buildChunkedBridgeTransportPayloads,
  createBridgeTransportState,
  readBridgeTransportPayload
} from "../shared/sync/bridge-transport.js";

const STORAGE_PUSH_DEBOUNCE_MS = 150;
const inboundBridgeTransportState = createBridgeTransportState();

function removePeerSocketListener(peerSocket, listener) {
  if (!listener || !peerSocket || typeof peerSocket.removeListener !== "function") {
    return;
  }

  peerSocket.removeListener("message", listener);
}

function removeSettingsStorageListener(settingsStorage, listener) {
  if (!listener || !settingsStorage || typeof settingsStorage.removeListener !== "function") {
    return;
  }

  settingsStorage.removeListener("change", listener);
}

function destroyAppSideRuntime(service) {
  removePeerSocketListener(service.peerSocket, service.peerSocketMessageListener);
  removeSettingsStorageListener(service.settingsStorage, service.settingsStorageChangeListener);

  if (service.snapshotPushScheduler) {
    service.snapshotPushScheduler.destroy();
  }

  service.snapshotPushScheduler = null;
  service.peerSocket = null;
  service.peerSocketMessageListener = null;
  service.settingsStorage = null;
  service.settingsStorageChangeListener = null;
  service.runtimeReady = false;
}

function sendEnvelope(syncEnvelope) {
  try {
    if (!messaging || !messaging.peerSocket || typeof messaging.peerSocket.send !== "function") {
      return false;
    }

    const payload = encodeEnvelopeForPeerSocket(syncEnvelope);
    const transportFrames = buildChunkedBridgeTransportPayloads(payload);
    transportFrames.forEach((frameBuffer) => {
      messaging.peerSocket.send(frameBuffer);
    });
    return true;
  } catch (error) {
    console.log(`Failed to send phone sync envelope type=${syncEnvelope.messageType}`, error);
    return false;
  }
}

function pushSnapshotSlice(settingsStorage, phoneSnapshot, slice, requestId) {
  switch (slice) {
    case PHONE_SYNC_SLICES.TOOLS:
      return sendEnvelope(
        createSyncEnvelope(
          SYNC_MESSAGE_TYPES.PUSH_TOOL_CATALOG,
          buildPhoneToolCatalogSnapshot(phoneSnapshot),
          { requestId }
        )
      );
    case PHONE_SYNC_SLICES.CATALOG:
      return sendEnvelope(
        createSyncEnvelope(
          SYNC_MESSAGE_TYPES.PUSH_CATALOG_SNAPSHOT,
          buildPhoneCatalogSnapshot(settingsStorage, phoneSnapshot),
          { requestId }
        )
      );
    case PHONE_SYNC_SLICES.HISTORY:
      return sendEnvelope(
        createSyncEnvelope(
          SYNC_MESSAGE_TYPES.PUSH_HISTORY_SNAPSHOT,
          buildPhoneHistorySnapshot(phoneSnapshot),
          { requestId }
        )
      );
    default:
      return false;
  }
}

function pushSnapshotSlices(settingsStorage, options = {}) {
  const phoneSnapshot = readPhoneSnapshot(settingsStorage);
  const orderedSlices = getOrderedPhoneSyncSlices(
    options.slices || [
      PHONE_SYNC_SLICES.TOOLS,
      PHONE_SYNC_SLICES.CATALOG,
      PHONE_SYNC_SLICES.HISTORY
    ]
  );

  if (!orderedSlices.length) {
    return false;
  }

  let sentAny = false;

  orderedSlices.forEach((slice) => {
    sentAny = pushSnapshotSlice(settingsStorage, phoneSnapshot, slice, options.requestId) || sentAny;
  });

  return sentAny;
}

function createSnapshotPushScheduler() {
  let pendingTimerId = null;
  const pendingSlices = new Set();

  function clearPendingTimer() {
    if (pendingTimerId !== null) {
      clearTimeout(pendingTimerId);
      pendingTimerId = null;
    }
  }

  return {
    flush(settingsStorage, options = {}) {
      clearPendingTimer();
      const slices = getOrderedPhoneSyncSlices(options.slices || pendingSlices);
      pendingSlices.clear();
      return pushSnapshotSlices(settingsStorage, {
        requestId: options.requestId,
        slices
      });
    },
    schedule(settingsStorage, changedKey) {
      const slices = getStorageChangeSlices(changedKey);

      if (!slices.length) {
        return false;
      }

      slices.forEach((slice) => pendingSlices.add(slice));
      clearPendingTimer();
      pendingTimerId = setTimeout(() => {
        pendingTimerId = null;
        const scheduledSlices = getOrderedPhoneSyncSlices(pendingSlices);
        pendingSlices.clear();
        pushSnapshotSlices(settingsStorage, {
          slices: scheduledSlices
        });
      }, STORAGE_PUSH_DEBOUNCE_MS);
      return true;
    },
    destroy() {
      pendingSlices.clear();
      clearPendingTimer();
    }
  };
}

function ensureAppSideRuntime(service) {
  if (service && service.runtimeReady) {
    return true;
  }

  try {
    const settingsStorage = settings.settingsStorage;
    const peerSocket = messaging && messaging.peerSocket ? messaging.peerSocket : null;
    const snapshotPushScheduler = createSnapshotPushScheduler();
    ensurePhoneStorage(settingsStorage);

    if (!peerSocket || typeof peerSocket.addListener !== "function") {
      snapshotPushScheduler.destroy();
      return false;
    }

    const peerSocketMessageListener = (payload) => {
      const transportResult = readBridgeTransportPayload(inboundBridgeTransportState, payload);

      if (transportResult.status === "pending") {
        return;
      }

      if (transportResult.status !== "complete") {
        console.log(`App-side rejected transport payload: ${transportResult.reason}`);
        return;
      }

      const syncEnvelope = decodeEnvelopeFromPeerSocket(transportResult.payload);

      if (!syncEnvelope) {
        console.log("App-side failed to decode peerSocket payload");
        return;
      }

      if (syncEnvelope.messageType === SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP) {
        ensurePhoneStorage(settingsStorage, {
          preferredLocale: syncEnvelope.payload?.preferredLocale || null
        });
        const phoneSnapshot = readPhoneSnapshot(settingsStorage);
        const responseSlices = getBootstrapResponseSlices(syncEnvelope.payload, phoneSnapshot.syncMeta);

        snapshotPushScheduler.flush(settingsStorage, {
          requestId: syncEnvelope.requestId,
          slices: responseSlices
        });
        return;
      }

      if (syncEnvelope.messageType === SYNC_MESSAGE_TYPES.UPSERT_HISTORY_ENTRY) {
        const result = saveHistoryEntry(settingsStorage, syncEnvelope.payload.entry);

        if (!result.ok) {
          console.log(`Rejected history entry: ${result.issues.join(" ")}`);
          return;
        }

        sendEnvelope(
          createSyncEnvelope(
            SYNC_MESSAGE_TYPES.ACK_HISTORY_ENTRY,
            {
              historyId: result.historyEntry.historyId,
              historyRevision: result.syncMeta.historyRevision
            },
            {
              requestId: syncEnvelope.requestId
            }
          )
        );
        snapshotPushScheduler.flush(settingsStorage, {
          requestId: syncEnvelope.requestId,
          slices: [PHONE_SYNC_SLICES.HISTORY]
        });
      }
    };

    const settingsStorageChangeListener = ({ key }) => {
      if (key === SETTINGS_UI_STORAGE_KEY) {
        return;
      }
      snapshotPushScheduler.schedule(settingsStorage, key);
    };

    service.snapshotPushScheduler = snapshotPushScheduler;
    service.settingsStorage = settingsStorage;
    service.peerSocket = peerSocket;
    service.peerSocketMessageListener = peerSocketMessageListener;
    service.settingsStorageChangeListener = settingsStorageChangeListener;

    peerSocket.addListener("message", peerSocketMessageListener);
    settingsStorage.addListener("change", settingsStorageChangeListener);

    service.runtimeReady = true;
    return true;
  } catch (error) {
    destroyAppSideRuntime(service);
    console.log("PourOverFlow app-side runtime setup failed", error);
    if (error && error.stack) {
      console.log(error.stack);
    }
    return false;
  }
}

AppSideService({
  onInit() {
    ensureAppSideRuntime(this);
  },
  onRun() {
    ensureAppSideRuntime(this);
  },
  onDestroy() {
    destroyAppSideRuntime(this);
  }
});
