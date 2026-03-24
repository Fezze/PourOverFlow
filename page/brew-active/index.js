import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
import { getFeedbackLabel } from "../../shared/engine/feedback";
import {
  formatDurationLabel,
  getCurrentSessionStep,
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
  reconcileActiveSessionOnEntry,
  tickActiveSession
} from "../../shared/watch/router";
import {
  disableActiveSessionDisplayGuard,
  enableActiveSessionDisplayGuard
} from "../../shared/watch/display-guard";
import { registerShortcutKey } from "../../shared/watch/shortcut-key";
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
  const stepTimerLabel =
    stepRemainingMs === null
      ? "Manual step"
      : `${formatDurationLabel(stepRemainingMs)} left`;

  return [
    `Step ${activeSession.currentStepIndex + 1}/${activeSession.recipeSnapshot.steps.length}`,
    currentStep ? currentStep.title : "Unknown step",
    currentStep ? currentStep.body : "No step payload",
    currentStep ? getStepProgressLabel(currentStep) : "No step type",
    currentStep && currentStep.targetTotalWaterMl !== undefined
      ? `Water target ${currentStep.targetTotalWaterMl} ml`
      : currentStep && currentStep.waterMl !== undefined
        ? `Pour ${currentStep.waterMl} ml`
        : stepTimerLabel,
    `Session ${sessionElapsedLabel}`
  ].join("\n");
}

function buildFooterText(activeSession) {
  const currentStep = getCurrentSessionStep(activeSession);

  if (!currentStep) {
    return "Session state is missing the current step.";
  }

  if (activeSession.status === "waiting_for_confirm") {
    return "Confirm to continue. Shortcut button also triggers the primary action when available.";
  }

  if (currentStep.kind === "timed_wait" || currentStep.kind === "timed_action") {
    return `Cue: ${getFeedbackLabel(currentStep.feedbackCue)}. Timed steps auto-advance when allowed.`;
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
        text: "Start a recipe from the browse flow first."
      });
      return;
    }

    enableActiveSessionDisplayGuard(activeSession);
    registerShortcutKey(() => {
      advanceOrCompleteActiveSession();
    });

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
