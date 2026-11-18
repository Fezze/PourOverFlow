import { SHARED_COLORS } from "../../shared/watch/layouts";
import * as hmUI from "@zos/ui";
import { getReadingFrame, createReader, createInstrumentText } from "../../shared/watch/reading-page";
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
import { BACKGROUND, BUTTONS } from "./index.layout.js";

const READING = getReadingFrame(BACKGROUND, BUTTONS[0].y);

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
    const accentColor = snapshot ? getColorNumber(snapshot.colorToken) : 0x2d8c82;

    this.unsubscribeRuntime = subscribeRuntimeEvent((event) => {
      if (event.type === "catalog") {
        replace({ url: PAGE_URLS.recipeDetail });
      }
    });

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    const [dose, ...details] = detailRows;
    if (dose) {
      createInstrumentText(BACKGROUND, dose.title, READING.y - 92, 22, 16, SHARED_COLORS.muted);
      createInstrumentText(BACKGROUND, dose.meta, READING.y - 68, 52, 40, SHARED_COLORS.primary);
    }
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: READING.x, y: READING.y - 4, w: READING.w, h: 3, color: accentColor
    });
    const addText = createReader(READING);
    addText(title, 27, SHARED_COLORS.text, 4);
    for (const row of details) {
      addText(row.title, 16, SHARED_COLORS.primary, 14);
      addText(row.meta, 20, SHARED_COLORS.text, 2);
    }
    if (!dose) addText(i18n.t("watch.recipeDetail.unavailableBody"), 20, SHARED_COLORS.muted, 12);
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
  }
});
