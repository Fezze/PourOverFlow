# Start Here

## Po co jest ten plik

To jest skondensowany handoff dla kolejnego agenta lub developera. Ma pozwolic wejsc w repo bez czytania wszystkiego naraz, ale bez gubienia najwazniejszych decyzji.

## Repo w jednym zdaniu

Budujemy Zepp mini-app do prowadzenia parzenia kawy na zegarku, gdzie telefon zarzadza recepturami i historia, a zegarek wykonuje sesje i umie je wznowic.

## Obowiazkowy skill

Kazdy agent pracujacy nad tym repo ma traktowac `zepp-miniapp-builder` jako domyslny skill roboczy. To nie jest opcjonalna wskazowka. Projekt ma byc prowadzony zgodnie z ograniczeniami, routingiem wersji i architektura Zepp OS.

## Co juz jest gotowe

- dokumentacja produktu,
- architektura Zepp,
- model domeny,
- kontrakty storage i sync,
- flow watch/phone,
- etapowy plan implementacji,
- seed library,
- kontrakt manifestu i Settings UI,
- scaffold Zepp app z przechodzacym `zeus build`,
- seed danych w `settingsStorage`,
- prawdziwy CRUD receptur i notatek historii w `setting/`,
- runtime sync `REQUEST_BOOTSTRAP` / `PUSH_*` / `UPSERT_HISTORY_ENTRY` / `ACK_HISTORY_ENTRY`,
- watch cache w `LocalStorage` dla katalogu, ostatniego wyniku i metadanych sync,
- podstawowe testy logiki dla walidatorow, phone storage i kontraktow sync.

## Czego jeszcze nie ma

- docelowego engine'u krokow i feedbacku runtime,
- storage-backed `active_session_v1`,
- pelnego live rerenderu placeholderowych stron watch po przyjsciu snapshotu,
- mockowanego runtime Zepp i testow lifecycle / replay kolejki.

## Przeczytaj najpierw

1. [README.md](c:\Users\krzys\Projects\PourOverFlow\README.md)
2. [AGENTS.md](c:\Users\krzys\Projects\PourOverFlow\AGENTS.md)
3. [01-zepp-architecture.md](c:\Users\krzys\Projects\PourOverFlow\docs\01-zepp-architecture.md)
4. [02-domain-model.md](c:\Users\krzys\Projects\PourOverFlow\docs\02-domain-model.md)
5. [03-sync-and-storage.md](c:\Users\krzys\Projects\PourOverFlow\docs\03-sync-and-storage.md)
6. [04-watch-and-phone-flows.md](c:\Users\krzys\Projects\PourOverFlow\docs\04-watch-and-phone-flows.md)
7. [05-seed-library.md](c:\Users\krzys\Projects\PourOverFlow\docs\05-seed-library.md)
8. [06-manifest-and-ui-contract.md](c:\Users\krzys\Projects\PourOverFlow\docs\06-manifest-and-ui-contract.md)
9. [TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md)

## Startup protocol dla nowego agenta

Kazdy nowy agent zaczynajacy prace ma wykonac te kroki w tej kolejnosci:

1. przeczytac dokumenty z listy powyzej,
2. przejrzec [TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md),
3. posprzatac przeterminowane albo wykonane punkty, jesli backlog jest nieaktualny,
4. wskazac najlepszy nastepny krok,
5. dopiero potem wejsc w implementacje.

Nie wolno rozpoczynac pracy od losowego zadania bez przegladu backlogu i dokumentacji.

## Twarde zasady

- Nie dodawaj nowych typow narzedzi poza whitelist.
- Nie traktuj zegarka jako zrodla prawdy dla historii.
- Nie lacz CRUD receptur z watch UI.
- Nie opieraj timera sesji na `AppService`.
- Nie dodawaj funkcji spoza v1 bez aktualizacji dokumentow i jawnej decyzji.

## Najwazniejsze byty

- `ToolDefinition`
- `RecipeRecord`
- `RecipeStep`
- `RecipeSnapshot`
- `ActiveBrewSession`
- `HistoryEntry`
- `SyncEnvelope`

Jesli ktorykolwiek z tych bytow zmienia ksztalt, aktualizacja dokumentacji jest obowiazkowa.

## Najwazniejsze klucze storage

Telefon:

- `pof_tools_v1`
- `pof_recipe_index_v1`
- `pof_recipe_<id>_v1`
- `pof_history_index_v1`
- `pof_history_<id>_v1`
- `pof_sync_meta_v1`

Zegarek:

- `active_session_v1`
- `catalog_cache_v1`
- `last_result_v1`
- `sync_meta_v1`

Pomocniczy klucz telefonu, niekanoniczny dla sync:

- `pof_settings_ui_state_v1`

## Najwazniejsze wiadomosci sync

- `REQUEST_BOOTSTRAP`
- `PUSH_TOOL_CATALOG`
- `PUSH_CATALOG_SNAPSHOT`
- `PUSH_HISTORY_SNAPSHOT`
- `UPSERT_HISTORY_ENTRY`
- `ACK_HISTORY_ENTRY`

## Najblizszy cel

Zrealizowac Etap 5 z [TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md), czyli dopracowac watch browse i recipe engine na danych przychodzacych z telefonu, z czytelniejszym flow krokow i przygotowaniem pod runtime feedback.

## Utrzymanie TODO i dokumentow

- Kazde nowe odkryte zadanie, ryzyko albo follow-up ma trafic do [TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md) lub do odpowiedniego dokumentu architektonicznego.
- Po zakonczeniu pracy agent ma usunac albo zaktualizowac wykonane punkty.
- `TODO.md` ma byc zywym backlogiem, a nie magazynem nieaktualnych notatek.

## Definition of done dla Etapu 4

- istnieje `REQUEST_BOOTSTRAP` oraz odpowiedzi `PUSH_TOOL_CATALOG`, `PUSH_CATALOG_SNAPSHOT`, `PUSH_HISTORY_SNAPSHOT`,
- watch wysyla `UPSERT_HISTORY_ENTRY` i przyjmuje `ACK_HISTORY_ENTRY`,
- `app-side` ignoruje `pof_settings_ui_state_v1`,
- watch zapisuje `catalog_cache_v1`, `last_result_v1` i `sync_meta_v1`,
- watch browse korzysta z danych zsynchronizowanych z telefonu zamiast lokalnego seed preview,
- istnieja podstawowe testy kontraktow sync,
- `npm test` i `zeus build` przechodza.

## Wazne odkrycia z Etapu 2, 3 i 4

- Zeus v4 scaffold poprawnie buduje target-based ikony z `assets/common.r/icon.png` i `assets/common.s/icon.png`.
- `setting/index.js` jest praktycznym entrypointem dla toolchainu, nawet jesli glowny kod Settings App trzymamy w `.jsx`.
- Obecny watch flow nie jest juz lokalnym seed preview, ale session engine nadal pozostaje scaffoldowy i `activeSession` dalej siedzi w pamieci procesu.
- `setting/` uzywa pomocniczego klucza `pof_settings_ui_state_v1` do zapisu stanu widokow i draftow. Klucz ma byc ignorowany przez `app-side` i przyszly runtime sync.
- Przy aktualnym placeholderowym UI watch przychodzacy snapshot odswieza cache od razu, ale nie wymusza jeszcze pelnego rerenderu aktualnie otwartej strony.
