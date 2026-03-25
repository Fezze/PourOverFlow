import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";
import {
  SHARED_COLORS,
  createFloatingButtonStyle,
  createFloatingDockStyle,
  createPanelStyle,
  createScaffoldLayout
} from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });
const homeButton = createFloatingButtonStyle(layout, {
  theme: "secondary",
  y: px(362),
  h: px(60),
  radius: px(30),
  text_size: px(20)
});

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
export const FOOTER_TEXT = layout.footer;
TITLE_TEXT.x = px(64);
TITLE_TEXT.y = px(64);
TITLE_TEXT.w = px(352);
TITLE_TEXT.text_size = px(26);
TITLE_TEXT.align_h = hmUI.align.CENTER_H;
SUBTITLE_TEXT.x = px(64);
SUBTITLE_TEXT.y = px(100);
SUBTITLE_TEXT.w = px(352);
SUBTITLE_TEXT.align_h = hmUI.align.CENTER_H;
export const STATUS_PANEL = createPanelStyle(layout, {
  y: px(118),
  h: px(82)
});
export const STATUS_TEXT = {
  x: STATUS_PANEL.x + px(18),
  y: STATUS_PANEL.y + px(14),
  w: STATUS_PANEL.w - px(36),
  h: STATUS_PANEL.h - px(28),
  color: SHARED_COLORS.text,
  text_size: px(16),
  align_h: hmUI.align.LEFT,
  align_v: hmUI.align.TOP,
  text_style: hmUI.text_style.WRAP
};
export const LIST_PANEL = createPanelStyle(layout, {
  y: px(210),
  h: px(138),
  color: SHARED_COLORS.surfaceMuted
});
export const LIST_FRAME = {
  x: LIST_PANEL.x + px(8),
  y: LIST_PANEL.y + px(8),
  w: LIST_PANEL.w - px(16),
  h: LIST_PANEL.h - px(16),
  itemHeight: px(72),
  itemSpace: px(6),
  itemRadius: px(18),
  titleHeight: px(34),
  metaHeight: px(20)
};
export const ACTION_DOCK = createFloatingDockStyle({
  x: homeButton.x,
  y: homeButton.y,
  w: homeButton.w,
  h: homeButton.h,
  radius: homeButton.radius
});
export const HOME_BUTTON = homeButton;
