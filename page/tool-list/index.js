import * as hmUI from "@zos/ui";
import { getToolList, selectTool } from "../../shared/watch/router";
import {
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  FOOTER_TEXT,
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "zosLoader:./index.[pf].layout.js";

Page({
  build() {
    const tools = getToolList();

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text: "Choose brewer"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...SUBTITLE_TEXT,
      text: "Closed catalog"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      text: "Stage 2 renders the locked tool whitelist from the docs."
    });

    BUTTONS.forEach((buttonStyle, index) => {
      const tool = tools[index];
      if (!tool) {
        return;
      }

      hmUI.createWidget(hmUI.widget.BUTTON, {
        ...buttonStyle,
        text: tool.label,
        click_func: () => {
          selectTool(tool.toolId);
        }
      });
    });

    hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
      text: "Real catalog cache and sync arrive in Stage 4."
    });
  }
});
