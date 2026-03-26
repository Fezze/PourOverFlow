# PourOverFlow v1 - watch and phone flows

## Flow map

The product has two primary runtimes:

- watch runtime: session execution and resume,
- phone runtime: editing and archiving.

## Watch flow 1 - app start

### Goal

Start quickly even when the phone is unavailable.

### Steps

1. `page/home` reads `active_session_v1`.
2. `page/home` reads `catalog_cache_v1`.
3. If an active session exists with status `running` or `waiting_for_confirm`, show the resume gate.
4. If there is no active session, navigate to `tool-list`.
5. Independently from the above, send `REQUEST_BOOTSTRAP`.

### Resume gate

The resume gate is not a separate page. It is a simple `home` state with two buttons:

- primary action to resume the active brew,
- a short secondary discard action,
- an optional shortcut into the latest result.

`Discard session` reads the snapshot only to build a `HistoryEntry` with status `aborted`, and then clears `active_session_v1`.

## Watch flow 2 - tool selection

### Screen

`tool-list`

### Behavior

- show only tools with `supported: true`,
- sort by `sortOrder`,
- render the brewer catalog as a native scrollable list,
- keep the brewer header centered and visible above the list,
- render the header above the list surface so the title does not disappear behind the scroll region,
- each row shows the brewer icon, brewer label, and the number of available recipes for that `toolId`,
- keep the populated chooser visually quiet: do not show cache state, bridge state, or a redundant `Home` CTA on this screen,
- on round screens, let the list itself extend through most of the page instead of boxing it into a short container,
- start the first visible row lower than the header so it can scroll upward naturally without clipping the title area,
- keep list content inside a conservative round-screen safe width instead of relying on the full black circle,
- keep icon and text columns inset far enough from the left mask that the first visible rows do not shave off brewer icons on round hardware,
- prefer the list itself over a separate scroll-bar affordance when the page already reads clearly as a vertical chooser,
- support hardware-key list focus when the watch exposes compatible keys,
- tapping a tool writes the selected `toolId` into watch runtime state and opens `recipe-list`.

### Empty state

If a tool has no recipes:

- still show the tool in the list,
- in `recipe-list`, show an empty state that says recipes are created on the phone first,
- keep the watch CTA focused on `Refresh from phone` after the user updates the library in Settings.

## Watch flow 3 - recipe selection

### Screen

`recipe-list`

### Behavior

- read the selected `toolId` from watch runtime state,
- render `RecipeSummary[]` only for that tool,
- render recipes as a native scrollable list,
- each visible recipe row shows name, update recency, and a short summary of key brew parameters,
- keep the populated chooser focused on list selection instead of extra footer actions,
- keep recipe rows roomy enough that long names and metadata do not crowd the card edges on round screens,
- tapping a recipe opens `recipe-detail`,
- the screen should not start brewing directly from a list tap.

### Recipe row data

Minimum UI set:

- name,
- recipe color,
- `coffeeDoseG`,
- `totalWaterMl`,
- `estimatedTotalDurationMs`.

## Watch flow 4 - recipe detail and start

### Screen

`recipe-detail`

### Behavior

1. read `selectedRecipeId` from watch runtime state,
2. show a compact summary of the selected `RecipeSnapshot`,
3. keep normal recipe metadata inside compact static summary rows when the content fits without overflow,
4. fall back to compact scrollable summary rows only when longer recipe metadata would exceed the comfortable safe area,
5. keep the start CTA separate from the browse list,
6. in the healthy state, prefer a single prominent `Start brew` CTA and let system back navigation return to `recipe-list`,
7. allow going back to `recipe-list` without mutating the recipe snapshot,
8. keep detail text inset from the card edges instead of stretching all the way to the inner background bounds,
9. let the summary card visually run down toward the CTA instead of spending that space on an extra footer hint about scrolling.

## Watch flow 5 - session start

### Scenario

1. the user selects a recipe,
2. the watch reads `RecipeSnapshot` from `catalog_cache_v1.recipeSnapshotsById`,
3. it creates `ActiveBrewSession`,
4. it saves `active_session_v1`,
5. it enables `setWakeUpRelaunch(true)`,
6. it enables `setPageBrightTime(...)`,
7. it transitions to the active session view.

### Important rule

After session start, do not read `RecipeRecord` from cache again in order to "pull in" changes. The session always runs on the startup snapshot.

## Watch flow 6 - active brew

### Screen

`brew-active`

### Screen sections

- header: recipe name,
- current step: title and description,
- primary timer: step timer when the step is timed,
- secondary timer: total session timer,
- brew metadata: `waterMl` and `targetTotalWaterMl` when present,
- CTA:
  - a bottom side-by-side action dock,
  - short Zepp-safe labels or icons instead of raw decorative glyphs or two full-width text buttons,
- physical shortcut:
  - trigger the primary action when the watch exposes Zepp's shortcut key

### Layout notes

- round-screen pages should keep the main copy within a stricter safe width than the full circular background,
- important CTA surfaces should sit above the most aggressive lower-edge clip zone,
- panel text should keep visible inner padding from its own background rather than hugging the card edges.

### Behavior by step type

#### `instruction`

- no countdown,
- progression only after `Next`.

#### `timed_action`

- counts down `durationMs`,
- may auto-advance when time ends if `requiresConfirm: false`,
- if `requiresConfirm: true`, it stops and waits for `Next`.

#### `timed_wait`

- counts down `durationMs`,
- auto-advances when time ends.

#### `confirm`

- zero-timer,
- requires `Next`.

#### `finish`

- ends the session,
- triggers final feedback and history persistence.

### Persist policy

`active_session_v1` must be written:

- on session start,
- on every step start,
- on every step completion,
- on `Abort`,
- on `Complete`.

Implementation state:

- storage-backed `active_session_v1` is already implemented,
- timestamp-based resume reconciliation is implemented on app entry,
- real-device validation logs now emit `[pof-validation] display_guard_enable` and `[pof-validation] display_guard_disable` entries with the applied wake and bright flags,
- real-watch logs already confirmed wake-up relaunch together with display-guard activation; remaining work is comfort validation rather than technical availability.

## Watch flow 7 - resume after sleep or app return

### Goal

Restore a sensible state without pretending a full background engine exists.

### Resume rules

- `home` reads `active_session_v1`,
- if the current step was timed, calculate elapsed time from `expectedStepEndAt`,
- if the timer already passed, the step should move into completed state and immediately advance to the next step or to waiting for `Next`,
- the whole process must work without contacting the phone first.

### Implementation state

- the current runtime reconciles persisted sessions on app entry before rendering the resume gate or active brew page,
- the runtime now emits `[pof-validation]` logs for `resume_attempt`, `resume_success`, and resume-clear/finalize paths to support real-watch verification,
- real-watch logs already confirmed successful resume reconciliation on hardware,
- if the session auto-completes during reconciliation, the watch writes the result locally, queues sync, clears `active_session_v1`, and routes to `result-summary`.

### What not to do

- do not resume by replaying the session "tick by tick",
- do not depend on `AppService`,
- do not block resume on a new bootstrap.

## Watch flow 8 - session completion

### Completed

1. build `HistoryEntry`,
2. save `LastResultSummary`,
3. save or update `sync_meta_v1.pendingHistoryQueue`,
4. send `UPSERT_HISTORY_ENTRY`,
5. clear `active_session_v1`,
6. navigate to `result-summary`.

Runtime note:

- real-device validation logs now emit `[pof-validation] history_entry_queued`, `history_flush_attempt`, and `history_flush_result` so offline completion and reconnect replay can be confirmed from logs.
- real-watch logs already confirmed queued history replay after reconnect with a successful `history_flush_result`.

### Aborted

Abort creates a `HistoryEntry` with status `aborted` only if the session was actually started. Do not save empty aborted entries if the user never moved past the recipe start screen.

## Watch flow 9 - result screen

### Screen

`result-summary`

### Contents

- recipe name,
- status,
- total time,
- basic time delta,
- compact scrollable summary rows when the body content grows past the comfortable round-screen safe area,
- for populated result state, one calm primary CTA back to `home`,
- keep the summary panel visually continuous behind the centered header and the visible list rows instead of splitting it into a short floating card plus redundant exit actions.

### What we do not do here

- full note editing,
- full text rating workflow,
- browsing the full history.

## Phone flow 1 - `setting/` boot

### Start view

`library-home`

### Contents

- persistent top navigation for `Library`, `History`, and `Sync`,
- contextual shell header,
- library summary card,
- supported tools section,
- recipe count per tool,
- optional latest-result summary card.

### Behavior

- `setting/` uses `settingsStorage` directly,
- every change writes the record and index, and `app-side/` picks it up reactively.

## Phone flow 2 - recipe list

### Entry

From `library-home` after tapping a tool.

### View

- recipe list for one `toolId`,
- tool summary card,
- button `New recipe`,
- card-tap entry into editing,
- secondary actions `Duplicate` and `Delete`.

### Rules

- `Create` always requires a selected tool from the whitelist,
- tapping a recipe card may be the primary `Edit` action, so a second redundant `Edit` button is not required,
- `Duplicate` copies the full record and creates a new `recipeId`,
- `Delete` removes the recipe record but keeps history.

## Phone flow 3 - recipe editor

### Form fields

- `name`
- `toolId` as read-only or controlled whitelist select
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

### Step editing

Each step has its own sub-form:

- `title`
- `body`
- `kind`
- `durationMs`
- `waterMl`
- `targetTotalWaterMl`
- `requiresConfirm`
- `feedbackCue`

### UX validation

- do not allow saving a recipe without `finish` at the end,
- do not allow an unknown `toolId`,
- do not allow saving an empty step list.

## Phone flow 4 - history

### `history-list`

- `HistoryIndexEntry` list,
- archived-brews summary card,
- sorted by `endedAt desc`,
- optional filtering by `toolId` is an enhancement, not baseline.

### `history-detail`

- full recipe snapshot,
- step result list,
- session status,
- user rating and note.

### Editing rule

Note and rating are edited only in `history-detail`, not inside the recipe itself.

## Phone flow 5 - delete recipe

### Expected behavior

1. delete `RecipeRecord`,
2. update `RecipeSummary[]`,
3. do not touch any `HistoryEntry`,
4. after sync, the watch should stop showing that recipe in the catalog,
5. `last_result_v1` may still point to the old snapshot name.

## Sync scenarios

### Recipe changed on phone during active brew

- the active session on the watch does not change,
- the new catalog revision applies only to future launches.

### History note added on phone

- `historyRevision` increases,
- `PUSH_HISTORY_SNAPSHOT` updates only `latestResult` if the changed entry is the newest one,
- the watch does not fetch the full archive.

### Phone unavailable

- the user can still start a recipe from cache,
- after the session ends, the result goes into `pendingHistoryQueue`.

## UI copy and tone

Watch copy should be:

- short,
- operational,
- action-oriented.

Phone copy may be slightly more descriptive, but still without unnecessary verbosity.

## Frozen decisions

- `home` owns the resume gate.
- Watch browse is `tool -> recipe -> recipe detail -> active brew`.
- The phone owns full recipe and history CRUD.
- The watch has no recipe editor.
- The watch has no full history browser.
