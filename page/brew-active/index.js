import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import { getFeedbackLabel } from "../../shared/engine/feedback";
import {
  formatDurationLabel,
  getCurrentSessionStep,
  getCurrentStepElapsedMs,
  getCurrentStepRemainingMs,
  getElapsedSessionMs,
  getStepProgressLabel
} from "../../shared/engine/recipe-engine";
import { getToolById } from "../../shared/constants/tool-catalog";
import { readActiveSession } from "../../shared/storage/watch-store";
import {
  PAGE_URLS,
  abortActiveBrew,
  advanceOrCompleteActiveSession,
  goHome,
  tickActiveSession
} from "../../shared/watch/router";
import {
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  FOOTER_TEXT,
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "zosLoader:./index.[pf].layout.js";

function buildBodyText(activeSession) {
  const currentStep = getCurrentSessionStep(activeSession);
  const sessionElapsedLabel = formatDurationLabel(getElapsedSessionMs(activeSession));
  const stepRemainingMs = getCurrentStepRemainingMs(activeSession);
  const stepElapsedLabel = formatDurationLabel(getCurrentStepElapsedMs(activeSession));
  const stepTimerLabel =
    stepRemainingMs === null
      ? `Step timer: manual (${stepElapsedLabel})`
      : `Step timer: ${formatDurationLabel(stepRemainingMs)} left`;

  return [
    `Step ${activeSession.currentStepIndex + 1}/${activeSession.recipeSnapshot.steps.length}`,
    currentStep ? currentStep.title : "Unknown step",
    currentStep ? getStepProgressLabel(currentStep) : "No step type",
    stepTimerLabel,
    `Session: ${sessionElapsedLabel}`,
    currentStep && currentStep.targetTotalWaterMl !== undefined
      ? `Water: ${currentStep.targetTotalWaterMl} ml target`
      : currentStep && currentStep.waterMl !== undefined
        ? `Water: ${currentStep.waterMl} ml`
        : "Water: n/a",
    currentStep ? getFeedbackLabel(currentStep.feedbackCue) : "No cue",
    currentStep ? currentStep.body : "No step payload"
  ].join("\n");
}

function buildFooterText(activeSession) {
  const currentStep = getCurrentSessionStep(activeSession);

  if (!currentStep) {
    return "Session state is missing the current step.";
  }

  if (activeSession.status === "waiting_for_confirm") {
    return "Timer is done or step is manual. Confirm to continue.";
  }

  if (currentStep.kind === "timed_wait" || currentStep.kind === "timed_action") {
    return "Timed step is running. It auto-advances when the countdown finishes.";
  }

  return "Manual step. Confirm when you are ready to continue.";
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

    if (!activeSession || !this.bodyWidget || !this.subtitleWidget || !this.footerWidget) {
      return;
    }

    const currentStep = getCurrentSessionStep(activeSession);
    const tool = getToolById(activeSession.toolId);
    this.subtitleWidget.text = tool
      ? `${tool.label} | ${activeSession.status}`
      : `Status: ${activeSession.status}`;
    this.bodyWidget.text = buildBodyText(activeSession);
    this.footerWidget.text = buildFooterText(activeSession);

    if (this.primaryButton && currentStep) {
      this.primaryButton.text =
        currentStep.kind === "finish"
          ? "Finish brew"
          : activeSession.status === "waiting_for_confirm"
            ? "Confirm step"
            : "Next step";
    }
  },
  build() {
    const activeSession = readActiveSession();

    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);

    if (!activeSession) {
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...TITLE_TEXT,
        text: "No active brew"
      });
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...SUBTITLE_TEXT,
        text: "Resume later"
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
        text: "Stage 5 persists active sessions. Resume hardening lands in the next stage."
      });
      return;
    }

    const currentStep = getCurrentSessionStep(activeSession);
    const tool = getToolById(activeSession.toolId);
    const primaryLabel =
      currentStep && currentStep.kind === "finish"
        ? "Finish brew"
        : activeSession.status === "waiting_for_confirm"
          ? "Confirm step"
          : "Next step";

    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text: activeSession.recipeName
    });
    this.subtitleWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...SUBTITLE_TEXT,
      text: tool ? `${tool.label} | ${activeSession.status}` : `Status: ${activeSession.status}`
    });
    this.bodyWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      h: BODY_TEXT.h + 44,
      text: buildBodyText(activeSession)
    });
    this.primaryButton = hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[0],
      text: primaryLabel,
      click_func: () => {
        advanceOrCompleteActiveSession();
      }
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[1],
      text: "Abort session",
      click_func: () => {
        abortActiveBrew();
      }
    });
    this.footerWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
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
