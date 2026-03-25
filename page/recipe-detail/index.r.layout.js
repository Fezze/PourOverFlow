import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";
import {
  createFloatingDockStyle,
  createFloatingButtonStyle,
  createPanelStyle,
  createScaffoldLayout
} from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });
const primaryButton = createFloatingButtonStyle(layout, {
  theme: "primary",
  y: px(360),
  h: px(64),
  radius: px(32),
  text_size: px(21)
});

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
TITLE_TEXT.align_h = hmUI.align.CENTER_H;
export const DETAIL_PANEL = createPanelStyle(layout, {
  y: px(110),
  h: px(138)
});
export const BODY_TEXT = {
  ...layout.body,
  y: DETAIL_PANEL.y + px(18),
  h: DETAIL_PANEL.h - px(36)
};
export const FOOTER_TEXT = {
  ...layout.footer,
  y: px(306),
  h: px(28)
};
export const ACTION_DOCK = createFloatingDockStyle({
  x: primaryButton.x,
  y: primaryButton.y,
  w: primaryButton.w,
  h: primaryButton.h,
  radius: primaryButton.radius
});
export const BUTTONS = [primaryButton];
