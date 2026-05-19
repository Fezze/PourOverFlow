const polishPlural = (count, one, few, many) => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (count === 1) {
    return one;
  }

  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return few;
  }

  return many;
};

const formatPolishCount = (count, one, few, many) => `${count} ${polishPlural(count, one, few, many)}`;

export default {
  common: {
    unknownDate: "Nieznana data",
    unknownMetrics: "Brak metryk",
    toolFallback: "Brak metody",
    bool: {
      true: "true",
      false: "false"
    },
    rating: {
      none: "brak"
    },
    historyStatus: {
      completed: "Ukończono",
      aborted: "Przerwano",
      expired: "Wygasło"
    },
    sessionStatus: {
      running: "Trwa",
      waiting_for_confirm: "Czeka na potwierdzenie",
      completed: "Ukończono",
      aborted: "Przerwano",
      expired: "Wygasło"
    },
    stepKind: {
      instruction: "Instrukcja",
      timed_action: "Akcja czasowa",
      timed_wait: "Czekanie",
      confirm: "Potwierdzenie",
      finish: "Koniec"
    },
    tool: {
      tool_aeropress: {
        label: "AeroPress",
        description: "Imersja / ciśnieniowa hybryda"
      },
      tool_v60: {
        label: "Hario V60",
        description: "Klasyczny stożkowy pour-over"
      },
      tool_kalita_wave: {
        label: "Kalita Wave",
        description: "Pour-over z płaskim dnem"
      },
      tool_chemex: {
        label: "Chemex",
        description: "Duży zaparzacz z papierowym filtrem"
      },
      tool_clever_dripper: {
        label: "Clever Dripper",
        description: "Imersja z kontrolowanym odpływem"
      },
      tool_french_press: {
        label: "French Press",
        description: "Pełna imersja"
      }
    },
    counts: {
      recipes: ({ count }) => formatPolishCount(count, "przepis", "przepisy", "przepisów"),
      brewers: ({ count }) => formatPolishCount(count, "zaparzacz", "zaparzacze", "zaparzaczy"),
      historyEntries: ({ count }) => formatPolishCount(count, "wpis historii", "wpisy historii", "wpisów historii"),
      archivedBrews: ({ count }) => `${formatPolishCount(count, "archiwalne parzenie", "archiwalne parzenia", "archiwalnych parzeń")} w telefonie.`
    }
  },
  schema: {
    defaultRecipe: {
      filterLabel: "Papier",
      grindLabel: "Średni"
    },
    defaultSteps: {
      prep: {
        title: "Przygotowanie",
        body: "Przygotuj zaparzacz i wsyp kawę."
      },
      done: {
        title: "Gotowe",
        body: "Zakończ parzenie."
      }
    },
    fallbackSteps: {
      step: "Krok",
      confirm: "Potwierdź",
      finish: "Gotowe",
      finishBody: "Zakończ parzenie.",
      continueBody: "Wykonaj krok i przejdź dalej."
    }
  },
  watch: {
    home: {
      title: {
        default: "Zaparzacze"
      },
      subtitle: {
        resume: "Wznow",
        nextCup: "Następna kawa",
        chooseBrewer: "Wybierz metodę"
      },
      body: {
        lastBrewLabel: "Ostatnie parzenie",
        ready: "Gotowe",
        recipesReady: ({ count }) => `${count} gotowe`,
        stepProgress: ({ current, total }) => `Krok ${current}/${total}`
      },
      actions: {
        resume: "Wznow",
        browse: "Przeglądaj",
        discard: "Odrzuć",
        sync: "Sync",
        last: "Ostatni"
      }
    },
    toolList: {
      title: "Zaparzacze",
      empty: "Brak zsynchronizowanych metod",
      refresh: "Odśwież bibliotekę"
    },
    recipeList: {
      empty: "Brak przepisów",
      refresh: "Odśwież z telefonu",
      titleFallback: "Przepisy",
      snapshotMissing: "Brak snapshotu"
    },
    recipeDetail: {
      unavailableTitle: "Brak przepisu",
      unavailableBody: "Otwórz listę przepisów ponownie albo odśwież sync z telefonu.",
      actions: {
        start: "Start",
        back: "Wróć"
      },
      rows: {
        doseWater: "Doza i woda",
        brewProfile: "Profil parzenia",
        timeAndSteps: "Czas i kroki",
        notes: "Notatki",
        startWhenReady: "Startuj, gdy będziesz gotowy."
      },
      detail: {
        doseWater: ({ coffeeDoseG, totalWaterMl }) => `${coffeeDoseG}g kawy / ${totalWaterMl}ml wody`,
        brewProfile: ({ waterTempC, grindLabel, filterLabel }) => `${waterTempC}C / ${grindLabel} / filtr ${filterLabel}`,
        timeAndSteps: ({ totalSeconds, stepCount }) => `${totalSeconds}s / ${formatPolishCount(stepCount, "krok", "kroki", "kroków")}`
      }
    },
    brewActive: {
      noActiveBrew: "Brak aktywnego parzenia",
      noSessionStored: "Brak zapisanej sesji na zegarku.",
      goHome: "Do domu",
      unknownStep: "Nieznany krok",
      noStepPayload: "Brak treści kroku",
      actions: {
        next: "Dalej",
        finish: "Koniec",
        skip: "Pomiń",
        stop: "Stop"
      },
      meta: {
        targetMl: ({ value }) => `Cel ${value} ml`,
        pourMl: ({ value }) => `Wlej ${value} ml`,
        left: ({ duration }) => `${duration} zostało`,
        session: ({ duration }) => `Sesja ${duration}`
      },
      progress: ({ current, total }) => `Krok ${current}/${total}`
    },
    resultSummary: {
      noResultYet: "Brak wyniku",
      noSummary: "Na zegarku nie ma jeszcze zapisanego podsumowania.",
      actions: {
        home: "Dom",
        browse: "Przeglądaj"
      },
      rows: {
        status: "Status",
        totalTime: "Łączny czas",
        timingDelta: "Odchylenie czasu",
        totalTimeValue: ({ seconds }) => `${seconds}s łącznie`,
        timingDeltaValue: ({ totalDeltaMs }) => `${totalDeltaMs} ms`
      }
    }
  },
  settings: {
    nav: {
      library: "Biblioteka",
      history: "Historia",
      sync: "Sync"
    },
    shell: {
      recipeListTitle: ({ toolLabel }) => `Przepisy: ${toolLabel}`,
      recipeListSubtitle: ({ recipeCountLabel }) => recipeCountLabel,
      historyTitle: "Historia parzeń",
      historySubtitle: ({ historyOverview }) => historyOverview,
      historyDetailTitle: "Szczegóły historii",
      historyDetailSubtitle: "Notatki i oceny z telefonu zostają przy archiwalnym wpisie.",
      syncTitle: "Status sync",
      syncSubtitle: "Telefon pozostaje kanoniczny. Zegarek trzyma tylko to, czego potrzebuje.",
      homeTitle: "PourOverFlow",
      homeSubtitle: ({ libraryOverview }) => libraryOverview
    },
    overview: {
      library: ({ toolCount, recipeCount, includeHistory, historyCount }) => {
        const parts = [
          formatPolishCount(toolCount, "zaparzacz", "zaparzacze", "zaparzaczy"),
          formatPolishCount(recipeCount, "przepis", "przepisy", "przepisów")
        ];

        if (includeHistory) {
          parts.push(formatPolishCount(historyCount, "wpis historii", "wpisy historii", "wpisów historii"));
        }

        return parts.join(" - ");
      },
      sync: ({ toolRevision, recipeRevision, historyRevision }) => `Rewizja metod: ${toolRevision}\nRewizja przepisów: ${recipeRevision}\nRewizja historii: ${historyRevision}`
    },
    messages: {
      noRecipesYet: "Brak przepisów dla tej metody.\nDodaj pierwszy tutaj.",
      recipeDraftMissing: "Brak draftu przepisu.",
      historyEntryNotFound: "Nie znaleziono wpisu historii.",
      noHistoryYet: "Brak wpisów historii.\nPojawią się tutaj po wysłaniu zakończonych lub przerwanych sesji z zegarka.",
      recipeSaved: ({ name }) => `Zapisano przepis: ${name}`,
      recipeDuplicated: ({ name }) => `Zduplikowano przepis: ${name}`,
      recipeDeleted: "Usunięto przepis. Historia została zachowana.",
      recipeRecordNotFound: "Nie znaleziono rekordu przepisu.",
      historyNoteSaved: "Zapisano notatkę historii."
    },
    library: {
      newRecipe: "Nowy przepis",
      brewers: "Metody",
      recipesTitle: "Przepisy",
      emptyShelfTitle: "Pusta półka",
      recipeListSubtitle: "Stuknij kartę przepisu, aby go edytować. Duplikuj albo usuń z rzędu akcji.",
      recipeListEmptySubtitle: ({ toolLabel }) => `Dodaj tu pierwszy przepis dla ${toolLabel}.`,
      recipeSource: {
        seed: "Startowy przepis",
        user: "Własny przepis"
      },
      updatedAt: ({ dateLabel }) => `Zaktualizowano ${dateLabel}`,
      duplicate: "Duplikuj",
      delete: "Usuń"
    },
    history: {
      recentBrews: "Ostatnie parzenia",
      recentBrewsSubtitle: "Otwórz wpis, aby zobaczyć czas, ocenę i notatki z telefonu.",
      detailTitle: "Szczegóły historii",
      detailSubtitle: "Archiwalny snapshot, czasy i notatki z telefonu.",
      stepTimingTitle: "Czasy kroków",
      stepTimingSubtitle: "Wyniki przebiegu zapisane przy archiwalnym snapshocie przepisu.",
      feedbackTitle: "Ocena z telefonu",
      feedbackSubtitle: "Notatki i ocena zostają przy tej archiwalnej sesji.",
      noStepResults: "Dla tego parzenia nie zapisano wyników kroków.",
      saveNotes: "Zapisz notatki",
      backToHistory: "Wróć do historii",
      rated: ({ rating }) => `Ocena ${rating}/5`,
      deltaOver: ({ duration }) => `${duration} ponad plan`,
      deltaUnder: ({ duration }) => `${duration} poniżej planu`,
      filter: ({ filterLabel }) => `Filtr: ${filterLabel || "Brak"}`
    },
    sync: {
      overviewTitle: "Przegląd synchronizacji",
      overviewSubtitle: "Zegarek trzyma tylko przepisy, stan cache i ostatni wynik."
    },
    editor: {
      editingExisting: "Edytujesz istniejący przepis.",
      creatingNew: "Tworzysz nowy przepis.",
      recipeEditorTitle: "Edytor przepisu",
      recipeEditorSubtitle: "Ustaw profil parzenia i kroki dla zegarka.",
      recipeBasicsTitle: "Podstawy przepisu",
      recipeBasicsSubtitle: "Tożsamość, metoda i krótki opis.",
      brewProfileTitle: "Profil parzenia",
      brewProfileSubtitle: "Liczby widoczne w bibliotece, na zegarku i w historii.",
      guidedStepsTitle: "Kroki prowadzone",
      guidedStepsSubtitle: ({ stepCount }) => `${formatPolishCount(stepCount, "krok", "kroki", "kroków")} definiuje prowadzenie na zegarku.`,
      notesAndSaveTitle: "Notatki i zapis",
      notesAndSaveSubtitle: "Notatki przepisu zostają w rekordzie telefonu i pomagają przy kolejnych edycjach.",
      stepEditorSubtitle: "Instrukcja dla zegarka",
      saveRecipe: "Zapisz przepis",
      cancel: "Anuluj",
      previous: "Wcześniej",
      next: "Dalej",
      addStep: "Dodaj krok",
      up: "W górę",
      down: "W dół",
      delete: "Usuń",
      reset: "Reset",
      stepOf: ({ current, total }) => `Krok ${current} z ${total}`,
      stepSummary: ({ index, total, title, detail }) => `Krok ${index}/${total}: ${title}\n${detail}`,
      untitledRecipe: "Przepis bez nazwy",
      untitledStep: "Krok bez nazwy",
      noBrewer: "Brak metody",
      stepLabel: ({ index, total }) => `${index} / ${total}`
    },
    labels: {
      name: "Nazwa",
      tool: "Metoda",
      color: "Kolor",
      description: "Opis",
      doseG: "Doza g",
      waterMl: "Woda ml",
      tempC: "Temp C",
      filter: "Filtr",
      grind: "Mielenie",
      estimatedMs: "Szacowane ms",
      kind: "Typ",
      title: "Tytuł",
      body: "Treść",
      durationMs: "Czas ms",
      targetTotalMl: "Cel łączny ml",
      requiresConfirm: "Wymaga potwierdzenia",
      feedbackCue: "Cue haptyczne",
      notes: "Notatki",
      rating: "Ocena",
      note: "Notatka"
    },
    options: {
      feedbackCue: {
        none: "brak",
        vibrate_short: "krótka haptyka",
        vibrate_long: "długa haptyka",
        combo_short: "finalowa haptyka"
      }
    },
    stats: {
      dose: ({ value }) => `Doza\n${value} g`,
      water: ({ value }) => `Woda\n${value} ml`,
      temp: ({ value }) => `Temp\n${value} C`,
      time: ({ value }) => `Czas\n${value}`,
      steps: ({ value }) => `Kroki\n${value}`,
      color: ({ value }) => `Kolor\n${value}`
    },
    misc: {
      notSpecified: "Brak",
      metricsUnavailable: "Brak metryk",
      unknownDate: "Nieznana data"
    }
  }
};
