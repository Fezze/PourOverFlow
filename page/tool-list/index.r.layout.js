import { createButtonStyle, createScaffoldLayout } from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
export const BODY_TEXT = layout.body;
export const FOOTER_TEXT = layout.footer;
export const BUTTONS = [
  createButtonStyle(layout, 0, "primary"),
  createButtonStyle(layout, 1, "secondary"),
  createButtonStyle(layout, 2, "accent"),
  createButtonStyle(layout, 3, "neutral"),
  createButtonStyle(layout, 4, "primary"),
  createButtonStyle(layout, 5, "secondary")
];
