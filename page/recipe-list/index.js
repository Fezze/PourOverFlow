import * as hmUI from "@zos/ui";
import { getDeviceInfo } from "@zos/device";
import { replace } from "@zos/router";
import {
  getRecipeListForSelectedTool,
  getSelectedTool,
  PAGE_URLS,
  refreshPhoneSnapshot,
  selectRecipe
} from "../../shared/watch/router";
import { subscribeRuntimeEvent } from "../../shared/watch/runtime-events";
import {
  BACKGROUND,
  EMPTY_BUTTON,
  LIST_FRAME,
  LIST_PANEL,
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

function buildRecipeRows(recipes) {
  return recipes.map((recipe) => {
    const snapshot = recipe.recipeSnapshot;
    const totalSeconds = snapshot ? Math.round(snapshot.estimatedTotalDurationMs / 1000) : 0;

    return {
      title: recipe.name,
      meta: snapshot ? `${snapshot.coffeeDoseG}g / ${snapshot.totalWaterMl}ml / ${totalSeconds}s` : "Snapshot missing",
      recipeId: recipe.recipeId
    };
  });
}

function createRecipeListConfig() {
  return [
    {
      type_id: 1,
      item_bg_color: 0x171d26,
      item_bg_radius: LIST_FRAME.itemRadius,
      item_press_effect: true,
      text_view: [
        {
          x: 20,
          y: 16,
          w: LIST_FRAME.w - 40,
          h: LIST_FRAME.titleHeight,
          key: "title",
          color: 0xf5f7fa,
          text_size: 22,
          action: true,
          align_h: hmUI.align.LEFT,
          align_v: hmUI.align.CENTER_V
        },
        {
          x: 20,
          y: 54,
          w: LIST_FRAME.w - 40,
          h: LIST_FRAME.metaHeight,
          key: "meta",
          color: 0xaab4c2,
          text_size: 15,
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
    const selectedTool = getSelectedTool();
    const recipes = getRecipeListForSelectedTool();
    const rows = buildRecipeRows(recipes);

    this.unsubscribeRuntime = subscribeRuntimeEvent((event) => {
      if (event.type === "catalog") {
        replace({ url: PAGE_URLS.recipeList });
      }
    });

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text: selectedTool ? selectedTool.label : "Recipes"
    });
    if (!rows.length) {
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...SUBTITLE_TEXT,
        text: "Create recipes on phone first"
      });
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...SUBTITLE_TEXT,
        y: SUBTITLE_TEXT.y + 36,
        h: SUBTITLE_TEXT.h + 18,
        text_size: Math.max(14, (SUBTITLE_TEXT.text_size || 16) - 1),
        text: "After saving in Settings, refresh from the watch."
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
        item_config: createRecipeListConfig(),
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
          selectRecipe(rows[index].recipeId);
        }
      });
      return;
    }

    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...EMPTY_BUTTON,
      text: "Refresh from phone",
      click_func: () => {
        refreshPhoneSnapshot();
      }
    });
  }
});
