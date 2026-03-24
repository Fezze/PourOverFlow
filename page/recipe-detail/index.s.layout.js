import { px } from "@zos/utils";
import { createButtonStyle, createPanelStyle, createScaffoldLayout } from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "square" });

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
export const DETAIL_PANEL = createPanelStyle(layout, {
  y: px(108),
  h: px(142)
});
export const BODY_TEXT = {
  ...layout.body,
  y: DETAIL_PANEL.y + px(16),
  h: DETAIL_PANEL.h - px(32)
};
export const FOOTER_TEXT = layout.footer;
export const BUTTONS = [
  createButtonStyle(layout, 0, "primary"),
  createButtonStyle(layout, 1, "secondary"),
  createButtonStyle(layout, 2, "neutral")
];
