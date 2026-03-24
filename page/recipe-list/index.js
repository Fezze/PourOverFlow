import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import {
  getRecipeBrowsePage,
  getSelectedTool,
  goToNextRecipeBrowsePage,
  PAGE_URLS,
  goHome,
  refreshPhoneSnapshot,
  startRecipe
} from "../../shared/watch/router";
import { subscribeRuntimeEvent } from "../../shared/watch/runtime-events";
import {
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  FOOTER_TEXT,
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "zosLoader:./index.[pf].layout.js";

Page({
  onDestroy() {
    if (this.unsubscribeRuntime) {
      this.unsubscribeRuntime();
      this.unsubscribeRuntime = null;
    }
  },
  build() {
    const selectedTool = getSelectedTool();
    const browsePage = getRecipeBrowsePage();
    const recipes = browsePage.items;
    const highlightedRecipe = recipes[0] || null;
    this.unsubscribeRuntime = subscribeRuntimeEvent((event) => {
      if (event.type === "catalog") {
        replace({ url: PAGE_URLS.recipeList });
      }
    });

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text: selectedTool ? selectedTool.label : "No tool selected"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...SUBTITLE_TEXT,
      text: browsePage.totalItems
        ? `Phone-synced recipes · page ${browsePage.pageIndex + 1}/${browsePage.totalPages}`
        : "Phone-synced recipes"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      text: browsePage.totalItems
        ? [
            "Pick a recipe from the synced catalog.",
            highlightedRecipe && highlightedRecipe.recipeSnapshot
              ? `${highlightedRecipe.recipeSnapshot.coffeeDoseG}g / ${highlightedRecipe.recipeSnapshot.totalWaterMl}ml / ${Math.round(highlightedRecipe.recipeSnapshot.estimatedTotalDurationMs / 1000)}s`
              : "Snapshot details unavailable"
          ].filter(Boolean).join("\n")
        : "No recipes are cached yet for this brewer. Refresh the phone bridge or add recipes in Settings."
    });

    recipes.slice(0, 2).forEach((recipe, index) => {
      hmUI.createWidget(hmUI.widget.BUTTON, {
        ...BUTTONS[index],
        text: recipe.recipeSnapshot
          ? `${recipe.name} ${recipe.recipeSnapshot.coffeeDoseG}g`
          : recipe.name,
        click_func: () => {
          startRecipe(recipe);
        }
      });
    });

    if (!recipes[1] && browsePage.totalItems) {
      hmUI.createWidget(hmUI.widget.BUTTON, {
        ...BUTTONS[1],
        text: "Back home",
        click_func: () => {
          goHome();
        }
      });
    }

    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[2],
      text: !browsePage.totalItems
        ? "Refresh sync"
        : browsePage.hasNext
          ? `Next page ${browsePage.pageIndex + 1}/${browsePage.totalPages}`
          : "Back home",
      click_func: () => {
        if (!browsePage.totalItems) {
          refreshPhoneSnapshot();
          return;
        }

        if (browsePage.hasNext) {
          goToNextRecipeBrowsePage();
          return;
        }

        goHome();
      }
    });

    hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
      text: selectedTool
        ? `toolId: ${selectedTool.toolId} | recipes: ${browsePage.totalItems}`
        : "toolId unavailable"
    });
  }
});
