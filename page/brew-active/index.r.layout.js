import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";
import {
  SHARED_COLORS,
  createFloatingButtonStyle,
  createScaffoldLayout
} from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });
const dockY = px(356);
const dockHeight = px(88);
const dockGap = 0;
const secondaryWidth = Math.floor(layout.buttonW / 2);
const actionBaseY = dockY + px(8);
const actionBaseH = dockHeight - px(8);
const primaryButton = createFloatingButtonStyle(layout, {
  theme: "secondary",
  x: layout.buttonX + secondaryWidth + dockGap,
  y: actionBaseY,
  w: layout.buttonW - secondaryWidth - dockGap,
  h: actionBaseH,
  radius: 0,
  text_size: px(34)
});
const secondaryButton = createFloatingButtonStyle(layout, {
  theme: "secondary",
  y: actionBaseY,
  w: secondaryWidth,
  h: actionBaseH,
  radius: 0,
  text_size: px(34)
});

secondaryButton.normal_color = SHARED_COLORS.secondary;
secondaryButton.press_color = SHARED_COLORS.secondaryPress;
primaryButton.normal_color = SHARED_COLORS.secondary;
primaryButton.press_color = SHARED_COLORS.secondaryPress;

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const BODY_TEXT = layout.body;
export const FOOTER_TEXT = layout.footer;
TITLE_TEXT.align_h = hmUI.align.CENTER_H;
export const ACTION_LEFT_BG = {
  x: secondaryButton.x,
  y: actionBaseY,
  w: secondaryButton.w,
  h: actionBaseH,
  radius: px(42),
  color: SHARED_COLORS.secondary
};
export const ACTION_RIGHT_BG = {
  x: primaryButton.x,
  y: actionBaseY,
  w: primaryButton.w,
  h: actionBaseH,
  radius: px(42),
  color: SHARED_COLORS.secondary
};
export const ACTION_TOP_MASK = {
  x: layout.buttonX,
  y: dockY,
  w: layout.buttonW,
  h: px(8),
  color: SHARED_COLORS.background
};
export const ACTION_DIVIDER = {
  x: layout.buttonX + secondaryWidth,
  y: actionBaseY,
  w: 1,
  h: actionBaseH,
  color: SHARED_COLORS.background
};
export const BUTTONS = [primaryButton, secondaryButton];
