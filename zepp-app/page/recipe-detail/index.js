import { SHARED_COLORS } from "../../shared/watch/layouts";
import * as hmUI from "@zos/ui";
import { getReadingFrame, measureWrappedText, enableReadingPage } from "../../shared/watch/reading-page";
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
import { BACKGROUND, BODY_TEXT, BUTTONS } from "./index.layout.js";

const READING = getReadingFrame(BACKGROUND);

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
    const title = selectedRecipe ? selectedRecipe.name : i18n.t("watch.recipeDetail.unavailableTitle");
    const titleSize = 24;
    const titleHeight = measureWrappedText(title, titleSize, READING.w);
    const panelY = READING.top + titleHeight + 14;
    let rowY = panelY + 12;
    const rows = detailRows.map((row, index) => {
      const size = index === 0 ? 21 : 17;
      const height = measureWrappedText(row.meta, size, READING.w);
      const result = { ...row, y: rowY, size, height };
      rowY += 18 + height + 12;
      return result;
    });
    const unavailableHeight = measureWrappedText(i18n.t("watch.recipeDetail.unavailableBody"), 20, READING.w);
    const panelBottom = rows.length ? rowY : panelY + unavailableHeight + 24;
    const buttonY = panelBottom + 16;
    const contentHeight = Math.max(BACKGROUND.h, buttonY + BUTTONS[0].h + READING.bottom);
    const accentColor = snapshot ? getColorNumber(snapshot.colorToken) : 0x2d8c82;

    this.unsubscribeRuntime = subscribeRuntimeEvent((event) => {
      if (event.type === "catalog") {
        replace({ url: PAGE_URLS.recipeDetail });
      }
    });

    enableReadingPage();
    hmUI.createWidget(hmUI.widget.FILL_RECT, { ...BACKGROUND, h: contentHeight });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT, x: READING.x, y: READING.top, w: READING.w, h: titleHeight,
      text_size: titleSize, text_style: hmUI.text_style.WRAP, align_v: hmUI.align.TOP,
      color: SHARED_COLORS.text, text: title
    });
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: READING.x - 12, y: panelY, w: READING.w + 24, h: panelBottom - panelY,
      radius: 18, color: SHARED_COLORS.surface
    });
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: READING.x, y: panelY, w: 32, h: 3, color: accentColor
    });
    rows.forEach((row, index) => {
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: READING.x, y: row.y, w: READING.w, h: 16,
        text_size: 13, color: SHARED_COLORS.muted, text: row.title,
        align_h: hmUI.align.LEFT, align_v: hmUI.align.CENTER_V
      });
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: READING.x, y: row.y + 18, w: READING.w, h: row.height,
        text_size: row.size, color: index === 0 ? SHARED_COLORS.accent : SHARED_COLORS.text,
        text: row.meta, text_style: hmUI.text_style.WRAP,
        align_h: hmUI.align.LEFT, align_v: hmUI.align.TOP
      });
    });
    if (!rows.length) {
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...BODY_TEXT, x: READING.x, y: panelY + 12, w: READING.w, h: unavailableHeight,
        text_size: 20, text: i18n.t("watch.recipeDetail.unavailableBody")
      });
    }
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[0],
      y: buttonY,
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
  }
});
