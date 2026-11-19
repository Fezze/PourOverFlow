import { formatDurationLabel } from "../../shared/engine/recipe-engine";
import { SHARED_COLORS, fitCenteredTextToRoundScreen } from "../../shared/watch/layouts";
import { drawBrowseTabs, registerBrowseTabs, switchBrowseTab } from "../../shared/watch/browse-tabs";
import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import { enterWatchPage } from "../../shared/watch/navigation";
import { getToolById, getLocalizedToolLabel } from "../../shared/constants/tool-catalog";
import { readLastResult } from "../../shared/storage/watch-store";
import { goHome, PAGE_URLS } from "../../shared/watch/router";
import { getScrollListOptions } from "../../shared/watch/scroll-list-options";
import { subscribeRuntimeEvent } from "../../shared/watch/runtime-events";
import { createWatchTranslator } from "../../shared/i18n/watch-locale.js";
import {
  ACTION_DOCK,
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  FOOTER_TEXT,
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "./index.layout.js";

const PANEL_COLOR = SHARED_COLORS.surface;
const MUTED_TEXT = SHARED_COLORS.muted;
const RESULT_PANEL = lastResult => ({
  x: lastResult ? TITLE_TEXT.x - 4 : BUTTONS[0].x,
  y: lastResult ? SUBTITLE_TEXT.y + SUBTITLE_TEXT.h + 12 : BODY_TEXT.y - 8,
  w: lastResult ? TITLE_TEXT.w + 8 : BUTTONS[0].w,
  h: lastResult ? BUTTONS[0].y - (SUBTITLE_TEXT.y + SUBTITLE_TEXT.h + 12) - 12 : 120,
  radius: 26
});
const createResultListFrame = (panel) => ({
  x: panel.x + 10,
  y: panel.y + 10,
  w: panel.w - 20,
  h: panel.h - 20,
  itemHeight: 62,
  itemSpace: 4,
  itemRadius: 18
});

function buildTitleStyle(lastResult) {
  if (!lastResult) {
    return TITLE_TEXT;
  }

  return fitCenteredTextToRoundScreen({
    ...TITLE_TEXT,
    h: TITLE_TEXT.h + 16,
    text_size: TITLE_TEXT.text_size > 24 ? 24 : TITLE_TEXT.text_size,
    align_v: hmUI.align.CENTER_V,
    text_style: hmUI.text_style.NONE
  }, BACKGROUND);
}

function buildResultRows(lastResult, i18n) {
  if (!lastResult) {
    return [];
  }

  return [
    {
      title: i18n.t("watch.resultSummary.rows.status"),
      meta: i18n.getHistoryStatus(lastResult.status)
    },
    {
      title: i18n.t("watch.resultSummary.rows.totalTime"),
      meta: formatDurationLabel(lastResult.elapsedMs)
    },
    {
      title: i18n.t("watch.resultSummary.rows.timingDelta"),
      meta: i18n.t("watch.resultSummary.rows.timingDeltaValue", {
        totalDeltaMs: lastResult.totalDeltaMs
      })
    }
  ];
}

function createResultListConfig(resultListFrame) {
  return [
    {
      type_id: 1,
      item_bg_color: PANEL_COLOR,
      item_bg_radius: resultListFrame.itemRadius,
      item_press_effect: false,
      text_view: [
        {
          x: 16,
          y: 10,
          w: resultListFrame.w - 32,
          h: 20,
          key: "title",
          color: SHARED_COLORS.text,
          text_size: 17,
          align_h: hmUI.align.LEFT,
          align_v: hmUI.align.CENTER_V
        },
        {
          x: 16,
          y: 30,
          w: resultListFrame.w - 32,
          h: 22,
          key: "meta",
          color: SHARED_COLORS.muted,
          text_size: 15,
          text_style: hmUI.text_style.WRAP,
          align_h: hmUI.align.LEFT,
          align_v: hmUI.align.CENTER_V
        }
      ],
      text_view_count: 2,
      item_height: resultListFrame.itemHeight
    }
  ];
}

function estimateResultLineCount(text, resultListFrame) {
  const approxCharsPerLine = Math.max(24, Math.floor((resultListFrame.w - 32) / 8));
  return Math.max(1, Math.ceil(String(text || "").length / approxCharsPerLine));
}

function buildStaticResultRows(resultRows, resultListFrame) {
  const items = [];
  let currentY = resultListFrame.y;

  resultRows.forEach((row, index) => {
    const lineCount = estimateResultLineCount(row.meta, resultListFrame);
    const rowHeight = (index === 1 ? 76 : 38) + (lineCount - 1) * 18;

    items.push({
      frame: {
        x: resultListFrame.x,
        y: currentY,
        w: resultListFrame.w,
        h: rowHeight,
        radius: resultListFrame.itemRadius,
        color: PANEL_COLOR
      },
      title: {
        x: resultListFrame.x + 16,
        y: currentY + 1,
        w: resultListFrame.w - 32,
        h: 16,
        text: row.title,
        color: SHARED_COLORS.muted,
        text_size: 13,
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V
      },
      meta: {
        x: resultListFrame.x + 16,
        y: currentY + 17,
        w: resultListFrame.w - 32,
        h: index === 1 ? 58 : Math.max(21, lineCount * 18),
        text: row.meta,
        color: index === 1 ? SHARED_COLORS.accent : (index === 0 ? SHARED_COLORS.success : SHARED_COLORS.text),
        text_size: index === 1 ? 50 : 18,
        text_style: hmUI.text_style.WRAP,
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V
      }
    });

    currentY += rowHeight + (index === resultRows.length - 1 ? 0 : resultListFrame.itemSpace);
  });

  return items;
}

function canRenderStaticResultRows(resultRows, resultListFrame) {
  if (!resultRows.length) {
    return false;
  }

  const totalHeight = buildStaticResultRows(resultRows, resultListFrame).reduce((sum, row) => sum + row.frame.h, 0) +
    resultListFrame.itemSpace * Math.max(0, resultRows.length - 1);

  return totalHeight <= resultListFrame.h;
}

Page({
  onDestroy() {
    if (this.removeTabs) this.removeTabs();
    if (this.unsubscribeRuntime) {
      this.unsubscribeRuntime();
      this.unsubscribeRuntime = null;
    }
  },
  build() {
    if (!enterWatchPage(PAGE_URLS.resultSummary)) return;
    hmUI.setStatusBarVisible(false);
    const i18n = createWatchTranslator();
    const lastResult = readLastResult();
    const tool = lastResult ? getToolById(lastResult.toolId) : null;
    const resultRows = buildResultRows(lastResult, i18n);
    const resultPanel = RESULT_PANEL(lastResult);
    const resultListFrame = createResultListFrame(resultPanel);

    this.unsubscribeRuntime = subscribeRuntimeEvent((event) => {
      if (event.type === "last_result") {
        replace({ url: PAGE_URLS.resultSummary });
      }
    });

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    this.removeTabs = registerBrowseTabs(1);
    drawBrowseTabs(BACKGROUND.w, 1, BACKGROUND.w === BACKGROUND.h);
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...buildTitleStyle(lastResult),
      text: lastResult ? lastResult.recipeName : i18n.t("watch.resultSummary.noResultYet")
    });
    if (lastResult) {
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...SUBTITLE_TEXT,
        text: tool ? getLocalizedToolLabel(tool, i18n) : lastResult.toolId
      });
    }
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      ...resultPanel,
      color: PANEL_COLOR
    });
    if (resultRows.length) {
      if (canRenderStaticResultRows(resultRows, resultListFrame)) {
        buildStaticResultRows(resultRows, resultListFrame).forEach((row) => {
          hmUI.createWidget(hmUI.widget.FILL_RECT, row.frame);
          hmUI.createWidget(hmUI.widget.TEXT, row.title);
          hmUI.createWidget(hmUI.widget.TEXT, row.meta);
        });
      } else {
        hmUI.createWidget(hmUI.widget.SCROLL_LIST, {
          x: resultListFrame.x,
          y: resultListFrame.y,
          w: resultListFrame.w,
          h: resultListFrame.h,
          item_space: resultListFrame.itemSpace,
          item_config: createResultListConfig(resultListFrame),
          item_config_count: 1,
          data_array: resultRows,
          data_count: resultRows.length,
          data_type_config: [
            {
              start: 0,
              end: resultRows.length - 1,
              type_id: 1
            }
          ],
          data_type_config_count: 1,
          ...getScrollListOptions(false)
        });
      }
    } else {
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...BODY_TEXT,
        x: BODY_TEXT.x + 14,
        w: BODY_TEXT.w - 28,
        y: BODY_TEXT.y + 10,
        h: BODY_TEXT.h + 24,
        text: i18n.t("watch.resultSummary.noSummary")
      });
    }
    if (ACTION_DOCK) {
      hmUI.createWidget(hmUI.widget.FILL_RECT, ACTION_DOCK);
    }
    if (lastResult) {
      hmUI.createWidget(hmUI.widget.BUTTON, {
        ...BUTTONS[0],
        text: i18n.t("watch.resultSummary.actions.home"),
        click_func: () => {
          goHome();
        }
      });
    } else {
      hmUI.createWidget(hmUI.widget.BUTTON, {
        ...BUTTONS[0],
        text: i18n.t("watch.resultSummary.actions.browse"),
        click_func: () => {
          switchBrowseTab(0);
        }
      });
      hmUI.createWidget(hmUI.widget.BUTTON, {
        ...BUTTONS[1],
        text: i18n.t("watch.resultSummary.actions.home"),
        click_func: () => {
          goHome();
        }
      });
    }
  }
});
