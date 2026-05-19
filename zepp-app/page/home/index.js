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
import { createWatchTranslator } from "../../shared/i18n/watch-locale.js";
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

function buildHomeTitle(state, i18n) {
  if (state.activeSession) {
    return state.activeSession.recipeName;
  }

  if (state.selectedTool) {
    return i18n.getToolLabel(state.selectedTool);
  }

  return i18n.t("watch.home.title.default");
}

function buildHomeSubtitle(state, i18n) {
  if (state.activeSession) {
    return i18n.t("watch.home.subtitle.resume");
  }

  if (state.lastResult) {
    return i18n.t("watch.home.subtitle.nextCup");
  }

  return i18n.t("watch.home.subtitle.chooseBrewer");
}

function buildHomeBody(state, i18n) {
  if (state.activeSession) {
    return i18n.t("watch.home.body.stepProgress", {
      current: state.activeSession.currentStepIndex + 1,
      total: state.activeSession.recipeSnapshot.steps.length
    });
  }

  if (state.lastResult) {
    return [
      i18n.t("watch.home.body.lastBrewLabel"),
      state.lastResult.recipeName
    ].join("\n");
  }

  return state.selectedTool
    ? i18n.t("watch.home.body.recipesReady", { count: state.recipeCount })
    : i18n.t("watch.home.body.ready");
}

Page({
  onDestroy() {
    if (this.unsubscribeRuntime) {
      this.unsubscribeRuntime();
      this.unsubscribeRuntime = null;
    }
  },
  build() {
    const i18n = createWatchTranslator();
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
    const isResumeState = Boolean(scaffoldState.activeSession);
    const titleTextStyle = isResumeState
      ? {
          ...TITLE_TEXT,
          y: TITLE_TEXT.y - 4,
          h: TITLE_TEXT.h + 18,
          text_size: TITLE_TEXT.text_size - 2,
          align_v: hmUI.align.TOP
        }
      : TITLE_TEXT;
    const subtitleTextStyle = isResumeState
      ? {
          ...SUBTITLE_TEXT,
          y: SUBTITLE_TEXT.y + 18,
          h: 24,
          align_v: hmUI.align.TOP
        }
      : SUBTITLE_TEXT;
    const bodyPanelY = isResumeState ? BODY_TEXT.y + 6 : BODY_TEXT.y - 8;
    const bodyTextY = isResumeState ? BODY_TEXT.y + 24 : BODY_TEXT.y + 10;

    hmUI.createWidget(hmUI.widget.TEXT, {
      ...titleTextStyle,
      text: buildHomeTitle(scaffoldState, i18n)
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...subtitleTextStyle,
      text: buildHomeSubtitle(scaffoldState, i18n)
    });
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: BUTTONS[0].x,
      y: bodyPanelY,
      w: BUTTONS[0].w,
      h: 110,
      radius: 26,
      color: PANEL_COLOR
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      x: BODY_TEXT.x + 14,
      w: BODY_TEXT.w - 28,
      y: bodyTextY,
      h: BODY_TEXT.h + 24,
      text: buildHomeBody(scaffoldState, i18n)
    });
    if (ACTION_DOCK) {
      hmUI.createWidget(hmUI.widget.FILL_RECT, ACTION_DOCK);
    }
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[0],
      text: scaffoldState.activeSession
        ? i18n.t("watch.home.actions.resume")
        : i18n.t("watch.home.actions.browse"),
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
      text: scaffoldState.activeSession
        ? i18n.t("watch.home.actions.discard")
        : i18n.t("watch.home.actions.sync"),
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
      text: i18n.t("watch.home.actions.last"),
      click_func: () => {
        goToResultSummary();
      }
    });

  }
});
