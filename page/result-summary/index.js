import * as hmUI from "@zos/ui";
import { getToolById } from "../../shared/constants/tool-catalog";
import { readLastResult } from "../../shared/storage/watch-store";
import { goHome, goToToolList } from "../../shared/watch/router";
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
    const lastResult = readLastResult();
    const tool = lastResult ? getToolById(lastResult.toolId) : null;

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text: lastResult ? "Session summary" : "No result yet"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...SUBTITLE_TEXT,
      text: lastResult ? (tool ? tool.label : lastResult.toolId) : "Seed preview"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      text: lastResult
        ? [
            lastResult.recipeName,
            `Status: ${lastResult.status}`,
            `Elapsed: ${Math.round(lastResult.elapsedMs / 1000)}s`,
            lastResult.summary
          ].join("\n")
        : "Run a seed preview brew to create a temporary result."
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[0],
      text: "Browse tools",
      click_func: () => {
        goToToolList();
      }
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[1],
      text: "Home",
      click_func: () => {
        goHome();
      }
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
      text: "Phone-side CRUD is live. History sync and real last-result handoff arrive in Stage 4."
    });
  }
});
