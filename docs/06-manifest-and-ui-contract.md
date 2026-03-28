# PourOverFlow v1 - manifest and UI contract

## Purpose of this document

This document freezes two areas that need to be decision-complete before implementation:

- the `app.json` outline for the current Zepp OS `API_LEVEL 3.6` baseline,
- the implementation contract for `setting/index.jsx`.

The document follows official Zepp assumptions for `app.json v3+`, screen adaptation, and `AppSettingsPage`.

## Official reference points

- `app.json v3+` requires at least `configVersion`, `app`, `runtime`, `permissions`, `targets`, `i18n`, and `defaultLanguage`.
- `setting` and `app-side` are optional modules inside `targets.*.module`.
- `AppSettingsPage` only has the `build(props)` lifecycle and uses `props.settingsStorage`.
- `target.platforms` in `app.json v3+` may be based on screen features such as `st: "r"` and `st: "s"`.
- The current repo floor is intentionally `3.6` to cover the verified Balance 1 compatibility path and the current simulator behavior, even though the official device list may report `Amazfit Balance` as `3.7`.

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

Implementation should start from this outline:

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
      "minVersion": "3.6",
      "compatible": "3.6",
      "target": "3.6"
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
            "page/recipe-detail/index",
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

- In this repo, `app.json` lives under `zepp-app/`, not the repo root.
- Zeus commands should run from `zepp-app/` or through the repo wrappers that set that working directory automatically.

- `appId` is a placeholder to replace later if the project is registered under a concrete account.
- `vender` must remain ASCII.
- Keep `data:os.device.info` when the watch layout layer uses `getDeviceInfo()` for runtime sizing.
- In the first scaffold, do not force `runtime.type`, because official Zeus templates do not require it for a passing build.
- Do not add `designWidth` in the first scaffold.
- Do not add `app-service`, `secondary-widget`, `app-widget`, `data-widget`, or BLE permissions.
- Do not add a `band` target.

## File structure implied by the manifest

From `app.json` and screen adaptation, the required structure inside `zepp-app/` is:

```text
zepp-app/
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
  page/recipe-detail/index.js
  page/recipe-detail/index.r.layout.js
  page/recipe-detail/index.s.layout.js
  page/brew-active/index.js
  page/brew-active/index.r.layout.js
  page/brew-active/index.s.layout.js
  page/result-summary/index.js
  page/result-summary/index.r.layout.js
  page/result-summary/index.s.layout.js
  setting/index.jsx
  app-side/index.js
```

## Watch UI contract

The watch UI now follows these repo-level rules:

- populated chooser pages stay quiet and selection-focused,
- `tool-list` and `recipe-list` rely on native scrolling instead of piling extra footer actions onto list screens,
- `tool-list` should keep the centered title visible and let the list itself own most of the page height instead of wrapping the populated state in an extra container box,
- `tool-list` should render the centered title above the active list surface so later list widgets cannot visually bury it,
- populated `result-summary` may use the same continuous-panel pattern plus a single primary `Home` CTA when `Browse` would route to nearly the same place,
- populated `result-summary` should keep its first visible summary row below the subtitle block instead of tucking it into the upper round-mask clip zone,
- populated `result-summary` should not keep the phone-history footer hint when that hint steals space from the summary itself,
- brewing starts from `recipe-detail`, not directly from a list tap,
- round-screen layouts should use a conservative content width instead of treating the full black circle as a safe text area,
- round-screen list screens should avoid pinning the first visible card directly against the top edge when a calmer centered starting position fits better,
- round-screen list rows should keep the icon column inset enough to avoid mask clipping on the first visible items,
- card content should keep visible inner padding from the panel edges,
- static detail or summary pages should prefer compact summary rows over one tall fixed text block, and both `recipe-detail` and the normal populated `result-summary` state should stay non-scrollable when those rows still fit on screen,
- only fall back to scrollable summary rows when the recipe metadata genuinely overflows the safe area,
- once a detail page already shows visible summary rows and a clear CTA, avoid spending extra footer space on generic "scroll" hints,
- destructive or secondary watch actions should prefer short Zepp-safe labels or icon treatment over another full-width text button,
- active-brew actions may use a custom side-by-side dock when that better matches the intended Zepp interaction pattern, but keep that dock visually simple: one rounded base surface and two rounded pill actions instead of extra mask or divider chrome.

## Asset contract for icons

### Root app icon

- `zepp-app/icon.png`
- for target-based Zeus scaffolding, the practical baseline is also:
  - `zepp-app/assets/common.r/icon.png`
  - `zepp-app/assets/common.s/icon.png`

### Tool icons

Tool icons should be stored as round/square asset pairs:

- `zepp-app/assets/common.r/tool-aeropress.png`
- `zepp-app/assets/common.s/tool-aeropress.png`
- `zepp-app/assets/common.r/tool-v60.png`
- `zepp-app/assets/common.s/tool-v60.png`
- `zepp-app/assets/common.r/tool-kalita-wave.png`
- `zepp-app/assets/common.s/tool-kalita-wave.png`
- `zepp-app/assets/common.r/tool-chemex.png`
- `zepp-app/assets/common.s/tool-chemex.png`
- `zepp-app/assets/common.r/tool-clever-dripper.png`
- `zepp-app/assets/common.s/tool-clever-dripper.png`
- `zepp-app/assets/common.r/tool-french-press.png`
- `zepp-app/assets/common.s/tool-french-press.png`

### Mapping rule

`ToolDefinition.iconStem` points to the asset name without extension. The watch UI should not contain a manual switch on `toolId` when the same result can be achieved through `iconStem`.

## `setting/index.jsx` contract

### Implementation note

If the Zeus toolchain does not detect `setting/index.jsx` directly as the `setting.path` entrypoint, it is allowed to add a thin `setting/index.js` shim that only imports the target `.jsx` file. The source of Settings App logic should still live in `.jsx`.

### Constructor shape

`setting/index.jsx` should be built on top of `AppSettingsPage({ state, build(props), ...helpers })`.

The current implementation keeps main logic in `setting/app-settings.jsx`, while `setting/index.js` remains the thin Zeus entry shim.

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
The same UI state may also keep editor-only presentation state such as the currently visible recipe-step page, as long as it remains non-canonical and phone-local.

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

- Keep the top navigation visible and stable across views.
- Use visibly different section backgrounds or panel tones so recipe basics, brew profile, guided steps, history, and sync do not blur into one flat column.
- Prefer one dominant hero or overview panel near the top of each view instead of many equally weighted cards.
- The recipe-step editor should paginate or otherwise segment steps; do not render every step form expanded in one long scrolling wall by default.

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

### Layout and hierarchy policy

- Keep a small persistent top navigation for `Library`, `History`, and `Sync`.
- Use one contextual shell header per view to explain where the user is and what the screen is for.
- Prefer card-like read-only summary buttons for counts, latest result summaries, recipe cards, and history cards.
- A card tap may be the primary "open/edit" action. Do not keep a second redundant `Edit` button next to the same card if the card already opens the record.
- Prefer a few grouped sections with clear subtitles over many short utility rows.
- `library-home` should stay selector-first: let the shell header carry the high-level brewer and recipe counts instead of adding a second dashboard panel with repeated numbers.
- Brewer rows on `library-home` should be visually compact, using the same brewer PNG assets as the watch on the left, the brewer label in the main card body, and a separate numeric count badge on the right.
- `history-list` and `about-sync` should avoid redundant top summary dashboards when the shell header already explains the context.

### Save policy

- Keep form changes in `this.state.draftRecipe` first.
- Persist to `settingsStorage` only on `Save`.
- Exceptions are simple actions such as `Delete`, `Duplicate`, or history note editing, which may persist immediately after click.

## `setting/` view contract

### `library-home`

Must contain:

- a `Section` with the supported tools and recipe counts,
- a high-level library summary,
- every supported `toolId` visible even if it has 0 recipes.

Implementation baseline:

- use the shell header as the only high-level summary,
- keep the main body focused on the brewer list itself,
- do not repeat history totals or latest mirrored-result cards here,
- do not repeat long brewer descriptions on every library row,
- do not write the recipe count into the main label when that count already has its own right-side badge.

History and sync remain reachable from the persistent top navigation, so they do not need extra duplicate buttons on `library-home`.

### `recipe-list`

Must contain:

- a title with the tool name,
- the recipe list for one `selectedToolId`,
- a `Create` button,
- `Duplicate` and `Delete` actions for every recipe.

The recipe card itself may be the `Edit` entrypoint when tapped.

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
- end date or date summary,
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

## Implementation conclusions

- Keep the `app.json` skeleton aligned with this document.
- Keep `setting/` aligned with this contract instead of inventing a new form architecture.
- Seed the recipe library according to [05-seed-library.md](c:\Users\krzys\Projects\PourOverFlow\docs\05-seed-library.md).
- Keep the existing Settings form and view contract even as synced phone snapshots continue to evolve.

## Things intentionally deferred

- custom keyboard workflows,
- multi-level routing inside `setting/`,
- recipe file import/export,
- advanced history filters,
- arbitrary colors beyond `RecipeColorToken`,
- arbitrary `toolId`.
