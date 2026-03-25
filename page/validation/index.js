import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import { goHome, PAGE_URLS } from "../../shared/watch/router";
import { subscribeRuntimeEvent } from "../../shared/watch/runtime-events";
import { getValidationScaffoldState, runValidationAction } from "../../shared/watch/validation";
import {
  BACKGROUND,
  FOOTER_TEXT,
  HOME_BUTTON,
  LIST_FRAME,
  LIST_PANEL,
  STATUS_PANEL,
  STATUS_TEXT,
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "zosLoader:./index.[pf].layout.js";

function buildStatusText(state) {
  return [
    `Bridge: ${state.connected ? "connected" : "offline"}`,
    `Cache: ${state.catalogReady ? "ready" : "missing"}  •  Pending: ${state.pendingHistoryCount}`,
    `Session: ${state.activeSessionName || "none"}`,
    `Last brew: ${state.lastResultName || "none"}`
  ].join("\n");
}

function buildValidationRows(state) {
  return [
    {
      title: "Short haptic cue",
      meta: "Check vibration on the wrist.",
      actionId: "haptic"
    },
    {
      title: "Soft sound cue",
      meta: "Check audio and silent-mode behavior.",
      actionId: "sound"
    },
    {
      title: "Sync check",
      meta: state.connected
        ? `${state.pendingHistoryCount} pending entries, request slices if stale.`
        : "Verify offline skip stays responsive.",
      actionId: "sync"
    }
  ];
}

function createValidationListConfig() {
  return [
    {
      type_id: 1,
      item_bg_color: 0x171d26,
      item_bg_radius: LIST_FRAME.itemRadius,
      item_press_effect: true,
      text_view: [
        {
          x: 18,
          y: 12,
          w: LIST_FRAME.w - 36,
          h: LIST_FRAME.titleHeight,
          key: "title",
          color: 0xf5f7fa,
          text_size: 22,
          action: true,
          align_h: hmUI.align.LEFT,
          align_v: hmUI.align.CENTER_V
        },
        {
          x: 18,
          y: 40,
          w: LIST_FRAME.w - 36,
          h: LIST_FRAME.metaHeight,
          key: "meta",
          color: 0xaab4c2,
          text_size: 14,
          action: true,
          align_h: hmUI.align.LEFT,
          align_v: hmUI.align.CENTER_V
        }
      ],
      text_view_count: 2,
      item_height: LIST_FRAME.itemHeight
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
    const state = getValidationScaffoldState();
    const rows = buildValidationRows(state);

    this.unsubscribeRuntime = subscribeRuntimeEvent((event) => {
      if (
        event.type === "catalog" ||
        event.type === "last_result" ||
        event.type === "sync_meta" ||
        event.type === "connection" ||
        event.type === "validation_note"
      ) {
        replace({ url: PAGE_URLS.validation });
      }
    });

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text: "Validation"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...SUBTITLE_TEXT,
      text: "Hardware checks for Stage 6"
    });
    hmUI.createWidget(hmUI.widget.FILL_RECT, STATUS_PANEL);
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...STATUS_TEXT,
      text: buildStatusText(state)
    });
    hmUI.createWidget(hmUI.widget.FILL_RECT, LIST_PANEL);
    hmUI.createWidget(hmUI.widget.SCROLL_LIST, {
      x: LIST_FRAME.x,
      y: LIST_FRAME.y,
      w: LIST_FRAME.w,
      h: LIST_FRAME.h,
      item_space: LIST_FRAME.itemSpace,
      item_config: createValidationListConfig(),
      item_config_count: 1,
      data_array: rows,
      data_count: rows.length,
      data_type_config: [
        {
          start: 0,
          end: rows.length - 1,
          type_id: 1
        }
      ],
      data_type_config_count: 1,
      enable_scroll_bar: rows.length > 2,
      item_common_focus: true,
      item_click_func: (_list, index) => {
        runValidationAction(rows[index].actionId);
      }
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...HOME_BUTTON,
      text: "Done",
      click_func: () => {
        goHome();
      }
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
      y: HOME_BUTTON.y - 44,
      h: 30,
      text: state.note || "Run a cue, check the watch, then go Home."
    });
  }
});
