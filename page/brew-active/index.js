import * as hmUI from "@zos/ui";
import { replace } from "@zos/router";
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
import { SHARED_COLORS, createPanelStyle } from "../../shared/watch/layouts";
import {
  ACTION_DIVIDER,
  ACTION_DOCK,
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  FOOTER_TEXT,
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "zosLoader:./index.[pf].layout.js";

function buildRecipeSubtitle(activeSession) {
  const tool = getToolById(activeSession.toolId);
  return tool ? tool.label : activeSession.toolId;
}

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
  const parts = [currentStep ? getStepProgressLabel(currentStep) : "No step type"];

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

  return parts.join("  •  ");
}

function buildFooterText(activeSession) {
  const currentStep = getCurrentSessionStep(activeSession);

  if (!currentStep) {
    return "Session state is missing the current step.";
  }

  if (activeSession.status === "waiting_for_confirm") {
    return "Ready to continue. Shortcut button also works when available.";
  }

  if (currentStep.kind === "timed_wait" || currentStep.kind === "timed_action") {
    return "Timed steps auto-advance when allowed.";
  }

  return "Manual step. Continue when you are ready.";
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
      !this.recipeSubtitleWidget ||
      !this.progressWidget ||
      !this.stepTitleWidget ||
      !this.metaWidget ||
      !this.footerWidget
    ) {
      return;
    }

    this.recipeSubtitleWidget.text = buildRecipeSubtitle(activeSession);
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

    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text_size: TITLE_TEXT.text_size - 2,
      h: TITLE_TEXT.h + 8,
      text: activeSession.recipeName
    });
    this.recipeSubtitleWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...SUBTITLE_TEXT,
      text: buildRecipeSubtitle(activeSession)
    });
    this.progressWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...SUBTITLE_TEXT,
      y: SUBTITLE_TEXT.y + 28,
      h: SUBTITLE_TEXT.h - 2,
      color: SHARED_COLORS.muted,
      text_size: SUBTITLE_TEXT.text_size + 2,
      text: buildProgressText(activeSession)
    });
    this.stepTitleWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      y: BODY_TEXT.y + 18,
      h: 34,
      text_size: BODY_TEXT.text_size + 8,
      color: SHARED_COLORS.text,
      text: currentStep ? currentStep.title : "Unknown step"
    });
    hmUI.createWidget(hmUI.widget.FILL_RECT, createPanelStyle({
      buttonX: BODY_TEXT.x,
      buttonW: BODY_TEXT.w
    }, {
      x: BODY_TEXT.x,
      y: BODY_TEXT.y + 66,
      w: BODY_TEXT.w,
      h: 116,
      radius: 28,
      color: SHARED_COLORS.surface
    }));
    this.descriptionWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      y: BODY_TEXT.y + 92,
      h: 48,
      text_size: BODY_TEXT.text_size + 2,
      text: buildDescriptionText(activeSession)
    });
    this.metaWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      y: BODY_TEXT.y + 146,
      h: 24,
      color: SHARED_COLORS.muted,
      text_size: BODY_TEXT.text_size - 2,
      text: buildStepMetaText(activeSession)
    });
    hmUI.createWidget(hmUI.widget.FILL_RECT, ACTION_DOCK);
    hmUI.createWidget(hmUI.widget.FILL_RECT, ACTION_DIVIDER);
    this.primaryButton = hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[0],
      text: "✓",
      click_func: () => {
        advanceOrCompleteActiveSession();
      }
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[1],
      text: "✕",
      click_func: () => {
        abortActiveBrew();
      }
    });
    this.footerWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
      y: BUTTONS[0].y - 64,
      h: 44,
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
