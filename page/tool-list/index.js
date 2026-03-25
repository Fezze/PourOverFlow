import * as hmUI from "@zos/ui";
import { getDeviceInfo } from "@zos/device";
import { replace } from "@zos/router";
import { PAGE_URLS, refreshPhoneSnapshot, selectTool, getToolList } from "../../shared/watch/router";
import { subscribeRuntimeEvent } from "../../shared/watch/runtime-events";
import {
  BACKGROUND,
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
    icon: `${tool.iconStem}.png`,
    title: tool.label,
    meta: tool.recipeCount === 1 ? "1 recipe" : `${tool.recipeCount || 0} recipes`,
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
      image_view: [
        {
          x: 18,
          y: 28,
          w: 56,
          h: 56,
          key: "icon",
          action: true
        }
      ],
      image_view_count: 1,
      text_view: [
        {
          x: 92,
          y: 20,
          w: LIST_FRAME.w - 112,
          h: LIST_FRAME.titleHeight,
          key: "title",
          color: 0xf5f7fa,
          text_size: 24,
          action: true,
          align_h: hmUI.align.LEFT,
          align_v: hmUI.align.CENTER_V
        },
        {
          x: 92,
          y: 60,
          w: LIST_FRAME.w - 112,
          h: LIST_FRAME.metaHeight,
          key: "meta",
          color: 0xaab4c2,
          text_size: 16,
          action: true,
          align_h: hmUI.align.LEFT,
          align_v: hmUI.align.CENTER_V
        }
      ],
      text_view_count: 2,
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
    if (!rows.length) {
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...SUBTITLE_TEXT,
        text: "Add recipes on the phone, then refresh."
      });
    }

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

    if (!rows.length) {
      hmUI.createWidget(hmUI.widget.BUTTON, {
        ...PRIMARY_BUTTON,
        text: "Refresh library",
        click_func: () => {
          refreshPhoneSnapshot();
        }
      });
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: PRIMARY_BUTTON.x,
        y: PRIMARY_BUTTON.y + PRIMARY_BUTTON.h + 10,
        w: PRIMARY_BUTTON.w,
        h: 28,
        color: 0xaab4c2,
        text_size: 14,
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V,
        text_style: hmUI.text_style.WRAP,
        text: "The list fills after the next phone sync."
      });
    }
  }
});
