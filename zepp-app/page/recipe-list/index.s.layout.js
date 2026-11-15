import { px } from "@zos/utils";
import { createButtonStyle, createPanelStyle, createScaffoldLayout } from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "square" });

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
export const LIST_PANEL = createPanelStyle(layout, {
  y: px(90),
  h: px(340)
});
export const LIST_FRAME = {
  x: LIST_PANEL.x + px(8),
  y: LIST_PANEL.y + px(8),
  w: LIST_PANEL.w - px(16),
  h: LIST_PANEL.h - px(16),
  itemHeight: px(100),
  itemSpace: px(8),
  itemRadius: px(18),
  titleHeight: px(52),
  metaHeight: px(24)
};
export const EMPTY_BUTTON = createButtonStyle(layout, 0, "secondary");
