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

const NAV_BUTTON_STYLE = {
  fontSize: "12px",
  lineHeight: "30px",
  borderRadius: "30px",
  background: "#2D8C82",
  color: "white",
  textAlign: "center",
  padding: "0 12px",
  width: "31%"
};

const ROOT_VIEW_STYLE = {
  padding: "16px 20px 28px",
  display: "flex",
  flexDirection: "column",
  gap: "12px"
};

const CARD_STACK_STYLE = {
  display: "flex",
  flexDirection: "column",
  gap: "12px"
};

const ACTION_BUTTON_STYLE = {
  fontSize: "12px",
  borderRadius: "30px",
  background: "#5E6773",
  color: "white"
};

const PRIMARY_BUTTON_STYLE = {
  fontSize: "12px",
  borderRadius: "30px",
  background: "#2D8C82",
  color: "white"
};

const DANGER_BUTTON_STYLE = {
  fontSize: "12px",
  borderRadius: "30px",
  background: "#D6675A",
  color: "white"
};

const INFO_BUTTON_STYLE = {
  fontSize: "12px",
  borderRadius: "30px",
  background: "#EEF3F8",
  color: "#2D3A46"
};

const SUCCESS_CARD_STYLE = {
  ...INFO_BUTTON_STYLE,
  background: "#DFF6F0",
  color: "#0F5F58",
  textAlign: "left"
};

const ERROR_CARD_STYLE = {
  ...INFO_BUTTON_STYLE,
  background: "#FCE8E6",
  color: "#8C2C1F",
  textAlign: "left"
};

const HERO_BUTTON_STYLE = {
  fontSize: "16px",
  lineHeight: "22px",
  borderRadius: "26px",
  background: "#0F1720",
  color: "white",
  textAlign: "left",
  padding: "14px 16px"
};

const SECTION_TITLE_STYLE = {
  fontSize: "13px",
  lineHeight: "20px",
  borderRadius: "20px",
  background: "#DCE6EF",
  color: "#21303D",
  textAlign: "left",
  padding: "10px 14px"
};

const CARD_BUTTON_STYLE = {
  fontSize: "13px",
  lineHeight: "20px",
  borderRadius: "22px",
  background: "#F7FAFC",
  color: "#21303D",
  textAlign: "left",
  padding: "12px 14px"
};

const SOFT_ACTION_BUTTON_STYLE = {
  fontSize: "12px",
  borderRadius: "30px",
  background: "#DCE6EF",
  color: "#21303D"
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

const FEEDBACK_OPTIONS = FEEDBACK_CUES.map((feedbackCue) => ({
  name: feedbackCue,
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
    background: isActive ? "#0F5F58" : "#DCE6EF",
    color: isActive ? "white" : "#1E2F3A"
  };
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

function getSnapshotCounts(snapshot) {
  const recipeCount = snapshot && Array.isArray(snapshot.recipeIndex) ? snapshot.recipeIndex.length : 0;
  const historyCount = snapshot && Array.isArray(snapshot.historyIndex) ? snapshot.historyIndex.length : 0;
  return {
    toolCount: TOOL_CATALOG.length,
    recipeCount,
    historyCount
  };
}

function buildLibraryOverview(snapshot) {
  const counts = getSnapshotCounts(snapshot);
  return `${counts.toolCount} brewers - ${counts.recipeCount} recipes - ${counts.historyCount} history entries`;
}

function buildToolCardLabel(tool, recipeCount) {
  const countLabel = recipeCount === 1 ? "1 recipe ready" : `${recipeCount} recipes ready`;
  return `${tool.label}\n${tool.description}\n${countLabel}`;
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

function buildStepSummaryLabel(step, index, totalSteps) {
  const detailParts = [step.kind];

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

function buildHistoryCardLabel(historyEntry) {
  const ratingLabel = historyEntry.userRating ? ` - Rated ${historyEntry.userRating}/5` : "";
  return `${historyEntry.recipeSnapshot.name}\n${historyEntry.status} - ${formatDurationLabel(
    historyEntry.elapsedMs
  )} - ${formatDateLabel(historyEntry.endedAt)}${ratingLabel}`;
}

function buildShellHeader(viewName, snapshot, selectedToolId) {
  const counts = getSnapshotCounts(snapshot);
  const selectedTool = getToolMeta(selectedToolId);

  switch (viewName) {
    case "recipe-list":
      return {
        title: selectedTool ? `${selectedTool.label} recipes` : "Recipes",
        subtitle: selectedTool ? selectedTool.description : "Manage recipes for the selected brewer."
      };
    case "recipe-editor":
      return {
        title: "Recipe editor",
        subtitle: "Shape the brew profile and the guided watch steps."
      };
    case "history-list":
      return {
        title: "Brew history",
        subtitle: `${counts.historyCount} archived brews stored on the phone.`
      };
    case "history-detail":
      return {
        title: "History detail",
        subtitle: "Phone notes and ratings stay attached to the archived snapshot."
      };
    case "about-sync":
      return {
        title: "Sync status",
        subtitle: "Phone stays canonical. The watch keeps cache, latest result, and active session."
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

    this.updateDraftField(props, "steps", nextSteps);
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
    this.updateDraftField(props, "steps", nextSteps);
  },
  deleteDraftStep(props, index) {
    const currentSteps = [...(this.state.ui.draftRecipe.steps || [])];

    if (currentSteps.length <= 1) {
      this.updateDraftField(props, "steps", createFreshDraft(this.state.ui.selectedToolId).steps);
      return;
    }

    currentSteps.splice(index, 1);
    this.updateDraftField(props, "steps", currentSteps);
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
    const latestResult = this.state.snapshot ? this.state.snapshot.latestResult : null;

    return View({ style: CARD_STACK_STYLE }, [
      Section({}, [
        createStaticCard(
          "Recipe library\nChoose a brewer to curate the recipes that sync to the watch.",
          HERO_BUTTON_STYLE
        ),
        createStaticCard(buildLibraryOverview(this.state.snapshot), CARD_BUTTON_STYLE),
        latestResult
          ? createStaticCard(
              `Latest watch result\n${latestResult.recipeName} - ${latestResult.status} - ${formatDurationLabel(
                latestResult.elapsedMs
              )}`,
              CARD_BUTTON_STYLE
            )
          : null
      ].filter(Boolean)),
      Section(
        {},
        [createSectionTitle("Brewers", "Open a brewer to review, create, or prune its recipes.")].concat(
          TOOL_CATALOG.map((tool) =>
            Button({
              label: buildToolCardLabel(tool, (recipesByTool[tool.toolId] || []).length),
              style: CARD_BUTTON_STYLE,
              onClick: () => {
                this.openRecipeList(props, tool.toolId);
              }
            })
          )
        )
      )
    ]);
  },
  renderRecipeCards(props) {
    const recipes = this.state.snapshot.recipesByTool[this.state.ui.selectedToolId] || [];

    if (!recipes.length) {
      return [
        createStaticCard(
          "No recipes yet for this brewer.\nCreate the first one and it will be available on the watch after sync.",
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
      Section({}, [
        createStaticCard(
          `${selectedTool ? selectedTool.label : "No brewer selected"}\n${
            selectedTool ? selectedTool.description : "Select a brewer from the library home."
          }\n${recipeCount === 1 ? "1 recipe" : `${recipeCount} recipes`}`,
          CARD_BUTTON_STYLE
        ),
        createButtonRow([
          Button({
            label: "New recipe",
            style: PRIMARY_BUTTON_STYLE,
            onClick: () => {
              this.openRecipeEditor(props, null);
            }
          }),
          Button({
            label: "Back to brewers",
            style: SOFT_ACTION_BUTTON_STYLE,
            onClick: () => {
              this.openLibraryHome(props);
            }
          })
        ])
      ]),
      Section(
        {},
        [createSectionTitle("Recipes", "Tap a card to edit the recipe. Duplicate or delete from the row below.")].concat(
          this.renderRecipeCards(props)
        )
      )
    ]);
  },
  renderStepEditor(props, step, index, totalSteps) {
    return Section({}, [
      createSectionTitle(buildStepSummaryLabel(step, index, totalSteps)),
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
    ]);
  },
  renderRecipeEditor(props) {
    const draftRecipe = this.state.ui.draftRecipe;

    if (!draftRecipe) {
      return Section({}, [
        createStaticCard("Recipe draft is missing.", ERROR_CARD_STYLE)
      ]);
    }

    return View({ style: CARD_STACK_STYLE }, [
      Section({}, [
        createStaticCard(buildDraftOverview(draftRecipe), HERO_BUTTON_STYLE),
        createSectionTitle(
          "Recipe basics",
          draftRecipe.recipeId ? "Editing an existing record." : "Creating a new recipe."
        ),
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
      ]),
      Section({}, [
        createSectionTitle("Brew profile", "Numbers shown in the library, on the watch, and in history."),
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
      ]),
      Section({}, [
        createSectionTitle(
          "Guided steps",
          `${draftRecipe.steps.length} steps currently define the watch-side brew guidance.`
        ),
        Button({
          label: "Add step",
          style: PRIMARY_BUTTON_STYLE,
          onClick: () => {
            this.addDraftStep(props);
          }
        })
      ]),
      ...((draftRecipe.steps || []).map((step, index) =>
        this.renderStepEditor(props, step, index, draftRecipe.steps.length)
      )),
      Section({}, [
        createSectionTitle("Notes and save", "Recipe notes stay on the phone record and help future edits."),
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
      ])
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
      Section({}, [
        createStaticCard(
          `${historyIndex.length} archived brews\nNewest entries stay on the phone even if the original recipe is later deleted.`,
          CARD_BUTTON_STYLE
        )
      ]),
      Section(
        {},
        [createSectionTitle("History", "Open an entry to review step timing, rating, and notes.")].concat(
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
      Section({}, [
        createStaticCard(buildHistoryCardLabel(historyEntry), HERO_BUTTON_STYLE),
        createStaticCard(
          `${snapshotTool ? snapshotTool.label : historyEntry.recipeSnapshot.toolId}\nFilter: ${
            historyEntry.recipeSnapshot.filterLabel || "Not specified"
          }\nDelta: ${formatDurationLabel(Math.abs(historyEntry.deviationSummary.totalDeltaMs || 0))} ${
            (historyEntry.deviationSummary.totalDeltaMs || 0) >= 0 ? "over" : "under"
          } planned`,
          CARD_BUTTON_STYLE
        )
      ]),
      Section(
        {},
        [createSectionTitle("Step timing", "Step run results attached to the archived recipe snapshot.")].concat(
          stepSummaries.length
            ? stepSummaries
            : [createStaticCard("No step run results were recorded for this brew.", CARD_BUTTON_STYLE)]
        )
      ),
      Section({}, [
        createSectionTitle("Phone feedback", "Notes and ratings stay attached to this archived session."),
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
      ])
    ]);
  },
  renderSyncInfo() {
    const syncMeta = this.state.syncMeta || {};
    const latestResult = this.state.snapshot ? this.state.snapshot.latestResult : null;

    return View({ style: CARD_STACK_STYLE }, [
      Section({}, [
        createStaticCard(
          "Sync overview\nThe phone stays canonical. The watch only keeps cache, the active session, and the latest result.",
          HERO_BUTTON_STYLE
        ),
        createStaticCard(
          `Tools revision: ${syncMeta.toolCatalogRevision || 0}\nRecipes revision: ${
            syncMeta.recipeCatalogRevision || 0
          }\nHistory revision: ${syncMeta.historyRevision || 0}`,
          CARD_BUTTON_STYLE
        ),
        latestResult
          ? createStaticCard(
              `Latest mirrored result\n${latestResult.recipeName} - ${latestResult.status} - ${formatDurationLabel(
                latestResult.elapsedMs
              )}`,
              CARD_BUTTON_STYLE
            )
          : createStaticCard("No watch result has been mirrored back yet.", CARD_BUTTON_STYLE)
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
        Section({}, [createStaticCard(`${shellHeader.title}\n${shellHeader.subtitle}`, SECTION_TITLE_STYLE)]),
        this.renderMessages(),
        this.renderView(props)
      ].filter(Boolean)
    );
  }
});
