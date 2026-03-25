import { px } from "@zos/utils";
import { createButtonStyle, createPanelStyle, createScaffoldLayout } from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "square" });
const primaryButton = createButtonStyle(layout, 0, "primary");

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
export const DETAIL_PANEL = createPanelStyle(layout, {
  y: px(108),
  h: px(126)
});
export const BODY_TEXT = {
  ...layout.body,
  y: DETAIL_PANEL.y + px(16),
  h: DETAIL_PANEL.h - px(32)
};
export const FOOTER_TEXT = {
  ...layout.footer,
  y: px(248),
  h: px(36)
};
primaryButton.y = px(292);
primaryButton.h = px(68);
primaryButton.y = px(326);
primaryButton.radius = px(34);
export const BUTTONS = [primaryButton];
