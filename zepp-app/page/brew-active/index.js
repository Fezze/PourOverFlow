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
import { getReadingFrame, createReader, createInstrumentText } from "../../shared/watch/reading-page";
import { createWatchTranslator } from "../../shared/i18n/watch-locale.js";
import { SHARED_COLORS } from "../../shared/watch/layouts";
import {
  ACTION_DOCK,
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  TITLE_TEXT
} from "./index.layout.js";

const IS_ROUND = BACKGROUND.w === BACKGROUND.h;
const IS_SMALL = IS_ROUND && BACKGROUND.w <= 430;
const READING = getReadingFrame(BACKGROUND, ACTION_DOCK.y ?? BUTTONS[0].y);

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
    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);

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

    const colors = SHARED_COLORS;
    const timerH = IS_SMALL ? 58 : 64;
    const metaY = READING.y - 27;
    const timerY = metaY - timerH;
    createInstrumentText(BACKGROUND, buildProgressText(activeSession, this.i18n),
      timerY - 20, 20, 16, colors.muted);
    this.timerWidget = createInstrumentText(BACKGROUND, buildTimerText(activeSession),
      timerY, timerH, IS_SMALL ? 54 : 60, colors.primary);
    this.metaWidget = createInstrumentText(BACKGROUND, buildStepMetaText(activeSession, this.i18n),
      metaY, 22, 16, colors.text);

    const track = { x: READING.x, y: READING.y - 4, w: READING.w, h: 3 };
    hmUI.createWidget(hmUI.widget.FILL_RECT, { ...track, color: colors.surfaceMuted });
    hmUI.createWidget(hmUI.widget.FILL_RECT, { ...track, color: colors.primary,
      w: Math.round(track.w * (activeSession.currentStepIndex + 1) / activeSession.recipeSnapshot.steps.length)
    });
    const addText = createReader(READING);
    addText(title, 27, colors.text, 4);
    addText(instruction, 20, colors.text, 10);
    addText(activeSession.recipeName, 16, colors.muted, 14);
    this.primaryButton = hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[0],
      text: buildPrimaryActionLabel(activeSession, this.i18n),
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
        this.confirmStop();
      }
    });
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
