import * as hmUI from "@zos/ui";
import { SHARED_COLORS, fitCenteredTextToRoundScreen, roundContentBottom } from "./layouts";

export function getReadingFrame(screen, dockY) {
  const round = screen.w === screen.h;
  const x = round ? 24 : 16;
  const bottom = round ? roundContentBottom(screen.w, x) : screen.h;
  const y = round ? Math.max(136, screen.h - bottom) : 112;
  return { x, y, w: screen.w - 2 * x, h: Math.min(bottom, dockY - 8) - y };
}

export function createInstrumentText(screen, text, y, h, size, color) {
  return hmUI.createWidget(hmUI.widget.TEXT, fitCenteredTextToRoundScreen({
    x: 12, w: screen.w - 24, y, h, text, color, text_size: size, line_space: 0,
    text_style: hmUI.text_style.NONE, align_h: hmUI.align.CENTER_H, align_v: hmUI.align.CENTER_V
  }, screen));
}

export function createReader(frame) {
  const container = hmUI.createWidget(hmUI.widget.VIEW_CONTAINER, {
    ...frame, scroll_enable: 1, modal: 0, bounce: 0
  });
  let y = 0;
  return function addText(text, size, color = SHARED_COLORS.text, gap = 0) {
    if (!text) return;
    const { height } = hmUI.getTextLayout(text, { text_size: size, text_width: frame.w, wrapped: 1 });
    const h = Math.max(size, Math.ceil(height));
    y += gap;
    container.createWidget(hmUI.widget.TEXT, {
      x: 0, y, w: frame.w, h, text, text_size: size, color,
      align_h: hmUI.align.LEFT, align_v: hmUI.align.TOP, text_style: hmUI.text_style.WRAP
    });
    y += h;
  };
}
