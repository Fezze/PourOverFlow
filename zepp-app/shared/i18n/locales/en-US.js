export default {
  common: {
    unknownDate: "Unknown date",
    unknownMetrics: "Metrics unavailable",
    toolFallback: "No brewer",
    bool: {
      true: "true",
      false: "false"
    },
    rating: {
      none: "none"
    },
    historyStatus: {
      completed: "Completed",
      aborted: "Aborted",
      expired: "Expired"
    },
    sessionStatus: {
      running: "Running",
      waiting_for_confirm: "Waiting for confirm",
      completed: "Completed",
      aborted: "Aborted",
      expired: "Expired"
    },
    stepKind: {
      instruction: "Instruction",
      timed_action: "Timed action",
      timed_wait: "Timed wait",
      confirm: "Confirm",
      finish: "Finish"
    },
    tool: {
      tool_aeropress: {
        label: "AeroPress",
        description: "Immersion / pressure hybrid"
      },
      tool_v60: {
        label: "Hario V60",
        description: "Classic conical pour-over"
      },
      tool_kalita_wave: {
        label: "Kalita Wave",
        description: "Flat-bed pour-over"
      },
      tool_chemex: {
        label: "Chemex",
        description: "Large paper filter brewer"
      },
      tool_clever_dripper: {
        label: "Clever Dripper",
        description: "Immersion with controlled drawdown"
      },
      tool_french_press: {
        label: "French Press",
        description: "Full immersion brewer"
      }
    },
    counts: {
      recipes: ({ count }) => (count === 1 ? "1 recipe" : `${count} recipes`),
      brewers: ({ count }) => (count === 1 ? "1 brewer" : `${count} brewers`),
      historyEntries: ({ count }) => (count === 1 ? "1 history entry" : `${count} history entries`),
      archivedBrews: ({ count }) => (count === 1 ? "1 archived brew on the phone." : `${count} archived brews on the phone.`)
    }
  },
  schema: {
    defaultRecipe: {
      filterLabel: "Paper",
      grindLabel: "Medium"
    },
    defaultSteps: {
      prep: {
        title: "Prep",
        body: "Set up the brewer and add coffee."
      },
      done: {
        title: "Done",
        body: "Finish the brew."
      }
    },
    fallbackSteps: {
      step: "Step",
      confirm: "Confirm",
      finish: "Done",
      finishBody: "Finish the brew.",
      continueBody: "Complete the step and continue."
    }
  },
  watch: {
    home: {
      title: {
        default: "Brewers"
      },
      subtitle: {
        resume: "Resume",
        nextCup: "Next cup",
        chooseBrewer: "Choose a brewer"
      },
      body: {
        lastBrewLabel: "Last brew",
        ready: "Ready",
        recipesReady: ({ count }) => `${count} recipes ready`,
        stepProgress: ({ current, total }) => `Step ${current}/${total}`
      },
      actions: {
        resume: "Resume",
        browse: "Browse",
        discard: "Discard",
        sync: "Sync",
        last: "Last"
      }
    },
    toolList: {
      title: "Brewers",
      empty: "No synced brewers yet",
      refresh: "Refresh library"
    },
    recipeList: {
      empty: "No recipes yet",
      refresh: "Refresh from phone",
      titleFallback: "Recipes",
      snapshotMissing: "Snapshot missing"
    },
    recipeDetail: {
      unavailableTitle: "Recipe unavailable",
      unavailableBody: "Open the recipe list again or refresh the phone sync.",
      actions: {
        start: "Start brew",
        back: "Back to recipes"
      },
      rows: {
        doseWater: "Dose and water",
        brewProfile: "Brew profile",
        timeAndSteps: "Time and steps",
        notes: "Notes",
        startWhenReady: "Start when ready."
      },
      detail: {
        doseWater: ({ coffeeDoseG, totalWaterMl }) => `${coffeeDoseG}g coffee / ${totalWaterMl}ml water`,
        brewProfile: ({ waterTempC, grindLabel, filterLabel }) => `${waterTempC}C / ${grindLabel} / ${filterLabel} filter`,
        timeAndSteps: ({ totalSeconds, stepCount }) => `${totalSeconds}s / ${stepCount} steps`
      }
    },
    brewActive: {
      noActiveBrew: "No active brew",
      noSessionStored: "No session is stored on the watch.",
      goHome: "Go home",
      unknownStep: "Unknown step",
      noStepPayload: "No step payload",
      actions: {
        next: "Next",
        finish: "Finish",
        skip: "Skip",
        stop: "Stop"
      },
      meta: {
        targetMl: ({ value }) => `Target ${value} ml`,
        pourMl: ({ value }) => `Pour ${value} ml`,
        left: ({ duration }) => `${duration} left`,
        session: ({ duration }) => `Session ${duration}`
      },
      progress: ({ current, total }) => `Step ${current}/${total}`
    },
    resultSummary: {
      noResultYet: "No result yet",
      noSummary: "No completed brew summary is stored on the watch yet.",
      actions: {
        home: "Home",
        browse: "Browse"
      },
      rows: {
        status: "Status",
        totalTime: "Total time",
        timingDelta: "Timing delta",
        totalTimeValue: ({ seconds }) => `${seconds}s total`,
        timingDeltaValue: ({ totalDeltaMs }) => `${totalDeltaMs} ms`
      }
    }
  },
  settings: {
    nav: {
      library: "Library",
      history: "History",
      sync: "Sync"
    },
    shell: {
      recipeListTitle: ({ toolLabel }) => `${toolLabel} recipes`,
      recipeListSubtitle: ({ recipeCountLabel }) => recipeCountLabel,
      historyTitle: "Brew history",
      historySubtitle: ({ historyOverview }) => historyOverview,
      historyDetailTitle: "History detail",
      historyDetailSubtitle: "Phone notes and ratings stay attached to the archived snapshot.",
      syncTitle: "Sync status",
      syncSubtitle: "Phone stays canonical. The watch mirrors only what it needs.",
      homeTitle: "PourOverFlow",
      homeSubtitle: ({ libraryOverview }) => libraryOverview
    },
    overview: {
      library: ({ toolCount, recipeCount, includeHistory, historyCount }) => {
        const parts = [`${toolCount} brewers`, `${recipeCount} recipes`];

        if (includeHistory) {
          parts.push(`${historyCount} history entries`);
        }

        return parts.join(" - ");
      },
      sync: ({ toolRevision, recipeRevision, historyRevision }) => `Tools revision: ${toolRevision}\nRecipes revision: ${recipeRevision}\nHistory revision: ${historyRevision}`
    },
    messages: {
      noRecipesYet: "No recipes yet for this brewer.\nCreate the first one here.",
      recipeDraftMissing: "Recipe draft is missing.",
      historyEntryNotFound: "History entry not found.",
      noHistoryYet: "No history entries yet.\nThey will appear here after the watch sends completed or aborted brews back to the phone.",
      recipeSaved: ({ name }) => `Saved recipe: ${name}`,
      recipeDuplicated: ({ name }) => `Duplicated recipe: ${name}`,
      recipeDeleted: "Recipe deleted. History was preserved.",
      recipeRecordNotFound: "Recipe record not found.",
      historyNoteSaved: "History note saved."
    },
    library: {
      newRecipe: "New recipe",
      brewers: "Brewers",
      recipesTitle: "Recipes",
      emptyShelfTitle: "Empty shelf",
      recipeListSubtitle: "Tap a recipe card to edit it. Duplicate or delete from the action row.",
      recipeListEmptySubtitle: ({ toolLabel }) => `Add the first ${toolLabel} recipe here.`,
      recipeSource: {
        seed: "Starter recipe",
        user: "Custom recipe"
      },
      updatedAt: ({ dateLabel }) => `Updated ${dateLabel}`,
      duplicate: "Duplicate",
      delete: "Delete"
    },
    history: {
      recentBrews: "Recent brews",
      recentBrewsSubtitle: "Open an entry to review timing, rating, and phone notes.",
      detailTitle: "History detail",
      detailSubtitle: "Archived snapshot, timing and phone notes.",
      stepTimingTitle: "Step timing",
      stepTimingSubtitle: "Run results attached to the archived recipe snapshot.",
      feedbackTitle: "Phone feedback",
      feedbackSubtitle: "Notes and rating stay attached to this archived session.",
      noStepResults: "No step run results were recorded for this brew.",
      saveNotes: "Save notes",
      backToHistory: "Back to history",
      rated: ({ rating }) => `Rated ${rating}/5`,
      deltaOver: ({ duration }) => `${duration} over planned`,
      deltaUnder: ({ duration }) => `${duration} under planned`,
      filter: ({ filterLabel }) => `Filter: ${filterLabel || "Not specified"}`
    },
    sync: {
      overviewTitle: "Sync overview",
      overviewSubtitle: "The watch mirrors recipes, cache state, and the latest result only."
    },
    editor: {
      editingExisting: "Editing an existing recipe.",
      creatingNew: "Creating a new recipe.",
      recipeEditorTitle: "Recipe editor",
      recipeEditorSubtitle: "Shape the brew profile and the guided watch steps.",
      recipeBasicsTitle: "Recipe basics",
      recipeBasicsSubtitle: "Identity, brewer and quick description.",
      brewProfileTitle: "Brew profile",
      brewProfileSubtitle: "Numbers shown in the library, on the watch, and in history.",
      guidedStepsTitle: "Guided steps",
      guidedStepsSubtitle: ({ stepCount }) => `${stepCount} steps currently define the watch-side brew guidance.`,
      notesAndSaveTitle: "Notes and save",
      notesAndSaveSubtitle: "Recipe notes stay on the phone record and help future edits.",
      stepEditorSubtitle: "Guided watch instruction",
      saveRecipe: "Save recipe",
      cancel: "Cancel",
      previous: "Previous",
      next: "Next",
      addStep: "Add step",
      up: "Up",
      down: "Down",
      delete: "Delete",
      reset: "Reset",
      stepOf: ({ current, total }) => `Step ${current} of ${total}`,
      stepSummary: ({ index, total, title, detail }) => `Step ${index}/${total}: ${title}\n${detail}`,
      untitledRecipe: "Untitled recipe",
      untitledStep: "Untitled step",
      noBrewer: "No brewer",
      stepLabel: ({ index, total }) => `${index} / ${total}`
    },
    labels: {
      name: "Name",
      tool: "Tool",
      color: "Color",
      description: "Description",
      doseG: "Dose g",
      waterMl: "Water ml",
      tempC: "Temp C",
      filter: "Filter",
      grind: "Grind",
      estimatedMs: "Estimated ms",
      kind: "Kind",
      title: "Title",
      body: "Body",
      durationMs: "Duration ms",
      targetTotalMl: "Target total ml",
      requiresConfirm: "Requires confirm",
      feedbackCue: "Feedback cue",
      notes: "Notes",
      rating: "Rating",
      note: "Note"
    },
    options: {
      feedbackCue: {
        none: "none",
        vibrate_short: "short haptic",
        vibrate_long: "long haptic",
        combo_short: "finish haptic"
      }
    },
    stats: {
      dose: ({ value }) => `Dose\n${value} g`,
      water: ({ value }) => `Water\n${value} ml`,
      temp: ({ value }) => `Temp\n${value} C`,
      time: ({ value }) => `Time\n${value}`,
      steps: ({ value }) => `Steps\n${value}`,
      color: ({ value }) => `Color\n${value}`
    },
    misc: {
      notSpecified: "Not specified",
      metricsUnavailable: "Metrics unavailable",
      unknownDate: "Unknown date"
    }
  }
};
