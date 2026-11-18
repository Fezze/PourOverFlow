import { createModal, MODAL_CONFIRM } from "@zos/interaction";
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
import { getReadingFrame, measureWrappedText, enableReadingPage } from "../../shared/watch/reading-page";
import { createWatchTranslator } from "../../shared/i18n/watch-locale.js";
import { SHARED_COLORS, fitCenteredTextToRoundScreen } from "../../shared/watch/layouts";
import {
  ACTION_DOCK,
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  FOOTER_TEXT,
  TITLE_TEXT
} from "./index.layout.js";

const IS_ROUND = BACKGROUND.w === BACKGROUND.h;
const IS_SMALL = IS_ROUND && BACKGROUND.w <= 430;
const READING = getReadingFrame(BACKGROUND);
const INSTRUCTION_TEXT_SIZE = 20;

function buildFlowLayout(title, instruction) {
  const titleY = IS_ROUND ? READING.top : 82;
  const titleSize = IS_SMALL ? 24 : 27;
  const titleHeight = measureWrappedText(title, titleSize, READING.w);
  const timerY = titleY + titleHeight + 4;
  const timerHeight = IS_SMALL ? 60 : 66;
  const metaY = timerY + timerHeight;
  const instructionY = metaY + 34;
  const instructionHeight = measureWrappedText(instruction, INSTRUCTION_TEXT_SIZE, READING.w);
  const dockY = instructionY + instructionHeight + 28;
  const dockHeight = ACTION_DOCK.h || BUTTONS[0].h + 16;
  const dockOffset = BUTTONS[0].y - (ACTION_DOCK.y ?? BUTTONS[0].y - 8);
  return { titleY, titleSize, titleHeight, timerY, timerHeight, metaY,
    instructionY, instructionHeight, dockY, dockHeight,
    buttonY: dockY + dockOffset,
    contentHeight: Math.max(BACKGROUND.h, dockY + dockHeight + READING.bottom) };
}

function buildTimerText(activeSession) {
  const remaining = getCurrentStepRemainingMs(activeSession);
  return formatDurationLabel(remaining === null ? getElapsedSessionMs(activeSession) : remaining);
}

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

  parts.push(i18n.t("watch.brewActive.meta.session", {
    duration: sessionElapsedLabel
  }));

  return parts.join(" · ");
}

function buildAssistText(activeSession) {
  const currentStep = getCurrentSessionStep(activeSession);

  if (!currentStep) {
    return "Session state is missing the current step.";
  }

  return "";
}

function setWidgetText(widget, text) {
  if (!widget) {
    return;
  }

  if (typeof widget.setProperty === "function" && hmUI.prop && hmUI.prop.TEXT !== undefined) {
    widget.setProperty(hmUI.prop.TEXT, text);
    return;
  }

  widget.text = text;
}

function buildPrimaryActionLabel(session, i18n) {
  const step = getCurrentSessionStep(session);
  let action = "next";
  if (step && step.kind === "finish") {
    action = "finish";
  } else if (step && session.status !== "waiting_for_confirm" &&
      (step.kind === "timed_action" || step.kind === "timed_wait")) {
    action = "skip";
  }
  return i18n.t(`watch.brewActive.actions.${action}`);
}

Page({
  onDestroy() {
    if (this.activeTimer) {
      clearInterval(this.activeTimer);
      this.activeTimer = null;
    }
    if (this.stopConfirmation) {
      this.stopConfirmation.show(false);
      this.stopConfirmation = null;
    }
  },
  confirmStop() {
    if (!this.stopConfirmation) {
      this.stopConfirmation = createModal({
        content: this.i18n.t("watch.brewActive.stopConfirmation"),
        show: false,
        autoHide: false,
        onClick: ({ type }) => {
          if (!this.stopConfirmation) return;
          this.stopConfirmation.show(false);
          if (type === MODAL_CONFIRM) abortActiveBrew();
        }
      });
    }
    this.stopConfirmation.show(true);
  },
  refreshWidgets(activeSession) {
    if (!activeSession || !this.metaWidget) return;
    setWidgetText(this.metaWidget, buildStepMetaText(activeSession, this.i18n));
    setWidgetText(this.timerWidget, buildTimerText(activeSession));
  },
  build() {
    hmUI.setStatusBarVisible(false);
    this.i18n = createWatchTranslator();
    const reconcileResult = reconcileActiveSessionOnEntry();

    if (reconcileResult.finalized) {
      return;
    }

    const activeSession = reconcileResult.activeSession || readActiveSession();

    const step = activeSession ? getCurrentSessionStep(activeSession) : null;
    const title = step ? step.title : this.i18n.t("watch.brewActive.unknownStep");
    const instruction = activeSession ? buildDescriptionText(activeSession, this.i18n) : "";
    const flow = activeSession ? buildFlowLayout(title, instruction) : null;
    if (flow) enableReadingPage();
    hmUI.createWidget(hmUI.widget.FILL_RECT, { ...BACKGROUND, h: flow ? flow.contentHeight : BACKGROUND.h });

    if (!activeSession) {
      disableActiveSessionDisplayGuard();
      const title = this.i18n.t("watch.brewActive.noActiveBrew");
      const titleHeight = Math.max(TITLE_TEXT.h, Math.ceil(hmUI.getTextLayout(title, {
        text_size: TITLE_TEXT.text_size, text_width: TITLE_TEXT.w, wrapped: 1
      }).height));
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...TITLE_TEXT,
        h: titleHeight,
        text: title
      });
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...BODY_TEXT,
        y: Math.max(BODY_TEXT.y, TITLE_TEXT.y + titleHeight + 8),
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

    hmUI.createWidget(hmUI.widget.TEXT, fitCenteredTextToRoundScreen({
      ...TITLE_TEXT,
      y: IS_ROUND ? 38 : 16,
      h: 26,
      text_size: IS_SMALL ? 17 : 18,
      align_h: hmUI.align.CENTER_H,
      color: SHARED_COLORS.muted,
      text_style: hmUI.text_style.NONE,
      text: activeSession.recipeName
    }, BACKGROUND));
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      y: flow.titleY - 26,
      h: 20,
      align_h: hmUI.align.CENTER_H,
      color: SHARED_COLORS.accent,
      text_size: 15,
      text: buildProgressText(activeSession, this.i18n)
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      x: READING.x,
      w: READING.w,
      y: flow.titleY,
      h: flow.titleHeight,
      text_size: flow.titleSize,
      align_h: hmUI.align.CENTER_H,
      text_style: hmUI.text_style.WRAP,
      color: SHARED_COLORS.text,
      text: title
    });
    this.timerWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      y: flow.timerY,
      h: flow.timerHeight,
      line_space: 0,
      text_style: hmUI.text_style.NONE,
      text_size: IS_SMALL ? 54 : 60,
      align_h: hmUI.align.CENTER_H,
      color: SHARED_COLORS.accent,
      text: buildTimerText(activeSession)
    });
    this.metaWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      y: flow.metaY,
      h: 22,
      align_h: hmUI.align.CENTER_H,
      color: SHARED_COLORS.muted,
      text_size: IS_SMALL ? 14 : 15,
      text: buildStepMetaText(activeSession, this.i18n)
    });
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: READING.x - 12, y: flow.instructionY - 12,
      w: READING.w + 24, h: flow.instructionHeight + 24,
      radius: 18, color: SHARED_COLORS.surface
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      x: READING.x, y: flow.instructionY, w: READING.w, h: flow.instructionHeight,
      align_v: hmUI.align.TOP, text_size: INSTRUCTION_TEXT_SIZE,
      text_style: hmUI.text_style.WRAP,
      text: instruction
    });
    if (ACTION_DOCK) {
      hmUI.createWidget(hmUI.widget.FILL_RECT, { ...ACTION_DOCK, y: flow.dockY });
    }
    this.primaryButton = hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[0],
      y: flow.buttonY,
      text: buildPrimaryActionLabel(activeSession, this.i18n),
      text_size: BUTTONS[0].text_size,
      click_func: () => {
        advanceOrCompleteActiveSession();
      }
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[1],
      y: flow.buttonY,
      text: this.i18n.t("watch.brewActive.actions.stop"),
      text_size: BUTTONS[1].text_size,
      click_func: () => {
        this.confirmStop();
      }
    });
    const assistText = buildAssistText(activeSession);
    if (assistText) {
      this.footerWidget = hmUI.createWidget(hmUI.widget.TEXT, {
        ...FOOTER_TEXT,
        y: flow.dockY - 28,
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
        beforeStep.stepId !== afterStep.stepId
      ) {
        replace({ url: PAGE_URLS.brewActive });
        return;
      }

      if (beforeStatus !== afterSession.status) {
        setWidgetText(this.primaryButton, buildPrimaryActionLabel(afterSession, this.i18n));
      }
      this.refreshWidgets(afterSession);
    }, 1000);
  }
});
