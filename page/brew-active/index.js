import * as hmUI from "@zos/ui";
import { getFeedbackLabel } from "../../shared/engine/feedback";
import { getCurrentScaffoldStep } from "../../shared/engine/recipe-engine";
import { getToolById } from "../../shared/constants/tool-catalog";
import { readActiveSession } from "../../shared/storage/watch-store";
import {
  abortActiveBrew,
  advanceOrCompleteActiveSession,
  goHome
} from "../../shared/watch/router";
import {
  BACKGROUND,
  BODY_TEXT,
  BUTTONS,
  FOOTER_TEXT,
  SUBTITLE_TEXT,
  TITLE_TEXT
} from "zosLoader:./index.[pf].layout.js";

Page({
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
        text: "Seed preview"
      });
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...BODY_TEXT,
        text: "Start a seed preview session from the recipe list first."
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
        text: "Timer hardening, bright time and resume land later."
      });
      return;
    }

    const currentStep = getCurrentScaffoldStep(activeSession);
    const tool = getToolById(activeSession.toolId);
    const nextLabel = currentStep && currentStep.kind === "finish" ? "Save result" : "Next step";

    hmUI.createWidget(hmUI.widget.TEXT, {
      ...TITLE_TEXT,
      text: activeSession.recipeName
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...SUBTITLE_TEXT,
      text: tool ? `${tool.label} seed preview` : "Seed preview"
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...BODY_TEXT,
      text: [
        `Step ${activeSession.currentStepIndex + 1}/${activeSession.stepCount}`,
        currentStep ? currentStep.title : "Unknown step",
        currentStep ? currentStep.body : "No step payload",
        currentStep ? getFeedbackLabel(currentStep.feedbackCue) : "No cue"
      ].join("\n")
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...BUTTONS[0],
      text: nextLabel,
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
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...FOOTER_TEXT,
      text: "The real timer engine and storage-backed resume arrive in Stages 5 and 6."
    });
  }
});
