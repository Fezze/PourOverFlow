import * as hmUI from "@zos/ui";
import {
  getRecipeListForSelectedTool,
  getSelectedTool,
  goHome,
  refreshPhoneSnapshot,
  startRecipe
} from "../../shared/watch/router";
import {
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  FOOTER_TEXT,
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "zosLoader:./index.[pf].layout.js";

Page({
  build() {
    const selectedTool = getSelectedTool();
    const recipes = getRecipeListForSelectedTool();

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
        ? "These recipes are coming from the phone snapshot. Pick one to start the scaffold session."
        : "No recipes are cached yet for this brewer. Refresh the phone bridge or add recipes in Settings."
    });

    BUTTONS.forEach((buttonStyle, index) => {
      if (index < 2 && recipes[index]) {
        hmUI.createWidget(hmUI.widget.BUTTON, {
          ...buttonStyle,
          text: recipes[index].name,
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
