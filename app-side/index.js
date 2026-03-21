import {
  ensurePhoneStorage,
  readPhoneSnapshot
} from "../shared/storage/phone-store";
import { SETTINGS_UI_STORAGE_KEY } from "../shared/storage/keys";

AppSideService({
  onInit() {
    const snapshot = ensurePhoneStorage(settings.settingsStorage);
    console.log(
      `PourOverFlow app-side ready. tools=${snapshot.tools.length} recipes=${snapshot.recipeIndex.length} history=${snapshot.historyIndex.length}`
    );

    settings.settingsStorage.addListener("change", ({ key }) => {
      if (key === SETTINGS_UI_STORAGE_KEY) {
        return;
      }

      const nextSnapshot = readPhoneSnapshot(settings.settingsStorage);
      console.log(
        `settingsStorage changed: ${key} (tools=${nextSnapshot.tools.length}, recipes=${nextSnapshot.recipeIndex.length}, history=${nextSnapshot.historyIndex.length})`
      );
    });
  },
  onRun() {},
  onDestroy() {}
});
