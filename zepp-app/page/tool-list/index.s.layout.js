import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";
import { createButtonStyle, createScaffoldLayout } from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "square" });

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
TITLE_TEXT.align_h = hmUI.align.CENTER_H;
SUBTITLE_TEXT.align_h = hmUI.align.CENTER_H;
export const LIST_FRAME = {
  x: px(18),
  y: px(112),
  w: px(344),
  h: px(228),
  itemHeight: px(92),
  itemSpace: px(10),
  itemRadius: px(20),
  titleHeight: px(40),
  metaHeight: px(24)
};
export const PRIMARY_BUTTON = createButtonStyle(layout, 0, "secondary");
