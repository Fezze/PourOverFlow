import * as hmUI from "@zos/ui";
import {
  SHARED_COLORS,
  createFloatingDockStyle,
  createFloatingButtonStyle,
  createScaffoldLayout,
  pickRoundMetric,
  pickRoundSizeMetric
} from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });
const dockInset = pickRoundMetric(10, 8);
const actionGap = pickRoundMetric(16, 14);
const dockY = pickRoundSizeMetric(382, 342, 326);
const dockHeight = pickRoundSizeMetric(84, 70, 62);
const actionBaseY = dockY + pickRoundSizeMetric(8, 7, 6);
const actionBaseH = dockHeight - pickRoundSizeMetric(16, 14, 12);
const actionDockWidth = layout.buttonW - dockInset * 2;
const actionButtonWidth = Math.floor((actionDockWidth - actionGap - pickRoundMetric(16, 14)) / 2);
const centerX = layout.buttonX + Math.floor(layout.buttonW / 2);
const primaryButton = createFloatingButtonStyle(layout, {
  theme: "primary",
  x: centerX + Math.floor(actionGap / 2),
  y: actionBaseY,
  w: actionButtonWidth,
  h: actionBaseH,
  radius: Math.floor(actionBaseH / 2),
  text_size: pickRoundSizeMetric(28, 24, 22)
});
const secondaryButton = createFloatingButtonStyle(layout, {
  theme: "secondary",
  x: centerX - Math.floor(actionGap / 2) - actionButtonWidth,
  y: actionBaseY,
  w: actionButtonWidth,
  h: actionBaseH,
  radius: Math.floor(actionBaseH / 2),
  text_size: pickRoundSizeMetric(28, 24, 22)
});

secondaryButton.normal_color = SHARED_COLORS.secondary;
secondaryButton.press_color = SHARED_COLORS.secondaryPress;
primaryButton.normal_color = SHARED_COLORS.primary;
primaryButton.press_color = SHARED_COLORS.primaryPress;

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const BODY_TEXT = {
  ...layout.body,
  y: pickRoundSizeMetric(134, 124, 116)
};
export const FOOTER_TEXT = layout.footer;
TITLE_TEXT.align_h = hmUI.align.CENTER_H;
export const ACTION_DOCK = createFloatingDockStyle({
  x: layout.buttonX + dockInset,
  y: dockY,
  w: actionDockWidth,
  h: dockHeight,
  radius: Math.floor(dockHeight / 2),
  color: SHARED_COLORS.surfaceMuted
});
export const BUTTONS = [primaryButton, secondaryButton];
