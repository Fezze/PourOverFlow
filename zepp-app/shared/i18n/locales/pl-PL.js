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
      completed: "Ukonczono",
      aborted: "Przerwano",
      expired: "Wygaslo"
    },
    sessionStatus: {
      running: "Trwa",
      waiting_for_confirm: "Czeka na potwierdzenie",
      completed: "Ukonczono",
      aborted: "Przerwano",
      expired: "Wygaslo"
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
        description: "Imersja / cisnieniowa hybryda"
      },
      tool_v60: {
        label: "Hario V60",
        description: "Klasyczny stozkowy pour-over"
      },
      tool_kalita_wave: {
        label: "Kalita Wave",
        description: "Pour-over z plaskim dnem"
      },
      tool_chemex: {
        label: "Chemex",
        description: "Duzy brewer z papierowym filtrem"
      },
      tool_clever_dripper: {
        label: "Clever Dripper",
        description: "Imersja z kontrolowanym odplywem"
      },
      tool_french_press: {
        label: "French Press",
        description: "Pelna imersja"
      }
    },
    counts: {
      recipes: ({ count }) => (count === 1 ? "1 przepis" : `${count} przepisy`),
      brewers: ({ count }) => (count === 1 ? "1 brewer" : `${count} brewery`),
      historyEntries: ({ count }) => (count === 1 ? "1 wpis historii" : `${count} wpisy historii`),
      archivedBrews: ({ count }) => (count === 1 ? "1 archiwalne parzenie w telefonie." : `${count} archiwalne parzenia w telefonie.`)
    }
  },
  schema: {
    defaultRecipe: {
      filterLabel: "Papier",
      grindLabel: "Sredni"
    },
    defaultSteps: {
      prep: {
        title: "Przygotowanie",
        body: "Przygotuj brewer i wsyp kawe."
      },
      done: {
        title: "Gotowe",
        body: "Zakoncz parzenie."
      }
    },
    fallbackSteps: {
      step: "Krok",
      confirm: "Potwierdz",
      finish: "Gotowe",
      finishBody: "Zakoncz parzenie.",
      continueBody: "Wykonaj krok i przejdz dalej."
    }
  },
  watch: {
    home: {
      title: {
        default: "Zaparzacze"
      },
      subtitle: {
        resume: "Wznow",
        nextCup: "Nastepna kawa",
        chooseBrewer: "Wybierz metode"
      },
      body: {
        lastBrewLabel: "Ostatni brew",
        ready: "Gotowe",
        recipesReady: ({ count }) => `${count} gotowe`,
        stepProgress: ({ current, total }) => `Krok ${current}/${total}`
      },
      actions: {
        resume: "Wznow",
        browse: "Przegladaj",
        discard: "Odrzuc",
        sync: "Sync",
        last: "Ostatni"
      }
    },
    toolList: {
      title: "Zaparzacze",
      empty: "Brak zsynchronizowanych metod",
      refresh: "Odswiez biblioteke"
    },
    recipeList: {
      empty: "Brak przepisow",
      refresh: "Odswiez z telefonu",
      titleFallback: "Przepisy",
      snapshotMissing: "Brak snapshotu"
    },
    recipeDetail: {
      unavailableTitle: "Brak przepisu",
      unavailableBody: "Otworz liste przepisow ponownie albo odswoez sync z telefonu.",
      actions: {
        start: "Start",
        back: "Wroc"
      },
      rows: {
        doseWater: "Doza i woda",
        brewProfile: "Profil parzenia",
        timeAndSteps: "Czas i kroki",
        notes: "Notatki",
        startWhenReady: "Startuj, gdy bedziesz gotowy."
      },
      detail: {
        doseWater: ({ coffeeDoseG, totalWaterMl }) => `${coffeeDoseG}g kawy / ${totalWaterMl}ml wody`,
        brewProfile: ({ waterTempC, grindLabel, filterLabel }) => `${waterTempC}C / ${grindLabel} / filtr ${filterLabel}`,
        timeAndSteps: ({ totalSeconds, stepCount }) => `${totalSeconds}s / ${stepCount} krokow`
      }
    },
    brewActive: {
      noActiveBrew: "Brak aktywnego brew",
      noSessionStored: "Brak zapisanej sesji na zegarku.",
      goHome: "Do domu",
      unknownStep: "Nieznany krok",
      noStepPayload: "Brak tresci kroku",
      actions: {
        next: "Dalej",
        finish: "Koniec",
        skip: "Pomin",
        stop: "Stop"
      },
      meta: {
        targetMl: ({ value }) => `Cel ${value} ml`,
        pourMl: ({ value }) => `Wlej ${value} ml`,
        left: ({ duration }) => `${duration} zostalo`,
        session: ({ duration }) => `Sesja ${duration}`
      },
      progress: ({ current, total }) => `Krok ${current}/${total}`
    },
    resultSummary: {
      noResultYet: "Brak wyniku",
      noSummary: "Na zegarku nie ma jeszcze zapisanego podsumowania.",
      actions: {
        home: "Dom",
        browse: "Przegladaj"
      },
      rows: {
        status: "Status",
        totalTime: "Laczny czas",
        timingDelta: "Odchylenie czasu",
        totalTimeValue: ({ seconds }) => `${seconds}s lacznie`,
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
      historyTitle: "Historia parzen",
      historySubtitle: ({ historyOverview }) => historyOverview,
      historyDetailTitle: "Szczegoly historii",
      historyDetailSubtitle: "Notatki i oceny z telefonu zostaja przy archiwalnym wpisie.",
      syncTitle: "Status sync",
      syncSubtitle: "Telefon pozostaje kanoniczny. Zegarek trzyma tylko to, czego potrzebuje.",
      homeTitle: "PourOverFlow",
      homeSubtitle: ({ libraryOverview }) => libraryOverview
    },
    overview: {
      library: ({ toolCount, recipeCount, includeHistory, historyCount }) => {
        const parts = [`${toolCount} brewerow`, `${recipeCount} przepisow`];

        if (includeHistory) {
          parts.push(`${historyCount} wpisow historii`);
        }

        return parts.join(" - ");
      },
      sync: ({ toolRevision, recipeRevision, historyRevision }) => `Rewizja metod: ${toolRevision}\nRewizja przepisow: ${recipeRevision}\nRewizja historii: ${historyRevision}`
    },
    messages: {
      noRecipesYet: "Brak przepisow dla tej metody.\nDodaj pierwszy tutaj.",
      recipeDraftMissing: "Brak draftu przepisu.",
      historyEntryNotFound: "Nie znaleziono wpisu historii.",
      noHistoryYet: "Brak wpisow historii.\nPojawia sie tutaj po wyslaniu zakonczonych lub przerwanych sesji z zegarka.",
      recipeSaved: ({ name }) => `Zapisano przepis: ${name}`,
      recipeDuplicated: ({ name }) => `Zduplikowano przepis: ${name}`,
      recipeDeleted: "Usunieto przepis. Historia zostala zachowana.",
      recipeRecordNotFound: "Nie znaleziono rekordu przepisu.",
      historyNoteSaved: "Zapisano notatke historii."
    },
    library: {
      newRecipe: "Nowy przepis",
      brewers: "Metody",
      recipesTitle: "Przepisy",
      emptyShelfTitle: "Pusta polka",
      recipeListSubtitle: "Stuknij karte przepisu, aby go edytowac. Duplikuj albo usun z rzedu akcji.",
      recipeListEmptySubtitle: ({ toolLabel }) => `Dodaj tu pierwszy przepis dla ${toolLabel}.`,
      recipeSource: {
        seed: "Startowy przepis",
        user: "Wlasny przepis"
      },
      updatedAt: ({ dateLabel }) => `Zaktualizowano ${dateLabel}`,
      duplicate: "Duplikuj",
      delete: "Usun"
    },
    history: {
      recentBrews: "Ostatnie parzenia",
      recentBrewsSubtitle: "Otworz wpis, aby zobaczyc czas, ocene i notatki z telefonu.",
      detailTitle: "Szczegoly historii",
      detailSubtitle: "Archiwalny snapshot, czasy i notatki z telefonu.",
      stepTimingTitle: "Czasy krokow",
      stepTimingSubtitle: "Wyniki przebiegu zapisane przy archiwalnym snapshocie przepisu.",
      feedbackTitle: "Ocena z telefonu",
      feedbackSubtitle: "Notatki i ocena zostaja przy tej archiwalnej sesji.",
      noStepResults: "Dla tego parzenia nie zapisano wynikow krokow.",
      saveNotes: "Zapisz notatki",
      backToHistory: "Wroc do historii",
      rated: ({ rating }) => `Ocena ${rating}/5`,
      deltaOver: ({ duration }) => `${duration} ponad plan`,
      deltaUnder: ({ duration }) => `${duration} ponizej planu`,
      filter: ({ filterLabel }) => `Filtr: ${filterLabel || "Brak"}`
    },
    sync: {
      overviewTitle: "Przeglad sync",
      overviewSubtitle: "Zegarek trzyma tylko przepisy, stan cache i ostatni wynik."
    },
    editor: {
      editingExisting: "Edytujesz istniejacy przepis.",
      creatingNew: "Tworzysz nowy przepis.",
      recipeEditorTitle: "Edytor przepisu",
      recipeEditorSubtitle: "Ustaw profil parzenia i kroki dla zegarka.",
      recipeBasicsTitle: "Podstawy przepisu",
      recipeBasicsSubtitle: "Tozsamosc, metoda i krotki opis.",
      brewProfileTitle: "Profil parzenia",
      brewProfileSubtitle: "Liczby widoczne w bibliotece, na zegarku i w historii.",
      guidedStepsTitle: "Kroki prowadzone",
      guidedStepsSubtitle: ({ stepCount }) => `${stepCount} krokow definiuje guidance na zegarku.`,
      notesAndSaveTitle: "Notatki i zapis",
      notesAndSaveSubtitle: "Notatki przepisu zostaja w rekordzie telefonu i pomagaja przy kolejnych edycjach.",
      stepEditorSubtitle: "Instrukcja dla zegarka",
      saveRecipe: "Zapisz przepis",
      cancel: "Anuluj",
      previous: "Wczesniej",
      next: "Dalej",
      addStep: "Dodaj krok",
      up: "W gore",
      down: "W dol",
      delete: "Usun",
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
      title: "Tytul",
      body: "Tresc",
      durationMs: "Czas ms",
      targetTotalMl: "Cel laczny ml",
      requiresConfirm: "Wymaga potwierdzenia",
      feedbackCue: "Cue haptyczne",
      notes: "Notatki",
      rating: "Ocena",
      note: "Notatka"
    },
    options: {
      feedbackCue: {
        none: "brak",
        vibrate_short: "krotka haptyka",
        vibrate_long: "dluga haptyka",
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
