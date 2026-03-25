import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";
import {
  SHARED_COLORS,
  createFloatingButtonStyle,
  createFloatingDockStyle,
  createPanelStyle,
  createScaffoldLayout
} from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "square" });
const homeButton = createFloatingButtonStyle(layout, {
  theme: "secondary",
  y: px(288),
  h: px(56),
  radius: px(28),
  text_size: px(20)
});

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
export const FOOTER_TEXT = layout.footer;
export const STATUS_PANEL = createPanelStyle(layout, {
  y: px(94),
  h: px(72)
});
export const STATUS_TEXT = {
  x: STATUS_PANEL.x + px(16),
  y: STATUS_PANEL.y + px(12),
  w: STATUS_PANEL.w - px(32),
  h: STATUS_PANEL.h - px(24),
  color: SHARED_COLORS.text,
  text_size: px(15),
  align_h: hmUI.align.LEFT,
  align_v: hmUI.align.TOP,
  text_style: hmUI.text_style.WRAP
};
export const LIST_PANEL = createPanelStyle(layout, {
  y: px(174),
  h: px(126),
  color: SHARED_COLORS.surfaceMuted
});
export const LIST_FRAME = {
  x: LIST_PANEL.x + px(8),
  y: LIST_PANEL.y + px(8),
  w: LIST_PANEL.w - px(16),
  h: LIST_PANEL.h - px(16),
  itemHeight: px(64),
  itemSpace: px(6),
  itemRadius: px(16),
  titleHeight: px(28),
  metaHeight: px(18)
};
export const ACTION_DOCK = createFloatingDockStyle({
  x: homeButton.x,
  y: homeButton.y,
  w: homeButton.w,
  h: homeButton.h,
  radius: homeButton.radius
});
export const HOME_BUTTON = homeButton;
