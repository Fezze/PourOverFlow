# PourOverFlow v1 - flow zegarka i telefonu

## Mapa flow

Produkt ma dwa glowne runtime'y:

- watch runtime: wykonanie i resume sesji,
- phone runtime: edycja i archiwizacja.

## Watch flow 1 - start aplikacji

### Cel

Wystartowac szybko nawet bez telefonu.

### Kroki

1. `page/home` odczytuje `active_session_v1`.
2. `page/home` odczytuje `catalog_cache_v1`.
3. Jesli istnieje aktywna sesja o statusie `running` albo `waiting_for_confirm`, pokazac ekran resume gate.
4. Jesli nie ma aktywnej sesji, przejsc do `tool-list`.
5. Niezaleznie od powyzszego wyslac `REQUEST_BOOTSTRAP`.

### Resume gate

Resume gate nie jest osobna strona. To prosty stan `home`, ktory daje dwa przyciski:

- `Resume brew`
- `Discard session`

`Discard session` czyta snapshot tylko do zbudowania `HistoryEntry` ze statusem `aborted`, a nastepnie czysci `active_session_v1`.

## Watch flow 2 - wybor narzedzia

### Ekran

`tool-list`

### Zachowanie

- pokazac tylko narzedzia z `supported: true`,
- sortowanie po `sortOrder`,
- kazdy row pokazuje ikone, label i liczbe dostepnych receptur dla danego `toolId`,
- klik na narzedzie otwiera `recipe-list` z router param `toolId`.

### Empty state

Jesli dane dla narzedzia nie maja zadnej receptury:

- nadal pokazac narzedzie w liscie,
- w `recipe-list` pokazac pusty stan z CTA `Create on phone`.

## Watch flow 3 - wybor receptury

### Ekran

`recipe-list`

### Zachowanie

- pobrac `toolId` z router params,
- wyrenderowac `RecipeSummary[]` tylko dla tego narzedzia,
- kazdy row pokazuje nazwe, kolor, update recency i skrot podstawowych parametrow,
- klik na recepture otwiera ekran potwierdzenia startu albo od razu `brew-active`.

### Dane wiersza receptury

Minimalny zestaw w UI:

- nazwa,
- kolor receptury,
- `coffeeDoseG`,
- `totalWaterMl`,
- `estimatedTotalDurationMs`.

## Watch flow 4 - start sesji

### Scenariusz

1. uzytkownik wybiera recepture,
2. watch odczytuje `RecipeSnapshot` z `catalog_cache_v1.recipeSnapshotsById`,
3. tworzy `ActiveBrewSession`,
4. zapisuje `active_session_v1`,
5. ustawia `setWakeUpRelaunch(true)`,
6. ustawia `setPageBrightTime(...)`,
7. przechodzi do aktywnego widoku sesji.

### Wazna regula

Po starcie sesji nie wolno juz czytac `RecipeRecord` z cache, aby "dociagac" zmiany. Sesja zawsze jedzie na snapshotcie startowym.

## Watch flow 5 - aktywne parzenie

### Ekran

`brew-active`

### Sekcje ekranu

- header: nazwa receptury i nazwa narzedzia,
- current step: tytul i opis,
- primary timer: timer kroku, jesli krok jest czasowy,
- secondary timer: timer calej sesji,
- brew metadata: `waterMl` i `targetTotalWaterMl`, jesli istnieja,
- CTA:
  - `Next`
  - `Abort`

### Zachowanie dla krokow

#### `instruction`

- nie ma odliczania,
- przejscie dalej tylko po `Next`.

#### `timed_action`

- odlicza `durationMs`,
- po zakonczeniu moze auto-przejsc dalej, jesli `requiresConfirm: false`,
- jesli `requiresConfirm: true`, zatrzymuje sie i czeka na `Next`.

#### `timed_wait`

- odlicza `durationMs`,
- po zakonczeniu auto-przechodzi dalej.

#### `confirm`

- zero-timer,
- wymaga `Next`.

#### `finish`

- konczy sesje,
- wywoluja finalny feedback i zapis historii.

### Persist policy

`active_session_v1` ma byc zapisywane:

- przy starcie sesji,
- przy rozpoczeciu kazdego kroku,
- przy zakonczeniu kazdego kroku,
- przy `Abort`,
- przy `Complete`.

## Watch flow 6 - resume po wygaszeniu lub powrocie

### Cel

Przywrocic sensowny stan bez udawania pelnego background engine.

### Resume rules

- `home` czyta `active_session_v1`,
- jesli obecny krok byl czasowy, nalezy przeliczyc, ile czasu uplynelo na podstawie `expectedStepEndAt`,
- jesli timer juz minol, krok ma wejsc w stan zakonczony i od razu przejsc do kolejnego albo do oczekiwania na `Next`,
- caly proces ma dzialac bez kontaktu z telefonem.

### What not to do

- nie wznawiac sesji przez odtworzenie "tick po ticku",
- nie zalezec od `AppService`,
- nie czekac z resume na nowy bootstrap.

## Watch flow 7 - zakonczenie sesji

### Completed

1. zbudowac `HistoryEntry`,
2. zapisac `LastResultSummary`,
3. zapisac lub zaktualizowac `sync_meta_v1.pendingHistoryQueue`,
4. wyslac `UPSERT_HISTORY_ENTRY`,
5. wyczyscic `active_session_v1`,
6. przejsc do `result-summary`.

### Aborted

Abort tworzy `HistoryEntry` ze statusem `aborted`, o ile sesja byla juz faktycznie uruchomiona. Nie zapisujemy pustych aborted entries, jesli uzytkownik nigdy nie wyszedl poza ekran startu receptury.

## Watch flow 8 - ekran wyniku

### Ekran

`result-summary`

### Zawartosc

- nazwa receptury,
- status,
- czas calkowity,
- podstawowa delta czasowa,
- CTA `Done`.

### Czego tu nie robimy

- pelnej edycji notatki,
- pelnej oceny tekstowej,
- przegladania calej historii.

## Phone flow 1 - boot `setting/`

### Widok startowy

`library-home`

### Zawartosc

- sekcja wspieranych narzedzi,
- liczba receptur per narzedzie,
- wejscie do `history-list`,
- sekcja stanu synchronizacji.

### Zachowanie

- `setting/` korzysta bezposrednio z `settingsStorage`,
- kazda zmiana zapisuje rekord i indeks, a `app-side/` odbiera to reaktywnie.

## Phone flow 2 - lista receptur

### Wejscie

Z `library-home` po kliknieciu narzedzia.

### Widok

- lista receptur dla jednego `toolId`,
- przyciski `Create`, `Edit`, `Delete`, `Duplicate`.

### Reguly

- `Create` zawsze wymaga wybranego narzedzia z whitelisty,
- `Duplicate` kopiuje caly rekord i tworzy nowy `recipeId`,
- `Delete` usuwa rekord receptury, ale nie historie.

## Phone flow 3 - edytor receptury

### Pola formularza

- `name`
- `toolId` z read-only lub controlled select whitelisty
- `colorToken`
- `description`
- `coffeeDoseG`
- `totalWaterMl`
- `waterTempC`
- `filterLabel`
- `grindLabel`
- `estimatedTotalDurationMs`
- `notes`
- `steps[]`

### Edycja krokow

Kazdy krok ma osobny sub-form:

- `title`
- `body`
- `kind`
- `durationMs`
- `waterMl`
- `targetTotalWaterMl`
- `requiresConfirm`
- `feedbackCue`

### Walidacje UX

- nie pozwalac zapisac receptury bez `finish` na koncu,
- nie pozwalac ustawic nieistniejacego `toolId`,
- nie pozwalac zapisac pustej listy krokow.

## Phone flow 4 - historia

### `history-list`

- lista `HistoryIndexEntry`,
- sortowanie `endedAt desc`,
- filtrowanie po `toolId` jako opcjonalny enhancement, nie baseline.

### `history-detail`

- pelny snapshot receptury,
- lista wynikow krokow,
- status sesji,
- ocena i notatka usera.

### Regula edycji

Notatka i ocena sa edytowane tylko na `history-detail`, nie w samej recepcie.

## Phone flow 5 - delete recipe

### Oczekiwane zachowanie

1. usunac `RecipeRecord`,
2. zaktualizowac `RecipeSummary[]`,
3. nie ruszac zadnego `HistoryEntry`,
4. po sync zegarek ma przestac pokazywac te recepte w katalogu,
5. `last_result_v1` moze nadal odnosic sie do starej nazwy ze snapshotu.

## Synchronizacja - scenariusze

### Recipe changed on phone during active brew

- aktywna sesja na zegarku sie nie zmienia,
- nowa rewizja katalogu dotyczy dopiero kolejnych uruchomien.

### History note added on phone

- `historyRevision` rosnie,
- `PUSH_HISTORY_SNAPSHOT` aktualizuje tylko `latestResult`, jesli zmieniony wpis jest najnowszy,
- zegarek nie pobiera pelnego archiwum.

### Phone unavailable

- user moze nadal uruchomic recepte z cache,
- po zakonczeniu sesji wynik trafia do `pendingHistoryQueue`.

## UI copy i tone

Watch copy ma byc:

- krotka,
- operacyjna,
- zorientowana na dzialanie.

Phone copy moze byc bardziej opisowa, ale nadal bez zbednego rozgadania.

## Decyzje zamrozone

- `home` robi resume gate.
- Watch browse jest zawsze dwuetapowy: `tool -> recipe`.
- Phone ma pelny CRUD receptur i historii.
- Zegarek nie ma edytora receptur.
- Zegarek nie ma pelnego browsera historii.
