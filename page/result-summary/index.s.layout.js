import { px } from "@zos/utils";
import { createButtonStyle, createScaffoldLayout } from "../../shared/watch/layouts";

const layout = createScaffoldLayout({ shape: "square" });
const splitGap = px(12);
const splitWidth = Math.floor((layout.buttonW - splitGap) / 2);
const primaryButton = createButtonStyle(layout, 0, "primary");
const secondaryButton = createButtonStyle(layout, 0, "secondary");
const accentButton = createButtonStyle(layout, 0, "neutral");

secondaryButton.y = px(236);
secondaryButton.w = splitWidth;
secondaryButton.h = px(42);
secondaryButton.radius = px(20);

accentButton.x = layout.buttonX + splitWidth + splitGap;
accentButton.y = px(236);
accentButton.w = splitWidth;
accentButton.h = px(42);
accentButton.radius = px(20);

primaryButton.y = px(286);
primaryButton.h = px(44);
primaryButton.radius = px(20);

export const BACKGROUND = layout.background;
export const TITLE_TEXT = layout.title;
export const SUBTITLE_TEXT = layout.subtitle;
export const BODY_TEXT = layout.body;
export const FOOTER_TEXT = layout.footer;
export const BUTTONS = [primaryButton, secondaryButton, accentButton];
