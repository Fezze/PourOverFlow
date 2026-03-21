import { destroyWatchSyncBridge, initWatchSyncBridge } from "./shared/watch/sync-bridge";

App({
  globalData: {
    runtimeState: null
  },
  onCreate() {
    initWatchSyncBridge();
    console.log("PourOverFlow app created");
  },
  onDestroy() {
    destroyWatchSyncBridge();
    console.log("PourOverFlow app destroyed");
  }
});
