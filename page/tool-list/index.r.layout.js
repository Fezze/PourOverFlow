import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";
import { createButtonStyle, createScaffoldLayout } from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
TITLE_TEXT.x = px(48);
TITLE_TEXT.y = px(66);
TITLE_TEXT.w = px(384);
TITLE_TEXT.text_size = px(26);
TITLE_TEXT.align_h = hmUI.align.CENTER_H;
SUBTITLE_TEXT.x = px(56);
SUBTITLE_TEXT.y = px(106);
SUBTITLE_TEXT.w = px(368);
SUBTITLE_TEXT.align_h = hmUI.align.CENTER_H;
export const LIST_FRAME = {
  x: px(48),
  y: px(112),
  w: px(384),
  h: px(332),
  itemHeight: px(92),
  itemSpace: px(12),
  itemRadius: px(24),
  titleHeight: px(48),
  metaHeight: px(28)
};
export const PRIMARY_BUTTON = createButtonStyle(layout, 0, "secondary");
PRIMARY_BUTTON.y = px(388);
PRIMARY_BUTTON.h = px(40);
PRIMARY_BUTTON.radius = px(20);
