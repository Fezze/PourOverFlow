import { getDeviceInfo } from "@zos/device";
import { getSystemInfo } from "@zos/settings";

export function getScrollListOptions(enableScrollBar, useHardwareFocus = false) {
  try {
    const apiLevel = /^([0-9]+)\.[0-9]+$/.exec(getSystemInfo()?.minAPI);
    if (!apiLevel || Number(apiLevel[1]) < 4) {
      return {};
    }
  } catch (error) {
    console.log("Failed to read the API level for scroll list options", error);
    return {};
  }

  const options = { enable_scroll_bar: enableScrollBar };
  if (useHardwareFocus) {
    try {
      const device = getDeviceInfo();
      options.item_common_focus = Number(device?.keyNumber) >= 3 ||
        String(device?.keyType || "").includes("sport");
    } catch (error) {
      options.item_common_focus = false;
      console.log("Hardware list focus fallback", error);
    }
  }
  return options;
}
