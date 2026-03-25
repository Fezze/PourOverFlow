import { px } from "@zos/utils";
import { createButtonStyle, createPanelStyle, createScaffoldLayout } from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });
const primaryButton = createButtonStyle(layout, 0, "primary");

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
export const DETAIL_PANEL = createPanelStyle(layout, {
  y: px(118),
  h: px(138)
});
export const BODY_TEXT = {
  ...layout.body,
  y: DETAIL_PANEL.y + px(18),
  h: DETAIL_PANEL.h - px(36)
};
export const FOOTER_TEXT = {
  ...layout.footer,
  y: px(318),
  h: px(38)
};
primaryButton.y = px(364);
primaryButton.h = px(72);
primaryButton.y = px(410);
primaryButton.radius = px(36);
export const BUTTONS = [primaryButton];
