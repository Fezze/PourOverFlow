import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import { getToolList } from "../../shared/watch/router";
import {
  discardActiveSessionFromHome,
  getHomeScaffoldState,
  PAGE_URLS,
  goToResultSummary,
  goToToolList,
  refreshPhoneSnapshot,
  reconcileActiveSessionOnEntry,
  retryPendingHistorySync,
  resumeActiveSession
} from "../../shared/watch/router";
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
    const reconcileResult = reconcileActiveSessionOnEntry();

    if (reconcileResult.finalized) {
      return;
    }

    const {
      activeSession,
      catalogReady,
      connected,
      lastResult,
      pendingHistoryCount,
      recipeCount,
      selectedTool,
      syncMeta
    } = getHomeScaffoldState();
    const supportedTools = getToolList();
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
      text: activeSession ? "Resume gate" : connected ? "Phone bridge connected" : "Waiting for phone bridge"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      text: [
        activeSession
          ? `Resume: ${activeSession.recipeName}`
          : "No active session yet.",
        `Tool catalog: ${supportedTools.length} brewers`,
        selectedTool ? `Current tool: ${selectedTool.label}` : "Current tool: n/a",
        selectedTool ? `Recipes on watch: ${recipeCount}` : "Recipes on watch: 0",
        lastResult ? `Last result: ${lastResult.recipeName}` : "Last result: none",
        `Pending sync: ${pendingHistoryCount}`,
        `Revisions: T${syncMeta.toolCatalogRevision}/R${syncMeta.recipeCatalogRevision}/H${syncMeta.historyRevision}`,
        catalogReady ? "Catalog cache ready." : "Catalog cache not ready yet."
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
      text: activeSession ? "Discard session" : connected ? "Refresh sync" : "Retry sync",
      click_func: () => {
        if (activeSession) {
          discardActiveSessionFromHome();
          return;
        }

        refreshPhoneSnapshot();
        retryPendingHistorySync();
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
      text: "Phone CRUD is live in Settings. This screen now boots from watch cache and requests a phone refresh."
    });
  }
});
