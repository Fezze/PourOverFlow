import { px } from "@zos/utils";
import {
  SHARED_COLORS,
  createFloatingDockStyle,
  createFloatingButtonStyle,
  createScaffoldLayout
} from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "square" });
const dockInset = px(8);
const actionGap = px(14);
const dockY = px(304);
const dockHeight = px(76);
const actionBaseY = dockY + px(7);
const actionBaseH = dockHeight - px(14);
const actionDockWidth = layout.buttonW - dockInset * 2;
const actionButtonWidth = Math.floor((actionDockWidth - actionGap - px(14)) / 2);
const centerX = layout.buttonX + Math.floor(layout.buttonW / 2);
const primaryButton = createFloatingButtonStyle(layout, {
  theme: "primary",
  x: centerX + Math.floor(actionGap / 2),
  y: actionBaseY,
  w: actionButtonWidth,
  h: actionBaseH,
  radius: Math.floor(actionBaseH / 2),
  text_size: px(24)
});
const secondaryButton = createFloatingButtonStyle(layout, {
  theme: "secondary",
  x: centerX - Math.floor(actionGap / 2) - actionButtonWidth,
  y: actionBaseY,
  w: actionButtonWidth,
  h: actionBaseH,
  radius: Math.floor(actionBaseH / 2),
  text_size: px(24)
});

secondaryButton.normal_color = SHARED_COLORS.secondary;
secondaryButton.press_color = SHARED_COLORS.secondaryPress;
primaryButton.normal_color = SHARED_COLORS.primary;
primaryButton.press_color = SHARED_COLORS.primaryPress;

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const BODY_TEXT = layout.body;
export const FOOTER_TEXT = layout.footer;
export const ACTION_DOCK = createFloatingDockStyle({
  x: layout.buttonX + dockInset,
  y: dockY,
  w: actionDockWidth,
  h: dockHeight,
  radius: Math.floor(dockHeight / 2),
  color: SHARED_COLORS.surfaceMuted
});
export const BUTTONS = [primaryButton, secondaryButton];
