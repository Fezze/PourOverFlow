import * as hmUI from "@zos/ui";
import {
  getRecipeListForSelectedTool,
  getSelectedTool,
  goHome,
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
      text: "Seed recipe list"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      text:
        "Watch preview now uses the real seed library from docs/05. Phone-edited recipes join this list after sync lands."
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
          text: "Back home",
          click_func: () => {
            goHome();
          }
        });
      }
    });

    hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
      text: selectedTool ? `toolId: ${selectedTool.toolId}` : "toolId unavailable"
    });
  }
});
