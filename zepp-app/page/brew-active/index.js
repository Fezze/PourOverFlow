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
import { SHARED_COLORS, createPanelStyle } from "../../shared/watch/layouts";
import {
  ACTION_DIVIDER,
  ACTION_LEFT_BG,
  ACTION_RIGHT_BG,
  ACTION_TOP_MASK,
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  FOOTER_TEXT,
  TITLE_TEXT
} from "zosLoader:./index.[pf].layout.js";

function buildProgressText(activeSession) {
  return `Step ${activeSession.currentStepIndex + 1}/${activeSession.recipeSnapshot.steps.length}`;
}

function buildDescriptionText(activeSession) {
  const currentStep = getCurrentSessionStep(activeSession);

  return currentStep ? currentStep.body : "No step payload";
}

function buildStepMetaText(activeSession) {
  const currentStep = getCurrentSessionStep(activeSession);
  const sessionElapsedLabel = formatDurationLabel(getElapsedSessionMs(activeSession));
  const stepRemainingMs = getCurrentStepRemainingMs(activeSession);
  const parts = [];

  if (currentStep && currentStep.targetTotalWaterMl !== undefined) {
    parts.push(`Target ${currentStep.targetTotalWaterMl} ml`);
  } else if (currentStep && currentStep.waterMl !== undefined) {
    parts.push(`Pour ${currentStep.waterMl} ml`);
  }

  if (stepRemainingMs !== null) {
    parts.push(`${formatDurationLabel(stepRemainingMs)} left`);
  } else {
    parts.push(`Session ${sessionElapsedLabel}`);
  }

  return parts.join(" / ");
}

function buildFooterText(activeSession) {
  const currentStep = getCurrentSessionStep(activeSession);

  if (!currentStep) {
    return "Session state is missing the current step.";
  }

  if (activeSession.status === "waiting_for_confirm") {
    return "Shortcut button also works when available.";
  }

  if (currentStep.kind === "timed_wait" || currentStep.kind === "timed_action") {
    return "Timed step.";
  }

  return "Tap Next to continue.";
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
      !this.descriptionWidget ||
      !this.progressWidget ||
      !this.stepTitleWidget ||
      !this.metaWidget ||
      !this.footerWidget
    ) {
      return;
    }

    this.progressWidget.text = buildProgressText(activeSession);
    const currentStep = getCurrentSessionStep(activeSession);
    this.stepTitleWidget.text = currentStep ? currentStep.title : "Unknown step";
    this.descriptionWidget.text = buildDescriptionText(activeSession);
    this.metaWidget.text = buildStepMetaText(activeSession);
    this.footerWidget.text = buildFooterText(activeSession);
  },
  build() {
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
        text: "No active brew"
      });
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...BODY_TEXT,
        text: "Start a synced recipe from the recipe list first."
      });
      hmUI.createWidget(hmUI.widget.BUTTON, {
        ...BUTTONS[0],
        text: "Go home",
        click_func: () => {
          goHome();
        }
      });
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...FOOTER_TEXT,
        text: "Start a recipe from the browse flow first."
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
      text: buildProgressText(activeSession)
    });
    this.stepTitleWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      x: BODY_TEXT.x + 2,
      w: BODY_TEXT.w - 4,
      y: BODY_TEXT.y + 24,
      h: 36,
      text_size: BODY_TEXT.text_size + 8,
      color: SHARED_COLORS.text,
      text: currentStep ? currentStep.title : "Unknown step"
    });
    hmUI.createWidget(hmUI.widget.FILL_RECT, createPanelStyle({
      buttonX: BODY_TEXT.x,
      buttonW: BODY_TEXT.w
    }, {
      x: BODY_TEXT.x,
      y: BODY_TEXT.y + 74,
      w: BODY_TEXT.w,
      h: 102,
      radius: 28,
      color: SHARED_COLORS.surface
    }));
    this.descriptionWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      x: BODY_TEXT.x + 14,
      w: BODY_TEXT.w - 28,
      y: BODY_TEXT.y + 96,
      h: 38,
      text_size: BODY_TEXT.text_size + 2,
      text: buildDescriptionText(activeSession)
    });
    this.metaWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      x: BODY_TEXT.x + 14,
      w: BODY_TEXT.w - 28,
      y: BODY_TEXT.y + 138,
      h: 24,
      color: SHARED_COLORS.muted,
      text_size: BODY_TEXT.text_size - 2,
      text: buildStepMetaText(activeSession)
    });
    if (ACTION_LEFT_BG) {
      hmUI.createWidget(hmUI.widget.FILL_RECT, ACTION_LEFT_BG);
    }
    if (ACTION_RIGHT_BG) {
      hmUI.createWidget(hmUI.widget.FILL_RECT, ACTION_RIGHT_BG);
    }
    if (ACTION_TOP_MASK) {
      hmUI.createWidget(hmUI.widget.FILL_RECT, ACTION_TOP_MASK);
    }
    if (ACTION_DIVIDER) {
      hmUI.createWidget(hmUI.widget.FILL_RECT, ACTION_DIVIDER);
    }
    this.primaryButton = hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[0],
      text: buildPrimaryActionLabel(activeSession),
      text_size: 24,
      click_func: () => {
        advanceOrCompleteActiveSession();
      }
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[1],
      text: "Stop",
      text_size: 24,
      click_func: () => {
        abortActiveBrew();
      }
    });
    this.footerWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
      y: BUTTONS[0].y - 28,
      h: 30,
      text: buildFooterText(activeSession)
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
