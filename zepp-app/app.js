import { destroyWatchSyncBridge, initWatchSyncBridge } from "./shared/watch/sync-bridge";

App({
  globalData: {
    runtimeState: null
  },
  onCreate() {
    console.log("PourOverFlow app created");
    initWatchSyncBridge();
  },
  onDestroy() {
    destroyWatchSyncBridge();
    console.log("PourOverFlow app destroyed");
  }
});
