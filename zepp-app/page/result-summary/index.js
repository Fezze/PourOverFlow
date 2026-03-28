import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import { getToolById, getLocalizedToolLabel } from "../../shared/constants/tool-catalog";
import { readLastResult } from "../../shared/storage/watch-store";
import { goHome, goToToolList, PAGE_URLS } from "../../shared/watch/router";
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
} from "zosLoader:./index.[pf].layout.js";

const PANEL_COLOR = 0x171d26;
const MUTED_TEXT = 0xaab4c2;
const RESULT_PANEL = lastResult => ({
  x: lastResult ? TITLE_TEXT.x - 4 : BUTTONS[0].x,
  y: lastResult ? SUBTITLE_TEXT.y + SUBTITLE_TEXT.h + 12 : BODY_TEXT.y - 8,
  w: lastResult ? TITLE_TEXT.w + 8 : BUTTONS[0].w,
  h: lastResult ? BUTTONS[0].y - (SUBTITLE_TEXT.y + SUBTITLE_TEXT.h + 12) - 12 : 120,
  radius: 26
});
const createResultListFrame = (panel) => ({
  x: panel.x + 10,
  y: panel.y + 18,
  w: panel.w - 20,
  h: panel.h - 28,
  itemHeight: 62,
  itemSpace: 8,
  itemRadius: 18
});

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
      meta: i18n.t("watch.resultSummary.rows.totalTimeValue", {
        seconds: Math.round(lastResult.elapsedMs / 1000)
      })
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
          color: 0xf5f7fa,
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
          color: 0xaab4c2,
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
    const rowHeight = 38 + (lineCount - 1) * 14;

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
        y: currentY + 7,
        w: resultListFrame.w - 32,
        h: 18,
        text: row.title,
        color: 0xf5f7fa,
        text_size: 17,
        align_h: hmUI.align.LEFT,
        align_v: hmUI.align.CENTER_V
      },
      meta: {
        x: resultListFrame.x + 16,
        y: currentY + 24,
        w: resultListFrame.w - 32,
        h: Math.max(16, lineCount * 14),
        text: row.meta,
        color: MUTED_TEXT,
        text_size: 15,
        text_style: hmUI.text_style.WRAP,
        align_h: hmUI.align.LEFT,
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
    if (this.unsubscribeRuntime) {
      this.unsubscribeRuntime();
      this.unsubscribeRuntime = null;
    }
  },
  build() {
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
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
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
          enable_scroll_bar: false
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
          goToToolList();
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
