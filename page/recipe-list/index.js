import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import {
  getRecipeListForSelectedTool,
  getSelectedTool,
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
    const recipes = getRecipeListForSelectedTool();
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
      text: "Phone-synced recipes"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      text: recipes.length
        ? [
            "Pick a recipe from the synced catalog.",
            highlightedRecipe && highlightedRecipe.recipeSnapshot
              ? `${highlightedRecipe.recipeSnapshot.coffeeDoseG}g / ${highlightedRecipe.recipeSnapshot.totalWaterMl}ml / ${Math.round(highlightedRecipe.recipeSnapshot.estimatedTotalDurationMs / 1000)}s`
              : "Snapshot details unavailable"
          ].filter(Boolean).join("\n")
        : "No recipes are cached yet for this brewer. Refresh the phone bridge or add recipes in Settings."
    });

    BUTTONS.forEach((buttonStyle, index) => {
      if (index < 2 && recipes[index]) {
        hmUI.createWidget(hmUI.widget.BUTTON, {
          ...buttonStyle,
          text: recipes[index].recipeSnapshot
            ? `${recipes[index].name} ${recipes[index].recipeSnapshot.coffeeDoseG}g`
            : recipes[index].name,
          click_func: () => {
            startRecipe(recipes[index]);
          }
        });
        return;
      }

      if (index === 2) {
        hmUI.createWidget(hmUI.widget.BUTTON, {
          ...buttonStyle,
          text: recipes.length ? "Back home" : "Refresh sync",
          click_func: () => {
            if (recipes.length) {
              goHome();
              return;
            }

            refreshPhoneSnapshot();
          }
        });
      }
    });

    hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
      text: selectedTool ? `toolId: ${selectedTool.toolId} | recipes: ${recipes.length}` : "toolId unavailable"
    });
  }
});
