import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import { getToolById } from "../../shared/constants/tool-catalog";
import { readLastResult } from "../../shared/storage/watch-store";
import { PAGE_URLS, goHome, goToToolList } from "../../shared/watch/router";
import { subscribeRuntimeEvent } from "../../shared/watch/runtime-events";
import {
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  FOOTER_TEXT,
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "zosLoader:./index.[pf].layout.js";

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
      text: lastResult ? "Session summary" : "No result yet"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...SUBTITLE_TEXT,
      text: lastResult ? (tool ? tool.label : lastResult.toolId) : "No synced result"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      text: lastResult
        ? [
            lastResult.recipeName,
            `Status: ${lastResult.status}`,
            `Elapsed: ${Math.round(lastResult.elapsedMs / 1000)}s`,
            `Delta: ${lastResult.totalDeltaMs} ms`,
            lastResult.summary || "Latest result is stored on watch and mirrored back to phone history via sync."
          ].join("\n")
        : "Run a brew or wait for a phone bootstrap to populate the latest result."
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
      text: "Watch now keeps the latest result summary and reconciles it with phone history snapshots."
    });
  }
});
