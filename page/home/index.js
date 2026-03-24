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
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "zosLoader:./index.[pf].layout.js";

function buildHomeBody(state) {
  const lines = [];

  if (state.activeSession) {
    lines.push(state.activeSession.recipeName);
    lines.push(`Step ${state.activeSession.currentStepIndex + 1}/${state.activeSession.recipeSnapshot.steps.length}`);
  } else if (state.selectedTool) {
    lines.push(`Last brewer: ${state.selectedTool.label}`);
    lines.push("Choose a recipe and start brewing.");
  } else {
    lines.push("Choose a brewer to start the next brew.");
  }

  if (state.lastResult) {
    lines.push(`Last brew: ${state.lastResult.recipeName}`);
  }

  return lines.join("\n");
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
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
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
      text: scaffoldState.activeSession ? "Discard session" : "Refresh library",
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
      text: "Latest result",
      click_func: () => {
        goToResultSummary();
      }
    });
  }
});
