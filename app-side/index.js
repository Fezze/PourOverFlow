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
  buildChunkedBridgeTransportPayloads,
  createBridgeTransportState,
  readBridgeTransportPayload
} from "../shared/sync/bridge-transport.js";

const STORAGE_PUSH_DEBOUNCE_MS = 150;
const inboundBridgeTransportState = createBridgeTransportState();

console.log("PourOverFlow app-side module loaded");

function sendEnvelope(syncEnvelope) {
  try {
    if (!messaging || !messaging.peerSocket || typeof messaging.peerSocket.send !== "function") {
      console.log("App-side peerSocket send is unavailable");
      return false;
    }

    const payload = encodeEnvelopeForPeerSocket(syncEnvelope);
    const transportFrames = buildChunkedBridgeTransportPayloads(payload);
    console.log(
      `App-side sending sync envelope type=${syncEnvelope.messageType} bytes=${payload ? payload.byteLength : "n/a"} chunks=${transportFrames.length}`
    );
    transportFrames.forEach((frameBuffer) => {
      messaging.peerSocket.send(frameBuffer);
    });
    return true;
  } catch (error) {
    console.log(`Failed to send phone sync envelope type=${syncEnvelope.messageType}`, error);
    return false;
  }
}

function pushBootstrapSnapshots(settingsStorage, requestId) {
  const phoneSnapshot = readPhoneSnapshot(settingsStorage);

  sendEnvelope(
    createSyncEnvelope(
      SYNC_MESSAGE_TYPES.PUSH_TOOL_CATALOG,
      buildPhoneToolCatalogSnapshot(phoneSnapshot),
      { requestId }
    )
  );
  sendEnvelope(
    createSyncEnvelope(
      SYNC_MESSAGE_TYPES.PUSH_CATALOG_SNAPSHOT,
      buildPhoneCatalogSnapshot(settingsStorage, phoneSnapshot),
      { requestId }
    )
  );
  sendEnvelope(
    createSyncEnvelope(
      SYNC_MESSAGE_TYPES.PUSH_HISTORY_SNAPSHOT,
      buildPhoneHistorySnapshot(phoneSnapshot),
      { requestId }
    )
  );
}

function createBootstrapPushScheduler() {
  let pendingTimerId = null;

  function clearPendingTimer() {
    if (pendingTimerId !== null) {
      clearTimeout(pendingTimerId);
      pendingTimerId = null;
    }
  }

  return {
    flush(settingsStorage, requestId) {
      clearPendingTimer();
      pushBootstrapSnapshots(settingsStorage, requestId);
    },
    schedule(settingsStorage) {
      clearPendingTimer();
      pendingTimerId = setTimeout(() => {
        pendingTimerId = null;
        pushBootstrapSnapshots(settingsStorage);
      }, STORAGE_PUSH_DEBOUNCE_MS);
    },
    destroy() {
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
    const bootstrapPushScheduler = createBootstrapPushScheduler();
    service.bootstrapPushScheduler = bootstrapPushScheduler;
    service.settingsStorage = settingsStorage;
    const snapshot = ensurePhoneStorage(settingsStorage);
    console.log(
      `PourOverFlow app-side ready. tools=${snapshot.tools.length} recipes=${snapshot.recipeIndex.length} history=${snapshot.historyIndex.length}`
    );

    if (!messaging || !messaging.peerSocket || typeof messaging.peerSocket.addListener !== "function") {
      console.log("App-side peerSocket listener is unavailable");
      return false;
    }

    messaging.peerSocket.addListener("message", (payload) => {
      console.log(`App-side received peerSocket payload bytes=${payload ? payload.byteLength : "n/a"}`);
      const transportResult = readBridgeTransportPayload(inboundBridgeTransportState, payload);

      if (transportResult.status === "pending") {
        console.log(
          `App-side waiting for chunked sync envelope transfer=${transportResult.transferId} chunk=${transportResult.chunkIndex + 1}/${transportResult.chunkCount}`
        );
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

      console.log(`App-side decoded sync envelope type=${syncEnvelope.messageType}`);

      if (syncEnvelope.messageType === SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP) {
        bootstrapPushScheduler.flush(settingsStorage, syncEnvelope.requestId);
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
        bootstrapPushScheduler.flush(settingsStorage, syncEnvelope.requestId);
      }
    });

    settingsStorage.addListener("change", ({ key }) => {
      if (key === SETTINGS_UI_STORAGE_KEY) {
        return;
      }

      const nextSnapshot = readPhoneSnapshot(settingsStorage);
      console.log(
        `settingsStorage changed: ${key} (tools=${nextSnapshot.tools.length}, recipes=${nextSnapshot.recipeIndex.length}, history=${nextSnapshot.historyIndex.length})`
      );
      bootstrapPushScheduler.schedule(settingsStorage);
    });

    service.runtimeReady = true;
    return true;
  } catch (error) {
    console.log("PourOverFlow app-side runtime setup failed", error);
    if (error && error.stack) {
      console.log(error.stack);
    }
    return false;
  }
}

AppSideService({
  onInit() {
    console.log("PourOverFlow app-side onInit");
    ensureAppSideRuntime(this);
  },
  onRun() {
    console.log("PourOverFlow app-side onRun");
    ensureAppSideRuntime(this);
  },
  onDestroy() {
    if (this.bootstrapPushScheduler) {
      this.bootstrapPushScheduler.destroy();
      this.bootstrapPushScheduler = null;
    }
  }
});
