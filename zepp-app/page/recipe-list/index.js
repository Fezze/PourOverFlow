import { getColorNumber } from "../../shared/constants/color-palette";
import { SHARED_COLORS } from "../../shared/watch/layouts";
import * as hmUI from "@zos/ui";
import { getScrollListOptions } from "../../shared/watch/scroll-list-options";
import { replace } from "@zos/router";
import { enterWatchPage } from "../../shared/watch/navigation";
import {
  getRecipeListForSelectedTool,
  getSelectedTool,
  PAGE_URLS,
  refreshPhoneSnapshot,
  selectRecipe
} from "../../shared/watch/router";
import { subscribeRuntimeEvent } from "../../shared/watch/runtime-events";
import { createWatchTranslator } from "../../shared/i18n/watch-locale.js";
import {
  BACKGROUND,
  EMPTY_BUTTON,
  LIST_FRAME,
  LIST_PANEL,
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "./index.layout.js";

function readableRecipeColor(token) {
  const color = getColorNumber(token);
  const lift = shift => Math.round((((color >> shift) & 255) + 255) / 2);
  return (lift(16) << 16) | (lift(8) << 8) | lift(0);
}

function buildRecipeRows(recipes, i18n) {
  return recipes.map((recipe) => {
    const snapshot = recipe.recipeSnapshot;
    const totalSeconds = snapshot ? Math.round(snapshot.estimatedTotalDurationMs / 1000) : 0;

    return {
      title: recipe.name,
      meta: snapshot
        ? `${snapshot.coffeeDoseG}g / ${snapshot.totalWaterMl}ml / ${totalSeconds}s`
        : i18n.t("watch.recipeList.snapshotMissing"),
      recipeId: recipe.recipeId,
      color: readableRecipeColor(snapshot ? snapshot.colorToken : "amber")
    };
  });
}

function createRecipeListConfig(rows) {
  const textInset = BACKGROUND.w === BACKGROUND.h ? 12 : 8;
  const titleY = 10;
  const titleTextSize = 22;
  const metaTextSize = 16;

  return rows.map((row, index) => {
    const textWidth = LIST_FRAME.w - textInset * 2;
    const { height } = hmUI.getTextLayout(row.title, {
      text_size: titleTextSize, text_width: textWidth, wrapped: 1
    });
    const titleHeight = Math.max(LIST_FRAME.titleHeight, Math.ceil(height));
    const metaY = titleY + titleHeight + 2;
    return {
      type_id: index + 1,
      item_bg_color: SHARED_COLORS.surface,
      item_bg_radius: LIST_FRAME.itemRadius,
      item_press_effect: true,
      text_view: [
        {
          x: textInset, y: titleY, w: textWidth, h: titleHeight,
          key: "title", color: SHARED_COLORS.text, text_size: titleTextSize,
          action: true, text_style: hmUI.text_style.WRAP,
          align_h: hmUI.align.LEFT, align_v: hmUI.align.CENTER_V
        },
        {
          x: textInset, y: metaY, w: textWidth, h: LIST_FRAME.metaHeight,
          key: "meta", color: row.color, text_size: metaTextSize,
          action: true, align_h: hmUI.align.LEFT, align_v: hmUI.align.CENTER_V
        }
      ],
      text_view_count: 2,
      item_height: Math.max(LIST_FRAME.itemHeight, metaY + LIST_FRAME.metaHeight + 10)
    };
  });
}

Page({
  onDestroy() {
    if (this.unsubscribeRuntime) {
      this.unsubscribeRuntime();
      this.unsubscribeRuntime = null;
    }
  },
  build() {
    if (!enterWatchPage(PAGE_URLS.recipeList)) return;
    hmUI.setStatusBarVisible(false);
    const i18n = createWatchTranslator();
    const selectedTool = getSelectedTool();
    const recipes = getRecipeListForSelectedTool();
    const rows = buildRecipeRows(recipes, i18n);

    this.unsubscribeRuntime = subscribeRuntimeEvent((event) => {
      if (event.type === "catalog") {
        replace({ url: PAGE_URLS.recipeList });
      }
    });

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text: selectedTool ? i18n.getToolLabel(selectedTool) : i18n.t("watch.recipeList.titleFallback")
    });
    if (!rows.length) {
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...SUBTITLE_TEXT,
        text: i18n.t("watch.recipeList.empty")
      });
    }

    if (rows.length) {
      hmUI.createWidget(hmUI.widget.FILL_RECT, { ...LIST_PANEL, color: SHARED_COLORS.background });
      hmUI.createWidget(hmUI.widget.SCROLL_LIST, {
        x: LIST_FRAME.x,
        y: LIST_FRAME.y,
        w: LIST_FRAME.w,
        h: LIST_FRAME.h,
        item_space: LIST_FRAME.itemSpace,
        item_config: createRecipeListConfig(rows),
        item_config_count: rows.length,
        data_array: rows,
        data_count: rows.length,
        data_type_config: rows.map((_row, index) => ({ start: index, end: index, type_id: index + 1 })),
        data_type_config_count: rows.length,
        ...getScrollListOptions(true, true),
        item_click_func: (_list, index) => {
          selectRecipe(rows[index].recipeId);
        }
      });
      return;
    }

    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...EMPTY_BUTTON,
      text: i18n.t("watch.recipeList.refresh"),
      click_func: () => {
        refreshPhoneSnapshot();
      }
    });
  }
});
