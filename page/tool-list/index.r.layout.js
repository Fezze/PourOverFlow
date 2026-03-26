import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";
import { createButtonStyle, createPanelStyle, createScaffoldLayout } from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
TITLE_TEXT.x = px(48);
TITLE_TEXT.y = px(68);
TITLE_TEXT.w = px(384);
TITLE_TEXT.text_size = px(26);
TITLE_TEXT.align_h = hmUI.align.CENTER_H;
SUBTITLE_TEXT.x = px(56);
SUBTITLE_TEXT.y = px(106);
SUBTITLE_TEXT.w = px(368);
SUBTITLE_TEXT.align_h = hmUI.align.CENTER_H;
export const LIST_PANEL = createPanelStyle(layout, {
  x: px(44),
  y: px(52),
  w: px(392),
  h: px(354)
});
export const LIST_FRAME = {
  x: LIST_PANEL.x + px(10),
  y: px(146),
  w: LIST_PANEL.w - px(20),
  h: px(252),
  itemHeight: px(104),
  itemSpace: px(10),
  itemRadius: px(22),
  titleHeight: px(48),
  metaHeight: px(28)
};
export const PRIMARY_BUTTON = createButtonStyle(layout, 0, "secondary");
PRIMARY_BUTTON.y = px(388);
PRIMARY_BUTTON.h = px(40);
PRIMARY_BUTTON.radius = px(20);
