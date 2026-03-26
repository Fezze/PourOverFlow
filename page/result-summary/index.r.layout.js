import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";
import {
  createFloatingDockStyle,
  createFloatingButtonStyle,
  createScaffoldLayout
} from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });
const splitGap = px(12);
const splitWidth = Math.floor((layout.buttonW - splitGap) / 2);
const secondaryButton = createFloatingButtonStyle(layout, {
  theme: "secondary",
  y: px(324),
  w: splitWidth,
  h: px(40),
  radius: px(20)
});
const accentButton = createFloatingButtonStyle(layout, {
  theme: "neutral",
  x: layout.buttonX + splitWidth + splitGap,
  y: px(324),
  w: splitWidth,
  h: px(40),
  radius: px(20)
});
const primaryButton = createFloatingButtonStyle(layout, {
  theme: "primary",
  y: px(382),
  h: px(64),
  radius: px(32),
  text_size: px(21)
});

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
export const BODY_TEXT = layout.body;
export const FOOTER_TEXT = layout.footer;
TITLE_TEXT.align_h = hmUI.align.CENTER_H;
SUBTITLE_TEXT.align_h = hmUI.align.CENTER_H;
TITLE_TEXT.x = px(48);
TITLE_TEXT.y = px(68);
TITLE_TEXT.w = px(384);
SUBTITLE_TEXT.x = px(56);
SUBTITLE_TEXT.y = px(106);
SUBTITLE_TEXT.w = px(368);
export const ACTION_DOCK = createFloatingDockStyle({
  x: primaryButton.x,
  y: primaryButton.y,
  w: primaryButton.w,
  h: primaryButton.h,
  radius: primaryButton.radius
});
export const BUTTONS = [primaryButton, secondaryButton, accentButton];
