import * as hmUI from "@zos/ui";
import { setScrollMode, scrollTo, SCROLL_MODE_FREE } from "@zos/page";

import { roundContentBottom } from "./layouts";

export function getReadingFrame(screen) {
  const round = screen.w === screen.h;
  const x = round ? 24 : 16;
  const w = screen.w - x * 2;
  // The first full-width line must start below the narrow circular cap.
  // Later lines can all pass through the widest part of the screen by scrolling.
  const top = round
    ? screen.h - roundContentBottom(screen.w, x) + 8
    : 28;
  return { x, w, top, bottom: round ? 60 : 24 };
}

export function measureWrappedText(text, size, width) {
  const { height } = hmUI.getTextLayout(text, { text_size: size, text_width: width, wrapped: 1 });
  return Math.max(size, Math.ceil(height));
}

export function enableReadingPage() {
  setScrollMode({ mode: SCROLL_MODE_FREE, options: { modeParams: { bounce: false } } });
  scrollTo({ y: 0 });
}
