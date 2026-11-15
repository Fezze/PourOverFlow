import * as hmUI from "@zos/ui";
import { onGesture, offGesture, GESTURE_LEFT, GESTURE_RIGHT } from "@zos/interaction";
import { replace } from "@zos/router";
import { SHARED_COLORS } from "./layouts";

// These are two views of existing data, not a new watch-side history browser.
const TAB_PAGES = ["page/tool-list/index", "page/result-summary/index"];

export function registerBrowseTabs(activeIndex) {
  onGesture({
    callback: (gesture) => {
      const nextIndex = gesture === GESTURE_LEFT ? activeIndex + 1
        : gesture === GESTURE_RIGHT ? activeIndex - 1 : activeIndex;
      if (nextIndex === activeIndex || nextIndex < 0 || nextIndex >= TAB_PAGES.length) {
        // Keep native vertical scrolling and system back at the outer edge.
        return false;
      }
      replace({ url: TAB_PAGES[nextIndex] });
      return true;
    }
  });
  return () => offGesture();
}

export function drawBrowseTabs(width, activeIndex, isRound) {
  const startX = Math.round(width / 2) - 21;
  for (let index = 0; index < TAB_PAGES.length; index += 1) {
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: startX + index * 26,
      y: isRound ? 25 : 12,
      w: 16,
      h: 4,
      radius: 2,
      color: index === activeIndex ? SHARED_COLORS.accent : SHARED_COLORS.surfaceMuted
    });
  }
}
