# PourOverFlow v1 - Zepp architecture

## Runtime profile

The project should be built as a modern Zepp mini-app:

- `configVersion: "v3"`
- `runtime.apiVersion.target: "3.6"`
- current compatibility floor: `API_LEVEL 3.6`
- chosen to keep the Balance 1 path open without depending on the simulator to report `3.7` correctly
- `round + square` only
- `band` out of scope

The codebase should use `@zos/*`, not legacy `hmUI` or `hmApp`.

## Architectural assumptions

- v1 should rely on official Zepp APIs without extra wrappers such as `@zeppos/zml`,
- `setting/` owns the UI for data management,
- `app-side/` owns data sync and normalization,
- `page/` owns watch UX,
- `app-service/` is not part of the v1 baseline and appears only as a separate spike.

## Proposed repo structure

This structure should be treated as the target scaffold:

```text
package.json
zepp-app/
  app.js
  app.json
  assets/
    common.r/
    common.s/
  page/
    home/
      index.js
      index.r.layout.js
      index.s.layout.js
    tool-list/
      index.js
      index.r.layout.js
      index.s.layout.js
    recipe-list/
      index.js
      index.r.layout.js
      index.s.layout.js
    recipe-detail/
      index.js
      index.r.layout.js
      index.s.layout.js
    brew-active/
      index.js
      index.r.layout.js
      index.s.layout.js
    result-summary/
      index.js
      index.r.layout.js
      index.s.layout.js
  setting/
    index.jsx
  app-side/
    index.js
  shared/
    constants/
      tool-catalog.js
      color-palette.js
    domain/
      schema.js
      seed-library/
        en-US.js
        pl-PL.js
      seed-library.js
      validators.js
    i18n/
      index.js
      phone-locale.js
      watch-locale.js
      runtime-locale.js
      locales/
        en-US.js
        pl-PL.js
    storage/
      keys.js
      phone-store.js
      watch-store.js
    sync/
      message-types.js
      encode.js
      decode.js
      normalize.js
    engine/
      recipe-engine.js
      session-reducer.js
      feedback.js
    watch/
      router.js
      layouts.js
docs/
scripts/
test/
```

## Repo split

- `zepp-app/` is the Zeus working root and should contain only the mini-app package.
- Repo root should keep docs, scripts, tests, editor tasks, and generated `coverage/`.
- Root-level build helpers should execute Zeus from `zepp-app/` instead of asking Zeus to watch the full repo tree.

## Surface responsibilities

### `zepp-app/app.js`

- registers `App()` exactly once,
- keeps minimal `globalData`,
- does not store large catalog data,
- may keep only short-lived bootstrap flags.

### `zepp-app/page/home/index.js`

- first entrypoint of the watch app,
- loads `active_session_v1`, `catalog_cache_v1`, and `sync_meta_v1`,
- decides whether to show resume or navigate to `tool-list`,
- triggers `REQUEST_BOOTSTRAP`, but does not block the UI waiting for the reply.

### `zepp-app/page/tool-list/index.js`

- shows the closed catalog of supported tools,
- does not display recipes directly,
- acts as the first screen of the browse flow.

### `zepp-app/page/recipe-list/index.js`

- shows recipes only for one `toolId`,
- sorts by `updatedAt desc`, then `name asc`,
- uses a Zepp-native list pattern instead of button-only paging,
- routes into a dedicated recipe detail/start screen,
- does not show the full history or an editor.

### `zepp-app/page/recipe-detail/index.js`

- shows the selected recipe snapshot before brewing starts,
- keeps the start decision separate from list browsing,
- acts as the lightweight review screen between recipe selection and `brew-active`.

### `zepp-app/page/brew-active/index.js`

- renders the active session,
- shows step timer, full-session timer, and key step metadata at the same time,
- uses `setPageBrightTime(...)` and `setWakeUpRelaunch(true)` during active brewing,
- writes the session to `active_session_v1` after every critical state change.

### `zepp-app/page/result-summary/index.js`

- shows a short result summary immediately after session completion,
- does not try to collect long free-text notes,
- writes `last_result_v1`.

### `zepp-app/setting/index.jsx`

- registers `AppSettingsPage(...)`,
- is the only place for recipe and history CRUD,
- uses `props.settingsStorage`,
- keeps view routing in UI state only, not in canonical persisted storage.

### `zepp-app/app-side/index.js`

- seeds the tool catalog on first launch,
- watches `settingsStorage`,
- normalizes data snapshots,
- listens on `messaging.peerSocket`,
- answers `REQUEST_BOOTSTRAP`,
- sends `PUSH_TOOL_CATALOG`, `PUSH_CATALOG_SNAPSHOT`, and `PUSH_HISTORY_SNAPSHOT`,
- accepts `UPSERT_HISTORY_ENTRY` from the watch and persists history on the phone side.

## Watch pages and routing

The watch UI flow should stay simple and stable:

1. `home`
2. `tool-list`
3. `recipe-list`
4. `recipe-detail`
5. `brew-active`
6. `result-summary`

Do not add separate pages for:

- watch settings,
- full history,
- recipe creation or editing.

## Phone views in `setting/`

`setting/index.jsx` should account for these logical views:

- `library-home`
- `recipe-list`
- `recipe-editor`
- `history-list`
- `history-detail`
- `about-sync`

Routing for those views should stay local to `setting/`. Do not persist the active view into canonical `settingsStorage`.

## Screen adaptation

The project should use the `app.json v3+` mechanism and layout files:

- `index.r.layout.js` for round,
- `index.s.layout.js` for square,
- `zosLoader:./index.[pf].layout.js` for layout selection,
- `zepp-app/assets/common.r` and `zepp-app/assets/common.s` for assets.

### `designWidth` decision

Do not set `designWidth` manually at the start. Use Zepp defaults for round and square first. Once the first screens exist, this can be revisited using real assets, but the documentation baseline should stay neutral and use `px(...)` where values come from a draft.

For the current round baseline, keep a single shared round page set and apply only a small compact-round adjustment when runtime sizing reports a sub-`480x480` round screen. Do not fork a second Balance 1 page set unless later hardware validation proves the compact pass is still insufficient.

## Manifest and targets

In `app.json`, the next agent should freeze at least:

- `configVersion: "v3"`,
- `runtime.apiVersion.target: "3.6"`,
- target `common`,
- `round` and `square` platforms,
- registration of all `page/*` pages,
- enabled `setting/` and `app-side/`.

The manifest must include these permissions in the baseline:

- `device:os.local_storage`
- `data:os.device.info` because shared watch layouts use `getDeviceInfo()` for real screen sizing

Do not add at the start:

- `device:os.bg_service`,
- `data-widget`,
- `secondary-widget`,
- BLE permissions.

`device:os.bg_service` is allowed only later, during the background reminder spike.

## Permissions and capability posture

### Baseline

- `device:os.local_storage` - required
- `data:os.device.info` - required because shared layouts read `getDeviceInfo()`

### Best-effort feedback

- haptics through `Vibrator` are the priority,
- the current watch baseline is haptics-only because real-device audio cues were not reliable across the target runtime.

### Explicitly out for the baseline

- BLE,
- geolocation,
- app-service background permission.

## Shared modules

### `shared/constants/tool-catalog.js`

- contains the seed tool catalog,
- is the only source of `toolId` definitions,
- is used to seed `pof_tools_v1`.

### `shared/domain/*`

- stores record schemas and validators,
- stores locale-aware starter recipe definitions and the seed-library wrapper,
- is shared by `setting/`, `app-side/`, and the watch app.

### `shared/i18n/*`

- stores shared translation dictionaries,
- keeps browser-safe phone locale resolution separate from Zepp-only watch locale resolution,
- should stay import-safe for browser harness tests and Playwright coverage runs.

### `shared/storage/*`

- encapsulates storage keys and `read/write` functions,
- isolates JSON format details from UI layers.

### `shared/sync/*`

- freezes message types,
- encodes JSON to `ArrayBuffer`,
- decodes `ArrayBuffer` back to JSON,
- validates `schemaVersion`.

### `shared/engine/*`

- implements pure session logic,
- should be testable without Zepp runtime,
- should not import UI widgets directly.

## Runtime data architecture

### The phone is the source of truth

The phone stores:

- tool catalog,
- recipe index,
- full recipe records,
- history index,
- full history records,
- sync revisions.

### The watch stores operational state

The watch stores:

- catalog cache for fast startup,
- active session,
- latest result,
- sync metadata together with a queue of unsynced results.

## Resume and background

### Required baseline

- `page/brew-active` must persist the session after every step change,
- `setWakeUpRelaunch(true)` must be enabled for the active page,
- `setPageBrightTime(...)` must be used during active brewing.

### Forbidden assumption

Do not design v1 as if `AppService` were a guaranteed session clock. `AppService` has no UI, has execution limits, and does not support normal `setTimeout`.

## Debugging assumptions

The implementation documents assume:

- `npm run build` from repo root or `zeus build` from `zepp-app/` as the minimum compile gate,
- simulator validation for layout and flow,
- real device validation for haptics, audio, and screen-sleep behavior.

If `setting/` logs become hard to see, `@silver-zepp/vis-log` may be considered, but it is not part of the v1 baseline.

## Frozen decisions

- Official `@zos/*` only.
- No `app-service/` in the first scaffold.
- No widgets or cards.
- No BLE.
- Separate layouts for round and square.
- Phone-side sync through `app-side/` is mandatory, not optional.
