import * as hmUI from "@zos/ui";
import {
  createButtonStyle,
  createScaffoldLayout,
  pickRoundMetric,
  pickRoundSizeMetric
} from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
TITLE_TEXT.x = layout.buttonX - pickRoundMetric(16, 12);
TITLE_TEXT.y = pickRoundMetric(66, 60);
TITLE_TEXT.w = layout.buttonW + pickRoundMetric(32, 24);
TITLE_TEXT.text_size = pickRoundMetric(26, 24);
TITLE_TEXT.align_h = hmUI.align.CENTER_H;
SUBTITLE_TEXT.x = layout.buttonX - pickRoundMetric(8, 6);
SUBTITLE_TEXT.y = pickRoundMetric(106, 98);
SUBTITLE_TEXT.w = layout.buttonW + pickRoundMetric(16, 12);
SUBTITLE_TEXT.align_h = hmUI.align.CENTER_H;
export const LIST_FRAME = {
  x: layout.buttonX - pickRoundMetric(16, 12),
  y: pickRoundMetric(112, 108),
  w: layout.buttonW + pickRoundMetric(32, 24),
  h: pickRoundSizeMetric(332, 300, 282),
  itemHeight: pickRoundMetric(92, 88),
  itemSpace: pickRoundMetric(12, 10),
  itemRadius: pickRoundMetric(24, 22),
  titleHeight: pickRoundMetric(48, 44),
  metaHeight: pickRoundMetric(28, 26)
};
export const PRIMARY_BUTTON = createButtonStyle(layout, 0, "secondary");
PRIMARY_BUTTON.y = pickRoundMetric(388, 378);
PRIMARY_BUTTON.h = pickRoundMetric(40, 38);
PRIMARY_BUTTON.radius = pickRoundMetric(20, 19);
