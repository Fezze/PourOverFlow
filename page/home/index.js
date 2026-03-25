import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import {
  discardActiveSessionFromHome,
  getHomeScaffoldState,
  goToResultSummary,
  goToToolList,
  PAGE_URLS,
  refreshPhoneSnapshot,
  reconcileActiveSessionOnEntry,
  retryPendingHistorySync,
  resumeActiveSession
} from "../../shared/watch/router";
import { subscribeRuntimeEvent } from "../../shared/watch/runtime-events";
import { primeWatchSyncBridge } from "../../shared/watch/sync-bridge";
import {
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  FOOTER_TEXT,
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "zosLoader:./index.[pf].layout.js";

const PANEL_COLOR = 0x171d26;
const MUTED_TEXT = 0xaab4c2;

function buildHomeBody(state) {
  if (state.activeSession) {
    return [
      state.activeSession.recipeName,
      `Step ${state.activeSession.currentStepIndex + 1}/${state.activeSession.recipeSnapshot.steps.length}`,
      "Pick up where you left off."
    ].join("\n");
  }

  if (state.lastResult) {
    return [
      state.selectedTool ? state.selectedTool.label : "Choose a brewer",
      `Last brew: ${state.lastResult.recipeName}`,
      "Pick a brewer and start the next cup."
    ].join("\n");
  }

  return state.selectedTool
    ? [state.selectedTool.label, `${state.recipeCount} recipes ready`, "Choose a recipe and start."].join("\n")
    : ["Choose a brewer", "Browse the library", "Start the next brew."].join("\n");
}

Page({
  onDestroy() {
    if (this.unsubscribeRuntime) {
      this.unsubscribeRuntime();
      this.unsubscribeRuntime = null;
    }
  },
  build() {
    primeWatchSyncBridge();
    const reconcileResult = reconcileActiveSessionOnEntry();

    if (reconcileResult.finalized) {
      return;
    }

    const scaffoldState = getHomeScaffoldState();

    this.unsubscribeRuntime = subscribeRuntimeEvent((event) => {
      if (event.type === "catalog" || event.type === "last_result") {
        replace({ url: PAGE_URLS.home });
      }
    });

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text: "PourOverFlow"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...SUBTITLE_TEXT,
      text: scaffoldState.activeSession ? "Resume your brew" : "Choose your brewer"
    });
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
      y: BODY_TEXT.y + 10,
      h: BODY_TEXT.h + 24,
      text: buildHomeBody(scaffoldState)
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[0],
      text: scaffoldState.activeSession ? "Resume brew" : "Browse brewers",
      click_func: () => {
        if (scaffoldState.activeSession) {
          resumeActiveSession();
          return;
        }

        goToToolList();
      }
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[1],
      text: scaffoldState.activeSession ? "X" : "Refresh",
      click_func: () => {
        if (scaffoldState.activeSession) {
          discardActiveSessionFromHome();
          return;
        }

        refreshPhoneSnapshot();
        retryPendingHistorySync();
      }
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[2],
      text: "Latest",
      click_func: () => {
        goToResultSummary();
      }
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
      y: BUTTONS[1].y - 44,
      h: 30,
      color: MUTED_TEXT,
      text: scaffoldState.activeSession
        ? "Main action stays pinned below."
        : "Refresh the phone snapshot or open the latest brew."
    });
  }
});
