import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import {
  formatDurationLabel,
  getCurrentSessionStep,
  getCurrentStepRemainingMs,
  getElapsedSessionMs
} from "../../shared/engine/recipe-engine";
import { readActiveSession } from "../../shared/storage/watch-store";
import {
  PAGE_URLS,
  abortActiveBrew,
  advanceOrCompleteActiveSession,
  goHome,
  reconcileActiveSessionOnEntry,
  tickActiveSession
} from "../../shared/watch/router";
import {
  disableActiveSessionDisplayGuard,
  enableActiveSessionDisplayGuard
} from "../../shared/watch/display-guard";
import { registerShortcutKey } from "../../shared/watch/shortcut-key";
import { createWatchTranslator } from "../../shared/i18n/watch-locale.js";
import { SHARED_COLORS, createPanelStyle } from "../../shared/watch/layouts";
import {
  ACTION_DOCK,
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  FOOTER_TEXT,
  TITLE_TEXT
} from "zosLoader:./index.[pf].layout.js";

const CONTENT_PANEL = {
  x: BODY_TEXT.x,
  y: BODY_TEXT.y + 88,
  w: BODY_TEXT.w,
  h: BUTTONS[0].y - (BODY_TEXT.y + 88) - 18,
  radius: 28,
  color: SHARED_COLORS.surface
};
const CONTENT_FRAME = {
  x: CONTENT_PANEL.x + 14,
  y: CONTENT_PANEL.y + 16,
  w: CONTENT_PANEL.w - 28,
  h: CONTENT_PANEL.h - 32,
  itemRadius: 22
};

function buildProgressText(activeSession, i18n) {
  return i18n.t("watch.brewActive.progress", {
    current: activeSession.currentStepIndex + 1,
    total: activeSession.recipeSnapshot.steps.length
  });
}

function buildDescriptionText(activeSession, i18n) {
  const currentStep = getCurrentSessionStep(activeSession);

  return currentStep ? currentStep.body : i18n.t("watch.brewActive.noStepPayload");
}

function buildStepMetaText(activeSession, i18n) {
  const currentStep = getCurrentSessionStep(activeSession);
  const sessionElapsedLabel = formatDurationLabel(getElapsedSessionMs(activeSession));
  const stepRemainingMs = getCurrentStepRemainingMs(activeSession);
  const parts = [];

  if (currentStep && currentStep.targetTotalWaterMl !== undefined) {
    parts.push(i18n.t("watch.brewActive.meta.targetMl", {
      value: currentStep.targetTotalWaterMl
    }));
  } else if (currentStep && currentStep.waterMl !== undefined) {
    parts.push(i18n.t("watch.brewActive.meta.pourMl", {
      value: currentStep.waterMl
    }));
  }

  if (stepRemainingMs !== null) {
    parts.push(i18n.t("watch.brewActive.meta.left", {
      duration: formatDurationLabel(stepRemainingMs)
    }));
  } else {
    parts.push(i18n.t("watch.brewActive.meta.session", {
      duration: sessionElapsedLabel
    }));
  }

  return parts.join(" / ");
}

function buildAssistText(activeSession) {
  const currentStep = getCurrentSessionStep(activeSession);

  if (!currentStep) {
    return "Session state is missing the current step.";
  }

  return "";
}

function estimateInstructionLineCount(text, contentWidth = CONTENT_FRAME.w) {
  const approxCharsPerLine = Math.max(18, Math.floor(contentWidth / 10));
  return Math.max(1, Math.ceil(String(text || "").length / approxCharsPerLine));
}

function buildStaticInstructionFrame(instructionText) {
  const lineCount = estimateInstructionLineCount(instructionText);
  return {
    x: CONTENT_FRAME.x,
    y: CONTENT_FRAME.y,
    w: CONTENT_FRAME.w,
    h: Math.max(CONTENT_FRAME.h, lineCount * 22)
  };
}

function canRenderStaticInstruction(instructionText) {
  return buildStaticInstructionFrame(instructionText).h <= CONTENT_FRAME.h;
}

function createInstructionScrollConfig(itemHeight) {
  return [
    {
      type_id: 1,
      item_bg_color: SHARED_COLORS.surface,
      item_bg_radius: CONTENT_FRAME.itemRadius,
      item_press_effect: false,
      text_view: [
        {
          x: 10,
          y: 8,
          w: CONTENT_FRAME.w - 20,
          h: itemHeight - 16,
          key: "body",
          color: SHARED_COLORS.text,
          text_size: BODY_TEXT.text_size + 3,
          text_style: hmUI.text_style.WRAP,
          align_h: hmUI.align.LEFT,
          align_v: hmUI.align.TOP
        }
      ],
      text_view_count: 1,
      item_height: itemHeight
    }
  ];
}

function buildPrimaryActionLabel(activeSession) {
  const currentStep = getCurrentSessionStep(activeSession);

  if (!currentStep) {
    return "Next";
  }

  if (currentStep.kind === "finish") {
    return "Finish";
  }

  if (activeSession.status === "waiting_for_confirm") {
    return "Next";
  }

  if (currentStep.kind === "timed_action" || currentStep.kind === "timed_wait") {
    return "Skip";
  }

  return "Next";
}

Page({
  onDestroy() {
    if (this.activeTimer) {
      clearInterval(this.activeTimer);
      this.activeTimer = null;
    }
  },
  refreshWidgets() {
    const activeSession = readActiveSession();

    if (
      !activeSession ||
      !this.progressWidget ||
      !this.stepTitleWidget ||
      !this.metaWidget
    ) {
      return;
    }

    this.progressWidget.text = buildProgressText(activeSession, this.i18n);
    const currentStep = getCurrentSessionStep(activeSession);
    this.stepTitleWidget.text = currentStep ? currentStep.title : this.i18n.t("watch.brewActive.unknownStep");
    this.metaWidget.text = buildStepMetaText(activeSession, this.i18n);
    if (this.descriptionWidget) {
      this.descriptionWidget.text = buildDescriptionText(activeSession, this.i18n);
    }
    if (this.footerWidget) {
      this.footerWidget.text = buildAssistText(activeSession);
    }
  },
  build() {
    this.i18n = createWatchTranslator();
    const reconcileResult = reconcileActiveSessionOnEntry();

    if (reconcileResult.finalized) {
      return;
    }

    const activeSession = reconcileResult.activeSession || readActiveSession();

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);

    if (!activeSession) {
      disableActiveSessionDisplayGuard();
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...TITLE_TEXT,
        text: this.i18n.t("watch.brewActive.noActiveBrew")
      });
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...BODY_TEXT,
        text: this.i18n.t("watch.brewActive.noSessionStored")
      });
      hmUI.createWidget(hmUI.widget.BUTTON, {
        ...BUTTONS[0],
        text: this.i18n.t("watch.brewActive.goHome"),
        click_func: () => {
          goHome();
        }
      });
      return;
    }

    enableActiveSessionDisplayGuard(activeSession);
    registerShortcutKey(() => {
      advanceOrCompleteActiveSession();
    });

    const currentStep = getCurrentSessionStep(activeSession);

    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text_size: TITLE_TEXT.text_size - 4,
      h: TITLE_TEXT.h + 4,
      text: activeSession.recipeName
    });
    this.progressWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      y: BODY_TEXT.y - 2,
      h: 24,
      color: SHARED_COLORS.muted,
      text_size: BODY_TEXT.text_size,
      text: buildProgressText(activeSession, this.i18n)
    });
    this.stepTitleWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      x: BODY_TEXT.x + 2,
      w: BODY_TEXT.w - 4,
      y: BODY_TEXT.y + 24,
      h: 36,
      text_size: BODY_TEXT.text_size + 8,
      color: SHARED_COLORS.text,
      text: currentStep ? currentStep.title : this.i18n.t("watch.brewActive.unknownStep")
    });
    this.metaWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      x: BODY_TEXT.x + 4,
      w: BODY_TEXT.w - 8,
      y: BODY_TEXT.y + 62,
      h: 24,
      color: SHARED_COLORS.muted,
      text_size: BODY_TEXT.text_size - 2,
      text: buildStepMetaText(activeSession, this.i18n)
    });
    hmUI.createWidget(hmUI.widget.FILL_RECT, createPanelStyle({
      buttonX: BODY_TEXT.x,
      buttonW: BODY_TEXT.w
    }, CONTENT_PANEL));

    const descriptionText = buildDescriptionText(activeSession, this.i18n);
    if (canRenderStaticInstruction(descriptionText)) {
      const staticInstructionFrame = buildStaticInstructionFrame(descriptionText);
      this.descriptionWidget = hmUI.createWidget(hmUI.widget.TEXT, {
        ...BODY_TEXT,
        x: staticInstructionFrame.x,
        y: staticInstructionFrame.y,
        w: staticInstructionFrame.w,
        h: CONTENT_FRAME.h,
        text_size: BODY_TEXT.text_size + 3,
        text_style: hmUI.text_style.WRAP,
        text: descriptionText
      });
    } else {
      const scrollItemHeight = Math.max(CONTENT_FRAME.h + 28, estimateInstructionLineCount(descriptionText) * 22 + 18);
      hmUI.createWidget(hmUI.widget.SCROLL_LIST, {
        x: CONTENT_FRAME.x,
        y: CONTENT_FRAME.y,
        w: CONTENT_FRAME.w,
        h: CONTENT_FRAME.h,
        item_space: 0,
        item_config: createInstructionScrollConfig(scrollItemHeight),
        item_config_count: 1,
        data_array: [
          {
            body: descriptionText
          }
        ],
        data_count: 1,
        data_type_config: [
          {
            start: 0,
            end: 0,
            type_id: 1
          }
        ],
        data_type_config_count: 1,
        enable_scroll_bar: false
      });
    }
    if (ACTION_DOCK) {
      hmUI.createWidget(hmUI.widget.FILL_RECT, ACTION_DOCK);
    }
    this.primaryButton = hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[0],
      text: (() => {
        const currentStep = getCurrentSessionStep(activeSession);

        if (!currentStep) {
          return this.i18n.t("watch.brewActive.actions.next");
        }

        if (currentStep.kind === "finish") {
          return this.i18n.t("watch.brewActive.actions.finish");
        }

        if (activeSession.status === "waiting_for_confirm") {
          return this.i18n.t("watch.brewActive.actions.next");
        }

        if (currentStep.kind === "timed_action" || currentStep.kind === "timed_wait") {
          return this.i18n.t("watch.brewActive.actions.skip");
        }

        return this.i18n.t("watch.brewActive.actions.next");
      })(),
      text_size: BUTTONS[0].text_size,
      click_func: () => {
        advanceOrCompleteActiveSession();
      }
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[1],
      text: this.i18n.t("watch.brewActive.actions.stop"),
      text_size: BUTTONS[1].text_size,
      click_func: () => {
        abortActiveBrew();
      }
    });
    const assistText = buildAssistText(activeSession);
    if (assistText) {
      this.footerWidget = hmUI.createWidget(hmUI.widget.TEXT, {
        ...FOOTER_TEXT,
        y: BUTTONS[0].y - 28,
        h: 30,
        text: assistText
      });
    } else {
      this.footerWidget = null;
    }

    this.activeTimer = setInterval(() => {
      const beforeSession = readActiveSession();
      const beforeStep = getCurrentSessionStep(beforeSession);
      const beforeStatus = beforeSession ? beforeSession.status : null;
      tickActiveSession(Date.now());
      const afterSession = readActiveSession();
      const afterStep = getCurrentSessionStep(afterSession);

      if (!afterSession) {
        if (this.activeTimer) {
          clearInterval(this.activeTimer);
          this.activeTimer = null;
        }
        return;
      }

      if (
        !beforeStep ||
        !afterStep ||
        beforeStep.stepId !== afterStep.stepId ||
        beforeStatus !== afterSession.status
      ) {
        replace({ url: PAGE_URLS.brewActive });
        return;
      }

      this.refreshWidgets();
    }, 1000);
  }
});
