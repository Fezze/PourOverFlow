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

- `Resume brew`
- `Discard session`

`Discard session` reads the snapshot only to build a `HistoryEntry` with status `aborted`, and then clears `active_session_v1`.

## Watch flow 2 - tool selection

### Screen

`tool-list`

### Behavior

- show only tools with `supported: true`,
- sort by `sortOrder`,
- each row shows icon, label, and the number of available recipes for that `toolId`,
- tapping a tool opens `recipe-list` with router param `toolId`.

### Empty state

If a tool has no recipes:

- still show the tool in the list,
- in `recipe-list`, show an empty state with CTA `Create on phone`.

## Watch flow 3 - recipe selection

### Screen

`recipe-list`

### Behavior

- read `toolId` from router params,
- render `RecipeSummary[]` only for that tool,
- each row shows name, color, update recency, and a short summary of key brew parameters,
- tapping a recipe opens a start confirmation screen or goes directly to `brew-active`.

### Recipe row data

Minimum UI set:

- name,
- recipe color,
- `coffeeDoseG`,
- `totalWaterMl`,
- `estimatedTotalDurationMs`.

## Watch flow 4 - session start

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

## Watch flow 5 - active brew

### Screen

`brew-active`

### Screen sections

- header: recipe name and tool name,
- current step: title and description,
- primary timer: step timer when the step is timed,
- secondary timer: total session timer,
- brew metadata: `waterMl` and `targetTotalWaterMl` when present,
- CTA:
  - `Next`
  - `Abort`

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

Implementation state after Stage 5:

- storage-backed `active_session_v1` is already implemented,
- further resume hardening for sleep and wake remains in Stage 6.

## Watch flow 6 - resume after sleep or app return

### Goal

Restore a sensible state without pretending a full background engine exists.

### Resume rules

- `home` reads `active_session_v1`,
- if the current step was timed, calculate elapsed time from `expectedStepEndAt`,
- if the timer already passed, the step should move into completed state and immediately advance to the next step or to waiting for `Next`,
- the whole process must work without contacting the phone first.

### What not to do

- do not resume by replaying the session "tick by tick",
- do not depend on `AppService`,
- do not block resume on a new bootstrap.

## Watch flow 7 - session completion

### Completed

1. build `HistoryEntry`,
2. save `LastResultSummary`,
3. save or update `sync_meta_v1.pendingHistoryQueue`,
4. send `UPSERT_HISTORY_ENTRY`,
5. clear `active_session_v1`,
6. navigate to `result-summary`.

### Aborted

Abort creates a `HistoryEntry` with status `aborted` only if the session was actually started. Do not save empty aborted entries if the user never moved past the recipe start screen.

## Watch flow 8 - result screen

### Screen

`result-summary`

### Contents

- recipe name,
- status,
- total time,
- basic time delta,
- CTA `Done`.

### What we do not do here

- full note editing,
- full text rating workflow,
- browsing the full history.

## Phone flow 1 - `setting/` boot

### Start view

`library-home`

### Contents

- supported tools section,
- recipe count per tool,
- entry to `history-list`,
- sync state section.

### Behavior

- `setting/` uses `settingsStorage` directly,
- every change writes the record and index, and `app-side/` picks it up reactively.

## Phone flow 2 - recipe list

### Entry

From `library-home` after tapping a tool.

### View

- recipe list for one `toolId`,
- buttons `Create`, `Edit`, `Delete`, `Duplicate`.

### Rules

- `Create` always requires a selected tool from the whitelist,
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
- Watch browse is always two-step: `tool -> recipe`.
- The phone owns full recipe and history CRUD.
- The watch has no recipe editor.
- The watch has no full history browser.
