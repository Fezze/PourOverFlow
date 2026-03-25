import { px } from "@zos/utils";
import {
  SHARED_COLORS,
  createFloatingDockStyle,
  createFloatingButtonStyle,
  createScaffoldLayout
} from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "square" });
const dockY = px(292);
const dockHeight = px(78);
const dockGap = 0;
const secondaryWidth = Math.floor(layout.buttonW / 2);
const primaryButton = createFloatingButtonStyle(layout, {
  theme: "secondary",
  x: layout.buttonX + secondaryWidth + dockGap,
  y: dockY,
  w: layout.buttonW - secondaryWidth - dockGap,
  h: dockHeight,
  radius: px(39),
  text_size: px(30)
});
const secondaryButton = createFloatingButtonStyle(layout, {
  theme: "secondary",
  y: dockY,
  w: secondaryWidth,
  h: dockHeight,
  radius: px(39),
  text_size: px(30)
});

secondaryButton.normal_color = SHARED_COLORS.secondary;
secondaryButton.press_color = SHARED_COLORS.secondaryPress;
primaryButton.normal_color = SHARED_COLORS.secondary;
primaryButton.press_color = SHARED_COLORS.secondaryPress;

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const BODY_TEXT = layout.body;
export const FOOTER_TEXT = layout.footer;
export const ACTION_DOCK = createFloatingDockStyle({
  x: secondaryButton.x,
  y: dockY,
  w: primaryButton.w + secondaryButton.w + dockGap,
  h: dockHeight,
  radius: px(39)
});
export const ACTION_DIVIDER = {
  x: layout.buttonX + secondaryWidth,
  y: dockY + px(10),
  w: 1,
  h: dockHeight - px(10),
  color: SHARED_COLORS.background
};
export const BUTTONS = [primaryButton, secondaryButton];
