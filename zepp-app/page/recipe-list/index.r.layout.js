import {
  createButtonStyle,
  createPanelStyle,
  createScaffoldLayout,
  pickRoundMetric
} from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
TITLE_TEXT.x = layout.buttonX;
TITLE_TEXT.y = pickRoundMetric(64, 60);
TITLE_TEXT.w = layout.buttonW;
TITLE_TEXT.text_size = pickRoundMetric(26, 24);
SUBTITLE_TEXT.x = layout.buttonX;
SUBTITLE_TEXT.y = pickRoundMetric(100, 94);
SUBTITLE_TEXT.w = layout.buttonW;
export const LIST_PANEL = createPanelStyle(layout, {
  x: layout.buttonX - pickRoundMetric(6, 4),
  y: pickRoundMetric(114, 108),
  w: layout.buttonW + pickRoundMetric(12, 8),
  h: pickRoundMetric(270, 260)
});
export const LIST_FRAME = {
  x: LIST_PANEL.x + pickRoundMetric(8, 8),
  y: LIST_PANEL.y + pickRoundMetric(8, 8),
  w: LIST_PANEL.w - pickRoundMetric(16, 16),
  h: LIST_PANEL.h - pickRoundMetric(16, 16),
  itemHeight: pickRoundMetric(104, 98),
  itemSpace: pickRoundMetric(8, 8),
  itemRadius: pickRoundMetric(22, 20),
  titleHeight: pickRoundMetric(44, 40),
  metaHeight: pickRoundMetric(26, 24)
};
export const EMPTY_BUTTON = createButtonStyle(layout, 0, "secondary");
EMPTY_BUTTON.y = pickRoundMetric(388, 378);
EMPTY_BUTTON.h = pickRoundMetric(40, 38);
EMPTY_BUTTON.radius = pickRoundMetric(20, 19);
