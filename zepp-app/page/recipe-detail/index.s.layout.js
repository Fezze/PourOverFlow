import { px } from "@zos/utils";
import {
  createFloatingDockStyle,
  createFloatingButtonStyle,
  createPanelStyle,
  createScaffoldLayout
} from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "square" });
const primaryButton = createFloatingButtonStyle(layout, {
  theme: "primary",
  y: px(302),
  h: px(60),
  radius: px(30),
  text_size: px(20)
});

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
export const DETAIL_PANEL = createPanelStyle(layout, {
  x: px(24),
  y: px(100),
  w: px(336),
  h: px(176)
});
export const BODY_TEXT = {
  ...layout.body,
  y: DETAIL_PANEL.y + px(16),
  h: DETAIL_PANEL.h - px(32)
};
export const FOOTER_TEXT = {
  ...layout.footer,
  y: px(262),
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
