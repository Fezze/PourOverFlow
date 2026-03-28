import * as hmUI from "@zos/ui";
import {
  createFloatingDockStyle,
  createFloatingButtonStyle,
  createPanelStyle,
  createScaffoldLayout,
  pickRoundMetric
} from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });
const primaryButton = createFloatingButtonStyle(layout, {
  theme: "primary",
  y: pickRoundMetric(380, 370),
  h: pickRoundMetric(64, 60),
  radius: pickRoundMetric(32, 30),
  text_size: pickRoundMetric(21, 20)
});

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
TITLE_TEXT.align_h = hmUI.align.CENTER_H;
export const DETAIL_PANEL = createPanelStyle(layout, {
  x: layout.buttonX - pickRoundMetric(8, 6),
  y: pickRoundMetric(110, 104),
  w: layout.buttonW + pickRoundMetric(16, 12),
  h: pickRoundMetric(246, 236)
});
export const BODY_TEXT = {
  ...layout.body,
  y: DETAIL_PANEL.y + pickRoundMetric(18, 16),
  h: DETAIL_PANEL.h - pickRoundMetric(36, 32)
};
export const FOOTER_TEXT = {
  ...layout.footer,
  y: pickRoundMetric(326, 314),
  h: pickRoundMetric(28, 26)
};
export const ACTION_DOCK = createFloatingDockStyle({
  x: primaryButton.x,
  y: primaryButton.y,
  w: primaryButton.w,
  h: primaryButton.h,
  radius: primaryButton.radius
});
export const BUTTONS = [primaryButton];
