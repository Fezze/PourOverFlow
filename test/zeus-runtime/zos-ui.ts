import { ui } from "./runtime.ts";

export const createWidget = ui.createWidget;
export const widget = ui.widget;
export const align = ui.align;
export const prop = ui.prop;
export const text_style = ui.text_style;

export const setStatusBarVisible = ui.setStatusBarVisible;

// Approximate line wrapping for the source-backed preview. Firmware uses the
// native font metrics instead.
export function getTextLayout(text: string, { text_size, text_width }: {
  text_size: number;
  text_width: number;
}) {
  const columns = Math.max(1, Math.floor(text_width / (text_size * 0.54)));
  let lines = 0;
  for (const paragraph of text.split("\n")) {
    lines += 1;
    let used = 0;
    for (const word of paragraph.split(/ +/)) {
      if (used && used + 1 + word.length > columns) {
        lines += 1;
        used = 0;
      }
      const length = used + Number(used > 0) + word.length;
      const extraLines = Math.floor(Math.max(0, length - 1) / columns);
      lines += extraLines;
      used = length - extraLines * columns;
    }
  }
  return { height: Math.ceil(lines * text_size * 1.25) };
}
