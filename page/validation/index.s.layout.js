import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";
import {
  SHARED_COLORS,
  createButtonStyle,
  createPanelStyle,
  createScaffoldLayout
} from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "square" });
const homeButton = createButtonStyle(layout, 0, "secondary");

homeButton.y = px(342);
homeButton.h = px(44);
homeButton.radius = px(20);

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
export const FOOTER_TEXT = layout.footer;
export const STATUS_PANEL = createPanelStyle(layout, {
  y: px(102),
  h: px(76)
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
  y: px(188),
  h: px(130),
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
export const HOME_BUTTON = homeButton;
