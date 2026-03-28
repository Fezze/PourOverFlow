import { TOOL_CATALOG, getLocalizedToolLabel } from "../shared/constants/tool-catalog";
import { DEFAULT_LOCALE } from "../shared/i18n/index.js";
import { createPhoneTranslator, resolvePhoneLocale } from "../shared/i18n/phone-locale.js";
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
  buildToolCardLabel,
  buildToolCountBadgeLabel,
  buildToolSettingsIconPath,
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

const TOOL_ICON_STYLE = {
  width: "54px",
  minWidth: "54px",
  height: "54px",
  borderRadius: "20px",
  backgroundColor: "#EAF1F7",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "32px 32px",
  padding: "0"
};

const TOOL_ICON_TONES = {
  tool_aeropress: {
    backgroundColor: "#DFF4EE"
  },
  tool_v60: {
    backgroundColor: "#E2E9FF"
  },
  tool_kalita_wave: {
    backgroundColor: "#DFF7EF"
  },
  tool_chemex: {
    backgroundColor: "#E5E9FF"
  },
  tool_clever_dripper: {
    backgroundColor: "#EAF4DE"
  },
  tool_french_press: {
    backgroundColor: "#F8E7DC"
  }
};

const TOOL_COUNT_BADGE_STYLE = {
  minWidth: "34px",
  fontSize: "12px",
  fontWeight: "700",
  lineHeight: "34px",
  borderRadius: "17px",
  background: "#DCE6EF",
  color: "#21303D",
  textAlign: "center",
  padding: "0 10px"
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

const COLOR_OPTIONS = RECIPE_COLOR_TOKENS.map((colorToken) => ({
  name: colorToken,
  value: colorToken
}));

const NOOP = () => {};

function resolveSettingsTranslator(pageInstance = null) {
  if (pageInstance && pageInstance.i18n && typeof pageInstance.i18n.t === "function") {
    return pageInstance.i18n;
  }

  return createPhoneTranslator(resolvePhoneLocale(DEFAULT_LOCALE));
}

function buildToolOptions(i18n) {
  return TOOL_CATALOG.map((tool) => ({
    name: getLocalizedToolLabel(tool, i18n),
    value: tool.toolId
  }));
}

function buildStepKindOptions(i18n) {
  return RECIPE_STEP_KINDS.map((stepKind) => ({
    name: i18n.getStepKindLabel(stepKind),
    value: stepKind
  }));
}

function buildFeedbackOptions(i18n) {
  return FEEDBACK_CUES.map((feedbackCue) => ({
    name: i18n.t(`settings.options.feedbackCue.${feedbackCue}`, {}, feedbackCue),
    value: feedbackCue
  }));
}

function buildBooleanOptions(i18n) {
  return [
    { name: i18n.t("common.bool.true"), value: "true" },
    { name: i18n.t("common.bool.false"), value: "false" }
  ];
}

function buildRatingOptions(i18n) {
  return [
    { name: i18n.t("common.rating.none"), value: "" },
    { name: "1", value: "1" },
    { name: "2", value: "2" },
    { name: "3", value: "3" },
    { name: "4", value: "4" },
    { name: "5", value: "5" }
  ];
}

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

function createFreshDraft(toolId, i18n) {
  return createDraftFromRecipe(
    createUserRecipeRecord({
      toolId,
      locale: i18n ? i18n.locale : DEFAULT_LOCALE,
      steps: createDefaultRecipeSteps({
        locale: i18n ? i18n.locale : DEFAULT_LOCALE
      })
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

function formatDateLabel(timestamp, i18n) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return i18n.t("common.unknownDate");
  }

  return new Date(timestamp).toLocaleDateString(i18n.locale, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getToolMeta(toolId) {
  return TOOL_CATALOG.find((tool) => tool.toolId === toolId) || null;
}

function createToolIconStyle(tool) {
  return {
    ...TOOL_ICON_STYLE,
    ...(TOOL_ICON_TONES[tool.toolId] || {}),
    backgroundImage: `url(${buildToolSettingsIconPath(tool)})`
  };
}

function createToolBrowseCard(tool, recipeCount, onClick, i18n) {
  return View({ style: TOOL_ROW_STYLE }, [
    View(
      {
        style: createToolIconStyle(tool)
      },
      []
    ),
    Button({
      label: buildToolCardLabel(tool, recipeCount, i18n),
      style: LIST_CARD_BUTTON_STYLE,
      onClick
    }),
    Button({
      label: buildToolCountBadgeLabel(recipeCount),
      style: TOOL_COUNT_BADGE_STYLE,
      onClick
    })
  ]);
}

function buildRecipeCardLabel(recipeSummary, recipeRecord, i18n) {
  const metrics = recipeRecord
    ? `${recipeRecord.coffeeDoseG}g - ${recipeRecord.totalWaterMl}ml - ${formatDurationLabel(
        recipeRecord.estimatedTotalDurationMs
      )}`
    : i18n.t("common.unknownMetrics");
  const sourceLabel = i18n.t(`settings.library.recipeSource.${recipeSummary.source}`, {}, recipeSummary.source);

  return `${recipeSummary.name}\n${metrics}\n${sourceLabel} - ${i18n.t("settings.library.updatedAt", {
    dateLabel: formatDateLabel(recipeSummary.updatedAt, i18n)
  })}`;
}

function buildDraftOverview(draftRecipe, i18n) {
  return `${draftRecipe.name || i18n.t("settings.editor.untitledRecipe")}\n${
    getLocalizedToolLabel(getToolMeta(draftRecipe.toolId), i18n) || i18n.t("settings.editor.noBrewer")
  } - ${i18n.t("settings.editor.guidedStepsSubtitle", { stepCount: draftRecipe.steps.length })} - ${formatDurationLabel(
    draftRecipe.estimatedTotalDurationMs
  )}`;
}

function buildRecipeStatCards(draftRecipe, i18n) {
  return [
    i18n.t("settings.stats.dose", { value: draftRecipe.coffeeDoseG || "-" }),
    i18n.t("settings.stats.water", { value: draftRecipe.totalWaterMl || "-" }),
    i18n.t("settings.stats.temp", { value: draftRecipe.waterTempC || "-" }),
    i18n.t("settings.stats.time", { value: formatDurationLabel(draftRecipe.estimatedTotalDurationMs) }),
    i18n.t("settings.stats.steps", { value: draftRecipe.steps.length }),
    i18n.t("settings.stats.color", { value: draftRecipe.colorToken || "-" })
  ];
}

function humanizeStepKind(stepKind, i18n) {
  return i18n.getStepKindLabel(stepKind || "instruction");
}

function buildStepSummaryLabel(step, index, totalSteps, i18n) {
  const detailParts = [humanizeStepKind(step.kind, i18n)];

  if (step.durationMs) {
    detailParts.push(formatDurationLabel(step.durationMs));
  }

  if (step.waterMl) {
    detailParts.push(`${step.waterMl}ml`);
  }

  if (step.requiresConfirm === "true" || step.requiresConfirm === true) {
    detailParts.push(i18n.t("schema.fallbackSteps.confirm"));
  }

  return i18n.t("settings.editor.stepSummary", {
    index: index + 1,
    total: totalSteps,
    title: step.title || step.kind,
    detail: detailParts.join(" - ")
  });
}

function chunkItems(items, size) {
  const rows = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
}

function buildHistoryCardLabel(historyEntry, i18n) {
  const ratingLabel = historyEntry.userRating
    ? ` - ${i18n.t("settings.history.rated", { rating: historyEntry.userRating })}`
    : "";
  return `${historyEntry.recipeSnapshot.name}\n${i18n.getHistoryStatus(historyEntry.status)} - ${formatDurationLabel(
    historyEntry.elapsedMs
  )} - ${formatDateLabel(historyEntry.endedAt, i18n)}${ratingLabel}`;
}

function buildShellHeader(viewName, snapshot, selectedToolId, i18n) {
  const selectedTool = getToolMeta(selectedToolId);
  const selectedRecipeCount = selectedTool
    ? (((snapshot && snapshot.recipesByTool) || {})[selectedTool.toolId] || []).length
    : 0;

  switch (viewName) {
    case "recipe-list":
      return {
        title: selectedTool
          ? i18n.t("settings.shell.recipeListTitle", {
            toolLabel: getLocalizedToolLabel(selectedTool, i18n)
          })
          : i18n.t("watch.recipeList.titleFallback"),
        subtitle: selectedTool
          ? buildRecipeShelfCountLabel(selectedRecipeCount, i18n)
          : i18n.t("settings.library.recipeListSubtitle")
      };
    case "recipe-editor":
      return {
        title: i18n.t("settings.editor.recipeEditorTitle"),
        subtitle: i18n.t("settings.editor.recipeEditorSubtitle")
      };
    case "history-list":
      return {
        title: i18n.t("settings.shell.historyTitle"),
        subtitle: buildHistoryOverview(snapshot, i18n)
      };
    case "history-detail":
      return {
        title: i18n.t("settings.shell.historyDetailTitle"),
        subtitle: i18n.t("settings.shell.historyDetailSubtitle")
      };
    case "about-sync":
      return {
        title: i18n.t("settings.shell.syncTitle"),
        subtitle: i18n.t("settings.shell.syncSubtitle")
      };
    default:
      return {
        title: i18n.t("settings.shell.homeTitle"),
        subtitle: buildLibraryOverview(snapshot, i18n)
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
    this.i18n = createPhoneTranslator(resolvePhoneLocale());
    ensurePhoneStorage(props.settingsStorage, {
      preferredLocale: this.i18n.locale
    });
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
      : createFreshDraft(selectedToolId, resolveSettingsTranslator(this));

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
    const i18n = resolveSettingsTranslator(this);
    const nextSteps = [...(this.state.ui.draftRecipe.steps || [])];
    const insertIndex = Math.max(0, nextSteps.length - 1);

    nextSteps.splice(insertIndex, 0, {
      stepId: "",
      order: insertIndex,
      kind: "instruction",
      title: `${i18n.t("schema.fallbackSteps.step")} ${insertIndex + 1}`,
      body: i18n.t("schema.fallbackSteps.continueBody"),
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
    const i18n = resolveSettingsTranslator(this);
    const currentSteps = [...(this.state.ui.draftRecipe.steps || [])];

    if (currentSteps.length <= 1) {
      this.persistUiState(props, {
        draftRecipe: {
          ...this.state.ui.draftRecipe,
          steps: createFreshDraft(this.state.ui.selectedToolId, i18n).steps
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
    const i18n = resolveSettingsTranslator(this);
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
      flashMessage: i18n.t("settings.messages.recipeSaved", {
        name: result.recipeRecord.name
      }),
      errorMessage: ""
    });
  },
  duplicateRecipe(props, recipeId) {
    const i18n = resolveSettingsTranslator(this);
    const result = duplicateRecipeRecord(props.settingsStorage, recipeId);

    if (!result.ok) {
      this.persistUiState(props, {
        errorMessage: result.issues.join(" ")
      });
      return;
    }

    this.openRecipeList(props, result.recipeRecord.toolId);
    this.persistUiState(props, {
      flashMessage: i18n.t("settings.messages.recipeDuplicated", {
        name: result.recipeRecord.name
      })
    });
  },
  deleteRecipe(props, recipeId) {
    const i18n = resolveSettingsTranslator(this);
    const deleted = deleteRecipeRecord(props.settingsStorage, recipeId);

    this.persistUiState(props, {
      flashMessage: deleted ? i18n.t("settings.messages.recipeDeleted") : "",
      errorMessage: deleted ? "" : i18n.t("settings.messages.recipeRecordNotFound")
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
    const i18n = resolveSettingsTranslator(this);
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
      flashMessage: i18n.t("settings.messages.historyNoteSaved"),
      errorMessage: ""
    });
  },
  renderNav(props) {
    const activeNavKey = getActiveNavKey(this.state.ui.view);
    const i18n = resolveSettingsTranslator(this);

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
          label: i18n.t("settings.nav.library"),
          style: createNavButtonStyle(activeNavKey === "library"),
          onClick: () => {
            this.openLibraryHome(props);
          }
        }),
        Button({
          label: i18n.t("settings.nav.history"),
          style: createNavButtonStyle(activeNavKey === "history"),
          onClick: () => {
            this.openHistoryList(props);
          }
        }),
        Button({
          label: i18n.t("settings.nav.sync"),
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
    const i18n = resolveSettingsTranslator(this);
    const recipesByTool = this.state.snapshot ? this.state.snapshot.recipesByTool : {};

    return View({ style: TOOL_LIST_STYLE }, TOOL_CATALOG.map((tool) =>
      createToolBrowseCard(
        tool,
        (recipesByTool[tool.toolId] || []).length,
        () => {
          this.openRecipeList(props, tool.toolId);
        },
        i18n
      )
    ));
  },
  renderRecipeCards(props) {
    const i18n = resolveSettingsTranslator(this);
    const recipes = this.state.snapshot.recipesByTool[this.state.ui.selectedToolId] || [];

    if (!recipes.length) {
      return [
        createStaticCard(
          i18n.t("settings.messages.noRecipesYet"),
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
            label: buildRecipeCardLabel(recipeSummary, recipeRecord, i18n),
            style: CARD_BUTTON_STYLE,
            onClick: () => {
              this.openRecipeEditor(props, recipeSummary.recipeId);
            }
          }),
          createButtonRow([
            Button({
              label: i18n.t("settings.library.duplicate"),
              style: SOFT_ACTION_BUTTON_STYLE,
              onClick: () => {
                this.duplicateRecipe(props, recipeSummary.recipeId);
              }
            }),
            Button({
              label: i18n.t("settings.library.delete"),
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
    const i18n = resolveSettingsTranslator(this);
    const selectedTool =
      TOOL_CATALOG.find((tool) => tool.toolId === this.state.ui.selectedToolId) || TOOL_CATALOG[0];
    const recipeCount = ((this.state.snapshot.recipesByTool || {})[selectedTool.toolId] || []).length;
    const toolLabel = getLocalizedToolLabel(selectedTool, i18n);

    return View({ style: CARD_STACK_STYLE }, [
      createButtonRow([
        Button({
          label: i18n.t("settings.library.newRecipe"),
          style: PRIMARY_BUTTON_STYLE,
          onClick: () => {
            this.openRecipeEditor(props, null);
          }
        }),
        Button({
          label: i18n.t("settings.library.brewers"),
          style: SOFT_ACTION_BUTTON_STYLE,
          onClick: () => {
            this.openLibraryHome(props);
          }
        })
      ]),
      createPanel(
        "sand",
        recipeCount ? i18n.t("settings.library.recipesTitle") : i18n.t("settings.library.emptyShelfTitle"),
        recipeCount
          ? i18n.t("settings.library.recipeListSubtitle")
          : i18n.t("settings.library.recipeListEmptySubtitle", { toolLabel }),
        this.renderRecipeCards(props)
      )
    ]);
  },
  renderStepEditor(props, step, index, totalSteps) {
    const i18n = resolveSettingsTranslator(this);

    return createPanel(
      "white",
      i18n.t("settings.editor.stepOf", { current: index + 1, total: totalSteps }),
      buildStepSummaryLabel(step, index, totalSteps, i18n).split("\n")[1] || i18n.t("settings.editor.stepEditorSubtitle"),
      [
        createStaticCard(
          `${humanizeStepKind(step.kind, i18n)}\n${step.title || i18n.t("settings.editor.untitledStep")}`,
          {
            ...CARD_BUTTON_STYLE,
            background: "#F4F8FB",
            color: "#183546"
          }
        ),
        Select({
          label: i18n.t("settings.labels.kind"),
          options: buildStepKindOptions(i18n),
          value: step.kind,
          onChange: (value) => {
            this.updateDraftStepField(props, index, "kind", value);
          }
        }),
        TextInput({
          label: i18n.t("settings.labels.title"),
          value: step.title || "",
          onChange: (value) => {
            this.updateDraftStepField(props, index, "title", value);
          }
        }),
        TextInput({
          label: i18n.t("settings.labels.body"),
          value: step.body || "",
          onChange: (value) => {
            this.updateDraftStepField(props, index, "body", value);
          }
        }),
        TextInput({
          label: i18n.t("settings.labels.durationMs"),
          value: step.durationMs || "",
          onChange: (value) => {
            this.updateDraftStepField(props, index, "durationMs", value);
          }
        }),
        TextInput({
          label: i18n.t("settings.labels.waterMl"),
          value: step.waterMl || "",
          onChange: (value) => {
            this.updateDraftStepField(props, index, "waterMl", value);
          }
        }),
        TextInput({
          label: i18n.t("settings.labels.targetTotalMl"),
          value: step.targetTotalWaterMl || "",
          onChange: (value) => {
            this.updateDraftStepField(props, index, "targetTotalWaterMl", value);
          }
        }),
        Select({
          label: i18n.t("settings.labels.requiresConfirm"),
          options: buildBooleanOptions(i18n),
          value: step.requiresConfirm,
          onChange: (value) => {
            this.updateDraftStepField(props, index, "requiresConfirm", value);
          }
        }),
        Select({
          label: i18n.t("settings.labels.feedbackCue"),
          options: buildFeedbackOptions(i18n),
          value: step.feedbackCue,
          onChange: (value) => {
            this.updateDraftStepField(props, index, "feedbackCue", value);
          }
        }),
        createButtonRow([
          Button({
            label: i18n.t("settings.editor.up"),
            style: SOFT_ACTION_BUTTON_STYLE,
            onClick: () => {
              this.moveDraftStep(props, index, -1);
            }
          }),
          Button({
            label: i18n.t("settings.editor.down"),
            style: SOFT_ACTION_BUTTON_STYLE,
            onClick: () => {
              this.moveDraftStep(props, index, 1);
            }
          }),
          Button({
            label: totalSteps > 1 ? i18n.t("settings.editor.delete") : i18n.t("settings.editor.reset"),
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
    const i18n = resolveSettingsTranslator(this);
    const draftRecipe = this.state.ui.draftRecipe;

    if (!draftRecipe) {
      return Section({}, [
        createStaticCard(i18n.t("settings.messages.recipeDraftMissing"), ERROR_CARD_STYLE)
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
        draftRecipe.name || i18n.t("settings.editor.untitledRecipe"),
        draftRecipe.recipeId ? i18n.t("settings.editor.editingExisting") : i18n.t("settings.editor.creatingNew"),
        [
          createStaticCard(buildDraftOverview(draftRecipe, i18n), {
            ...SUCCESS_CARD_STYLE,
            background: "#314352",
            color: "#D7F3EA"
          }),
          createWrapRow(
            buildRecipeStatCards(draftRecipe, i18n).map((label) =>
              createStaticCard(label, MINI_STAT_STYLE)
            )
          )
        ]
      ),
      createPanel(
        "mint",
        i18n.t("settings.editor.recipeBasicsTitle"),
        i18n.t("settings.editor.recipeBasicsSubtitle"),
        [
          TextInput({
            label: i18n.t("settings.labels.name"),
            value: draftRecipe.name || "",
            onChange: (value) => {
              this.updateDraftField(props, "name", value);
            }
          }),
          Select({
            label: i18n.t("settings.labels.tool"),
            options: buildToolOptions(i18n),
            value: draftRecipe.toolId,
            onChange: (value) => {
              this.updateDraftField(props, "toolId", value);
            }
          }),
          Select({
            label: i18n.t("settings.labels.color"),
            options: COLOR_OPTIONS,
            value: draftRecipe.colorToken,
            onChange: (value) => {
              this.updateDraftField(props, "colorToken", value);
            }
          }),
          TextInput({
            label: i18n.t("settings.labels.description"),
            value: draftRecipe.description || "",
            onChange: (value) => {
              this.updateDraftField(props, "description", value);
            }
          })
        ]
      ),
      createPanel(
        "sky",
        i18n.t("settings.editor.brewProfileTitle"),
        i18n.t("settings.editor.brewProfileSubtitle"),
        [
          TextInput({
            label: i18n.t("settings.labels.doseG"),
            value: draftRecipe.coffeeDoseG || "",
            onChange: (value) => {
              this.updateDraftField(props, "coffeeDoseG", value);
            }
          }),
          TextInput({
            label: i18n.t("settings.labels.waterMl"),
            value: draftRecipe.totalWaterMl || "",
            onChange: (value) => {
              this.updateDraftField(props, "totalWaterMl", value);
            }
          }),
          TextInput({
            label: i18n.t("settings.labels.tempC"),
            value: draftRecipe.waterTempC || "",
            onChange: (value) => {
              this.updateDraftField(props, "waterTempC", value);
            }
          }),
          TextInput({
            label: i18n.t("settings.labels.filter"),
            value: draftRecipe.filterLabel || "",
            onChange: (value) => {
              this.updateDraftField(props, "filterLabel", value);
            }
          }),
          TextInput({
            label: i18n.t("settings.labels.grind"),
            value: draftRecipe.grindLabel || "",
            onChange: (value) => {
              this.updateDraftField(props, "grindLabel", value);
            }
          }),
          TextInput({
            label: i18n.t("settings.labels.estimatedMs"),
            value: draftRecipe.estimatedTotalDurationMs || "",
            onChange: (value) => {
              this.updateDraftField(props, "estimatedTotalDurationMs", value);
            }
          })
        ]
      ),
      createPanel(
        "sand",
        i18n.t("settings.editor.guidedStepsTitle"),
        i18n.t("settings.editor.guidedStepsSubtitle", { stepCount: draftRecipe.steps.length }),
        [
          createButtonRow([
            Button({
              label: i18n.t("settings.editor.previous"),
              style: currentStepIndex > 0 ? SOFT_ACTION_BUTTON_STYLE : INFO_BUTTON_STYLE,
              onClick: () => {
                this.setStepPage(props, currentStepIndex - 1);
              }
            }),
            Button({
              label: i18n.t("settings.editor.stepLabel", {
                index: currentStepIndex + 1,
                total: draftRecipe.steps.length
              }),
              style: STEPPER_PAGER_STYLE,
              onClick: NOOP
            }),
            Button({
              label: i18n.t("settings.editor.next"),
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
            label: buildStepSummaryLabel(currentStep, currentStepIndex, draftRecipe.steps.length, i18n),
            style: STEP_BADGE_STYLE,
            onClick: NOOP
          }),
          ...stepJumpButtons.map((buttonRow) => createWrapRow(buttonRow)),
          Button({
            label: i18n.t("settings.editor.addStep"),
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
        i18n.t("settings.editor.notesAndSaveTitle"),
        i18n.t("settings.editor.notesAndSaveSubtitle"),
        [
          TextInput({
            label: i18n.t("settings.labels.notes"),
            value: draftRecipe.notes || "",
            onChange: (value) => {
              this.updateDraftField(props, "notes", value);
            }
          }),
          createButtonRow([
            Button({
              label: i18n.t("settings.editor.saveRecipe"),
              style: PRIMARY_BUTTON_STYLE,
              onClick: () => {
                this.saveDraftRecipe(props);
              }
            }),
            Button({
              label: i18n.t("settings.editor.cancel"),
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
    const i18n = resolveSettingsTranslator(this);
    const historyIndex = this.state.snapshot ? this.state.snapshot.historyIndex : [];

    if (!historyIndex.length) {
      return Section({}, [
        createStaticCard(
          i18n.t("settings.messages.noHistoryYet"),
          CARD_BUTTON_STYLE
        )
      ]);
    }

    return View({ style: CARD_STACK_STYLE }, [
      createPanel(
        "white",
        i18n.t("settings.history.recentBrews"),
        i18n.t("settings.history.recentBrewsSubtitle"),
        historyIndex.map((historyIndexEntry) => {
          const historyEntry = readHistoryEntry(props.settingsStorage, historyIndexEntry.historyId);

          return Button({
            label: historyEntry
              ? buildHistoryCardLabel(historyEntry, i18n)
              : `${historyIndexEntry.recipeName}\n${i18n.getHistoryStatus(historyIndexEntry.status)} - ${formatDurationLabel(
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
    const i18n = resolveSettingsTranslator(this);
    const historyEntry = readHistoryEntry(props.settingsStorage, this.state.ui.selectedHistoryId);

    if (!historyEntry) {
      return Section({}, [
        createStaticCard(i18n.t("settings.messages.historyEntryNotFound"), ERROR_CARD_STYLE)
      ]);
    }

    const historyDraft = this.state.ui.historyDraft || createHistoryDraft(historyEntry);
    const snapshotTool = getToolMeta(historyEntry.recipeSnapshot.toolId);
    const stepSummaries = (historyEntry.stepRunResults || []).map((stepRunResult) =>
      createStaticCard(
        `${stepRunResult.order + 1}. ${stepRunResult.title || i18n.t("settings.editor.untitledStep")}\n${humanizeStepKind(stepRunResult.kind, i18n)} - ${formatDurationLabel(
          stepRunResult.actualDurationMs || 0
        )}`,
        CARD_BUTTON_STYLE
      )
    );

    return View({ style: CARD_STACK_STYLE }, [
      createPanel("slate", i18n.t("settings.history.detailTitle"), i18n.t("settings.history.detailSubtitle"), [
        createStaticCard(buildHistoryCardLabel(historyEntry, i18n), {
          ...SUCCESS_CARD_STYLE,
          background: "#314352",
          color: "#D7F3EA"
        }),
        createStaticCard(
          `${snapshotTool ? getLocalizedToolLabel(snapshotTool, i18n) : historyEntry.recipeSnapshot.toolId}\n${i18n.t("settings.history.filter", {
            filterLabel: historyEntry.recipeSnapshot.filterLabel || i18n.t("settings.misc.notSpecified")
          })}\n${(historyEntry.deviationSummary.totalDeltaMs || 0) >= 0
            ? i18n.t("settings.history.deltaOver", {
              duration: formatDurationLabel(Math.abs(historyEntry.deviationSummary.totalDeltaMs || 0))
            })
            : i18n.t("settings.history.deltaUnder", {
              duration: formatDurationLabel(Math.abs(historyEntry.deviationSummary.totalDeltaMs || 0))
            })}`,
          CARD_BUTTON_STYLE
        )
      ]),
      createPanel(
        "sky",
        i18n.t("settings.history.stepTimingTitle"),
        i18n.t("settings.history.stepTimingSubtitle"),
        (
          stepSummaries.length
            ? stepSummaries
            : [createStaticCard(i18n.t("settings.history.noStepResults"), CARD_BUTTON_STYLE)]
        )
      ),
      createPanel(
        "mint",
        i18n.t("settings.history.feedbackTitle"),
        i18n.t("settings.history.feedbackSubtitle"),
        [
          Select({
            label: i18n.t("settings.labels.rating"),
            options: buildRatingOptions(i18n),
            value: historyDraft.userRating || "",
            onChange: (value) => {
              this.updateHistoryDraftField(props, "userRating", value);
            }
          }),
          TextInput({
            label: i18n.t("settings.labels.note"),
            value: historyDraft.userNote || "",
            onChange: (value) => {
              this.updateHistoryDraftField(props, "userNote", value);
            }
          }),
          createButtonRow([
            Button({
              label: i18n.t("settings.history.saveNotes"),
              style: PRIMARY_BUTTON_STYLE,
              onClick: () => {
                this.saveHistoryDraft(props);
              }
            }),
            Button({
              label: i18n.t("settings.history.backToHistory"),
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
    const i18n = resolveSettingsTranslator(this);
    const syncMeta = this.state.syncMeta || {};

    return View({ style: CARD_STACK_STYLE }, [
      createPanel("white", i18n.t("settings.sync.overviewTitle"), i18n.t("settings.sync.overviewSubtitle"), [
        createStaticCard(
          buildSyncOverview(syncMeta, i18n),
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
    const i18n = resolveSettingsTranslator(this);
    const shellHeader = buildShellHeader(
      this.state.ui.view,
      this.state.snapshot,
      this.state.ui.selectedToolId,
      i18n
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
