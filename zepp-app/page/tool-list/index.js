import { SHARED_COLORS } from "../../shared/watch/layouts";
import { drawBrowseTabs, registerBrowseTabs } from "../../shared/watch/browse-tabs";
import * as hmUI from "@zos/ui";
import { getScrollListOptions } from "../../shared/watch/scroll-list-options";
import { replace } from "@zos/router";
import { enterWatchPage } from "../../shared/watch/navigation";
import { PAGE_URLS, refreshPhoneSnapshot, selectTool, getToolList } from "../../shared/watch/router";
import { subscribeRuntimeEvent } from "../../shared/watch/runtime-events";
import { createWatchTranslator } from "../../shared/i18n/watch-locale.js";
import {
  BACKGROUND,
  LIST_FRAME,
  PRIMARY_BUTTON,
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "./index.layout.js";

function buildToolRows(tools, i18n) {
  return tools.map((tool) => ({
    icon: `${tool.iconStem}.png`,
    title: i18n.getToolLabel(tool),
    meta: i18n.t("common.counts.recipes", {
      count: tool.recipeCount || 0
    }),
    toolId: tool.toolId
  }));
}

function createToolListConfig() {
  const iconSize = Math.max(44, LIST_FRAME.itemHeight - 36);
  const iconX = 24;
  const iconY = Math.floor((LIST_FRAME.itemHeight - iconSize) / 2);
  const titleY = 14;
  const titleTextSize = 23;
  const metaY = titleY + LIST_FRAME.titleHeight - 8;
  const metaTextSize = 16;
  const textX = iconX + iconSize + 18;
  const textW = LIST_FRAME.w - textX - 20;

  return [
    {
      type_id: 1,
      item_bg_color: SHARED_COLORS.surface,
      item_bg_radius: LIST_FRAME.itemRadius,
      item_press_effect: true,
      image_view: [
        {
          x: iconX,
          y: iconY,
          w: iconSize,
          h: iconSize,
          key: "icon",
          action: true
        }
      ],
      image_view_count: 1,
      text_view: [
        {
          x: textX,
          y: titleY,
          w: textW,
          h: LIST_FRAME.titleHeight,
          key: "title",
          color: SHARED_COLORS.text,
          text_size: titleTextSize,
          action: true,
          align_h: hmUI.align.LEFT,
          align_v: hmUI.align.CENTER_V
        },
        {
          x: textX,
          y: metaY,
          w: textW,
          h: LIST_FRAME.metaHeight,
          key: "meta",
          color: SHARED_COLORS.accent,
          text_size: metaTextSize,
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
    if (this.removeTabs) this.removeTabs();
    if (this.unsubscribeRuntime) {
      this.unsubscribeRuntime();
      this.unsubscribeRuntime = null;
    }
  },
  build() {
    if (!enterWatchPage(PAGE_URLS.toolList)) return;
    hmUI.setStatusBarVisible(false);
    const i18n = createWatchTranslator();
    const tools = getToolList();
    const rows = buildToolRows(tools, i18n);

    this.unsubscribeRuntime = subscribeRuntimeEvent((event) => {
      if (event.type === "catalog") {
        replace({ url: PAGE_URLS.toolList });
      }
    });

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    this.removeTabs = registerBrowseTabs(0);
    drawBrowseTabs(BACKGROUND.w, 0, BACKGROUND.w === BACKGROUND.h);
    if (!rows.length) {
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...SUBTITLE_TEXT,
        text: i18n.t("watch.toolList.empty")
      });
    }

    if (rows.length) {
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
        ...getScrollListOptions(false, true),
        item_click_func: (_list, index) => {
          selectTool(rows[index].toolId);
        }
      });
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...TITLE_TEXT,
        text: i18n.t("watch.toolList.title")
      });
    }

    if (!rows.length) {
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...TITLE_TEXT,
        text: i18n.t("watch.toolList.title")
      });
      hmUI.createWidget(hmUI.widget.BUTTON, {
        ...PRIMARY_BUTTON,
        text: i18n.t("watch.toolList.refresh"),
        click_func: () => {
          refreshPhoneSnapshot();
        }
      });
    }
  }
});
