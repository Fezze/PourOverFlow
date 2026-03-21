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
          style: NAV_BUTTON_STYLE,
          onClick: () => {
            this.openLibraryHome(props);
          }
        }),
        Button({
          label: "History",
          style: NAV_BUTTON_STYLE,
          onClick: () => {
            this.openHistoryList(props);
          }
        }),
        Button({
          label: "Sync",
          style: NAV_BUTTON_STYLE,
          onClick: () => {
            this.openSyncInfo(props);
          }
        })
      ]);
  },
  renderMessages() {
    const messageViews = [];

    if (this.state.ui.flashMessage) {
      messageViews.push(
        Button({
          label: this.state.ui.flashMessage,
          style: PRIMARY_BUTTON_STYLE,
          onClick: () => {}
        })
      );
    }

    if (this.state.ui.errorMessage) {
      messageViews.push(
        Button({
          label: this.state.ui.errorMessage,
          style: DANGER_BUTTON_STYLE,
          onClick: () => {}
        })
      );
    }

    return messageViews.length ? Section({}, messageViews) : null;
  },
  renderLibraryHome(props) {
    const recipesByTool = this.state.snapshot ? this.state.snapshot.recipesByTool : {};

    return Section(
      {},
      TOOL_CATALOG.map((tool) =>
        Button({
          label: `${tool.label} (${(recipesByTool[tool.toolId] || []).length})`,
          style: ACTION_BUTTON_STYLE,
          onClick: () => {
            this.openRecipeList(props, tool.toolId);
          }
        })
      ).concat([
        Button({
          label: "Open history",
          style: PRIMARY_BUTTON_STYLE,
          onClick: () => {
            this.openHistoryList(props);
          }
        })
      ]));
  },
  renderRecipeCards(props) {
    const recipes = this.state.snapshot.recipesByTool[this.state.ui.selectedToolId] || [];

    if (!recipes.length) {
      return [
        Button({
          label: "No recipes yet for this tool.",
          style: INFO_BUTTON_STYLE,
          onClick: () => {}
        })
      ];
    }

    return recipes.map((recipeSummary) =>
      View(
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
            label: `${recipeSummary.name} [${recipeSummary.source}]`,
            style: INFO_BUTTON_STYLE,
            onClick: () => {
              this.openRecipeEditor(props, recipeSummary.recipeId);
            }
          }),
          createButtonRow([
            Button({
              label: "Edit",
              style: PRIMARY_BUTTON_STYLE,
              onClick: () => {
                this.openRecipeEditor(props, recipeSummary.recipeId);
              }
            }),
            Button({
              label: "Duplicate",
              style: ACTION_BUTTON_STYLE,
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
      )
    );
  },
  renderRecipeList(props) {
    const selectedTool =
      TOOL_CATALOG.find((tool) => tool.toolId === this.state.ui.selectedToolId) || TOOL_CATALOG[0];

    return Section(
      {},
      [
        Button({
          label: selectedTool
            ? `${selectedTool.label} recipes`
            : "No tool selected",
          style: INFO_BUTTON_STYLE,
          onClick: () => {}
        }),
        createButtonRow([
          Button({
            label: "Create",
            style: PRIMARY_BUTTON_STYLE,
            onClick: () => {
              this.openRecipeEditor(props, null);
            }
          }),
          Button({
            label: "Back",
            style: ACTION_BUTTON_STYLE,
            onClick: () => {
              this.openLibraryHome(props);
            }
          })
        ])
      ].concat(this.renderRecipeCards(props))
    );
  },
  renderStepEditor(props, step, index, totalSteps) {
    return Section({}, [
      Button({
        label: `Step ${index + 1}: ${step.title || step.kind}`,
        style: INFO_BUTTON_STYLE,
        onClick: () => {}
      }),
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
          style: ACTION_BUTTON_STYLE,
          onClick: () => {
            this.moveDraftStep(props, index, -1);
          }
        }),
        Button({
          label: "Down",
          style: ACTION_BUTTON_STYLE,
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
        Button({
          label: "Recipe draft is missing.",
          style: DANGER_BUTTON_STYLE,
          onClick: () => {}
        })
      ]);
    }

    return View(
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }
      },
      [
        Section({}, [
          Button({
            label: draftRecipe.recipeId ? "Editing existing recipe" : "Creating new recipe",
            style: INFO_BUTTON_STYLE,
            onClick: () => {}
          }),
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
          })
        ]),
        Section({}, [
          TextInput({
            label: "Description",
            value: draftRecipe.description || "",
            onChange: (value) => {
              this.updateDraftField(props, "description", value);
            }
          }),
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
      ].concat(
        (draftRecipe.steps || []).map((step, index) =>
          this.renderStepEditor(props, step, index, draftRecipe.steps.length)
        )
      ).concat([
        Section({}, [
          Button({
            label: "Add step",
            style: PRIMARY_BUTTON_STYLE,
            onClick: () => {
              this.addDraftStep(props);
            }
          }),
          TextInput({
            label: "Notes",
            value: draftRecipe.notes || "",
            onChange: (value) => {
              this.updateDraftField(props, "notes", value);
            }
          }),
          createButtonRow([
            Button({
              label: "Save",
              style: PRIMARY_BUTTON_STYLE,
              onClick: () => {
                this.saveDraftRecipe(props);
              }
            }),
            Button({
              label: "Cancel",
              style: ACTION_BUTTON_STYLE,
              onClick: () => {
                this.openRecipeList(props, draftRecipe.toolId || this.state.ui.selectedToolId);
              }
            })
          ])
        ])
      ]));
  },
  renderHistoryList(props) {
    const historyIndex = this.state.snapshot ? this.state.snapshot.historyIndex : [];

    if (!historyIndex.length) {
      return Section({}, [
        Button({
          label: "No history entries yet. They will appear after watch sync lands.",
          style: INFO_BUTTON_STYLE,
          onClick: () => {}
        })
      ]);
    }

    return Section(
      {},
      historyIndex.map((historyIndexEntry) =>
        Button({
          label: `${historyIndexEntry.recipeName} | ${historyIndexEntry.status} | ${Math.round(
            historyIndexEntry.elapsedMs / 1000
          )}s`,
          style: ACTION_BUTTON_STYLE,
          onClick: () => {
            this.openHistoryDetail(props, historyIndexEntry.historyId);
          }
        })
      )
    );
  },
  renderHistoryDetail(props) {
    const historyEntry = readHistoryEntry(props.settingsStorage, this.state.ui.selectedHistoryId);

    if (!historyEntry) {
      return Section({}, [
        Button({
          label: "History entry not found.",
          style: DANGER_BUTTON_STYLE,
          onClick: () => {}
        })
      ]);
    }

    const historyDraft = this.state.ui.historyDraft || createHistoryDraft(historyEntry);
    const stepSummaries = (historyEntry.stepRunResults || []).map((stepRunResult) =>
      Button({
        label: `${stepRunResult.order + 1}. ${stepRunResult.kind} | ${Math.round(
          (stepRunResult.actualDurationMs || 0) / 1000
        )}s`,
        style: INFO_BUTTON_STYLE,
        onClick: () => {}
      })
    );

    return View(
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }
      },
      [
        Section({}, [
          Button({
            label: `${historyEntry.recipeSnapshot.name} | ${historyEntry.status}`,
            style: INFO_BUTTON_STYLE,
            onClick: () => {}
          }),
          Button({
            label: `Elapsed: ${Math.round(historyEntry.elapsedMs / 1000)}s`,
            style: INFO_BUTTON_STYLE,
            onClick: () => {}
          }),
          Button({
            label: `Delta: ${historyEntry.deviationSummary.totalDeltaMs} ms`,
            style: INFO_BUTTON_STYLE,
            onClick: () => {}
          })
        ]),
        Section({}, [
          Button({
            label: `Snapshot: ${historyEntry.recipeSnapshot.toolId} | ${historyEntry.recipeSnapshot.filterLabel}`,
            style: INFO_BUTTON_STYLE,
            onClick: () => {}
          }),
        ].concat(
          stepSummaries.length
            ? stepSummaries
            : [
                Button({
                  label: "No step run results yet.",
                  style: INFO_BUTTON_STYLE,
                  onClick: () => {}
                })
              ]
        )),
        Section({}, [
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
              label: "Back",
              style: ACTION_BUTTON_STYLE,
              onClick: () => {
                this.openHistoryList(props);
              }
            })
          ])
        ])
      ]);
    ;
  },
  renderSyncInfo() {
    const syncMeta = this.state.syncMeta || {};

    return Section({}, [
      Button({
        label: `Tools rev: ${syncMeta.toolCatalogRevision || 0}`,
        style: INFO_BUTTON_STYLE,
        onClick: () => {}
      }),
      Button({
        label: `Recipes rev: ${syncMeta.recipeCatalogRevision || 0}`,
        style: INFO_BUTTON_STYLE,
        onClick: () => {}
      }),
      Button({
        label: `History rev: ${syncMeta.historyRevision || 0}`,
        style: INFO_BUTTON_STYLE,
        onClick: () => {}
      }),
      Button({
        label: "Phone stays source of truth. Watch keeps cache and active session.",
        style: ACTION_BUTTON_STYLE,
        onClick: () => {}
      })
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

    return View(
      {
        style: {
          padding: "12px 20px"
        }
      },
      [
        this.renderNav(props),
        Section({}, [
          Button({
            label: `Current view: ${this.state.ui.view}`,
            style: INFO_BUTTON_STYLE,
            onClick: () => {}
          })
        ]),
        this.renderMessages(),
        this.renderView(props)
      ].filter(Boolean)
    );
  }
});
