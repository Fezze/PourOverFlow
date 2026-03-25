import { px } from "@zos/utils";
import { createButtonStyle, createScaffoldLayout } from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "round" });
const splitGap = px(12);
const splitWidth = Math.floor((layout.buttonW - splitGap) / 2);
const primaryButton = createButtonStyle(layout, 0, "primary");
const secondaryButton = createButtonStyle(layout, 0, "secondary");
const accentButton = createButtonStyle(layout, 0, "accent");

secondaryButton.y = px(312);
secondaryButton.w = splitWidth;
secondaryButton.h = px(40);
secondaryButton.radius = px(20);
secondaryButton.text_size = px(18);

accentButton.x = layout.buttonX + splitWidth + splitGap;
accentButton.y = px(312);
accentButton.w = splitWidth;
accentButton.h = px(40);
accentButton.radius = px(20);
accentButton.text_size = px(18);

primaryButton.y = px(360);
primaryButton.h = px(42);
primaryButton.radius = px(21);

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
export const BODY_TEXT = layout.body;
export const FOOTER_TEXT = layout.footer;
export const BUTTONS = [primaryButton, secondaryButton, accentButton];
