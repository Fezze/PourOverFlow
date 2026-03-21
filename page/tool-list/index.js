import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import { getToolList, refreshPhoneSnapshot, selectTool } from "../../shared/watch/router";
import { PAGE_URLS } from "../../shared/watch/router";
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
    const tools = getToolList();
    this.unsubscribeRuntime = subscribeRuntimeEvent((event) => {
      if (event.type === "catalog") {
        replace({ url: PAGE_URLS.toolList });
      }
    });

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text: "Choose brewer"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...SUBTITLE_TEXT,
      text: "Closed synced catalog"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      text: tools.length
        ? "Choose a brewer. Recipes now come from the phone-owned catalog snapshot."
        : "No tool catalog on watch yet. Trigger a phone refresh first."
    });

    BUTTONS.forEach((buttonStyle, index) => {
      const tool = index < tools.length ? tools[index] : null;
      if (!tool) {
        if (index === tools.length || (!tools.length && index === 0)) {
          hmUI.createWidget(hmUI.widget.BUTTON, {
            ...buttonStyle,
            text: "Refresh phone sync",
            click_func: () => {
              refreshPhoneSnapshot();
            }
          });
        }
        return;
      }

      hmUI.createWidget(hmUI.widget.BUTTON, {
        ...buttonStyle,
        text: `${tool.label} (${tool.recipeCount || 0})`,
        click_func: () => {
          selectTool(tool.toolId);
        }
      });
    });

    hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
      text: "Counts reflect the current watch cache from phone sync."
    });
  }
});
