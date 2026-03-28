import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";
import {
  createFloatingDockStyle,
  createFloatingButtonStyle,
  createScaffoldLayout,
  pickRoundMetric
} from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });
const splitGap = pickRoundMetric(12, 10);
const splitWidth = Math.floor((layout.buttonW - splitGap) / 2);
const secondaryButton = createFloatingButtonStyle(layout, {
  theme: "secondary",
  y: pickRoundMetric(308, 300),
  w: splitWidth,
  h: pickRoundMetric(40, 38),
  radius: pickRoundMetric(20, 19),
  text_size: pickRoundMetric(18, 17)
});
const accentButton = createFloatingButtonStyle(layout, {
  theme: "accent",
  x: layout.buttonX + splitWidth + splitGap,
  y: pickRoundMetric(308, 300),
  w: splitWidth,
  h: pickRoundMetric(40, 38),
  radius: pickRoundMetric(20, 19),
  text_size: pickRoundMetric(18, 17)
});
const primaryButton = createFloatingButtonStyle(layout, {
  theme: "primary",
  y: pickRoundMetric(362, 350),
  h: pickRoundMetric(64, 60),
  radius: pickRoundMetric(32, 30),
  text_size: pickRoundMetric(21, 20)
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
