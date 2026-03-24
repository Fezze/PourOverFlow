import * as hmUI from "@zos/ui";
import { getDeviceInfo } from "@zos/device";
import { replace } from "@zos/router";
import { goHome, PAGE_URLS, refreshPhoneSnapshot, selectTool, getToolList } from "../../shared/watch/router";
import { subscribeRuntimeEvent } from "../../shared/watch/runtime-events";
import {
  BACKGROUND,
  FOOTER_TEXT,
  LIST_FRAME,
  LIST_PANEL,
  PRIMARY_BUTTON,
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "zosLoader:./index.[pf].layout.js";

function supportsHardwareListFocus() {
  try {
    const deviceInfo = getDeviceInfo();
    return Number(deviceInfo?.keyNumber) >= 3 || String(deviceInfo?.keyType || "").includes("sport");
  } catch (error) {
    console.log("Hardware list focus fallback", error);
    return false;
  }
}

function buildToolRows(tools) {
  return tools.map((tool) => ({
    title: tool.label,
    meta: tool.recipeCount === 1 ? "1 recipe ready" : `${tool.recipeCount || 0} recipes ready`,
    hint: "Open",
    toolId: tool.toolId
  }));
}

function createToolListConfig() {
  return [
    {
      type_id: 1,
      item_bg_color: 0x171d26,
      item_bg_radius: LIST_FRAME.itemRadius,
      item_press_effect: true,
      text_view: [
        {
          x: 20,
          y: 18,
          w: LIST_FRAME.w - 110,
          h: LIST_FRAME.titleHeight,
          key: "title",
          color: 0xf5f7fa,
          text_size: 24,
          action: true,
          align_h: hmUI.align.LEFT,
          align_v: hmUI.align.CENTER_V
        },
        {
          x: 20,
          y: 58,
          w: LIST_FRAME.w - 120,
          h: LIST_FRAME.metaHeight,
          key: "meta",
          color: 0xaab4c2,
          text_size: 16,
          action: true,
          align_h: hmUI.align.LEFT,
          align_v: hmUI.align.CENTER_V
        },
        {
          x: LIST_FRAME.w - 96,
          y: 26,
          w: 76,
          h: 28,
          key: "hint",
          color: 0x2d8c82,
          text_size: 18,
          action: true,
          align_h: hmUI.align.RIGHT,
          align_v: hmUI.align.CENTER_V
        }
      ],
      text_view_count: 3,
      item_height: LIST_FRAME.itemHeight
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
    const tools = getToolList();
    const rows = buildToolRows(tools);

    this.unsubscribeRuntime = subscribeRuntimeEvent((event) => {
      if (event.type === "catalog") {
        replace({ url: PAGE_URLS.toolList });
      }
    });

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text: "Brewers"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...SUBTITLE_TEXT,
      text: rows.length ? `${rows.length} synced tools on watch` : "No synced tools yet"
    });

    if (rows.length) {
      hmUI.createWidget(hmUI.widget.FILL_RECT, LIST_PANEL);
      hmUI.createWidget(hmUI.widget.SCROLL_LIST, {
        x: LIST_FRAME.x,
        y: LIST_FRAME.y,
        w: LIST_FRAME.w,
        h: LIST_FRAME.h,
        item_space: LIST_FRAME.itemSpace,
        item_config: createToolListConfig(),
        item_config_count: 1,
        data_array: rows,
        data_count: rows.length,
        data_type_config: [
          {
            start: 0,
            end: rows.length - 1,
            type_id: 1
          }
        ],
        data_type_config_count: 1,
        enable_scroll_bar: true,
        item_common_focus: supportsHardwareListFocus(),
        item_click_func: (_list, index) => {
          selectTool(rows[index].toolId);
        }
      });
    }

    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...PRIMARY_BUTTON,
      text: rows.length ? "Home" : "Refresh sync",
      click_func: () => {
        if (rows.length) {
          goHome();
          return;
        }

        refreshPhoneSnapshot();
      }
    });

    hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
      text: rows.length
        ? "Scroll to browse brewers."
        : "Sync from the phone companion to populate the watch browse list."
    });
  }
});
