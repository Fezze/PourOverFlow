import { SHARED_COLORS, fitCenteredTextToRoundScreen } from "../../shared/watch/layouts";
import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import { getColorNumber } from "../../shared/constants/color-palette";
import {
  getSelectedRecipe,
  goToRecipeList,
  PAGE_URLS,
  startSelectedRecipe
} from "../../shared/watch/router";
import { subscribeRuntimeEvent } from "../../shared/watch/runtime-events";
import { createWatchTranslator } from "../../shared/i18n/watch-locale.js";
import {
  ACTION_DOCK,
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  DETAIL_PANEL,
  FOOTER_TEXT,
  TITLE_TEXT
} from "./index.layout.js";

const DETAIL_LIST_FRAME = {
  x: DETAIL_PANEL.x + 8,
  y: DETAIL_PANEL.y + 8,
  w: DETAIL_PANEL.w - 16,
  h: DETAIL_PANEL.h - 16,
  itemSpace: 3,
  itemRadius: 12
};
const DETAIL_TEXT_INSET = 10;

function buildRecipeRows(recipe, i18n) {
  const snapshot = recipe.recipeSnapshot;

  if (!snapshot) {
    return [];
  }

  return [
    {
      title: i18n.t("watch.recipeDetail.rows.doseWater"),
      meta: `${snapshot.coffeeDoseG} g · ${snapshot.totalWaterMl} ml`
    },
    {
      title: i18n.t("watch.recipeDetail.rows.brewProfile"),
      meta: i18n.t("watch.recipeDetail.detail.brewProfile", {
        waterTempC: snapshot.waterTempC,
        grindLabel: snapshot.grindLabel,
        filterLabel: snapshot.filterLabel
      })
    },
    {
      title: i18n.t("watch.recipeDetail.rows.timeAndSteps"),
      meta: i18n.t("watch.recipeDetail.detail.timeAndSteps", {
        totalSeconds: Math.round(snapshot.estimatedTotalDurationMs / 1000),
        stepCount: snapshot.steps.length
      })
    },
    {
      title: i18n.t("watch.recipeDetail.rows.notes"),
      meta: snapshot.description || i18n.t("watch.recipeDetail.rows.startWhenReady")
    }
  ];
}

function createDetailListConfig(detailRows) {
  return detailRows.map((row, index) => {
    const textSize = index === 0 ? 21 : 17;
    const textWidth = DETAIL_LIST_FRAME.w - DETAIL_TEXT_INSET * 2;
    const { height } = hmUI.getTextLayout(row.meta, {
      text_size: textSize,
      text_width: textWidth,
      wrapped: 1
    });
    const textHeight = Math.max(textSize, Math.ceil(height));
    return {
      type_id: index + 1,
      item_bg_color: SHARED_COLORS.surface,
      item_bg_radius: DETAIL_LIST_FRAME.itemRadius,
      item_press_effect: false,
      text_view: [
        {
          x: DETAIL_TEXT_INSET, y: 0, w: textWidth, h: 16,
          key: "title", color: SHARED_COLORS.muted, text_size: 13,
          align_h: hmUI.align.LEFT, align_v: hmUI.align.CENTER_V
        },
        {
          x: DETAIL_TEXT_INSET, y: 18, w: textWidth, h: textHeight,
          key: "meta", color: index === 0 ? SHARED_COLORS.accent : SHARED_COLORS.text,
          text_size: textSize, text_style: hmUI.text_style.WRAP,
          align_h: hmUI.align.LEFT, align_v: hmUI.align.TOP
        }
      ],
      text_view_count: 2,
      item_height: 18 + textHeight + 3
    };
  });
}

function buildStaticDetailRows(detailRows, configs) {
  let y = DETAIL_LIST_FRAME.y;
  return detailRows.map((row, index) => {
    const config = configs[index];
    const item = {
      frame: {
        x: DETAIL_LIST_FRAME.x, y, w: DETAIL_LIST_FRAME.w, h: config.item_height,
        radius: DETAIL_LIST_FRAME.itemRadius, color: SHARED_COLORS.surface
      },
      ...Object.fromEntries(config.text_view.map(({ key, ...view }) => [key, {
        ...view, x: DETAIL_LIST_FRAME.x + view.x, y: y + view.y, text: row[key]
      }]))
    };
    y += config.item_height + DETAIL_LIST_FRAME.itemSpace;
    return item;
  });
}

function canRenderStaticDetailRows(configs) {
  const height = configs.reduce((sum, row) => sum + row.item_height, 0) +
    DETAIL_LIST_FRAME.itemSpace * Math.max(0, configs.length - 1);
  return configs.length > 0 && height <= DETAIL_LIST_FRAME.h;
}

Page({
  onDestroy() {
    if (this.unsubscribeRuntime) {
      this.unsubscribeRuntime();
      this.unsubscribeRuntime = null;
    }
  },
  build() {
    hmUI.setStatusBarVisible(false);
    const i18n = createWatchTranslator();
    const selectedRecipe = getSelectedRecipe();
    const snapshot = selectedRecipe ? selectedRecipe.recipeSnapshot : null;
    const detailRows = selectedRecipe ? buildRecipeRows(selectedRecipe, i18n) : [];
    const detailConfigs = createDetailListConfig(detailRows);
    const accentColor = snapshot ? getColorNumber(snapshot.colorToken) : 0x2d8c82;

    this.unsubscribeRuntime = subscribeRuntimeEvent((event) => {
      if (event.type === "catalog") {
        replace({ url: PAGE_URLS.recipeDetail });
      }
    });

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    hmUI.createWidget(hmUI.widget.TEXT, fitCenteredTextToRoundScreen({
      ...TITLE_TEXT,
      text_size: TITLE_TEXT.text_size - 2,
      h: 40,
      y: BACKGROUND.w === BACKGROUND.h ? 52 : 28,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.NONE,
      text: selectedRecipe ? selectedRecipe.name : i18n.t("watch.recipeDetail.unavailableTitle")
    }, BACKGROUND));
    hmUI.createWidget(hmUI.widget.FILL_RECT, DETAIL_PANEL);
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: DETAIL_PANEL.x + 24,
      y: DETAIL_PANEL.y,
      w: 32,
      h: 3,
      radius: DETAIL_PANEL.radius,
      color: accentColor
    });
    if (detailRows.length) {
      if (canRenderStaticDetailRows(detailConfigs)) {
        buildStaticDetailRows(detailRows, detailConfigs).forEach((row) => {
          hmUI.createWidget(hmUI.widget.FILL_RECT, row.frame);
          hmUI.createWidget(hmUI.widget.TEXT, row.title);
          hmUI.createWidget(hmUI.widget.TEXT, row.meta);
        });
      } else {
        hmUI.createWidget(hmUI.widget.SCROLL_LIST, {
          x: DETAIL_LIST_FRAME.x,
          y: DETAIL_LIST_FRAME.y,
          w: DETAIL_LIST_FRAME.w,
          h: DETAIL_LIST_FRAME.h,
          item_space: DETAIL_LIST_FRAME.itemSpace,
          item_config: detailConfigs,
          item_config_count: detailRows.length,
          data_array: detailRows,
          data_count: detailRows.length,
          data_type_config: detailRows.map((_row, index) => ({ start: index, end: index, type_id: index + 1 })),
          data_type_config_count: detailRows.length,
          enable_scroll_bar: false
        });
      }
    } else {
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...BODY_TEXT,
        x: BODY_TEXT.x + 14,
        w: BODY_TEXT.w - 28,
        y: BODY_TEXT.y + 6,
        h: BODY_TEXT.h + 14,
        text: i18n.t("watch.recipeDetail.unavailableBody")
      });
    }
    if (ACTION_DOCK) {
      hmUI.createWidget(hmUI.widget.FILL_RECT, ACTION_DOCK);
    }
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[0],
      text: selectedRecipe
        ? i18n.t("watch.recipeDetail.actions.start")
        : i18n.t("watch.recipeDetail.actions.back"),
      click_func: () => {
        if (selectedRecipe) {
          startSelectedRecipe();
          return;
        }

        goToRecipeList();
      }
    });

    if (!selectedRecipe) {
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...FOOTER_TEXT,
        text: i18n.t("watch.recipeDetail.unavailableBody")
      });
    }

  }
});
