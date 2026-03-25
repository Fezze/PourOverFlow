import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import { getToolById } from "../../shared/constants/tool-catalog";
import { readLastResult } from "../../shared/storage/watch-store";
import { goHome, goToToolList, PAGE_URLS } from "../../shared/watch/router";
import { subscribeRuntimeEvent } from "../../shared/watch/runtime-events";
import {
  ACTION_DOCK,
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  FOOTER_TEXT,
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "zosLoader:./index.[pf].layout.js";

const PANEL_COLOR = 0x171d26;
const MUTED_TEXT = 0xaab4c2;

function buildResultBody(lastResult) {
  if (!lastResult) {
    return "No completed brew summary is stored on the watch yet.";
  }

  return [
    `${Math.round(lastResult.elapsedMs / 1000)}s total`,
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
      text: lastResult ? lastResult.recipeName : "No result yet"
    });
    if (lastResult) {
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...SUBTITLE_TEXT,
        text: tool ? tool.label : lastResult.toolId
      });
    }
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: BUTTONS[0].x,
      y: BODY_TEXT.y - 8,
      w: BUTTONS[0].w,
      h: 110,
      radius: 26,
      color: PANEL_COLOR
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      x: BODY_TEXT.x + 14,
      w: BODY_TEXT.w - 28,
      y: BODY_TEXT.y + 10,
      h: BODY_TEXT.h + 24,
      text: buildResultBody(lastResult)
    });
    if (ACTION_DOCK) {
      hmUI.createWidget(hmUI.widget.FILL_RECT, ACTION_DOCK);
    }
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[0],
      text: "Browse",
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
      y: BUTTONS[1].y - 34,
      h: 24,
      color: MUTED_TEXT,
      text: lastResult
        ? "Start another brew or go home."
        : "Full history stays on the phone."
    });
  }
});
