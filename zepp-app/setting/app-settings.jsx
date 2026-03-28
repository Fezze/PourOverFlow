import { TOOL_CATALOG } from "../shared/constants/tool-catalog";
import {
  FEEDBACK_CUES,
  RECIPE_COLOR_TOKENS,
  RECIPE_STEP_KINDS,
  createDefaultRecipeSteps
} from "../shared/domain/schema";
import {
  createUserRecipeRecord,
  deleteRecipeRecord,
  duplicateRecipeRecord,
  ensurePhoneStorage,
  readHistoryEntry,
  readPhoneSnapshot,
  readRecipeRecord,
  readSettingsJson,
  saveRecipeRecord,
  updateHistoryEntryFeedback,
  writeSettingsJson
} from "../shared/storage/phone-store";
import { SETTINGS_UI_STORAGE_KEY } from "../shared/storage/keys";
import {
  buildHistoryOverview,
  buildLibraryOverview,
  buildRecipeShelfCountLabel,
  buildSyncOverview,
  buildToolBadgeLabel,
  buildToolCardLabel,
  getSnapshotCounts
} from "./view-model";

const NAV_BUTTON_STYLE = {
  fontSize: "12px",
  fontWeight: "600",
  lineHeight: "32px",
  borderRadius: "32px",
  background: "#D8E3EC",
  color: "#1F2D3A",
  textAlign: "center",
  padding: "0 12px",
  width: "31%"
};

const ROOT_VIEW_STYLE = {
  padding: "12px 16px 32px",
  background: "#F4EFE6",
  display: "flex",
  flexDirection: "column",
  gap: "14px"
};

const CARD_STACK_STYLE = {
  display: "flex",
  flexDirection: "column",
  gap: "14px"
};

const ACTION_BUTTON_STYLE = {
  fontSize: "12px",
  fontWeight: "600",
  borderRadius: "18px",
  background: "#5E6773",
  color: "white"
};

const PRIMARY_BUTTON_STYLE = {
  fontSize: "12px",
  fontWeight: "600",
  borderRadius: "18px",
  background: "#188B7E",
  color: "white"
};

const DANGER_BUTTON_STYLE = {
  fontSize: "12px",
  fontWeight: "600",
  borderRadius: "18px",
  background: "#D6675A",
  color: "white"
};

const INFO_BUTTON_STYLE = {
  fontSize: "12px",
  borderRadius: "18px",
  background: "#EEF3F8",
  color: "#2D3A46"
};

const SUCCESS_CARD_STYLE = {
  ...INFO_BUTTON_STYLE,
  background: "#DFF6F0",
  color: "#0F5F58",
  textAlign: "left",
  padding: "12px 14px",
  lineHeight: "18px"
};

const ERROR_CARD_STYLE = {
  ...INFO_BUTTON_STYLE,
  background: "#FCE8E6",
  color: "#8C2C1F",
  textAlign: "left",
  padding: "12px 14px",
  lineHeight: "18px"
};

const HERO_BUTTON_STYLE = {
  fontSize: "16px",
  lineHeight: "22px",
  fontWeight: "700",
  borderRadius: "24px",
  background: "#15202B",
  color: "white",
  textAlign: "left",
  padding: "16px 18px"
};

const SECTION_TITLE_STYLE = {
  fontSize: "13px",
  fontWeight: "600",
  lineHeight: "18px",
  borderRadius: "18px",
  background: "#DCE6EF",
  color: "#21303D",
  textAlign: "left",
  padding: "10px 14px"
};

const CARD_BUTTON_STYLE = {
  fontSize: "13px",
  lineHeight: "22px",
  borderRadius: "18px",
  background: "#FFFFFF",
  color: "#21303D",
  textAlign: "left",
  padding: "14px 16px"
};

const LIST_CARD_BUTTON_STYLE = {
  ...CARD_BUTTON_STYLE,
  flex: "1",
  padding: "16px 18px"
};

const SOFT_ACTION_BUTTON_STYLE = {
  fontSize: "12px",
  fontWeight: "600",
  borderRadius: "18px",
  background: "#DCE6EF",
  color: "#21303D"
};

const SHELL_HEADER_STYLE = {
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: "700",
  borderRadius: "22px",
  background: "#1A2430",
  color: "#F9FBFC",
  textAlign: "left",
  padding: "16px 18px"
};

const PANEL_BASE_STYLE = {
  borderRadius: "24px",
  padding: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  boxShadow: "0 6px 18px rgba(22, 32, 43, 0.08)"
};

const PANEL_TONES = {
  mint: {
    background: "#DFF4EE",
    border: "1px solid #B3DDD3"
  },
  sky: {
    background: "#E7F0F8",
    border: "1px solid #C8D8E8"
  },
  sand: {
    background: "#F5EBDD",
    border: "1px solid #E5D4BC"
  },
  slate: {
    background: "#243240",
    border: "1px solid #314355"
  },
  white: {
    background: "#FFFFFF",
    border: "1px solid #D7E0E8"
  }
};

const PANEL_HEADER_STYLE = {
  fontSize: "14px",
  fontWeight: "700",
  lineHeight: "20px",
  color: "#16313A"
};

const PANEL_SUBTITLE_STYLE = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#45606E"
};

const PANEL_HEADER_DARK_STYLE = {
  ...PANEL_HEADER_STYLE,
  color: "#F3F8FB"
};

const PANEL_SUBTITLE_DARK_STYLE = {
  ...PANEL_SUBTITLE_STYLE,
  color: "#C5D5E1"
};

const STEPPER_PAGER_STYLE = {
  fontSize: "12px",
  fontWeight: "600",
  lineHeight: "16px",
  borderRadius: "16px",
  background: "#D8EAF4",
  color: "#1B4155",
  textAlign: "center",
  padding: "8px 10px"
};

const STEP_BADGE_STYLE = {
  fontSize: "12px",
  fontWeight: "700",
  lineHeight: "18px",
  borderRadius: "16px",
  background: "#0E7B83",
  color: "#FFFFFF",
  textAlign: "center",
  padding: "8px 12px"
};

const MINI_STAT_STYLE = {
  fontSize: "12px",
  lineHeight: "18px",
  borderRadius: "14px",
  background: "#F9FBFC",
  color: "#1F2D3A",
  textAlign: "left",
  padding: "10px 12px"
};

const STEP_JUMP_STYLE = {
  fontSize: "12px",
  fontWeight: "700",
  lineHeight: "16px",
  borderRadius: "16px",
  background: "#E7EEF4",
  color: "#234050",
  textAlign: "center",
  padding: "8px 10px",
  minWidth: "48px"
};

const STATIC_NOTE_STYLE = {
  fontSize: "12px",
  lineHeight: "18px",
  background: "transparent",
  color: "#4A5D6A",
  textAlign: "left",
  padding: "0",
  borderRadius: "0px"
};

const STATIC_NOTE_DARK_STYLE = {
  ...STATIC_NOTE_STYLE,
  color: "#C5D5E1"
};

const TOOL_LIST_STYLE = {
  display: "flex",
  flexDirection: "column",
  gap: "12px"
};

const TOOL_ROW_STYLE = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "10px"
};

const TOOL_BADGE_STYLE = {
  width: "54px",
  minWidth: "54px",
  fontSize: "12px",
  fontWeight: "700",
  lineHeight: "54px",
  borderRadius: "20px",
  color: "#FFFFFF",
  textAlign: "center",
  padding: "0"
};

const TOOL_BADGE_TONES = {
  tool_aeropress: {
    background: "#2E8C7B"
  },
  tool_v60: {
    background: "#4B74D4"
  },
  tool_kalita_wave: {
    background: "#3FA589"
  },
  tool_chemex: {
    background: "#5C6FD6"
  },
  tool_clever_dripper: {
    background: "#6A9C58"
  },
  tool_french_press: {
    background: "#C06B3D"
  }
};

const PANEL_TITLE_RIBBON_STYLE = {
  fontSize: "12px",
  fontWeight: "700",
  lineHeight: "18px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.18)",
  color: "#F3F8FB",
  textAlign: "center",
  padding: "6px 12px"
};

const PANEL_TITLE_LIGHT_STYLE = {
  ...PANEL_TITLE_RIBBON_STYLE,
  background: "rgba(255,255,255,0.55)",
  color: "#234050"
};

const TOOL_OPTIONS = TOOL_CATALOG.map((tool) => ({
  name: tool.label,
  value: tool.toolId
}));

const COLOR_OPTIONS = RECIPE_COLOR_TOKENS.map((colorToken) => ({
  name: colorToken,
  value: colorToken
}));

const STEP_KIND_OPTIONS = RECIPE_STEP_KINDS.map((stepKind) => ({
  name: stepKind,
  value: stepKind
}));

const FEEDBACK_LABELS = {
  none: "none",
  vibrate_short: "short haptic",
  vibrate_long: "long haptic",
  combo_short: "finish haptic"
};

const FEEDBACK_OPTIONS = FEEDBACK_CUES.map((feedbackCue) => ({
  name: FEEDBACK_LABELS[feedbackCue] || feedbackCue,
  value: feedbackCue
}));

const BOOLEAN_OPTIONS = [
  { name: "true", value: "true" },
  { name: "false", value: "false" }
];

const RATING_OPTIONS = [
  { name: "none", value: "" },
  { name: "1", value: "1" },
  { name: "2", value: "2" },
  { name: "3", value: "3" },
  { name: "4", value: "4" },
  { name: "5", value: "5" }
];

const NOOP = () => {};

function createDefaultUiState(selectedToolId) {
  return {
    view: "library-home",
    selectedToolId: selectedToolId || null,
    editingRecipeId: null,
    selectedHistoryId: null,
    draftRecipe: null,
    historyDraft: null,
    stepPageIndex: 0,
    flashMessage: "",
    errorMessage: ""
  };
}

function createDraftFromRecipe(recipeRecord) {
  return {
    ...recipeRecord,
    coffeeDoseG: String(recipeRecord.coffeeDoseG ?? ""),
    totalWaterMl: String(recipeRecord.totalWaterMl ?? ""),
    waterTempC: String(recipeRecord.waterTempC ?? ""),
    estimatedTotalDurationMs: String(recipeRecord.estimatedTotalDurationMs ?? ""),
    steps: (recipeRecord.steps || []).map((step) => ({
      ...step,
      durationMs: step.durationMs === undefined ? "" : String(step.durationMs),
      waterMl: step.waterMl === undefined ? "" : String(step.waterMl),
      targetTotalWaterMl:
        step.targetTotalWaterMl === undefined ? "" : String(step.targetTotalWaterMl),
      requiresConfirm: step.requiresConfirm ? "true" : "false"
    }))
  };
}

function createFreshDraft(toolId) {
  return createDraftFromRecipe(
    createUserRecipeRecord({
      toolId,
      steps: createDefaultRecipeSteps()
    })
  );
}

function createHistoryDraft(historyEntry) {
  return {
    userNote: historyEntry && historyEntry.userNote ? historyEntry.userNote : "",
    userRating:
      historyEntry && historyEntry.userRating !== undefined ? String(historyEntry.userRating) : ""
  };
}

function createButtonRow(buttons) {
  return View(
    {
      style: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: "8px",
        marginTop: "8px"
      }
    },
    buttons
  );
}

function createWrapRow(children, gap = "8px") {
  return View(
    {
      style: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap
      }
    },
    children
  );
}

function createPanel(tone, title, subtitle, content) {
  const isDark = tone === "slate";
  const headerStyle = {
    ...(isDark ? PANEL_TITLE_RIBBON_STYLE : PANEL_TITLE_LIGHT_STYLE),
    alignSelf: "center"
  };
  const subtitleStyle = {
    ...(isDark ? STATIC_NOTE_DARK_STYLE : STATIC_NOTE_STYLE),
    background: "transparent",
    borderRadius: "0px"
  };

  return View(
    {
      style: {
        ...PANEL_BASE_STYLE,
        ...(PANEL_TONES[tone] || PANEL_TONES.white)
      }
    },
    [
      View(
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "4px"
          }
        },
        [
          title ? createStaticCard(title, headerStyle) : null,
          subtitle ? createStaticCard(subtitle, subtitleStyle) : null
        ].filter(Boolean)
      ),
      ...content
    ]
  );
}

function createStaticCard(label, style = INFO_BUTTON_STYLE) {
  return Button({
    label,
    style,
    onClick: NOOP
  });
}

function createSectionTitle(title, subtitle = "") {
  return createStaticCard(subtitle ? `${title}\n${subtitle}` : title, SECTION_TITLE_STYLE);
}

function createNavButtonStyle(isActive) {
  return {
    ...NAV_BUTTON_STYLE,
    background: isActive ? "#167F73" : "#DFE7EF",
    color: isActive ? "white" : "#1E2F3A"
  };
}

function getStepPageCount(stepCount) {
  return Math.max(1, Number(stepCount) || 0);
}

function clampStepPageIndex(stepPageIndex, stepCount) {
  const pageCount = getStepPageCount(stepCount);
  return Math.min(Math.max(Number(stepPageIndex) || 0, 0), pageCount - 1);
}

function getActiveNavKey(viewName) {
  if (viewName === "history-list" || viewName === "history-detail") {
    return "history";
  }

  if (viewName === "about-sync") {
    return "sync";
  }

  return "library";
}

function formatDurationLabel(durationMs) {
  const durationSeconds = Math.max(0, Math.round((Number(durationMs) || 0) / 1000));
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  if (!minutes) {
    return `${seconds}s`;
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function formatDateLabel(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "Unknown date";
  }

  return new Date(timestamp).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getToolMeta(toolId) {
  return TOOL_CATALOG.find((tool) => tool.toolId === toolId) || null;
}

function createToolBadgeStyle(toolId) {
  return {
    ...TOOL_BADGE_STYLE,
    ...(TOOL_BADGE_TONES[toolId] || {
      background: "#5E6773"
    })
  };
}

function createToolBrowseCard(tool, recipeCount, onClick) {
  return View({ style: TOOL_ROW_STYLE }, [
    createStaticCard(buildToolBadgeLabel(tool), createToolBadgeStyle(tool.toolId)),
    Button({
      label: buildToolCardLabel(tool, recipeCount),
      style: LIST_CARD_BUTTON_STYLE,
      onClick
    })
  ]);
}

function buildRecipeCardLabel(recipeSummary, recipeRecord) {
  const metrics = recipeRecord
    ? `${recipeRecord.coffeeDoseG}g - ${recipeRecord.totalWaterMl}ml - ${formatDurationLabel(
        recipeRecord.estimatedTotalDurationMs
      )}`
    : "Metrics unavailable";
  const sourceLabel = recipeSummary.source === "seed" ? "Starter recipe" : "Custom recipe";

  return `${recipeSummary.name}\n${metrics}\n${sourceLabel} - Updated ${formatDateLabel(recipeSummary.updatedAt)}`;
}

function buildDraftOverview(draftRecipe) {
  return `${draftRecipe.name || "Untitled recipe"}\n${getToolMeta(draftRecipe.toolId)?.label || "No brewer"} - ${
    draftRecipe.steps.length
  } steps - ${formatDurationLabel(draftRecipe.estimatedTotalDurationMs)}`;
}

function buildRecipeStatCards(draftRecipe) {
  return [
    `Dose\n${draftRecipe.coffeeDoseG || "-"} g`,
    `Water\n${draftRecipe.totalWaterMl || "-"} ml`,
    `Temp\n${draftRecipe.waterTempC || "-"} C`,
    `Time\n${formatDurationLabel(draftRecipe.estimatedTotalDurationMs)}`,
    `Steps\n${draftRecipe.steps.length}`,
    `Color\n${draftRecipe.colorToken || "-"}`
  ];
}

function humanizeStepKind(stepKind) {
  switch (stepKind) {
    case "timed_action":
      return "Timed action";
    case "timed_wait":
      return "Timed wait";
    default:
      return stepKind ? `${stepKind.charAt(0).toUpperCase()}${stepKind.slice(1)}` : "Step";
  }
}

function buildStepSummaryLabel(step, index, totalSteps) {
  const detailParts = [humanizeStepKind(step.kind)];

  if (step.durationMs) {
    detailParts.push(formatDurationLabel(step.durationMs));
  }

  if (step.waterMl) {
    detailParts.push(`${step.waterMl}ml`);
  }

  if (step.requiresConfirm === "true" || step.requiresConfirm === true) {
    detailParts.push("Confirm");
  }

  return `Step ${index + 1}/${totalSteps}: ${step.title || step.kind}\n${detailParts.join(" - ")}`;
}

function chunkItems(items, size) {
  const rows = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
}

function buildHistoryCardLabel(historyEntry) {
  const ratingLabel = historyEntry.userRating ? ` - Rated ${historyEntry.userRating}/5` : "";
  return `${historyEntry.recipeSnapshot.name}\n${historyEntry.status} - ${formatDurationLabel(
    historyEntry.elapsedMs
  )} - ${formatDateLabel(historyEntry.endedAt)}${ratingLabel}`;
}

function buildShellHeader(viewName, snapshot, selectedToolId) {
  const selectedTool = getToolMeta(selectedToolId);
  const selectedRecipeCount = selectedTool
    ? (((snapshot && snapshot.recipesByTool) || {})[selectedTool.toolId] || []).length
    : 0;

  switch (viewName) {
    case "recipe-list":
      return {
        title: selectedTool ? `${selectedTool.label} recipes` : "Recipes",
        subtitle: selectedTool
          ? buildRecipeShelfCountLabel(selectedRecipeCount)
          : "Manage recipes for the selected brewer."
      };
    case "recipe-editor":
      return {
        title: "Recipe editor",
        subtitle: "Shape the brew profile and the guided watch steps."
      };
    case "history-list":
      return {
        title: "Brew history",
        subtitle: buildHistoryOverview(snapshot)
      };
    case "history-detail":
      return {
        title: "History detail",
        subtitle: "Phone notes and ratings stay attached to the archived snapshot."
      };
    case "about-sync":
      return {
        title: "Sync status",
        subtitle: "Phone stays canonical. The watch mirrors only what it needs."
      };
    default:
      return {
        title: "PourOverFlow",
        subtitle: buildLibraryOverview(snapshot)
      };
  }
}

AppSettingsPage({
  state: {
    snapshot: null,
    syncMeta: null,
    ui: null
  },
  hydrateFromStorage(props) {
    ensurePhoneStorage(props.settingsStorage);
    this.state.snapshot = readPhoneSnapshot(props.settingsStorage);
    this.state.syncMeta = this.state.snapshot.syncMeta;

    const defaultToolId = this.state.snapshot.tools[0] ? this.state.snapshot.tools[0].toolId : null;
    const persistedUi = readSettingsJson(
      props.settingsStorage,
      SETTINGS_UI_STORAGE_KEY,
      createDefaultUiState(defaultToolId)
    );

    this.state.ui = {
      ...createDefaultUiState(defaultToolId),
      ...persistedUi
    };

    if (!this.state.ui.selectedToolId) {
      this.state.ui.selectedToolId = defaultToolId;
    }
  },
  persistUiState(props, patch) {
    const nextUi = {
      ...(this.state.ui || createDefaultUiState(null)),
      ...patch
    };

    this.state.ui = nextUi;
    writeSettingsJson(props.settingsStorage, SETTINGS_UI_STORAGE_KEY, nextUi);
  },
  setView(props, viewName, patch = {}) {
    this.persistUiState(props, {
      view: viewName,
      errorMessage: "",
      ...patch
    });
  },
  openLibraryHome(props) {
    this.setView(props, "library-home", {
      draftRecipe: null,
      editingRecipeId: null,
      selectedHistoryId: null,
      historyDraft: null
    });
  },
  openRecipeList(props, toolId) {
    this.setView(props, "recipe-list", {
      selectedToolId: toolId || this.state.ui.selectedToolId,
      draftRecipe: null,
      editingRecipeId: null
    });
  },
  openRecipeEditor(props, recipeId) {
    const recipeRecord = recipeId ? readRecipeRecord(props.settingsStorage, recipeId) : null;
    const selectedToolId = recipeRecord ? recipeRecord.toolId : this.state.ui.selectedToolId;
    const draftRecipe = recipeRecord
      ? createDraftFromRecipe(recipeRecord)
      : createFreshDraft(selectedToolId);

    this.setView(props, "recipe-editor", {
      selectedToolId: selectedToolId || this.state.ui.selectedToolId,
      editingRecipeId: recipeId || null,
      draftRecipe,
      stepPageIndex: 0,
      flashMessage: ""
    });
  },
  openHistoryList(props) {
    this.setView(props, "history-list", {
      selectedHistoryId: null,
      historyDraft: null
    });
  },
  openHistoryDetail(props, historyId) {
    const historyEntry = readHistoryEntry(props.settingsStorage, historyId);

    this.setView(props, "history-detail", {
      selectedHistoryId: historyId,
      historyDraft: historyEntry ? createHistoryDraft(historyEntry) : null
    });
  },
  openSyncInfo(props) {
    this.setView(props, "about-sync");
  },
  updateDraftField(props, fieldName, value) {
    this.persistUiState(props, {
      draftRecipe: {
        ...this.state.ui.draftRecipe,
        [fieldName]: value
      },
      flashMessage: "",
      errorMessage: ""
    });
  },
  updateDraftStepField(props, index, fieldName, value) {
    const nextSteps = (this.state.ui.draftRecipe.steps || []).map((step, stepIndex) =>
      stepIndex === index ? { ...step, [fieldName]: value } : step
    );

    this.updateDraftField(props, "steps", nextSteps);
  },
  addDraftStep(props) {
    const nextSteps = [...(this.state.ui.draftRecipe.steps || [])];
    const insertIndex = Math.max(0, nextSteps.length - 1);

    nextSteps.splice(insertIndex, 0, {
      stepId: "",
      order: insertIndex,
      kind: "instruction",
      title: `Step ${insertIndex + 1}`,
      body: "Describe the action.",
      durationMs: "",
      waterMl: "",
      targetTotalWaterMl: "",
      requiresConfirm: "false",
      feedbackCue: "none"
    });

    this.persistUiState(props, {
      draftRecipe: {
        ...this.state.ui.draftRecipe,
        steps: nextSteps
      },
      stepPageIndex: insertIndex,
      flashMessage: "",
      errorMessage: ""
    });
  },
  setStepPage(props, nextPageIndex) {
    this.persistUiState(props, {
      stepPageIndex: clampStepPageIndex(
        nextPageIndex,
        (this.state.ui.draftRecipe && this.state.ui.draftRecipe.steps
          ? this.state.ui.draftRecipe.steps.length
          : 0)
      )
    });
  },
  moveDraftStep(props, index, delta) {
    const nextIndex = index + delta;
    const nextSteps = [...(this.state.ui.draftRecipe.steps || [])];

    if (nextIndex < 0 || nextIndex >= nextSteps.length) {
      return;
    }

    const currentStep = nextSteps[index];
    nextSteps[index] = nextSteps[nextIndex];
    nextSteps[nextIndex] = currentStep;
    this.persistUiState(props, {
      draftRecipe: {
        ...this.state.ui.draftRecipe,
        steps: nextSteps
      },
      stepPageIndex: nextIndex,
      flashMessage: "",
      errorMessage: ""
    });
  },
  deleteDraftStep(props, index) {
    const currentSteps = [...(this.state.ui.draftRecipe.steps || [])];

    if (currentSteps.length <= 1) {
      this.persistUiState(props, {
        draftRecipe: {
          ...this.state.ui.draftRecipe,
          steps: createFreshDraft(this.state.ui.selectedToolId).steps
        },
        stepPageIndex: 0,
        flashMessage: "",
        errorMessage: ""
      });
      return;
    }

    currentSteps.splice(index, 1);
    this.persistUiState(props, {
      draftRecipe: {
        ...this.state.ui.draftRecipe,
        steps: currentSteps
      },
      stepPageIndex: clampStepPageIndex(index, currentSteps.length),
      flashMessage: "",
      errorMessage: ""
    });
  },
  saveDraftRecipe(props) {
    const result = saveRecipeRecord(props.settingsStorage, this.state.ui.draftRecipe);

    if (!result.ok) {
      this.persistUiState(props, {
        errorMessage: result.issues.join(" "),
        flashMessage: ""
      });
      return;
    }

    this.setView(props, "recipe-list", {
      selectedToolId: result.recipeRecord.toolId,
      editingRecipeId: null,
      draftRecipe: null,
      flashMessage: `Saved recipe: ${result.recipeRecord.name}`,
      errorMessage: ""
    });
  },
  duplicateRecipe(props, recipeId) {
    const result = duplicateRecipeRecord(props.settingsStorage, recipeId);

    if (!result.ok) {
      this.persistUiState(props, {
        errorMessage: result.issues.join(" ")
      });
      return;
    }

    this.openRecipeList(props, result.recipeRecord.toolId);
    this.persistUiState(props, {
      flashMessage: `Duplicated recipe: ${result.recipeRecord.name}`
    });
  },
  deleteRecipe(props, recipeId) {
    const deleted = deleteRecipeRecord(props.settingsStorage, recipeId);

    this.persistUiState(props, {
      flashMessage: deleted ? "Recipe deleted. History was preserved." : "",
      errorMessage: deleted ? "" : "Recipe record not found."
    });
  },
  updateHistoryDraftField(props, fieldName, value) {
    this.persistUiState(props, {
      historyDraft: {
        ...(this.state.ui.historyDraft || {}),
        [fieldName]: value
      },
      flashMessage: "",
      errorMessage: ""
    });
  },
  saveHistoryDraft(props) {
    const result = updateHistoryEntryFeedback(
      props.settingsStorage,
      this.state.ui.selectedHistoryId,
      this.state.ui.historyDraft || {}
    );

    if (!result.ok) {
      this.persistUiState(props, {
        errorMessage: result.issues.join(" ")
      });
      return;
    }

    this.persistUiState(props, {
      flashMessage: "History note saved.",
      errorMessage: ""
    });
  },
  renderNav(props) {
    const activeNavKey = getActiveNavKey(this.state.ui.view);

    return View(
      {
        style: {
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          gap: "8px"
        }
      },
      [
        Button({
          label: "Library",
          style: createNavButtonStyle(activeNavKey === "library"),
          onClick: () => {
            this.openLibraryHome(props);
          }
        }),
        Button({
          label: "History",
          style: createNavButtonStyle(activeNavKey === "history"),
          onClick: () => {
            this.openHistoryList(props);
          }
        }),
        Button({
          label: "Sync",
          style: createNavButtonStyle(activeNavKey === "sync"),
          onClick: () => {
            this.openSyncInfo(props);
          }
        })
      ]);
  },
  renderMessages() {
    const messageViews = [];

    if (this.state.ui.flashMessage) {
      messageViews.push(createStaticCard(this.state.ui.flashMessage, SUCCESS_CARD_STYLE));
    }

    if (this.state.ui.errorMessage) {
      messageViews.push(createStaticCard(this.state.ui.errorMessage, ERROR_CARD_STYLE));
    }

    return messageViews.length ? Section({}, messageViews) : null;
  },
  renderLibraryHome(props) {
    const recipesByTool = this.state.snapshot ? this.state.snapshot.recipesByTool : {};

    return View({ style: TOOL_LIST_STYLE }, TOOL_CATALOG.map((tool) =>
      createToolBrowseCard(tool, (recipesByTool[tool.toolId] || []).length, () => {
        this.openRecipeList(props, tool.toolId);
      })
    ));
  },
  renderRecipeCards(props) {
    const recipes = this.state.snapshot.recipesByTool[this.state.ui.selectedToolId] || [];

    if (!recipes.length) {
      return [
        createStaticCard(
          "No recipes yet for this brewer.\nCreate the first one here.",
          CARD_BUTTON_STYLE
        )
      ];
    }

    return recipes.map((recipeSummary) => {
      const recipeRecord = readRecipeRecord(props.settingsStorage, recipeSummary.recipeId);

      return View(
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "10px"
          }
        },
        [
          Button({
            label: buildRecipeCardLabel(recipeSummary, recipeRecord),
            style: CARD_BUTTON_STYLE,
            onClick: () => {
              this.openRecipeEditor(props, recipeSummary.recipeId);
            }
          }),
          createButtonRow([
            Button({
              label: "Duplicate",
              style: SOFT_ACTION_BUTTON_STYLE,
              onClick: () => {
                this.duplicateRecipe(props, recipeSummary.recipeId);
              }
            }),
            Button({
              label: "Delete",
              style: DANGER_BUTTON_STYLE,
              onClick: () => {
                this.deleteRecipe(props, recipeSummary.recipeId);
              }
            })
          ])
        ]
      );
    });
  },
  renderRecipeList(props) {
    const selectedTool =
      TOOL_CATALOG.find((tool) => tool.toolId === this.state.ui.selectedToolId) || TOOL_CATALOG[0];
    const recipeCount = ((this.state.snapshot.recipesByTool || {})[selectedTool.toolId] || []).length;

    return View({ style: CARD_STACK_STYLE }, [
      createButtonRow([
        Button({
          label: "New recipe",
          style: PRIMARY_BUTTON_STYLE,
          onClick: () => {
            this.openRecipeEditor(props, null);
          }
        }),
        Button({
          label: "Brewers",
          style: SOFT_ACTION_BUTTON_STYLE,
          onClick: () => {
            this.openLibraryHome(props);
          }
        })
      ]),
      createPanel(
        "sand",
        recipeCount ? "Recipes" : "Empty shelf",
        recipeCount
          ? "Tap a recipe card to edit it. Duplicate or delete from the action row."
          : `Add the first ${selectedTool.label} recipe here.`,
        this.renderRecipeCards(props)
      )
    ]);
  },
  renderStepEditor(props, step, index, totalSteps) {
    return createPanel(
      "white",
      `Step ${index + 1} of ${totalSteps}`,
      buildStepSummaryLabel(step, index, totalSteps).split("\n")[1] || "Guided watch instruction",
      [
        createStaticCard(
          `${humanizeStepKind(step.kind)}\n${step.title || "Untitled step"}`,
          {
            ...CARD_BUTTON_STYLE,
            background: "#F4F8FB",
            color: "#183546"
          }
        ),
        Select({
          label: "Kind",
          options: STEP_KIND_OPTIONS,
          value: step.kind,
          onChange: (value) => {
            this.updateDraftStepField(props, index, "kind", value);
          }
        }),
        TextInput({
          label: "Title",
          value: step.title || "",
          onChange: (value) => {
            this.updateDraftStepField(props, index, "title", value);
          }
        }),
        TextInput({
          label: "Body",
          value: step.body || "",
          onChange: (value) => {
            this.updateDraftStepField(props, index, "body", value);
          }
        }),
        TextInput({
          label: "Duration ms",
          value: step.durationMs || "",
          onChange: (value) => {
            this.updateDraftStepField(props, index, "durationMs", value);
          }
        }),
        TextInput({
          label: "Water ml",
          value: step.waterMl || "",
          onChange: (value) => {
            this.updateDraftStepField(props, index, "waterMl", value);
          }
        }),
        TextInput({
          label: "Target total ml",
          value: step.targetTotalWaterMl || "",
          onChange: (value) => {
            this.updateDraftStepField(props, index, "targetTotalWaterMl", value);
          }
        }),
        Select({
          label: "Requires confirm",
          options: BOOLEAN_OPTIONS,
          value: step.requiresConfirm,
          onChange: (value) => {
            this.updateDraftStepField(props, index, "requiresConfirm", value);
          }
        }),
        Select({
          label: "Feedback cue",
          options: FEEDBACK_OPTIONS,
          value: step.feedbackCue,
          onChange: (value) => {
            this.updateDraftStepField(props, index, "feedbackCue", value);
          }
        }),
        createButtonRow([
          Button({
            label: "Up",
            style: SOFT_ACTION_BUTTON_STYLE,
            onClick: () => {
              this.moveDraftStep(props, index, -1);
            }
          }),
          Button({
            label: "Down",
            style: SOFT_ACTION_BUTTON_STYLE,
            onClick: () => {
              this.moveDraftStep(props, index, 1);
            }
          }),
          Button({
            label: totalSteps > 1 ? "Delete" : "Reset",
            style: DANGER_BUTTON_STYLE,
            onClick: () => {
              this.deleteDraftStep(props, index);
            }
          })
        ])
      ]
    );
  },
  renderRecipeEditor(props) {
    const draftRecipe = this.state.ui.draftRecipe;

    if (!draftRecipe) {
      return Section({}, [
        createStaticCard("Recipe draft is missing.", ERROR_CARD_STYLE)
      ]);
    }

    const currentStepIndex = clampStepPageIndex(this.state.ui.stepPageIndex, draftRecipe.steps.length);
    const currentStep = draftRecipe.steps[currentStepIndex];
    const stepJumpButtons = chunkItems(
      (draftRecipe.steps || []).map((step, index) =>
        Button({
          label: `${index + 1}`,
          style:
            index === currentStepIndex
              ? {
                  ...STEP_JUMP_STYLE,
                  background: "#0E7B83",
                  color: "#FFFFFF"
                }
              : STEP_JUMP_STYLE,
          onClick: () => {
            this.setStepPage(props, index);
          }
        })
      ),
      5
    );

    return View({ style: CARD_STACK_STYLE }, [
      createPanel(
        "slate",
        draftRecipe.name || "Untitled recipe",
        draftRecipe.recipeId ? "Editing an existing recipe." : "Creating a new recipe.",
        [
          createStaticCard(buildDraftOverview(draftRecipe), {
            ...SUCCESS_CARD_STYLE,
            background: "#314352",
            color: "#D7F3EA"
          }),
          createWrapRow(
            buildRecipeStatCards(draftRecipe).map((label) =>
              createStaticCard(label, MINI_STAT_STYLE)
            )
          )
        ]
      ),
      createPanel(
        "mint",
        "Recipe basics",
        "Identity, brewer and quick description.",
        [
          TextInput({
            label: "Name",
            value: draftRecipe.name || "",
            onChange: (value) => {
              this.updateDraftField(props, "name", value);
            }
          }),
          Select({
            label: "Tool",
            options: TOOL_OPTIONS,
            value: draftRecipe.toolId,
            onChange: (value) => {
              this.updateDraftField(props, "toolId", value);
            }
          }),
          Select({
            label: "Color",
            options: COLOR_OPTIONS,
            value: draftRecipe.colorToken,
            onChange: (value) => {
              this.updateDraftField(props, "colorToken", value);
            }
          }),
          TextInput({
            label: "Description",
            value: draftRecipe.description || "",
            onChange: (value) => {
              this.updateDraftField(props, "description", value);
            }
          })
        ]
      ),
      createPanel(
        "sky",
        "Brew profile",
        "Numbers shown in the library, on the watch, and in history.",
        [
          TextInput({
            label: "Dose g",
            value: draftRecipe.coffeeDoseG || "",
            onChange: (value) => {
              this.updateDraftField(props, "coffeeDoseG", value);
            }
          }),
          TextInput({
            label: "Water ml",
            value: draftRecipe.totalWaterMl || "",
            onChange: (value) => {
              this.updateDraftField(props, "totalWaterMl", value);
            }
          }),
          TextInput({
            label: "Temp C",
            value: draftRecipe.waterTempC || "",
            onChange: (value) => {
              this.updateDraftField(props, "waterTempC", value);
            }
          }),
          TextInput({
            label: "Filter",
            value: draftRecipe.filterLabel || "",
            onChange: (value) => {
              this.updateDraftField(props, "filterLabel", value);
            }
          }),
          TextInput({
            label: "Grind",
            value: draftRecipe.grindLabel || "",
            onChange: (value) => {
              this.updateDraftField(props, "grindLabel", value);
            }
          }),
          TextInput({
            label: "Estimated ms",
            value: draftRecipe.estimatedTotalDurationMs || "",
            onChange: (value) => {
              this.updateDraftField(props, "estimatedTotalDurationMs", value);
            }
          })
        ]
      ),
      createPanel(
        "sand",
        "Guided steps",
        `${draftRecipe.steps.length} steps currently define the watch-side brew guidance.`,
        [
          createButtonRow([
            Button({
              label: "Previous",
              style: currentStepIndex > 0 ? SOFT_ACTION_BUTTON_STYLE : INFO_BUTTON_STYLE,
              onClick: () => {
                this.setStepPage(props, currentStepIndex - 1);
              }
            }),
            Button({
              label: `${currentStepIndex + 1} / ${draftRecipe.steps.length}`,
              style: STEPPER_PAGER_STYLE,
              onClick: NOOP
            }),
            Button({
              label: "Next",
              style:
                currentStepIndex < draftRecipe.steps.length - 1
                  ? SOFT_ACTION_BUTTON_STYLE
                  : INFO_BUTTON_STYLE,
              onClick: () => {
                this.setStepPage(props, currentStepIndex + 1);
              }
            })
          ]),
          Button({
            label: buildStepSummaryLabel(currentStep, currentStepIndex, draftRecipe.steps.length),
            style: STEP_BADGE_STYLE,
            onClick: NOOP
          }),
          ...stepJumpButtons.map((buttonRow) => createWrapRow(buttonRow)),
          Button({
            label: "Add step",
            style: PRIMARY_BUTTON_STYLE,
            onClick: () => {
              this.addDraftStep(props);
            }
          })
        ]
      ),
      this.renderStepEditor(props, currentStep, currentStepIndex, draftRecipe.steps.length),
      createPanel(
        "white",
        "Notes and save",
        "Recipe notes stay on the phone record and help future edits.",
        [
          TextInput({
            label: "Notes",
            value: draftRecipe.notes || "",
            onChange: (value) => {
              this.updateDraftField(props, "notes", value);
            }
          }),
          createButtonRow([
            Button({
              label: "Save recipe",
              style: PRIMARY_BUTTON_STYLE,
              onClick: () => {
                this.saveDraftRecipe(props);
              }
            }),
            Button({
              label: "Cancel",
              style: SOFT_ACTION_BUTTON_STYLE,
              onClick: () => {
                this.openRecipeList(props, draftRecipe.toolId || this.state.ui.selectedToolId);
              }
            })
          ])
        ]
      )
    ]);
  },
  renderHistoryList(props) {
    const historyIndex = this.state.snapshot ? this.state.snapshot.historyIndex : [];

    if (!historyIndex.length) {
      return Section({}, [
        createStaticCard(
          "No history entries yet.\nThey will appear here after the watch sends completed or aborted brews back to the phone.",
          CARD_BUTTON_STYLE
        )
      ]);
    }

    return View({ style: CARD_STACK_STYLE }, [
      createPanel(
        "white",
        "Recent brews",
        "Open an entry to review timing, rating, and phone notes.",
        historyIndex.map((historyIndexEntry) => {
          const historyEntry = readHistoryEntry(props.settingsStorage, historyIndexEntry.historyId);

          return Button({
            label: historyEntry
              ? buildHistoryCardLabel(historyEntry)
              : `${historyIndexEntry.recipeName}\n${historyIndexEntry.status} - ${formatDurationLabel(
                  historyIndexEntry.elapsedMs
                )}`,
            style: CARD_BUTTON_STYLE,
            onClick: () => {
              this.openHistoryDetail(props, historyIndexEntry.historyId);
            }
          });
        })
      )
    ]);
  },
  renderHistoryDetail(props) {
    const historyEntry = readHistoryEntry(props.settingsStorage, this.state.ui.selectedHistoryId);

    if (!historyEntry) {
      return Section({}, [
        createStaticCard("History entry not found.", ERROR_CARD_STYLE)
      ]);
    }

    const historyDraft = this.state.ui.historyDraft || createHistoryDraft(historyEntry);
    const snapshotTool = getToolMeta(historyEntry.recipeSnapshot.toolId);
    const stepSummaries = (historyEntry.stepRunResults || []).map((stepRunResult) =>
      createStaticCard(
        `${stepRunResult.order + 1}. ${stepRunResult.title || stepRunResult.kind}\n${stepRunResult.kind} - ${formatDurationLabel(
          stepRunResult.actualDurationMs || 0
        )}`,
        CARD_BUTTON_STYLE
      )
    );

    return View({ style: CARD_STACK_STYLE }, [
      createPanel("slate", "History detail", "Archived snapshot, timing and phone notes.", [
        createStaticCard(buildHistoryCardLabel(historyEntry), {
          ...SUCCESS_CARD_STYLE,
          background: "#314352",
          color: "#D7F3EA"
        }),
        createStaticCard(
          `${snapshotTool ? snapshotTool.label : historyEntry.recipeSnapshot.toolId}\nFilter: ${
            historyEntry.recipeSnapshot.filterLabel || "Not specified"
          }\nDelta: ${formatDurationLabel(Math.abs(historyEntry.deviationSummary.totalDeltaMs || 0))} ${
            (historyEntry.deviationSummary.totalDeltaMs || 0) >= 0 ? "over" : "under"
          } planned`,
          CARD_BUTTON_STYLE
        )
      ]),
      createPanel(
        "sky",
        "Step timing",
        "Run results attached to the archived recipe snapshot.",
        (
          stepSummaries.length
            ? stepSummaries
            : [createStaticCard("No step run results were recorded for this brew.", CARD_BUTTON_STYLE)]
        )
      ),
      createPanel(
        "mint",
        "Phone feedback",
        "Notes and rating stay attached to this archived session.",
        [
          Select({
            label: "Rating",
            options: RATING_OPTIONS,
            value: historyDraft.userRating || "",
            onChange: (value) => {
              this.updateHistoryDraftField(props, "userRating", value);
            }
          }),
          TextInput({
            label: "Note",
            value: historyDraft.userNote || "",
            onChange: (value) => {
              this.updateHistoryDraftField(props, "userNote", value);
            }
          }),
          createButtonRow([
            Button({
              label: "Save notes",
              style: PRIMARY_BUTTON_STYLE,
              onClick: () => {
                this.saveHistoryDraft(props);
              }
            }),
            Button({
              label: "Back to history",
              style: SOFT_ACTION_BUTTON_STYLE,
              onClick: () => {
                this.openHistoryList(props);
              }
            })
          ])
        ]
      )
    ]);
  },
  renderSyncInfo() {
    const syncMeta = this.state.syncMeta || {};

    return View({ style: CARD_STACK_STYLE }, [
      createPanel("white", "Sync overview", "The watch mirrors recipes, cache state, and the latest result only.", [
        createStaticCard(
          buildSyncOverview(syncMeta),
          CARD_BUTTON_STYLE
        )
      ])
    ]);
  },
  renderView(props) {
    if (this.state.ui.view === "recipe-list") {
      return this.renderRecipeList(props);
    }

    if (this.state.ui.view === "recipe-editor") {
      return this.renderRecipeEditor(props);
    }

    if (this.state.ui.view === "history-list") {
      return this.renderHistoryList(props);
    }

    if (this.state.ui.view === "history-detail") {
      return this.renderHistoryDetail(props);
    }

    if (this.state.ui.view === "about-sync") {
      return this.renderSyncInfo(props);
    }

    return this.renderLibraryHome(props);
  },
  build(props) {
    this.hydrateFromStorage(props);
    const shellHeader = buildShellHeader(
      this.state.ui.view,
      this.state.snapshot,
      this.state.ui.selectedToolId
    );

    return View(
      {
        style: ROOT_VIEW_STYLE
      },
      [
        this.renderNav(props),
        createStaticCard(`${shellHeader.title}\n${shellHeader.subtitle}`, SHELL_HEADER_STYLE),
        this.renderMessages(),
        this.renderView(props)
      ].filter(Boolean)
    );
  }
});
