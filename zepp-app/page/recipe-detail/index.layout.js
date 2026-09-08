import * as roundLayout from "./index.r.layout.js";
import * as squareLayout from "./index.s.layout.js";
import { selectDeviceLayout } from "../../shared/watch/select-layout.js";

export const {
  BACKGROUND,
  TITLE_TEXT,
  SUBTITLE_TEXT,
  DETAIL_PANEL,
  BODY_TEXT,
  FOOTER_TEXT,
  ACTION_DOCK,
  BUTTONS
} = selectDeviceLayout(roundLayout, squareLayout);
