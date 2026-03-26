# PourOverFlow v1 - sync and storage

## Ownership rules

### Phone

The phone is the source of truth for:

- tool catalog,
- recipes,
- history,
- sync revisions.

The phone stores these in `settingsStorage` as JSON strings.

### Watch

The watch stores operational data only:

- local catalog cache,
- active session,
- latest result,
- sync metadata together with a queue of unsynced history entries.

Implementation state:

- `catalog_cache_v1`, `last_result_v1`, `sync_meta_v1`, and `active_session_v1` are already persisted locally on the watch,
- active sessions are reconciled from timestamps on app entry before new phone bootstrap is required,
- phone-side storage-driven bootstrap pushes are coalesced with a short debounce,
- phone-side sync now schedules only the affected slice (`tools`, `catalog`, or `history`) instead of pushing a full bootstrap snapshot on every storage write,
- bootstrap requests are revision-aware, so the phone may answer with only the stale slices or with nothing if the watch is already up to date,
- the remaining real-device follow-up is comfort validation for haptics and round-screen watch fit, not the basic transport or resume mechanics.

## Phone-side storage keys

| key | contents | notes |
| --- | --- | --- |
| `pof_tools_v1` | `ToolDefinition[]` | seeded on first launch |
| `pof_recipe_index_v1` | `RecipeSummary[]` | lightweight list, without steps |
| `pof_recipe_<id>_v1` | `RecipeRecord` | full recipe record |
| `pof_history_index_v1` | `HistoryIndexEntry[]` | history summary list |
| `pof_history_<id>_v1` | `HistoryEntry` | full history record |
| `pof_sync_meta_v1` | `PhoneSyncMeta` | revisions and sync state |
| `pof_settings_ui_state_v1` | `SettingsUiState` | helper state for Settings App, non-canonical for sync |

## Watch-side storage keys

| key | contents | notes |
| --- | --- | --- |
| `active_session_v1` | `ActiveBrewSession \| null` | only one active session |
| `catalog_cache_v1` | `WatchCatalogCache` | tools + recipes |
| `last_result_v1` | `LastResultSummary \| null` | latest result only |
| `sync_meta_v1` | `WatchSyncMeta` | revisions, bootstrap info, and pending queue |

## Index records

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
  seedCatalogVersion: number
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

## Why `index + records`

`settingsStorage` stores JSON strings. Because of that:

- do not put the whole library and history into one key,
- keep list data in an index,
- keep detailed records under separate keys,
- changing one recipe must not require rewriting the whole archive.

## Phone seeding

`app-side/` should seed data on first launch:

1. if `pof_tools_v1` does not exist, write `TOOL_CATALOG`,
2. if `pof_recipe_index_v1` does not exist, write seed recipes,
3. if `pof_history_index_v1` does not exist, write an empty list,
4. if `pof_sync_meta_v1` does not exist, create initial revisions.

Seeding must be idempotent. Later launches must not overwrite user data.

The current implementation also keeps `seedCatalogVersion` inside `pof_sync_meta_v1` so the phone can append only newly introduced seed recipes on later app versions without replaying the whole catalog.
That migration path is additive:

- new installs get the full current seed set,
- older installs receive only recipes introduced after their stored `seedCatalogVersion`,
- edited or deleted older seeds must not be overwritten or silently resurrected.

`pof_settings_ui_state_v1` is not part of domain seeding. It is phone UI state only.

## Bootstrap flow

### Watch start

1. `home` reads `catalog_cache_v1`, `last_result_v1`, `sync_meta_v1`, and `active_session_v1`.
2. The UI starts immediately from cache if it exists.
3. The watch sends `REQUEST_BOOTSTRAP`.
4. `app-side/` reads phone records and sends only the stale snapshot slices.
5. The watch updates `catalog_cache_v1`, `last_result_v1`, and `sync_meta_v1`.

At the current stage, some watch pages may still require a rebuild to fully show a new snapshot that arrives after the first render.

### Phone answer order

When `app-side/` needs to send more than one slice in the same pass, it should use this order:

1. `PUSH_TOOL_CATALOG`
2. `PUSH_CATALOG_SNAPSHOT`
3. `PUSH_HISTORY_SNAPSHOT`

This simplifies watch bootstrap and `toolId` validation.

`REQUEST_BOOTSTRAP` is revision-aware:

- if the watch already has the current `toolCatalogRevision`, skip `PUSH_TOOL_CATALOG`,
- if the watch already has the current `recipeCatalogRevision`, skip `PUSH_CATALOG_SNAPSHOT`,
- if the watch already has the current `historyRevision`, skip `PUSH_HISTORY_SNAPSHOT`,
- if all revisions already match, the phone may send nothing.

The `settingsStorage` listener inside `app-side/` must ignore `pof_settings_ui_state_v1` changes so that drafts and view transitions in Settings App do not trigger false sync refreshes.
It should also classify storage writes by slice and push only the affected snapshot payload instead of replaying the full bootstrap set.

## Message contracts

All messages are wrapped in `SyncEnvelope<T>` and encoded to `ArrayBuffer`.

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

This message does not carry the full history. V1 needs only the latest result and the history revision.

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

## Encoding and decoding

For `API 4.0+`, use:

- `stringToBuffer` for JSON string -> `ArrayBuffer`,
- `bufferToString` for `ArrayBuffer` -> JSON string.

Do not send raw JS objects. The messaging layer should use `ArrayBuffer` only.

## Data revisions

### `toolCatalogRevision`

- incremented only when the seed catalog changes in a new app version,
- not changed by normal user activity.

This remains separate from `seedCatalogVersion`:

- `toolCatalogRevision` is the watch-facing sync revision,
- `seedCatalogVersion` is the phone-side seed-migration baseline.

### `recipeCatalogRevision`

- incremented for every recipe create, edit, archive, or delete operation.

### `historyRevision`

- incremented for every history add or note/rating update.

## Validation policy

### On the phone side

- reject a recipe with an unknown `toolId`,
- reject `HistoryEntry` if the snapshot references a non-existent `toolId`,
- do not store records without `schemaVersion: 1`,
- reject empty or corrupted JSON.

### On the watch side

- if `PUSH_TOOL_CATALOG` is corrupted, keep the previous cache,
- if a `RecipeSummary` has no matching `recipeSnapshotById`, hide that recipe,
- if `latestResult: null` arrives, clear `last_result_v1`.

## Writing history from the watch

### Online scenario

1. the watch finishes a session,
2. it builds `HistoryEntry`,
3. it writes `LastResultSummary`,
4. it sends `UPSERT_HISTORY_ENTRY`,
5. after `ACK_HISTORY_ENTRY` it removes the entry from `pendingHistoryQueue`.

### Offline scenario

1. the watch finishes a session,
2. it writes `LastResultSummary`,
3. it appends the full `HistoryEntry` to `sync_meta_v1.pendingHistoryQueue`,
4. the queue is replayed after the next successful `REQUEST_BOOTSTRAP`.

### Queue limit

`pendingHistoryQueue` should have a limit of 20 entries. If the limit is exceeded:

- the oldest synced entries should not still be in the queue,
- if the limit is still exceeded, drop the oldest pending entry and write a warning to the log.

## Delete policy

Deleting a recipe on the phone means:

- delete `pof_recipe_<id>_v1`,
- remove the entry from `pof_recipe_index_v1`,
- increment `recipeCatalogRevision`.

Do not touch:

- `pof_history_index_v1`,
- any `pof_history_<id>_v1`,
- `last_result_v1` on the watch if the latest result refers to a deleted recipe.

## Watch cache invalidation

When a new `PUSH_CATALOG_SNAPSHOT` is accepted, the watch:

1. rewrites the full `catalog_cache_v1`,
2. does not change `active_session_v1`,
3. does not change `last_result_v1`,
4. updates revisions in `sync_meta_v1`.

This is intentional. The active session lives on its own snapshot.

## Resume policy

Resume should depend on `active_session_v1`, not on sync from the phone. The runtime now reconciles session state from persisted timestamps before asking the phone for fresh bootstrap data, and real-watch logs have already confirmed the core resume path.

During resume:

- the watch loads the session locally,
- recalculates `elapsedSessionMs` and timer state from `sessionStartedAt`, `currentStepStartedAt`, and `expectedStepEndAt`,
- only then asks the phone for bootstrap.

## Errors and fallbacks

### No phone available

- the watch works from `catalog_cache_v1`,
- the watch can continue the current session from local state if the runtime is still alive,
- results are buffered into `pendingHistoryQueue`.
- bootstrap and queue replay should fail fast when the bridge is disconnected; the watch UI must not stall waiting on repeated send attempts.

### Corrupted cache

- if `catalog_cache_v1` is unreadable, the watch should show an empty catalog and a `sync needed` state,
- if `active_session_v1` or `last_result_v1` is corrupted, the watch should clear the bad key and continue safely,
- the app must not crash.

### Revision mismatch

- `REQUEST_BOOTSTRAP` is never used for merge,
- the phone sends the full current snapshot for each stale slice,
- v1 does not implement conflict resolution between two editing sources.

## Frozen decisions

- `settingsStorage` is canonical.
- `index + records`, not one blob.
- `PUSH_HISTORY_SNAPSHOT` carries only the latest result, not full history.
- `pendingHistoryQueue` lives in `sync_meta_v1`.
- Bootstrap is revision-aware by slice. Each stale slice is sent as a full snapshot, not as record-by-record patching.
