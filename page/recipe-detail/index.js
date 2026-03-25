import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import { getToolById } from "../../shared/constants/tool-catalog";
import { getColorNumber } from "../../shared/constants/color-palette";
import {
  getSelectedRecipe,
  goToRecipeList,
  PAGE_URLS,
  startSelectedRecipe
} from "../../shared/watch/router";
import { subscribeRuntimeEvent } from "../../shared/watch/runtime-events";
import {
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  DETAIL_PANEL,
  FOOTER_TEXT,
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "zosLoader:./index.[pf].layout.js";

const MUTED_TEXT = 0xaab4c2;

function buildRecipeBody(recipe) {
  const snapshot = recipe.recipeSnapshot;

  if (!snapshot) {
    return "Recipe details are missing from the local snapshot. Return to the list and refresh after the next phone sync.";
  }

  return [
    `${snapshot.coffeeDoseG}g coffee / ${snapshot.totalWaterMl}ml water`,
    `${snapshot.waterTempC}C / ${snapshot.grindLabel}`,
    `${Math.round(snapshot.estimatedTotalDurationMs / 1000)}s / ${snapshot.steps.length} steps`,
    `${snapshot.filterLabel} filter`
  ].join("\n");
}

Page({
  onDestroy() {
    if (this.unsubscribeRuntime) {
      this.unsubscribeRuntime();
      this.unsubscribeRuntime = null;
    }
  },
  build() {
    const selectedRecipe = getSelectedRecipe();
    const snapshot = selectedRecipe ? selectedRecipe.recipeSnapshot : null;
    const tool = snapshot ? getToolById(snapshot.toolId) : null;
    const accentColor = snapshot ? getColorNumber(snapshot.colorToken) : 0x2d8c82;

    this.unsubscribeRuntime = subscribeRuntimeEvent((event) => {
      if (event.type === "catalog") {
        replace({ url: PAGE_URLS.recipeDetail });
      }
    });

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text: selectedRecipe ? selectedRecipe.name : "Recipe unavailable"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...SUBTITLE_TEXT,
      text: tool ? tool.label : "Sync the recipe and try again"
    });
    hmUI.createWidget(hmUI.widget.FILL_RECT, DETAIL_PANEL);
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: DETAIL_PANEL.x,
      y: DETAIL_PANEL.y,
      w: DETAIL_PANEL.w,
      h: 10,
      radius: DETAIL_PANEL.radius,
      color: accentColor
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      y: BODY_TEXT.y + 6,
      h: BODY_TEXT.h + 14,
      text: selectedRecipe
        ? buildRecipeBody(selectedRecipe)
        : "Open the recipe list again or refresh the phone sync."
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[0],
      text: selectedRecipe ? "Start brew" : "Back to recipes",
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
        text: "The local snapshot is unavailable right now."
      });
    }

    if (selectedRecipe && snapshot) {
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...FOOTER_TEXT,
        color: MUTED_TEXT,
        text: snapshot.description || "Review the brew, then start when ready."
      });
    }
  }
});
