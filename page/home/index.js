import * as hmUI from "@zos/ui";
import { getToolList } from "../../shared/watch/router";
import {
  getHomeScaffoldState,
  goToResultSummary,
  goToToolList,
  resumeActiveSession
} from "../../shared/watch/router";
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
    const { activeSession, lastResult, selectedTool } = getHomeScaffoldState();
    const supportedTools = getToolList();

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text: "PourOverFlow"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...SUBTITLE_TEXT,
      text: "Stage 2 scaffold"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      text: [
        activeSession
          ? `Resume: ${activeSession.recipeName}`
          : "No active session yet.",
        `Tool catalog: ${supportedTools.length} brewers`,
        selectedTool ? `Current tool: ${selectedTool.label}` : "Current tool: n/a",
        lastResult ? `Last result: ${lastResult.recipeName}` : "Last result: none"
      ].join("\n")
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[0],
      text: activeSession ? "Resume brew" : "Browse tools",
      click_func: () => {
        if (activeSession) {
          resumeActiveSession();
          return;
        }

        goToToolList();
      }
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[1],
      text: "Browse tools",
      click_func: () => {
        goToToolList();
      }
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[2],
      text: "Last result",
      click_func: () => {
        goToResultSummary();
      }
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
      text: "CRUD, sync and persistence land in Stages 3 to 6."
    });
  }
});
