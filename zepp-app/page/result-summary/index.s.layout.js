import { px } from "@zos/utils";
import {
  createFloatingDockStyle,
  createFloatingButtonStyle,
  createScaffoldLayout
} from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "square" });
const splitGap = px(12);
const splitWidth = Math.floor((layout.buttonW - splitGap) / 2);
const secondaryButton = createFloatingButtonStyle(layout, {
  theme: "secondary",
  y: px(252),
  w: splitWidth,
  h: px(40),
  radius: px(20)
});
const accentButton = createFloatingButtonStyle(layout, {
  theme: "neutral",
  x: layout.buttonX + splitWidth + splitGap,
  y: px(252),
  w: splitWidth,
  h: px(40),
  radius: px(20)
});
const primaryButton = createFloatingButtonStyle(layout, {
  theme: "primary",
  y: px(300),
  h: px(60),
  radius: px(30),
  text_size: px(20)
});

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
export const BODY_TEXT = layout.body;
export const FOOTER_TEXT = layout.footer;
TITLE_TEXT.align_h = "CENTER_H";
SUBTITLE_TEXT.align_h = "CENTER_H";
export const ACTION_DOCK = createFloatingDockStyle({
  x: primaryButton.x,
  y: primaryButton.y,
  w: primaryButton.w,
  h: primaryButton.h,
  radius: primaryButton.radius
});
export const BUTTONS = [primaryButton, secondaryButton, accentButton];
