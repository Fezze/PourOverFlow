import * as roundLayout from "./index.r.layout.js";
import * as squareLayout from "./index.s.layout.js";
import { selectDeviceLayout } from "../../shared/watch/select-layout.js";

export const {
  BACKGROUND,
  TITLE_TEXT,
  SUBTITLE_TEXT,
  LIST_FRAME,
  PRIMARY_BUTTON
} = selectDeviceLayout(roundLayout, squareLayout);
