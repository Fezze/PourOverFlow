import { px } from "@zos/utils";
import { createButtonStyle, createPanelStyle, createScaffoldLayout } from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
export const DETAIL_PANEL = createPanelStyle(layout, {
  y: px(118),
  h: px(154)
});
export const BODY_TEXT = {
  ...layout.body,
  y: DETAIL_PANEL.y + px(18),
  h: DETAIL_PANEL.h - px(36)
};
export const FOOTER_TEXT = layout.footer;
export const BUTTONS = [
  createButtonStyle(layout, 0, "primary")
];
