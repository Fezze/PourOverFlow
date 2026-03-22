# PourOverFlow v1 - manifest and UI contract

## Purpose of this document

This document freezes two areas that need to be decision-complete before Stage 2:

- the `app.json` outline for the Zepp OS v4 baseline,
- the implementation contract for `setting/index.jsx`.

The document follows official Zepp assumptions for `app.json v3+`, screen adaptation, and `AppSettingsPage`.

## Official reference points

- `app.json v3+` requires at least `configVersion`, `app`, `runtime`, `permissions`, `targets`, `i18n`, and `defaultLanguage`.
- `setting` and `app-side` are optional modules inside `targets.*.module`.
- `AppSettingsPage` only has the `build(props)` lifecycle and uses `props.settingsStorage`.
- `target.platforms` in `app.json v3+` may be based on screen features such as `st: "r"` and `st: "s"`.

Sources:

- https://docs.zepp.com/docs/reference/app-json/
- https://docs.zepp.com/docs/guides/framework/device/screen-adaption/
- https://docs.zepp.com/docs/guides/framework/app-settings/register/
- https://docs.zepp.com/docs/guides/framework/app-settings/ui-intro/
- https://docs.zepp.com/docs/reference/app-settings-api/ui/section/
- https://docs.zepp.com/docs/reference/app-settings-api/ui/textinput/
- https://docs.zepp.com/docs/reference/app-settings-api/ui/select/

## `app.json` contract

### Target shape

Stage 2 implementation should start from this outline:

```json
{
  "configVersion": "v3",
  "app": {
    "appId": 0,
    "appName": "PourOverFlow",
    "appType": "app",
    "version": {
      "code": 1,
      "name": "0.1.0"
    },
    "icon": "icon.png",
    "vender": "pouroverflow",
    "description": "Manual coffee brewing flow for Zepp OS"
  },
  "permissions": [
    "data:os.device.info",
    "device:os.local_storage"
  ],
  "runtime": {
    "apiVersion": {
      "minVersion": "4.0",
      "compatible": "4.0",
      "target": "4.0"
    },
    "type": "0"
  },
  "targets": {
    "common": {
      "module": {
        "page": {
          "pages": [
            "page/home/index",
            "page/tool-list/index",
            "page/recipe-list/index",
            "page/brew-active/index",
            "page/result-summary/index"
          ]
        },
        "app-side": {
          "path": "app-side/index"
        },
        "setting": {
          "path": "setting/index"
        }
      },
      "platforms": [
        {
          "st": "r"
        },
        {
          "st": "s"
        }
      ]
    }
  },
  "i18n": {
    "en-US": {
      "appName": "PourOverFlow"
    },
    "pl-PL": {
      "appName": "PourOverFlow"
    }
  },
  "defaultLanguage": "en-US"
}
```

### Rules for the implementer

- `appId` is a placeholder to replace later if the project is registered under a concrete account.
- `vender` must remain ASCII.
- Keep `data:os.device.info` when the watch layout layer uses `getDeviceInfo()` for runtime sizing.
- In the first scaffold, do not force `runtime.type`, because official Zeus `os4.0` templates do not require it for a passing build.
- Do not add `designWidth` in the first scaffold.
- Do not add `app-service`, `secondary-widget`, `app-widget`, `data-widget`, or BLE permissions.
- Do not add a `band` target.

## File structure implied by the manifest

From `app.json` and screen adaptation, the required structure is:

```text
assets/
  common.r/
  common.s/
page/home/index.js
page/home/index.r.layout.js
page/home/index.s.layout.js
page/tool-list/index.js
page/tool-list/index.r.layout.js
page/tool-list/index.s.layout.js
page/recipe-list/index.js
page/recipe-list/index.r.layout.js
page/recipe-list/index.s.layout.js
page/brew-active/index.js
page/brew-active/index.r.layout.js
page/brew-active/index.s.layout.js
page/result-summary/index.js
page/result-summary/index.r.layout.js
page/result-summary/index.s.layout.js
setting/index.jsx
app-side/index.js
```

## Asset contract for icons

### Root app icon

- `icon.png` in the project root
- for target-based Zeus scaffolding, the practical baseline is also:
  - `assets/common.r/icon.png`
  - `assets/common.s/icon.png`

### Tool icons

Tool icons should be stored as round/square asset pairs:

- `assets/common.r/tool-aeropress.png`
- `assets/common.s/tool-aeropress.png`
- `assets/common.r/tool-v60.png`
- `assets/common.s/tool-v60.png`
- `assets/common.r/tool-kalita-wave.png`
- `assets/common.s/tool-kalita-wave.png`
- `assets/common.r/tool-chemex.png`
- `assets/common.s/tool-chemex.png`
- `assets/common.r/tool-clever-dripper.png`
- `assets/common.s/tool-clever-dripper.png`
- `assets/common.r/tool-french-press.png`
- `assets/common.s/tool-french-press.png`

### Mapping rule

`ToolDefinition.iconStem` points to the asset name without extension. The watch UI should not contain a manual switch on `toolId` when the same result can be achieved through `iconStem`.

## `setting/index.jsx` contract

### Stage 2 implementation note

If the Zeus toolchain does not detect `setting/index.jsx` directly as the `setting.path` entrypoint, it is allowed to add a thin `setting/index.js` shim that only imports the target `.jsx` file. The source of Settings App logic should still live in `.jsx`.

### Constructor shape

`setting/index.jsx` should be built on top of `AppSettingsPage({ state, build(props), ...helpers })`.

The current Stage 3 implementation keeps main logic in `setting/app-settings.jsx`, while `setting/index.js` remains the thin Zeus entry shim.

Recommended structure:

```js
AppSettingsPage({
  state: {
    view: 'library-home',
    selectedToolId: null,
    editingRecipeId: null,
    selectedHistoryId: null,
    draftRecipe: null,
    historyDraft: null,
    syncMeta: null,
    flashMessage: '',
    errorMessage: ''
  },
  build(props) {
    this.hydrateFromStorage(props)
    return this.renderView(props)
  },
  hydrateFromStorage(props) {},
  renderView(props) {}
})
```

V1 may additionally persist phone UI state under `pof_settings_ui_state_v1`, but that key is not part of the sync model and must not be treated as a domain record.

### Allowed views

`view` may be only:

- `library-home`
- `recipe-list`
- `recipe-editor`
- `history-list`
- `history-detail`
- `about-sync`

Do not create extra hidden views for experiments.

## UI rules for the Settings App

### Base components

The implementer should build `setting/` mainly from:

- `Section`
- `TextInput`
- `Select`
- `Button`

This is intentional. V1 should stay simple, readable, and aligned with Zepp documentation, without a large custom UI system.

### Form policy

- One logical form = one section or group of sections.
- Every important action should have an explicit `Button`.
- Fields with a restricted option set should use `Select`, not free text.
- `toolId`, `colorToken`, `kind`, and `feedbackCue` must not be plain text inputs.

### Save policy

- Keep form changes in `this.state.draftRecipe` first.
- Persist to `settingsStorage` only on `Save`.
- Exceptions are simple actions such as `Delete`, `Duplicate`, or history note editing, which may persist immediately after click.

## `setting/` view contract

### `library-home`

Must contain:

- a `Section` with the supported tools and recipe counts,
- a `Button` to go to history,
- a `Section` showing sync state.

Every supported `toolId` must be visible even if it has 0 recipes.

### `recipe-list`

Must contain:

- a title with the tool name,
- the recipe list for one `selectedToolId`,
- a `Create` button,
- `Edit`, `Duplicate`, and `Delete` actions for every recipe.

Sorting:

1. `updatedAt desc`
2. `name asc`

### `recipe-editor`

Must contain sections:

1. `Identity`
   - `name`
   - `toolId`
   - `colorToken`
2. `Brew metadata`
   - `description`
   - `coffeeDoseG`
   - `totalWaterMl`
   - `waterTempC`
   - `filterLabel`
   - `grindLabel`
   - `estimatedTotalDurationMs`
3. `Steps`
   - repeated sections per step
4. `Notes`
   - `notes`
5. `Actions`
   - `Save`
   - `Cancel`

### `history-list`

Must contain:

- the `HistoryIndexEntry` list,
- status,
- recipe name,
- end date/time,
- entry to `history-detail`.

Do not add advanced filters as baseline behavior.

### `history-detail`

Must contain:

- recipe snapshot,
- step execution breakdown,
- `userRating`,
- `userNote`,
- `Save notes`.

This is the only place for editing note and rating.

### `about-sync`

Must contain:

- latest sync revisions,
- information that the phone is the source of truth,
- a short explanation that the watch stores only cache and the active session.

## Step editor contract

### Rendering

Steps should be edited as a list of sections one below another. V1 does not need drag-and-drop.

### Step fields

Each step must expose editing for:

- `title` through `TextInput`
- `body` through `TextInput`
- `kind` through `Select`
- `durationMs` through `TextInput`
- `waterMl` through `TextInput`
- `targetTotalWaterMl` through `TextInput`
- `requiresConfirm` through `Select`
- `feedbackCue` through `Select`

### Step actions

- `Add step`
- `Move up`
- `Move down`
- `Delete step`

`Delete step` must not remove the only remaining step without immediately adding a replacement.

## Recipe form validation

Before saving `RecipeRecord`:

- `toolId` must belong to the whitelist,
- `name` must not be empty,
- `steps.length >= 1`,
- the last step must have `kind: "finish"`,
- `order` must be rewritten sequentially,
- `estimatedTotalDurationMs` must not be smaller than the sum of `durationMs`.

If validation fails:

- do not write to `settingsStorage`,
- stay in `recipe-editor`,
- show a simple error message in the view.

## Implementation conclusions for Stages 2 and 3

- Stage 2 should create the `app.json` skeleton according to this document.
- Stage 3 should implement `setting/` according to this contract, without inventing a new form architecture.
- Stage 3 should seed the recipe library according to [05-seed-library.md](c:\Users\krzys\Projects\PourOverFlow\docs\05-seed-library.md).
- Stage 4 should keep the view and form contract, but replace the watch runtime data source from local preview data to snapshots synced from the phone.

## Things intentionally deferred

- custom keyboard workflows,
- multi-level routing inside `setting/`,
- recipe file import/export,
- advanced history filters,
- arbitrary colors beyond `RecipeColorToken`,
- arbitrary `toolId`.
