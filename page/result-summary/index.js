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
const RESULT_PANEL = {
  x: BUTTONS[0].x,
  y: BODY_TEXT.y - 8,
  w: BUTTONS[0].w,
  h: 120,
  radius: 26
};
const RESULT_LIST_FRAME = {
  x: RESULT_PANEL.x + 10,
  y: RESULT_PANEL.y + 10,
  w: RESULT_PANEL.w - 20,
  h: RESULT_PANEL.h - 20,
  itemHeight: 62,
  itemSpace: 8,
  itemRadius: 18
};

function buildResultRows(lastResult) {
  if (!lastResult) {
    return [];
  }

  return [
    {
      title: "Status",
      meta: lastResult.status
    },
    {
      title: "Total time",
      meta: `${Math.round(lastResult.elapsedMs / 1000)}s total`
    },
    {
      title: "Timing delta",
      meta: `${lastResult.totalDeltaMs} ms`
    }
  ];
}

function createResultListConfig() {
  return [
    {
      type_id: 1,
      item_bg_color: PANEL_COLOR,
      item_bg_radius: RESULT_LIST_FRAME.itemRadius,
      item_press_effect: false,
      text_view: [
        {
          x: 16,
          y: 10,
          w: RESULT_LIST_FRAME.w - 32,
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
          w: RESULT_LIST_FRAME.w - 32,
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
      item_height: RESULT_LIST_FRAME.itemHeight
    }
  ];
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
    const resultRows = buildResultRows(lastResult);

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
      ...RESULT_PANEL,
      color: PANEL_COLOR
    });
    if (resultRows.length) {
      hmUI.createWidget(hmUI.widget.SCROLL_LIST, {
        x: RESULT_LIST_FRAME.x,
        y: RESULT_LIST_FRAME.y,
        w: RESULT_LIST_FRAME.w,
        h: RESULT_LIST_FRAME.h,
        item_space: RESULT_LIST_FRAME.itemSpace,
        item_config: createResultListConfig(),
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
        enable_scroll_bar: true
      });
    } else {
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...BODY_TEXT,
        x: BODY_TEXT.x + 14,
        w: BODY_TEXT.w - 28,
        y: BODY_TEXT.y + 10,
        h: BODY_TEXT.h + 24,
        text: "No completed brew summary is stored on the watch yet."
      });
    }
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
        ? "Scroll for summary, then brew again or go home."
        : "Full history stays on the phone."
    });
  }
});
