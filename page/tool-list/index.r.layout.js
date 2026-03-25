import { px } from "@zos/utils";
import { createButtonStyle, createPanelStyle, createScaffoldLayout } from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
TITLE_TEXT.x = px(64);
TITLE_TEXT.y = px(64);
TITLE_TEXT.w = px(352);
TITLE_TEXT.text_size = px(26);
SUBTITLE_TEXT.x = px(64);
SUBTITLE_TEXT.y = px(100);
SUBTITLE_TEXT.w = px(352);
export const LIST_PANEL = createPanelStyle(layout, {
  y: px(114),
  h: px(270)
});
export const LIST_FRAME = {
  x: LIST_PANEL.x + px(8),
  y: LIST_PANEL.y + px(8),
  w: LIST_PANEL.w - px(16),
  h: LIST_PANEL.h - px(16),
  itemHeight: px(104),
  itemSpace: px(8),
  itemRadius: px(22),
  titleHeight: px(48),
  metaHeight: px(28)
};
export const PRIMARY_BUTTON = createButtonStyle(layout, 0, "secondary");
PRIMARY_BUTTON.y = px(388);
PRIMARY_BUTTON.h = px(40);
PRIMARY_BUTTON.radius = px(20);
