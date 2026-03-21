import {
  ensurePhoneScaffoldStorage,
  readPhoneScaffoldSnapshot
} from "../shared/storage/phone-store";

AppSideService({
  onInit() {
    const snapshot = ensurePhoneScaffoldStorage(settings.settingsStorage);
    console.log(
      `PourOverFlow app-side ready. tools=${snapshot.tools.length} recipes=${snapshot.recipeIndex.length} history=${snapshot.historyIndex.length}`
    );

    settings.settingsStorage.addListener("change", ({ key }) => {
      const nextSnapshot = readPhoneScaffoldSnapshot(settings.settingsStorage);
      console.log(
        `settingsStorage changed: ${key} (tools=${nextSnapshot.tools.length}, recipes=${nextSnapshot.recipeIndex.length}, history=${nextSnapshot.historyIndex.length})`
      );
    });
  },
  onRun() {},
  onDestroy() {}
});
