import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import { getToolById } from "../../shared/constants/tool-catalog";
import { getColorNumber } from "../../shared/constants/color-palette";
import {
  getSelectedRecipe,
  goHome,
  goToRecipeList,
  PAGE_URLS,
  refreshPhoneSnapshot,
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

function buildRecipeBody(recipe) {
  const snapshot = recipe.recipeSnapshot;

  if (!snapshot) {
    return "Recipe details are missing from the local snapshot.";
  }

  return [
    `${snapshot.coffeeDoseG}g coffee / ${snapshot.totalWaterMl}ml water`,
    `${snapshot.waterTempC}C / ${snapshot.grindLabel}`,
    `${snapshot.filterLabel} filter / ${Math.round(snapshot.estimatedTotalDurationMs / 1000)}s total`,
    `${snapshot.steps.length} guided steps`
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
      h: 8,
      radius: DETAIL_PANEL.radius,
      color: accentColor
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
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
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[1],
      text: "Recipes",
      click_func: () => {
        goToRecipeList();
      }
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[2],
      text: selectedRecipe ? "Home" : "Refresh sync",
      click_func: () => {
        if (selectedRecipe) {
          goHome();
          return;
        }

        refreshPhoneSnapshot();
      }
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
      text: selectedRecipe
        ? "Starts from the saved recipe snapshot."
        : "The local snapshot is unavailable right now."
    });
  }
});
