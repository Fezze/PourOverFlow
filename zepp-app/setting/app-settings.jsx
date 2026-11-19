import { TOOL_CATALOG, getLocalizedToolLabel } from "../shared/constants/tool-catalog";
import { formatDurationLabel } from "../shared/engine/recipe-engine.js";
import { DEFAULT_LOCALE } from "../shared/i18n/index.js";
import { createPhoneTranslator, resolvePhoneLocale } from "../shared/i18n/phone-locale.js";
import {
  FEEDBACK_CUES,
  RECIPE_COLOR_TOKENS,
  RECIPE_STEP_KINDS,
  createDefaultRecipeSteps,
  createLastResultSummary,
  repairLegacyRecipeSteps
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
  buildSyncRevisionRows,
  buildToolCardLabel,
  buildToolCountBadgeLabel,
  buildToolSettingsIconPath
} from "./view-model";
import {
  ACTION,
  BODY,
  COLORS,
  DANGER_ACTION,
  FIELD_LABEL,
  PANEL,
  PRIMARY_ACTION,
  PRIMARY_VALUE,
  ROOT_VIEW,
  ROW,
  STACK,
  TITLE
} from "./appearance.js";

const NAV_STYLE = {
  ...ROW,
  gap: "4px",
  padding: "4px",
  borderRadius: "999px",
  backgroundColor: COLORS.surface
};

const HEADER_STYLE = {
  ...STACK,
  gap: "5px",
  padding: "8px 2px 16px",
  borderBottom: `1px solid ${COLORS.surfaceMuted}`
};

const HEADER_TITLE = { ...TITLE, fontSize: "30px", lineHeight: "36px" };

const CARD_STYLE = {
  ...PANEL,
  gap: "0",
  padding: "0"
};

const RECORD_ROW = {
  ...ROW,
  padding: "14px 16px",
  borderRadius: "20px"
};

const TOOL_ICON = {
  width: "44px",
  height: "44px",
  flex: "0 0 44px",
  borderRadius: "14px",
  backgroundColor: COLORS.surfaceMuted,
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "33px 33px"
};

const COUNT_BADGE = {
  ...PRIMARY_VALUE,
  flexShrink: "0",
  minWidth: "34px",
  padding: "5px 8px",
  borderRadius: "999px",
  backgroundColor: COLORS.surfaceMuted
};

const DIVIDED_ROW = {
  ...ROW,
  borderTop: `1px solid ${COLORS.surfaceMuted}`,
  paddingTop: "12px",
  justifyContent: "space-between"
};

const COLOR_OPTIONS = RECIPE_COLOR_TOKENS.map((colorToken) => ({
  name: colorToken,
  value: colorToken
}));

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
    { name: i18n.t("settings.options.yes"), value: "true" },
    { name: i18n.t("settings.options.no"), value: "false" }
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
    steps: repairLegacyRecipeSteps(recipeRecord.steps || []).map((step) => ({
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
  const draft = createDraftFromRecipe(
    createUserRecipeRecord({
      toolId,
      locale: i18n ? i18n.locale : DEFAULT_LOCALE,
      steps: createDefaultRecipeSteps({
        locale: i18n ? i18n.locale : DEFAULT_LOCALE
      })
    })
  );
  draft.estimatedTotalDurationMs = "";
  return draft;
}

function createHistoryDraft(historyEntry) {
  return {
    userNote: historyEntry && historyEntry.userNote ? historyEntry.userNote : "",
    userRating:
      historyEntry && historyEntry.userRating !== undefined ? String(historyEntry.userRating) : ""
  };
}

function createButtonRow(buttons, style = {}) {
  return View({ style: { ...ROW, flexWrap: "wrap", ...style } }, buttons);
}

function createText(label, style = BODY, align = "left") {
  return Text({ style, align }, [label]);
}

function createPanel(title, content) {
  return View({ style: PANEL }, [
    title && createText(title, TITLE),
    ...content
  ].filter(Boolean));
}

function createMessage(message, color = COLORS.muted) {
  return View({ style: PANEL }, [createText(message, { ...BODY, color })]);
}

function createNavButtonStyle(isActive) {
  return {
    ...(isActive ? PRIMARY_ACTION : ACTION),
    flex: "1 1 0",
    minWidth: "0",
    padding: "10px 4px",
    backgroundColor: isActive ? COLORS.primary : COLORS.surface
  };
}

function createFieldRow(fields) {
  return createButtonRow(fields.map((field) =>
    View({ style: { flex: "1 1 120px", minWidth: "0" } }, [field])
  ), { alignItems: "flex-start" });
}

function createTextField(props) {
  return View({
    style: {
      backgroundColor: COLORS.surfaceMuted,
      borderRadius: "12px",
      minHeight: "44px",
      padding: "8px 12px"
    }
  }, [TextInput({
    labelStyle: FIELD_LABEL,
    subStyle: {
      ...BODY,
      color: COLORS.text,
      wordBreak: "normal",
      maxHeight: "110px",
      overflow: "hidden"
    },
    ...props
  })]);
}

function createSelectField({ label, currentLabel, options, value, onChange }) {
  return View({
    style: {
      ...ROW,
      position: "relative",
      boxSizing: "border-box",
      backgroundColor: COLORS.surfaceMuted,
      borderRadius: "12px",
      minHeight: "62px",
      padding: "8px 14px"
    }
  }, [
    View({ style: { ...STACK, gap: "2px", flex: "1" } }, [
      createText(label, { ...BODY, fontSize: "14px" }),
      createText(currentLabel, { ...FIELD_LABEL, fontSize: "16px" })
    ]),
    View({
      style: {
        width: "8px",
        height: "8px",
        flexShrink: "0",
        margin: "0 4px 5px 6px",
        borderRight: `2px solid ${COLORS.primary}`,
        borderBottom: `2px solid ${COLORS.primary}`,
        transform: "rotate(45deg)"
      }
    }, []),
    // Android ignores Select substyles. Keep the host's menu and put its touch
    // surface over the row. Zoom expands the host's capped, short trigger.
    View({
      style: {
        position: "absolute",
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingBottom: "20px",
        overflow: "hidden",
        opacity: "0",
        zoom: "1.5"
      }
    }, [Select({ label, options, value, onChange })])
  ]);
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

function formatDeltaDuration(durationMs) {
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

function createToolBrowseCard(tool, recipeCount, onClick, i18n) {
  return View({ style: { ...RECORD_ROW, backgroundColor: COLORS.surface }, onClick }, [
    View({
      style: { ...TOOL_ICON, backgroundImage: `url(${buildToolSettingsIconPath(tool)})` }
    }, []),
    createText(buildToolCardLabel(tool, recipeCount, i18n), { ...TITLE, flex: "1 1 0", minWidth: "0" }),
    createText(buildToolCountBadgeLabel(recipeCount), COUNT_BADGE, "center"),
    createText("›", { ...BODY, fontSize: "22px" })
  ]);
}

function createRecordRow(title, details, onClick) {
  return View({ style: RECORD_ROW, onClick }, [
    View({ style: { ...STACK, gap: "4px", flex: "1 1 0" } }, [
      createText(title, TITLE),
      ...details
    ]),
    createText("›", { ...BODY, fontSize: "24px", flexShrink: "0" })
  ]);
}

function formatBrewMetrics(recipe) {
  const { coffeeDoseG, totalWaterMl } = recipe;
  const durationMs = Number(recipe.estimatedTotalDurationMs);
  return [
    coffeeDoseG && `${coffeeDoseG} g`,
    totalWaterMl && `${totalWaterMl} ml`,
    durationMs > 0 && formatDurationLabel(durationMs)
  ].filter(Boolean).join(" · ");
}

function buildRecipeDetails(recipeSummary, recipeRecord, i18n) {
  const metrics = recipeRecord ? formatBrewMetrics(recipeRecord) : "";
  const source = i18n.t(`settings.library.recipeSource.${recipeSummary.source}`, {}, recipeSummary.source);
  const updated = i18n.t("settings.library.updatedAt", { dateLabel: formatDateLabel(recipeSummary.updatedAt, i18n) });

  return [
    createText(metrics || i18n.t("common.unknownMetrics"), PRIMARY_VALUE),
    createText(`${source} · ${updated}`)
  ];
}

function humanizeStepKind(stepKind, i18n) {
  return i18n.getStepKindLabel(stepKind || "instruction");
}

function buildHistoryDetails(entry, i18n) {
  return [
    i18n.getHistoryStatus(entry.status),
    formatDateLabel(entry.endedAt, i18n),
    entry.userRating ? i18n.t("settings.history.rated", { rating: entry.userRating }) : null
  ].filter(Boolean).join(" · ");
}

function buildShellHeader(ui, snapshot, i18n) {
  const { view: viewName, selectedToolId, draftRecipe } = ui;
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
        subtitle: buildRecipeShelfCountLabel(selectedRecipeCount, i18n)
      };
    case "recipe-editor":
      return {
        title: draftRecipe?.name || i18n.t(draftRecipe?.recipeId
          ? "settings.editor.untitledRecipe"
          : "settings.library.newRecipe"),
        subtitle: draftRecipe ? [
          getLocalizedToolLabel(getToolMeta(draftRecipe.toolId), i18n),
          formatBrewMetrics(draftRecipe)
        ].filter(Boolean).join(" · ") : ""
      };
    case "history-list":
      return {
        title: i18n.t("settings.shell.historyTitle"),
        subtitle: buildHistoryOverview(snapshot, i18n)
      };
    case "history-detail":
      return {
        title: i18n.t("settings.shell.historyDetailTitle")
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
    ui: null,
    selectValues: {}
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
    this.state.selectValues = {};
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
  addDraftStep(props, insertIndex) {
    const i18n = resolveSettingsTranslator(this);
    const nextSteps = [...this.state.ui.draftRecipe.steps];

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
    if (currentSteps.length === 1) delete this.state.selectValues.stepPage;
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
      { style: NAV_STYLE },
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
    const { flashMessage, errorMessage } = this.state.ui;
    const messages = [
      flashMessage && createMessage(flashMessage, COLORS.success),
      errorMessage && createMessage(errorMessage, DANGER_ACTION.color)
    ].filter(Boolean);

    return messages.length ? View({ style: STACK }, messages) : null;
  },
  renderLibraryHome(props) {
    const i18n = resolveSettingsTranslator(this);
    const recipesByTool = this.state.snapshot?.recipesByTool || {};

    return View({ style: STACK }, TOOL_CATALOG.map((tool) =>
      createToolBrowseCard(
        tool,
        (recipesByTool[tool.toolId] || []).length,
        () => this.openRecipeList(props, tool.toolId),
        i18n
      )
    ));
  },
  renderRecipeCards(props) {
    const i18n = resolveSettingsTranslator(this);
    const recipes = this.state.snapshot.recipesByTool[this.state.ui.selectedToolId] || [];

    if (!recipes.length) {
      return [createMessage(i18n.t("settings.messages.noRecipesYet"))];
    }

    return recipes.map((recipeSummary) => {
      const { recipeId, name } = recipeSummary;
      const recipeRecord = readRecipeRecord(props.settingsStorage, recipeId);

      return View({ style: CARD_STYLE }, [
        createRecordRow(
          name,
          buildRecipeDetails(recipeSummary, recipeRecord, i18n),
          () => this.openRecipeEditor(props, recipeId)
        ),
        createButtonRow([
          Button({
            label: i18n.t("settings.library.duplicate"),
            style: ACTION,
            onClick: () => this.duplicateRecipe(props, recipeId)
          }),
          Button({
            label: i18n.t("settings.library.delete"),
            style: DANGER_ACTION,
            onClick: () => this.deleteRecipe(props, recipeId)
          })
        ], { padding: "0 16px 14px" })
      ]);
    });
  },
  renderRecipeList(props) {
    const i18n = resolveSettingsTranslator(this);

    return View({ style: STACK }, [
      createButtonRow([
        Button({
          label: i18n.t("settings.library.brewers"),
          style: ACTION,
          onClick: () => this.openLibraryHome(props)
        }),
        Button({
          label: i18n.t("settings.library.newRecipe"),
          style: PRIMARY_ACTION,
          onClick: () => this.openRecipeEditor(props, null)
        })
      ], { justifyContent: "space-between" }),
      ...this.renderRecipeCards(props)
    ]);
  },
  renderSelectField({ field, label, options, value, onChange }) {
    // An unbound Zepp Select retains its last emitted value. Keep that value
    // associated with the current option, even when another control changes it.
    const currentToken = this.state.selectValues[field] || "";
    const firstPrefix = `${field}:a:`;
    const prefix = currentToken.startsWith(firstPrefix) ? `${field}:b:` : firstPrefix;
    const currentOption = options.find((option) => option.value === value);
    const choices = options.map((option, index) => ({
      name: option.name,
      value: option === currentOption ? currentToken : `${prefix}${index}`
    }));

    return createSelectField({
      label,
      currentLabel: currentOption?.name || "—",
      options: choices,
      value: currentToken,
      onChange: (token) => {
        const selected = options[choices.findIndex((choice) => choice.value === token)];
        if (!selected || selected === currentOption) return;
        this.state.selectValues[field] = token;
        onChange(selected.value);
      }
    });
  },
  renderStepSelect(props, steps, index, i18n) {
    return this.renderSelectField({
      field: "stepPage",
      label: i18n.t("settings.editor.jumpToStep"),
      options: steps.map((step, stepIndex) => ({
        name: `${stepIndex + 1}. ${step.title?.trim() || i18n.t("settings.editor.untitledStep")}`,
        value: stepIndex
      })),
      value: index,
      onChange: (nextIndex) => this.setStepPage(props, nextIndex)
    });
  },
  renderStepEditor(props, steps, index) {
    const i18n = resolveSettingsTranslator(this);
    const step = steps[index];
    const updateStep = (key) => (value) => this.updateDraftStepField(props, index, key, value);
    const stepTextField = (key, label, options = {}) => createTextField({
      label: i18n.t(`settings.labels.${label}`),
      value: String(step[key] ?? ""),
      onChange: updateStep(key),
      ...options
    });
    const stepTitle = i18n.t("settings.editor.stepOf", { current: index + 1, total: steps.length });

    return createPanel(i18n.t("settings.editor.guidedStepsTitle"), [
      createButtonRow([
        index > 0 ? Button({
          label: i18n.t("settings.editor.previous"),
          style: ACTION,
          onClick: () => this.setStepPage(props, index - 1)
        }) : View({ style: { width: "78px" } }, []),
        createText(stepTitle, { ...PRIMARY_VALUE, flex: "1 1 auto" }, "center"),
        index < steps.length - 1 ? Button({
          label: i18n.t("settings.editor.next"),
          style: ACTION,
          onClick: () => this.setStepPage(props, index + 1)
        }) : View({ style: { width: "78px" } }, [])
      ], { gap: "6px" }),
      steps.length > 1 && this.renderStepSelect(props, steps, index, i18n),
      this.renderSelectField({
        field: "stepKind",
        label: i18n.t("settings.labels.kind"),
        options: buildStepKindOptions(i18n),
        value: step.kind,
        onChange: updateStep("kind")
      }),
      stepTextField("title", "title"),
      stepTextField("body", "body", { multiline: true, rows: 4 }),
      createFieldRow([
        stepTextField("durationMs", "durationMs"),
        stepTextField("waterMl", "waterMl"),
        stepTextField("targetTotalWaterMl", "targetTotalMl")
      ]),
      this.renderSelectField({
        field: "stepConfirm",
        label: i18n.t("settings.labels.requiresConfirm"),
        options: buildBooleanOptions(i18n),
        value: String(step.requiresConfirm ?? "false"),
        onChange: updateStep("requiresConfirm")
      }),
      this.renderSelectField({
        field: "stepFeedback",
        label: i18n.t("settings.labels.feedbackCue"),
        options: buildFeedbackOptions(i18n),
        value: step.feedbackCue,
        onChange: updateStep("feedbackCue")
      }),
      createButtonRow([
        Button({
          label: i18n.t("settings.editor.up"),
          style: ACTION,
          onClick: () => this.moveDraftStep(props, index, -1)
        }),
        Button({
          label: i18n.t("settings.editor.down"),
          style: ACTION,
          onClick: () => this.moveDraftStep(props, index, 1)
        }),
        Button({
          label: i18n.t(steps.length > 1 ? "settings.editor.delete" : "settings.editor.reset"),
          style: DANGER_ACTION,
          onClick: () => this.deleteDraftStep(props, index)
        })
      ]),
      step.kind !== "finish" && createButtonRow([
        Button({
          label: i18n.t("settings.editor.addStep"),
          style: ACTION,
          onClick: () => this.addDraftStep(props, index + 1)
        })
      ], DIVIDED_ROW)
    ]);
  },
  renderRecipeEditor(props) {
    const i18n = resolveSettingsTranslator(this);
    const draftRecipe = this.state.ui.draftRecipe;

    if (!draftRecipe) {
      return createMessage(i18n.t("settings.messages.recipeDraftMissing"), DANGER_ACTION.color);
    }

    const updateDraft = (key) => (value) => this.updateDraftField(props, key, value);
    const recipeTextField = (key, label, options = {}) => createTextField({
      label: i18n.t(`settings.labels.${label}`),
      value: String(draftRecipe[key] ?? ""),
      onChange: updateDraft(key),
      ...options
    });
    const currentStepIndex = clampStepPageIndex(this.state.ui.stepPageIndex, draftRecipe.steps.length);

    return View({ style: STACK }, [
      createPanel(i18n.t("settings.editor.recipeBasicsTitle"), [
        recipeTextField("name", "name"),
        this.renderSelectField({
          field: "recipeTool",
          label: i18n.t("settings.labels.tool"),
          options: buildToolOptions(i18n),
          value: draftRecipe.toolId,
          onChange: updateDraft("toolId")
        }),
        this.renderSelectField({
          field: "recipeColor",
          label: i18n.t("settings.labels.color"),
          options: COLOR_OPTIONS,
          value: draftRecipe.colorToken,
          onChange: updateDraft("colorToken")
        }),
        recipeTextField("description", "description", { multiline: true, rows: 3 })
      ]),
      createPanel(i18n.t("settings.editor.brewProfileTitle"), [
        createFieldRow([
          recipeTextField("coffeeDoseG", "doseG"),
          recipeTextField("totalWaterMl", "waterMl"),
          recipeTextField("waterTempC", "tempC"),
          recipeTextField("estimatedTotalDurationMs", "estimatedMs", {
            placeholder: i18n.t("settings.labels.estimatedAutoHint")
          })
        ]),
        recipeTextField("filterLabel", "filter"),
        recipeTextField("grindLabel", "grind")
      ]),
      this.renderStepEditor(props, draftRecipe.steps, currentStepIndex),
      createPanel(null, [
        recipeTextField("notes", "notes", { multiline: true, rows: 3 }),
        createButtonRow([
          Button({
            label: i18n.t("settings.editor.cancel"),
            style: ACTION,
            onClick: () => this.openRecipeList(props, draftRecipe.toolId || this.state.ui.selectedToolId)
          }),
          Button({
            label: i18n.t("settings.editor.saveRecipe"),
            style: PRIMARY_ACTION,
            onClick: () => this.saveDraftRecipe(props)
          })
        ], { justifyContent: "space-between" })
      ])
    ]);
  },
  renderHistoryList(props) {
    const i18n = resolveSettingsTranslator(this);
    const historyIndex = this.state.snapshot?.historyIndex || [];

    const entries = historyIndex
      .map(({ historyId }) => readHistoryEntry(props.settingsStorage, historyId))
      .filter(Boolean);

    if (!entries.length) {
      return createMessage(i18n.t("settings.messages.noHistoryYet"));
    }

    return View({ style: STACK }, entries.map((historyEntry) => {
      const { historyId } = historyEntry;

      return View({ style: CARD_STYLE }, [
        createRecordRow(
          historyEntry.recipeSnapshot.name,
          [
            createText(buildHistoryDetails(historyEntry, i18n)),
            createText(formatDurationLabel(historyEntry.elapsedMs), PRIMARY_VALUE)
          ],
          () => this.openHistoryDetail(props, historyId)
        )
      ]);
    }));
  },
  renderHistoryDetail(props) {
    const i18n = resolveSettingsTranslator(this);
    const historyEntry = readHistoryEntry(props.settingsStorage, this.state.ui.selectedHistoryId);

    if (!historyEntry) {
      return createMessage(i18n.t("settings.messages.historyEntryNotFound"), DANGER_ACTION.color);
    }

    const historyDraft = this.state.ui.historyDraft || createHistoryDraft(historyEntry);
    const snapshot = historyEntry.recipeSnapshot;
    const brewer = getLocalizedToolLabel(getToolMeta(snapshot.toolId), i18n) || snapshot.toolId;
    const deltaMs = createLastResultSummary(historyEntry).totalDeltaMs;
    const delta = i18n.t(deltaMs >= 0 ? "settings.history.deltaOver" : "settings.history.deltaUnder", {
      duration: formatDeltaDuration(Math.abs(deltaMs))
    });
    const stepsById = new Map(snapshot.steps.map((step) => [step.stepId, step]));
    const stepSummaries = (historyEntry.stepRunResults || []).map((result) =>
      View({ style: DIVIDED_ROW }, [
        View({ style: { ...STACK, gap: "2px", flex: "1 1 0" } }, [
          createText(`${result.order + 1}. ${stepsById.get(result.stepId)?.title || result.title || i18n.t("settings.editor.untitledStep")}`, TITLE),
          createText(humanizeStepKind(result.kind, i18n))
        ]),
        createText(formatDurationLabel(result.actualDurationMs || 0), PRIMARY_VALUE, "right")
      ])
    );

    return View({ style: STACK }, [
      createPanel(snapshot.name, [
        createText(formatDurationLabel(historyEntry.elapsedMs), { ...PRIMARY_VALUE, fontSize: "34px", lineHeight: "40px" }),
        createText(`${buildHistoryDetails(historyEntry, i18n)} · ${delta}`),
        createText(brewer, { ...BODY, borderTop: DIVIDED_ROW.borderTop, paddingTop: "12px" }),
        createText(i18n.t("settings.history.filter", {
          filterLabel: snapshot.filterLabel || i18n.t("settings.misc.notSpecified")
        }))
      ]),
      createPanel(i18n.t("settings.history.stepTimingTitle"), stepSummaries.length
        ? stepSummaries
        : [createText(i18n.t("settings.history.noStepResults"))]
      ),
      createPanel(i18n.t("settings.history.feedbackTitle"), [
        this.renderSelectField({
          field: "historyRating",
          label: i18n.t("settings.labels.rating"),
          options: buildRatingOptions(i18n),
          value: historyDraft.userRating || "",
          onChange: (value) => this.updateHistoryDraftField(props, "userRating", value)
        }),
        createTextField({
          label: i18n.t("settings.labels.note"),
          value: historyDraft.userNote || "",
          multiline: true,
          rows: 3,
          onChange: (value) => this.updateHistoryDraftField(props, "userNote", value)
        }),
        createButtonRow([
          Button({
            label: i18n.t("settings.history.backToHistory"),
            style: ACTION,
            onClick: () => this.openHistoryList(props)
          }),
          Button({
            label: i18n.t("settings.history.saveNotes"),
            style: PRIMARY_ACTION,
            onClick: () => this.saveHistoryDraft(props)
          })
        ], { justifyContent: "space-between" })
      ])
    ]);
  },
  renderSyncInfo() {
    const i18n = resolveSettingsTranslator(this);
    const rows = buildSyncRevisionRows(this.state.syncMeta, i18n);

    return createPanel(i18n.t("settings.sync.revisionsTitle"), rows.map(({ label, value }, index) =>
      View({ style: index ? DIVIDED_ROW : { ...ROW, justifyContent: "space-between" } }, [
        createText(label, TITLE),
        createText(String(value), PRIMARY_VALUE, "right")
      ])
    ));
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
      this.state.ui,
      this.state.snapshot,
      i18n
    );

    return View(
      {
        style: ROOT_VIEW
      },
      [
        this.renderNav(props),
        View({ style: HEADER_STYLE }, [
          createText(shellHeader.title, HEADER_TITLE),
          shellHeader.subtitle && createText(shellHeader.subtitle)
        ].filter(Boolean)),
        this.renderMessages(),
        this.renderView(props)
      ].filter(Boolean)
    );
  }
});
