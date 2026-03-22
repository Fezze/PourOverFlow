import * as messaging from "@zos/messaging";
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

const STORAGE_PUSH_DEBOUNCE_MS = 150;

function sendEnvelope(syncEnvelope) {
  try {
    messaging.peerSocket.send(encodeEnvelopeForPeerSocket(syncEnvelope));
    return true;
  } catch (error) {
    console.log("Failed to send phone sync envelope", error);
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

AppSideService({
  onInit() {
    const settingsStorage = settings.settingsStorage;
    const bootstrapPushScheduler = createBootstrapPushScheduler();
    this.bootstrapPushScheduler = bootstrapPushScheduler;
    const snapshot = ensurePhoneStorage(settingsStorage);
    console.log(
      `PourOverFlow app-side ready. tools=${snapshot.tools.length} recipes=${snapshot.recipeIndex.length} history=${snapshot.historyIndex.length}`
    );

    messaging.peerSocket.addListener("message", (payload) => {
      const syncEnvelope = decodeEnvelopeFromPeerSocket(payload);

      if (!syncEnvelope) {
        return;
      }

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
  },
  onRun() {},
  onDestroy() {
    if (this.bootstrapPushScheduler) {
      this.bootstrapPushScheduler.destroy();
      this.bootstrapPushScheduler = null;
    }
  }
});
