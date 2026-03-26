import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";
import { createButtonStyle, createPanelStyle, createScaffoldLayout } from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "square" });

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
TITLE_TEXT.align_h = hmUI.align.CENTER_H;
SUBTITLE_TEXT.align_h = hmUI.align.CENTER_H;
export const LIST_PANEL = createPanelStyle(layout, {
  x: px(18),
  y: px(82),
  w: px(348),
  h: px(254)
});
export const LIST_FRAME = {
  x: LIST_PANEL.x + px(8),
  y: px(124),
  w: LIST_PANEL.w - px(16),
  h: px(204),
  itemHeight: px(96),
  itemSpace: px(8),
  itemRadius: px(18),
  titleHeight: px(40),
  metaHeight: px(24)
};
export const PRIMARY_BUTTON = createButtonStyle(layout, 0, "secondary");
