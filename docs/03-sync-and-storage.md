# PourOverFlow v1 - synchronizacja i storage

## Zasady ownership

### Telefon

Telefon jest zrodlem prawdy dla:

- katalogu narzedzi,
- receptur,
- historii,
- rewizji sync.

Telefon przechowuje te dane w `settingsStorage` jako stringi JSON.

### Zegarek

Zegarek przechowuje tylko dane operacyjne:

- lokalny cache katalogu,
- aktywna sesje,
- ostatni wynik,
- metadane synchronizacji wraz z kolejka niezsynchronizowanych wpisow historii.

## Klucze storage po stronie telefonu

| key | zawartosc | uwagi |
| --- | --- | --- |
| `pof_tools_v1` | `ToolDefinition[]` | seedowane przy pierwszym uruchomieniu |
| `pof_recipe_index_v1` | `RecipeSummary[]` | lista lekka, bez krokow |
| `pof_recipe_<id>_v1` | `RecipeRecord` | pelny rekord receptury |
| `pof_history_index_v1` | `HistoryIndexEntry[]` | summary historii |
| `pof_history_<id>_v1` | `HistoryEntry` | pelny rekord historii |
| `pof_sync_meta_v1` | `PhoneSyncMeta` | rewizje i stan synchronizacji |
| `pof_settings_ui_state_v1` | `SettingsUiState` | pomocniczy stan Settings App, niekanoniczny dla sync |

## Klucze storage po stronie zegarka

| key | zawartosc | uwagi |
| --- | --- | --- |
| `active_session_v1` | `ActiveBrewSession \| null` | tylko jedna aktywna sesja |
| `catalog_cache_v1` | `WatchCatalogCache` | tools + recipes |
| `last_result_v1` | `LastResultSummary \| null` | tylko ostatni wynik |
| `sync_meta_v1` | `WatchSyncMeta` | rewizje, bootstrap i kolejka pending |

## Rekordy indeksowe

### `HistoryIndexEntry`

```ts
interface HistoryIndexEntry {
  historyId: string
  toolId: string
  recipeName: string
  status: 'completed' | 'aborted' | 'expired'
  endedAt: number
  elapsedMs: number
  updatedAt: number
}
```

### `PhoneSyncMeta`

```ts
interface PhoneSyncMeta {
  schemaVersion: 1
  toolCatalogRevision: number
  recipeCatalogRevision: number
  historyRevision: number
  seededAt: number
  lastBootstrapAt?: number
  lastWatchSeenAt?: number
}
```

### `WatchCatalogCache`

```ts
interface WatchCatalogCache {
  schemaVersion: 1
  toolCatalogRevision: number
  recipeCatalogRevision: number
  tools: ToolDefinition[]
  recipesByTool: Record<string, RecipeSummary[]>
  recipeSnapshotsById: Record<string, RecipeSnapshot>
  cachedAt: number
}
```

### `WatchSyncMeta`

```ts
interface WatchSyncMeta {
  schemaVersion: 1
  toolCatalogRevision: number
  recipeCatalogRevision: number
  historyRevision: number
  lastBootstrapAt?: number
  lastAckedHistoryId?: string
  pendingHistoryQueue: HistoryEntry[]
}
```

## Dlaczego `index + records`

`settingsStorage` przechowuje stringi JSON. Z tego powodu:

- nie wolno trzymac calej biblioteki i calej historii w jednym kluczu,
- lista ma byc w indeksie,
- rekord szczegolowy ma miec osobny klucz,
- modyfikacja jednej receptury nie moze wymagac przepisywania calego archiwum.

## Seed danych na telefonie

`app-side/` ma wykonac seed przy pierwszym uruchomieniu:

1. jesli `pof_tools_v1` nie istnieje, zapisac `TOOL_CATALOG`,
2. jesli `pof_recipe_index_v1` nie istnieje, zapisac seed recipes,
3. jesli `pof_history_index_v1` nie istnieje, zapisac pusta liste,
4. jesli `pof_sync_meta_v1` nie istnieje, utworzyc rewizje startowe.

Seed ma byc idempotentny. Kolejne uruchomienia nie nadpisuja danych usera.

`pof_settings_ui_state_v1` nie bierze udzialu w seedzie danych domenowych. To tylko stan UI telefonu.

## Bootstrap flow

### Watch start

1. `home` czyta `catalog_cache_v1`, `active_session_v1`, `sync_meta_v1`.
2. UI rusza od razu z cache, jesli istnieje.
3. Watch wysyla `REQUEST_BOOTSTRAP`.
4. `app-side/` odczytuje telefoniczne rekordy i wysyla snapshoty.
5. Watch aktualizuje `catalog_cache_v1`, `last_result_v1` i `sync_meta_v1`.

### Phone answer order

`app-side/` ma wysylac odpowiedzi w tej kolejnosci:

1. `PUSH_TOOL_CATALOG`
2. `PUSH_CATALOG_SNAPSHOT`
3. `PUSH_HISTORY_SNAPSHOT`

To upraszcza watch bootstrap i walidacje `toolId`.

Listener `settingsStorage` w `app-side/` ma ignorowac zmiany klucza `pof_settings_ui_state_v1`, zeby drafty i przejscia widokow Settings App nie wyzwalaly falszywych refreshy sync.

## Kontrakty wiadomosci

Wszystkie wiadomosci sa opakowane w `SyncEnvelope<T>` i kodowane do `ArrayBuffer`.

### `REQUEST_BOOTSTRAP`

Watch -> phone

```ts
interface RequestBootstrapPayload {
  knownToolCatalogRevision: number
  knownRecipeCatalogRevision: number
  knownHistoryRevision: number
}
```

### `PUSH_TOOL_CATALOG`

Phone -> watch

```ts
interface PushToolCatalogPayload {
  toolCatalogRevision: number
  tools: ToolDefinition[]
}
```

### `PUSH_CATALOG_SNAPSHOT`

Phone -> watch

```ts
interface PushCatalogSnapshotPayload {
  recipeCatalogRevision: number
  recipesByTool: Record<string, RecipeSummary[]>
  recipeSnapshotsById: Record<string, RecipeSnapshot>
}
```

### `PUSH_HISTORY_SNAPSHOT`

Phone -> watch

Ta wiadomosc nie przenosi pelnej historii. V1 wymaga tylko ostatniego wyniku i rewizji historii.

```ts
interface PushHistorySnapshotPayload {
  historyRevision: number
  latestResult: LastResultSummary | null
}
```

### `UPSERT_HISTORY_ENTRY`

Watch -> phone

```ts
interface UpsertHistoryEntryPayload {
  entry: HistoryEntry
}
```

### `ACK_HISTORY_ENTRY`

Phone -> watch

```ts
interface AckHistoryEntryPayload {
  historyId: string
  historyRevision: number
}
```

## Kodowanie i dekodowanie

Dla `API 4.0+` nalezy uzyc:

- `stringToBuffer` do kodowania JSON string -> `ArrayBuffer`,
- `bufferToString` do dekodowania `ArrayBuffer` -> JSON string.

Nie przesylac raw JS objects. Messaging layer ma uzywac tylko `ArrayBuffer`.

## Rewizje danych

### `toolCatalogRevision`

- inkrementowana tylko przy zmianie seed katalogu w nowej wersji aplikacji,
- w normalnym uzyciu user jej nie zmienia.

### `recipeCatalogRevision`

- inkrementowana przy kazdym utworzeniu, edycji, archiwizacji albo usunieciu receptury.

### `historyRevision`

- inkrementowana przy kazdym dodaniu historii albo aktualizacji notatki/oceny.

## Polityka walidacji

### Po stronie telefonu

- odrzucic recepture z nieznanym `toolId`,
- odrzucic `HistoryEntry`, jesli snapshot wskazuje nieistniejacy `toolId`,
- nie zapisywac rekordow bez `schemaVersion: 1`,
- odrzucic puste lub uszkodzone JSON-y.

### Po stronie zegarka

- jesli `PUSH_TOOL_CATALOG` jest uszkodzony, zachowac poprzedni cache,
- jesli brak `recipeSnapshotById` dla `RecipeSummary`, ukryc te recepture,
- jesli przyjdzie `latestResult: null`, wyczyscic `last_result_v1`.

## Zapis historii z zegarka

### Scenariusz online

1. watch konczy sesje,
2. buduje `HistoryEntry`,
3. zapisuje `LastResultSummary`,
4. wysyla `UPSERT_HISTORY_ENTRY`,
5. po `ACK_HISTORY_ENTRY` usuwa wpis z `pendingHistoryQueue`.

### Scenariusz offline

1. watch konczy sesje,
2. zapisuje `LastResultSummary`,
3. dodaje pelny `HistoryEntry` do `sync_meta_v1.pendingHistoryQueue`,
4. przy kolejnym udanym `REQUEST_BOOTSTRAP` kolejka jest replayowana.

### Limit kolejki

`pendingHistoryQueue` ma miec limit 20 wpisow. Po przekroczeniu limitu:

- najstarsze zsynchronizowane wpisy nie powinny sie tam znajdowac,
- jesli limit nadal jest przekroczony, odrzucic najstarszy pending i zapisac warning do logu.

## Delete policy

Usuniecie receptury po stronie telefonu oznacza:

- usuniecie `pof_recipe_<id>_v1`,
- usuniecie wpisu z `pof_recipe_index_v1`,
- inkrementacje `recipeCatalogRevision`.

Nie ruszamy:

- `pof_history_index_v1`,
- zadnego `pof_history_<id>_v1`,
- `last_result_v1` na zegarku, jesli ostatni wynik odwoluje sie do usunietej receptury.

## Watch cache invalidation

Przy przyjeciu nowego `PUSH_CATALOG_SNAPSHOT` zegarek:

1. przepisuje caly `catalog_cache_v1`,
2. nie zmienia `active_session_v1`,
3. nie zmienia `last_result_v1`,
4. aktualizuje rewizje w `sync_meta_v1`.

To jest celowe. Aktywna sesja zyje na snapshotcie.

## Resume policy

Resume opiera sie na `active_session_v1`, nie na sync z telefonu.

Przy resume:

- zegarek wczytuje sesje lokalnie,
- przelicza `elapsedSessionMs` i biezacy stan timerow na podstawie `sessionStartedAt`, `currentStepStartedAt` i `expectedStepEndAt`,
- dopiero potem prosi telefon o bootstrap.

## Bledy i fallbacki

### Brak telefonu

- watch dziala z `catalog_cache_v1`,
- watch moze wznowic `active_session_v1`,
- wyniki sa buforowane do `pendingHistoryQueue`.

### Uszkodzony cache

- jesli `catalog_cache_v1` jest nieczytelny, watch ma pokazac pusty katalog i stan "sync needed",
- nie wolno crashowac aplikacji.

### Rozjazd rewizji

- `REQUEST_BOOTSTRAP` nigdy nie sluzy do merge,
- telefon zawsze odsyla pelny aktualny snapshot,
- v1 nie implementuje conflict resolution pomiedzy dwoma zrodlami edycji.

## Decyzje zamrozone

- `settingsStorage` jest kanoniczne.
- `index + records`, nie jeden blob.
- `PUSH_HISTORY_SNAPSHOT` przenosi tylko ostatni wynik, nie pelna historie.
- `pendingHistoryQueue` mieszka w `sync_meta_v1`.
- Bootstrap zawsze ma byc full refresh, nie delta sync.
