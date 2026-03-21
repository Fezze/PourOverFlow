# PourOverFlow v1 - TODO wdrozeniowe

## Zasady ogolne

- Najpierw dokumenty i kontrakty, potem scaffold i implementacja.
- Nie omijac `zeus build`.
- Nie wdrazac background engine jako "pewnego", dopoki nie przejdzie osobnego spike.
- Nie dodawac funkcji spoza scope v1 tylko dlatego, ze "moga sie przydac".
- Ten plik ma byc utrzymywany na biezaco: wykonane punkty usuwaj albo oznaczaj jednoznacznie, nowe zadania dopisuj od razu.
- Jesli w trakcie pracy wyjdzie nowy problem, debt, ograniczenie albo follow-up, dodaj go tutaj lub do odpowiedniego dokumentu architektonicznego jeszcze w tej samej sesji.

## Workflow utrzymania backlogu

Kazdy agent startujacy prace w repo ma:

1. przeczytac ten plik przed implementacja,
2. wybrac najlepszy nastepny krok na podstawie aktualnego stanu repo,
3. zakomunikowac userowi te rekomendacje,
4. po wykonaniu pracy zaktualizowac ten plik.

Przy aktualizacji backlogu:

- usuwaj lub przepisuj punkty juz wykonane,
- dopisuj nowe follow-upy wynikajace z implementacji,
- nie duplikuj tego samego zadania w kilku miejscach bez powodu,
- jesli zadanie zmienia sie z "do zrobienia" w stale ograniczenie architektury, przenies je do odpowiedniego dokumentu i zostaw tu tylko odnosnik lub krotki follow-up.

## Etap 1 - zamrozenie dokumentacji

### Cel

Miec komplet dokumentow, na ktorych moze pracowac kolejny agent bez zgadywania modelu danych i sync.

### Deliverables

- `docs/00-product-goals.md`
- `docs/01-zepp-architecture.md`
- `docs/02-domain-model.md`
- `docs/03-sync-and-storage.md`
- `docs/04-watch-and-phone-flows.md`
- `docs/05-seed-library.md`
- `docs/06-manifest-and-ui-contract.md`
- `docs/TODO.md`

### Acceptance

- katalog narzedzi jest jawny i zamkniety,
- wszystkie klucze storage sa nazwane,
- wszystkie typy wiadomosci sync sa nazwane,
- aktywna sesja, historia i snapshot receptury sa opisane.

## Etap 2 - scaffold Zepp

### Cel

Postawic minimalny repo scaffold zgodny z dokumentami.

### Tasks

- utworzyc `app.json`, `app.js`, `package.json`,
- skonfigurowac `configVersion: "v3"` i `runtime.apiVersion.target: "4.0"`,
- zarejestrowac target `common` dla `round` i `square`,
- trzymac sie kontraktu z `docs/06-manifest-and-ui-contract.md`,
- dodac strony `home`, `tool-list`, `recipe-list`, `brew-active`, `result-summary`,
- dodac `setting/index.jsx`,
- dodac `app-side/index.js`,
- dodac `shared/*`,
- dodac puste asset directories `assets/common.r` i `assets/common.s`.

### Acceptance

- `zeus build` przechodzi,
- simulator uruchamia pusta appke bez crasha,
- routing stron dziala,
- `AppSettingsPage(...)` sie buduje.

### Ryzyka

- niepoprawny manifest,
- niepoprawna rejestracja stron,
- rozjazd layout files round vs square.

### Status

- wykonane: scaffold istnieje i `zeus build` przechodzi,
- wykonane: sa strony `home`, `tool-list`, `recipe-list`, `brew-active`, `result-summary`,
- wykonane: istnieja `setting/`, `app-side/`, `shared/` i placeholderowe assets,
- uwaga: watch runtime jest na razie scaffoldem in-memory, a nie docelowym `LocalStorage` / sync implementation.

## Etap 3 - storage i phone CRUD

### Cel

Uruchomic kanoniczna warstwe danych po stronie telefonu.

### Tasks

- seedowac `pof_tools_v1`,
- seedowac recipes zgodnie z `docs/05-seed-library.md`,
- zaimplementowac `RecipeRecord`, `RecipeSummary`, `HistoryEntry` i walidatory,
- zrobic `setting/` z widokami:
  - `library-home`
  - `recipe-list`
  - `recipe-editor`
  - `history-list`
  - `history-detail`
- zaimplementowac CRUD receptur,
- zaimplementowac odczyt i edycje historii,
- pilnowac zasady "delete recipe keeps history".

### Acceptance

- mozna utworzyc recepte dla wspieranego `toolId`,
- nie da sie zapisac recepty dla niewspieranego `toolId`,
- mozna usunac recepte bez utraty historii,
- historia i receptury sa rozlozone na `index + records`.

### Testy

- testy walidatorow rekordow,
- testy delete policy,
- testy serializacji JSON.

### Status

- wykonane: seed library i seed do `settingsStorage`,
- wykonane: `RecipeRecord`, `RecipeSummary`, `HistoryEntry` i walidatory,
- wykonane: `setting/` z widokami `library-home`, `recipe-list`, `recipe-editor`, `history-list`, `history-detail`, `about-sync`,
- wykonane: CRUD receptur i edycja notatek historii,
- wykonane: podstawowe testy Node dla walidatorow i phone storage,
- uwaga: `app-side/` na tym etapie seeduje dane i loguje zmiany, ale nie wysyla jeszcze snapshotow do watch runtime.

## Etap 4 - `app-side/` i synchronizacja

### Cel

Zrobic bootstrap i push danych z telefonu do zegarka.

### Tasks

- seed przy pierwszym uruchomieniu,
- implementacja `messaging.peerSocket`,
- `REQUEST_BOOTSTRAP`,
- `PUSH_TOOL_CATALOG`,
- `PUSH_CATALOG_SNAPSHOT`,
- `PUSH_HISTORY_SNAPSHOT`,
- `UPSERT_HISTORY_ENTRY`,
- `ACK_HISTORY_ENTRY`,
- kodowanie i dekodowanie przez `stringToBuffer` i `bufferToString`.
- ignorowanie `pof_settings_ui_state_v1` w listenerach storage i podczas normalizacji snapshotow.

### Acceptance

- watch dostaje katalog narzedzi i receptur po bootstrappie,
- watch dostaje ostatni wynik,
- `UPSERT_HISTORY_ENTRY` zapisuje historie po stronie telefonu,
- `ACK_HISTORY_ENTRY` czysci pending queue na zegarku.

### Testy

- encode/decode message envelopes,
- replay `pendingHistoryQueue`,
- walidacja rewizji i fallback na uszkodzony payload.

### Status

- wykonane: `app-side` obsluguje `REQUEST_BOOTSTRAP`, `UPSERT_HISTORY_ENTRY` i wysylanie `PUSH_*`,
- wykonane: watch most korzysta z BLE po stronie device i `peerSocket` po stronie phone,
- wykonane: `catalog_cache_v1`, `last_result_v1` i `sync_meta_v1` sa zapisywane lokalnie na watch,
- wykonane: watch router czyta receptury ze zsynchronizowanego katalogu telefonu,
- wykonane: podstawowe testy kontraktow sync i normalizacji snapshotow,
- follow-up: placeholderowe watch pages nie maja jeszcze pelnego live rerenderu po przyjsciu snapshotu podczas otwartej strony.

## Etap 5 - watch browse i recipe engine

### Cel

Uruchomic glowny flow `tool -> recipe -> active brew`.

### Tasks

- `home` z resume gate,
- `tool-list` z whitelist katalogu,
- `recipe-list` filtrowane po `toolId`,
- start sesji na `RecipeSnapshot`,
- `recipe-engine` i `session-reducer`,
- UI dla `instruction`, `timed_action`, `timed_wait`, `confirm`, `finish`,
- feedback layer dla haptyki i opcjonalnie audio,
- zapis `active_session_v1` i `last_result_v1`.
- dorobic sensowny refresh aktualnie otwartej strony po przyjsciu nowych snapshotow z telefonu.

### Acceptance

- user moze przejsc przez cala sesje,
- timer kroku i timer calosci sa widoczne rownolegle,
- `confirm` wymaga recznego przejscia,
- `finish` zapisuje wynik i czysci aktywna sesje.

### Testy

- logika reducera,
- przejscia miedzy typami krokow,
- serializacja `ActiveBrewSession`,
- simulator round i square.

## Etap 6 - resume, offline i twarde testy

### Cel

Upewnic sie, ze v1 zachowuje sie sensownie po przerwaniu.

### Tasks

- `setWakeUpRelaunch(true)` na `brew-active`,
- `setPageBrightTime(...)` na `brew-active`,
- resume z `active_session_v1`,
- obsluga `pendingHistoryQueue`,
- last result summary,
- fallbacki dla pustego albo uszkodzonego cache.

### Acceptance

- po wyjsciu i powrocie do aplikacji sesja daje sie wznowic,
- brak telefonu nie blokuje dalszego flow,
- offline-complete trafia do `pendingHistoryQueue`,
- po odzyskaniu sync wpis trafia do telefonu.

### Testy

- mocked resume,
- replay kolejki,
- testy na prawdziwym urzadzeniu dla wygaszania, haptyki i dzwieku.

## Etap 7 - eksperymentalny spike background reminders

### Cel

Zweryfikowac, czy `AppService` i `createSysTimer()` sa warte rozwijania po v1 core.

### Tasks

- zbadac `AppService` z `device:os.bg_service`,
- sprawdzic realne ograniczenia timers/background na konkretnym sprzecie,
- zbadac, czy reminder po wygaszeniu ma sens UX-owo i technicznie,
- nie laczyc tego z glowna logika timera, dopoki spike nie przejdzie.

### Acceptance

- pisemna decyzja `go / no-go`,
- osobny dokument techniczny albo ADR,
- brak regresji w baseline v1.

## Lista testow obowiazkowych

### Pure logic

- walidacja `toolId` whitelisty,
- walidacja krokow receptury,
- budowanie snapshotu sesji,
- budowanie `HistoryEntry`,
- encode/decode sync messages.

### Mocked runtime

- lifecycle stron,
- bootstrap z cache,
- update katalogu po sync,
- zapis i replay `pendingHistoryQueue`.

### Simulator

- `round`,
- `square`,
- flow `tool -> recipe -> brew`,
- `confirm` i `finish`,
- resume po restarcie aplikacji.

### Real device

- wibracja,
- opcjonalny dzwiek,
- wygaszanie ekranu,
- wake-up relaunch,
- komfort uzycia podczas realnego parzenia.

## Explicitly not now

- backend,
- cloud sync,
- import zewnetrznych receptur,
- widgets/cards,
- BLE integrations,
- band layout,
- pelna historia na zegarku.

## Decision log dla kolejnego agenta

- `Tool` jest read-only.
- `setting/` nie ma CRUD dla narzedzi.
- Historia zostaje po delete receptury.
- `PUSH_HISTORY_SNAPSHOT` to tylko ostatni wynik.
- `AppService` jest spike, nie baseline.
- Zeus target-based scaffold potrzebuje ikon pod `assets/<target>.<shape>/icon.png`.
- `setting/index.js` zostal dodany jako JS shim do kodu Settings App, bo sam `index.jsx` nie byl wystarczajacym entrypointem dla builda.
- Watch cache i sync meta sa juz storage-backed, ale `active_session_v1` nadal pozostaje follow-upem dalszych etapow.
- `pof_settings_ui_state_v1` jest kluczem pomocniczym Settings App i nie nalezy do kanonicznego modelu sync.
- Etap 4 ma juz runtime sync i storage-backed cache, ale `active_session_v1` nadal czeka na docelowa implementacje i resume hardening.
