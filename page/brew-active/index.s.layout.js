import { px } from "@zos/utils";
import { SHARED_COLORS, createButtonStyle, createScaffoldLayout } from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "square" });
const dockY = px(326);
const dockHeight = px(68);
const splitWidth = Math.floor(layout.buttonW / 2);
const primaryButton = createButtonStyle(layout, 0, "primary");
const secondaryButton = createButtonStyle(layout, 0, "danger");

primaryButton.x = layout.buttonX + splitWidth;
primaryButton.y = dockY;
primaryButton.w = splitWidth;
primaryButton.h = dockHeight;
primaryButton.radius = 0;
primaryButton.normal_color = SHARED_COLORS.primary;
primaryButton.press_color = SHARED_COLORS.primaryPress;
primaryButton.text_size = px(34);

secondaryButton.y = dockY;
secondaryButton.w = splitWidth;
secondaryButton.h = dockHeight;
secondaryButton.radius = 0;
secondaryButton.normal_color = SHARED_COLORS.secondary;
secondaryButton.press_color = SHARED_COLORS.secondaryPress;
secondaryButton.text_size = px(34);

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
export const BODY_TEXT = layout.body;
export const FOOTER_TEXT = layout.footer;
export const ACTION_DOCK = {
  x: layout.buttonX,
  y: dockY,
  w: layout.buttonW,
  h: dockHeight,
  radius: px(34),
  color: SHARED_COLORS.secondary
};
export const ACTION_DIVIDER = {
  x: layout.buttonX + splitWidth - px(1),
  y: dockY,
  w: px(2),
  h: dockHeight,
  color: 0x1b222d
};
export const BUTTONS = [primaryButton, secondaryButton];
