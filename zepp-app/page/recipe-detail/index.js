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
} from "zosLoader:./index.[pf].layout.js";

const DETAIL_LIST_FRAME = {
  x: DETAIL_PANEL.x + 8,
  y: DETAIL_PANEL.y + 12,
  w: DETAIL_PANEL.w - 16,
  h: DETAIL_PANEL.h - 24,
  itemHeight: 68,
  itemSpace: 8,
  itemRadius: 18
};

function buildRecipeRows(recipe, i18n) {
  const snapshot = recipe.recipeSnapshot;

  if (!snapshot) {
    return [];
  }

  return [
    {
      title: i18n.t("watch.recipeDetail.rows.doseWater"),
      meta: i18n.t("watch.recipeDetail.detail.doseWater", {
        coffeeDoseG: snapshot.coffeeDoseG,
        totalWaterMl: snapshot.totalWaterMl
      })
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

function estimateDetailLineCount(text) {
  const approxCharsPerLine = Math.max(24, Math.floor((DETAIL_LIST_FRAME.w - 32) / 8));
  return Math.max(1, Math.ceil(String(text || "").length / approxCharsPerLine));
}

function buildStaticDetailRows(detailRows) {
  const items = [];
  let currentY = DETAIL_LIST_FRAME.y;

  detailRows.forEach((row, index) => {
    const lineCount = estimateDetailLineCount(row.meta);
    const rowHeight = 38 + (lineCount - 1) * 14;

    items.push({
      frame: {
        x: DETAIL_LIST_FRAME.x,
        y: currentY,
        w: DETAIL_LIST_FRAME.w,
        h: rowHeight,
        radius: DETAIL_LIST_FRAME.itemRadius,
        color: 0x171d26
      },
      title: {
        x: DETAIL_LIST_FRAME.x + 16,
        y: currentY + 7,
        w: DETAIL_LIST_FRAME.w - 32,
        h: 18,
        text: row.title,
        color: 0xf5f7fa,
        text_size: 18,
        align_h: hmUI.align.LEFT,
        align_v: hmUI.align.CENTER_V
      },
      meta: {
        x: DETAIL_LIST_FRAME.x + 16,
        y: currentY + 24,
        w: DETAIL_LIST_FRAME.w - 32,
        h: Math.max(16, lineCount * 14),
        text: row.meta,
        color: 0xaab4c2,
        text_size: 15,
        text_style: hmUI.text_style.WRAP,
        align_h: hmUI.align.LEFT,
        align_v: hmUI.align.CENTER_V
      }
    });

    currentY += rowHeight + (index === detailRows.length - 1 ? 0 : DETAIL_LIST_FRAME.itemSpace);
  });

  return items;
}

function canRenderStaticDetailRows(detailRows) {
  if (!detailRows.length) {
    return false;
  }

  const totalHeight = buildStaticDetailRows(detailRows).reduce((sum, row) => sum + row.frame.h, 0) +
    DETAIL_LIST_FRAME.itemSpace * Math.max(0, detailRows.length - 1);

  return totalHeight <= DETAIL_LIST_FRAME.h;
}

function createDetailListConfig() {
  return [
    {
      type_id: 1,
      item_bg_color: 0x171d26,
      item_bg_radius: DETAIL_LIST_FRAME.itemRadius,
      item_press_effect: false,
      text_view: [
        {
          x: 16,
          y: 10,
          w: DETAIL_LIST_FRAME.w - 32,
          h: 22,
          key: "title",
          color: 0xf5f7fa,
          text_size: 18,
          align_h: hmUI.align.LEFT,
          align_v: hmUI.align.CENTER_V
        },
        {
          x: 16,
          y: 32,
          w: DETAIL_LIST_FRAME.w - 32,
          h: 26,
          key: "meta",
          color: 0xaab4c2,
          text_size: 15,
          text_style: hmUI.text_style.WRAP,
          align_h: hmUI.align.LEFT,
          align_v: hmUI.align.CENTER_V
        }
      ],
      text_view_count: 2,
      item_height: DETAIL_LIST_FRAME.itemHeight
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
    const i18n = createWatchTranslator();
    const selectedRecipe = getSelectedRecipe();
    const snapshot = selectedRecipe ? selectedRecipe.recipeSnapshot : null;
    const detailRows = selectedRecipe ? buildRecipeRows(selectedRecipe, i18n) : [];
    const accentColor = snapshot ? getColorNumber(snapshot.colorToken) : 0x2d8c82;

    this.unsubscribeRuntime = subscribeRuntimeEvent((event) => {
      if (event.type === "catalog") {
        replace({ url: PAGE_URLS.recipeDetail });
      }
    });

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text_size: TITLE_TEXT.text_size - 2,
      h: TITLE_TEXT.h + 4,
      text: selectedRecipe ? selectedRecipe.name : i18n.t("watch.recipeDetail.unavailableTitle")
    });
    hmUI.createWidget(hmUI.widget.FILL_RECT, DETAIL_PANEL);
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: DETAIL_PANEL.x,
      y: DETAIL_PANEL.y,
      w: DETAIL_PANEL.w,
      h: 6,
      radius: DETAIL_PANEL.radius,
      color: accentColor
    });
    if (detailRows.length) {
      if (canRenderStaticDetailRows(detailRows)) {
        buildStaticDetailRows(detailRows).forEach((row) => {
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
          item_config: createDetailListConfig(),
          item_config_count: 1,
          data_array: detailRows,
          data_count: detailRows.length,
          data_type_config: [
            {
              start: 0,
              end: detailRows.length - 1,
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
