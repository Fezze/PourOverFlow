import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import {
  getToolBrowsePage,
  goHome,
  goToNextToolBrowsePage,
  PAGE_URLS,
  refreshPhoneSnapshot,
  selectTool
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
    const browsePage = getToolBrowsePage();
    const tools = browsePage.items;

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
      text: browsePage.totalItems
        ? `Closed synced catalog · page ${browsePage.pageIndex + 1}/${browsePage.totalPages}`
        : "Closed synced catalog"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      text: browsePage.totalItems
        ? [
            "Choose a brewer from the synced watch cache.",
            ...tools.map((tool, index) => `${index + 1}. ${tool.label} · ${tool.recipeCount || 0} recipes`)
          ].join("\n")
        : "No tool catalog on watch yet. Trigger a phone refresh first."
    });

    if (tools[0]) {
      hmUI.createWidget(hmUI.widget.BUTTON, {
        ...BUTTONS[0],
        text: `${tools[0].label} (${tools[0].recipeCount || 0})`,
        click_func: () => {
          selectTool(tools[0].toolId);
        }
      });
    } else {
      hmUI.createWidget(hmUI.widget.BUTTON, {
        ...BUTTONS[0],
        text: "Refresh phone sync",
        click_func: () => {
          refreshPhoneSnapshot();
        }
      });
    }

    if (tools[1]) {
      hmUI.createWidget(hmUI.widget.BUTTON, {
        ...BUTTONS[1],
        text: `${tools[1].label} (${tools[1].recipeCount || 0})`,
        click_func: () => {
          selectTool(tools[1].toolId);
        }
      });
    } else if (browsePage.totalItems) {
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
        ? "Back home"
        : browsePage.hasNext
          ? `Next page ${browsePage.pageIndex + 1}/${browsePage.totalPages}`
          : "Back home",
      click_func: () => {
        if (!browsePage.totalItems) {
          goHome();
          return;
        }

        if (browsePage.hasNext) {
          goToNextToolBrowsePage();
          return;
        }

        goHome();
      }
    });

    hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
      text: browsePage.totalItems
        ? "Counts reflect the current watch cache from phone sync."
        : "Sync the phone companion to seed the watch catalog."
    });
  }
});
