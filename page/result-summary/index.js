import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import { getToolById } from "../../shared/constants/tool-catalog";
import { readLastResult } from "../../shared/storage/watch-store";
import { goHome, goToToolList, goToValidation, PAGE_URLS } from "../../shared/watch/router";
import { subscribeRuntimeEvent } from "../../shared/watch/runtime-events";
import {
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  FOOTER_TEXT,
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "zosLoader:./index.[pf].layout.js";

function buildResultBody(lastResult) {
  if (!lastResult) {
    return "No completed brew summary is stored on the watch yet.";
  }

  return [
    lastResult.recipeName,
    `Status: ${lastResult.status}`,
    `Time: ${Math.round(lastResult.elapsedMs / 1000)}s`,
    `Delta: ${lastResult.totalDeltaMs} ms`
  ].join("\n");
}

Page({
  onDestroy() {
    if (this.unsubscribeRuntime) {
      this.unsubscribeRuntime();
      this.unsubscribeRuntime = null;
    }
  },
  build() {
    const lastResult = readLastResult();
    const tool = lastResult ? getToolById(lastResult.toolId) : null;

    this.unsubscribeRuntime = subscribeRuntimeEvent((event) => {
      if (event.type === "last_result") {
        replace({ url: PAGE_URLS.resultSummary });
      }
    });

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text: lastResult ? "Latest brew" : "No result yet"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...SUBTITLE_TEXT,
      text: lastResult ? (tool ? tool.label : lastResult.toolId) : "Brew once to fill this screen"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      text: buildResultBody(lastResult)
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[0],
      text: "Browse brewers",
      click_func: () => {
        goToToolList();
      }
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[1],
      text: "Validation",
      click_func: () => {
        goToValidation();
      }
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[2],
      text: "Home",
      click_func: () => {
        goHome();
      }
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
      text: "Full history stays on the phone. Validation helps with Stage 6 hardware checks."
    });
  }
});
