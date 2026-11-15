import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";
import {
  createFloatingDockStyle,
  createFloatingButtonStyle,
  createScaffoldLayout,
  pickRoundMetric,
  pickRoundSizeMetric
} from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });
const splitGap = pickRoundMetric(12, 10);
const splitWidth = Math.floor((layout.buttonW - splitGap) / 2);
const secondaryButton = createFloatingButtonStyle(layout, {
  theme: "secondary",
  y: pickRoundSizeMetric(308, 292, 278),
  w: splitWidth,
  h: pickRoundMetric(40, 38),
  radius: pickRoundMetric(20, 19),
  text_size: pickRoundMetric(18, 17)
});
const accentButton = createFloatingButtonStyle(layout, {
  theme: "secondary",
  x: layout.buttonX + splitWidth + splitGap,
  y: pickRoundSizeMetric(308, 292, 278),
  w: splitWidth,
  h: pickRoundMetric(40, 38),
  radius: pickRoundMetric(20, 19),
  text_size: pickRoundMetric(18, 17)
});
const primaryButton = createFloatingButtonStyle(layout, {
  theme: "primary",
  x: (layout.background.w - pickRoundSizeMetric(280, 280, 268)) / 2,
  w: pickRoundSizeMetric(280, 280, 268),
  y: pickRoundSizeMetric(360, 344, 320),
  h: pickRoundSizeMetric(60, 56, 54),
  radius: pickRoundSizeMetric(32, 28, 27),
  text_size: pickRoundSizeMetric(21, 20, 19)
});

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
export const BODY_TEXT = layout.body;
export const FOOTER_TEXT = layout.footer;
TITLE_TEXT.align_h = hmUI.align.CENTER_H;
SUBTITLE_TEXT.align_h = hmUI.align.CENTER_H;
export const ACTION_DOCK = createFloatingDockStyle({
  x: primaryButton.x,
  y: primaryButton.y,
  w: primaryButton.w,
  h: primaryButton.h,
  radius: primaryButton.radius
});
export const BUTTONS = [primaryButton, secondaryButton, accentButton];
