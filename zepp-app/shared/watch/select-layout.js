import { getDeviceInfo, SCREEN_SHAPE_ROUND, SCREEN_SHAPE_SQUARE } from "@zos/device";

// Explicit deviceSource targets do not acquire the qualifier required by zosLoader.
export function selectDeviceLayout(roundLayout, squareLayout) {
  try {
    const { screenShape, width, height } = getDeviceInfo();
    if (screenShape === SCREEN_SHAPE_SQUARE) {
      return squareLayout;
    }
    if (screenShape === SCREEN_SHAPE_ROUND) {
      return roundLayout;
    }
    // Older simulator profiles may omit screenShape. All supported square targets
    // are rectangular; all supported round targets have equal dimensions.
    if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0 && width !== height) {
      return squareLayout;
    }
  } catch (error) {
    console.log("Falling back to round layout", error);
  }
  return roundLayout;
}
