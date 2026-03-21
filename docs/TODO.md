# PourOverFlow v1 - implementation TODO

## General rules

- Documents and contracts first, then scaffold and implementation.
- Do not skip `zeus build`.
- Do not implement the background engine as something "guaranteed" until it passes a separate spike.
- Do not add features outside v1 scope just because they "might be useful".
- This file must be maintained continuously: remove completed items or mark them clearly, and add new tasks immediately.
- If new problems, debt, constraints, or follow-ups appear during the work, add them here or to the relevant architecture document in the same session.
- Keep this backlog in English. New tasks, notes, risks, and follow-ups must be written in English.

## Backlog maintenance workflow

Every agent starting work in this repo must:

1. read this file before implementation,
2. choose the best next step based on the current repo state,
3. communicate that recommendation to the user,
4. update this file after finishing the work.

When updating the backlog:

- remove or rewrite items that are already done,
- add new follow-ups discovered during implementation,
- do not duplicate the same task in several places without a reason,
- if a task changes from "to do" into a stable architecture constraint, move it into the proper document and leave only a reference or short follow-up here.

## Stage 1 - freeze documentation

### Goal

Have a complete document set that a later agent can use without guessing the data model or sync model.

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

- the tool catalog is explicit and closed,
- all storage keys are named,
- all sync message types are named,
- active session, history, and recipe snapshot are documented.

## Stage 2 - Zepp scaffold

### Goal

Set up the minimum repo scaffold that matches the documents.

### Tasks

- create `app.json`, `app.js`, `package.json`,
- configure `configVersion: "v3"` and `runtime.apiVersion.target: "4.0"`,
- register target `common` for `round` and `square`,
- follow the contract from `docs/06-manifest-and-ui-contract.md`,
- add pages `home`, `tool-list`, `recipe-list`, `brew-active`, `result-summary`,
- add `setting/index.jsx`,
- add `app-side/index.js`,
- add `shared/*`,
- add empty asset directories `assets/common.r` and `assets/common.s`.

### Acceptance

- `zeus build` passes,
- the simulator launches the empty app without crashing,
- page routing works,
- `AppSettingsPage(...)` builds.

### Risks

- invalid manifest,
- invalid page registration,
- layout mismatch between round and square.

### Status

- done: scaffold exists and `zeus build` passes,
- done: pages `home`, `tool-list`, `recipe-list`, `brew-active`, and `result-summary` exist,
- done: `setting/`, `app-side/`, `shared/`, and placeholder assets exist,
- note: the watch runtime is still only a scaffold at this stage, not the final `LocalStorage` / sync implementation.

## Stage 3 - storage and phone CRUD

### Goal

Bring up the canonical data layer on the phone side.

### Tasks

- seed `pof_tools_v1`,
- seed recipes according to `docs/05-seed-library.md`,
- implement `RecipeRecord`, `RecipeSummary`, `HistoryEntry`, and validators,
- build `setting/` with the views:
  - `library-home`
  - `recipe-list`
  - `recipe-editor`
  - `history-list`
  - `history-detail`
- implement recipe CRUD,
- implement history read and note editing,
- enforce the rule "delete recipe keeps history".

### Acceptance

- a recipe can be created for a supported `toolId`,
- a recipe cannot be saved for an unsupported `toolId`,
- a recipe can be deleted without losing history,
- history and recipes are stored as `index + records`.

### Tests

- record validator tests,
- delete policy tests,
- JSON serialization tests.

### Status

- done: seed library and seeding into `settingsStorage`,
- done: `RecipeRecord`, `RecipeSummary`, `HistoryEntry`, and validators,
- done: `setting/` with views `library-home`, `recipe-list`, `recipe-editor`, `history-list`, `history-detail`, `about-sync`,
- done: recipe CRUD and history note editing,
- done: baseline Node tests for validators and phone storage,
- note: at this stage `app-side/` seeds data and logs changes, but does not yet push snapshots to the watch runtime.

## Stage 4 - `app-side/` and synchronization

### Goal

Build bootstrap and data push from phone to watch.

### Tasks

- seed on first launch,
- implement `messaging.peerSocket`,
- `REQUEST_BOOTSTRAP`,
- `PUSH_TOOL_CATALOG`,
- `PUSH_CATALOG_SNAPSHOT`,
- `PUSH_HISTORY_SNAPSHOT`,
- `UPSERT_HISTORY_ENTRY`,
- `ACK_HISTORY_ENTRY`,
- encoding and decoding through `stringToBuffer` and `bufferToString`,
- ignore `pof_settings_ui_state_v1` in storage listeners and snapshot normalization.

### Acceptance

- the watch receives the tool and recipe catalog during bootstrap,
- the watch receives the latest result,
- `UPSERT_HISTORY_ENTRY` stores history on the phone side,
- `ACK_HISTORY_ENTRY` clears the pending queue on the watch.

### Tests

- encode/decode message envelopes,
- `pendingHistoryQueue` replay,
- revision validation and fallback on corrupted payload.

### Status

- done: `app-side` handles `REQUEST_BOOTSTRAP`, `UPSERT_HISTORY_ENTRY`, and sending `PUSH_*`,
- done: the watch bridge uses BLE on device side and `peerSocket` on phone side,
- done: `catalog_cache_v1`, `last_result_v1`, and `sync_meta_v1` are persisted locally on the watch,
- done: the watch router reads recipes from the synced phone catalog,
- done: baseline tests for sync contracts and snapshot normalization,
- follow-up: placeholder watch pages still do not have full live rerender when a snapshot arrives while the page is already open.

## Stage 5 - watch browse and recipe engine

### Goal

Bring up the main `tool -> recipe -> active brew` flow.

### Tasks

- `home` with resume gate,
- `tool-list` with the whitelist catalog,
- `recipe-list` filtered by `toolId`,
- session start from `RecipeSnapshot`,
- `recipe-engine` and `session-reducer`,
- UI for `instruction`, `timed_action`, `timed_wait`, `confirm`, `finish`,
- feedback layer for haptics and optional audio,
- persistence of `active_session_v1` and `last_result_v1`,
- meaningful refresh for the currently open page when new snapshots arrive from the phone.

### Acceptance

- the user can go through a full session,
- step timer and full-session timer are visible in parallel,
- `confirm` requires manual progression,
- `finish` saves the result and clears the active session.

### Tests

- reducer logic,
- transitions between step kinds,
- `ActiveBrewSession` serialization,
- simulator validation for round and square.

### Status

- done: `home` has a resume gate,
- done: `tool-list` shows the whitelist catalog with recipe counts,
- done: `recipe-list` uses data coming from `RecipeSnapshot`,
- done: `active_session_v1` is storage-backed,
- done: timed steps, confirm steps, and finish steps have more production-shaped reducer handling,
- done: `brew-active` shows step timer and session timer,
- done: best-effort feedback layer for haptics and system sounds,
- done: runtime event refresh for list pages and result summary,
- follow-up: real-device validation of feedback and resume remains in Stage 6.

## Stage 6 - resume, offline, and hard validation

### Goal

Make sure v1 behaves sensibly after interruption.

### Tasks

- `setWakeUpRelaunch(true)` on `brew-active`,
- `setPageBrightTime(...)` on `brew-active`,
- resume from `active_session_v1`,
- handle `pendingHistoryQueue`,
- last result summary,
- fallbacks for empty or corrupted cache,
- real-device validation of `Buzzer` / `SystemSounds` and silent mode behavior.

### Acceptance

- after leaving and returning to the app, the session can be resumed,
- lack of phone does not block the flow,
- an offline-completed session goes into `pendingHistoryQueue`,
- after sync is restored, the entry reaches the phone.

### Tests

- mocked resume,
- queue replay,
- real-device tests for screen sleep, haptics, and sound.

## Stage 7 - experimental background reminder spike

### Goal

Verify whether `AppService` and `createSysTimer()` are worth developing after the v1 core.

### Tasks

- investigate `AppService` with `device:os.bg_service`,
- verify real timer/background limitations on specific hardware,
- check whether reminders after screen sleep make sense both technically and in UX terms,
- do not connect this to the main timer logic until the spike passes.

### Acceptance

- written `go / no-go` decision,
- separate technical document or ADR,
- no regression in the v1 baseline.

## Required test list

### Pure logic

- `toolId` whitelist validation,
- recipe step validation,
- session snapshot building,
- `HistoryEntry` building,
- sync message encode/decode.

### Mocked runtime

- page lifecycle,
- bootstrap from cache,
- catalog update after sync,
- `pendingHistoryQueue` save and replay.

### Simulator

- `round`,
- `square`,
- `tool -> recipe -> brew` flow,
- `confirm` and `finish`,
- resume after app restart.

### Real device

- vibration,
- optional sound,
- screen sleep,
- wake-up relaunch,
- real brewing comfort.

## Explicitly not now

- backend,
- cloud sync,
- external recipe import,
- widgets/cards,
- BLE integrations,
- band layout,
- full history on the watch.

## Decision log for the next agent

- `Tool` is read-only.
- `setting/` has no tool CRUD.
- History survives recipe deletion.
- `PUSH_HISTORY_SNAPSHOT` is latest-result only.
- `AppService` is a spike, not baseline.
- Zeus target-based scaffolding needs icons under `assets/<target>.<shape>/icon.png`.
- `setting/index.js` was added as a JS shim for Settings App code because `index.jsx` alone was not a reliable build entrypoint.
- Watch cache, sync metadata, and `active_session_v1` are already storage-backed, but resume hardening for sleep and wake remains Stage 6 work.
- `pof_settings_ui_state_v1` is a helper Settings App key and does not belong to the canonical sync model.
- Stage 4 closed runtime sync, and Stage 5 added storage-backed `active_session_v1`; the next follow-up is resume hardening and real-device validation.
