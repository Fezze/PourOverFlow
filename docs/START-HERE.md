# Start Here

## Why this file exists

This is a condensed handoff for the next agent or developer. It is meant to help someone enter the repo without reading everything at once, but without losing the most important decisions.

## The repo in one sentence

We are building a Zepp mini-app for guided coffee brewing on the watch, where the phone manages recipes and history and the watch executes and resumes brewing sessions.

## Mandatory skill

Every agent working on this repo must treat `zepp-miniapp-builder` as the default working skill. This is not optional guidance. The project must be run according to Zepp OS constraints, version routing, and surface architecture.

## Project language

This project must be run in English.

- Repo documentation must stay in English.
- Backlog updates must stay in English.
- Persistent handoff notes and repo-facing agent instructions must stay in English.

## What is already done

- product documentation,
- Zepp architecture,
- domain model,
- storage and sync contracts,
- watch/phone flows,
- staged implementation plan,
- seed library,
- manifest and Settings UI contract,
- Zepp app scaffold with passing `zeus build`,
- seed data in `settingsStorage`,
- real CRUD for recipes and history notes in `setting/`,
- runtime sync with `REQUEST_BOOTSTRAP` / `PUSH_*` / `UPSERT_HISTORY_ENTRY` / `ACK_HISTORY_ENTRY`,
- watch cache in `LocalStorage` for catalog, latest result, and sync metadata,
- storage-backed `active_session_v1`,
- a more production-shaped session reducer with timed and confirm step semantics,
- baseline logic tests for validators, phone storage, sync contracts, and the session reducer.

## What is still missing

- resume hardening after restart or screen sleep,
- `setWakeUpRelaunch(true)` and `setPageBrightTime(...)`,
- hard feedback validation on a real device,
- mocked Zepp runtime tests and lifecycle / queue replay coverage.

## Read first

1. [README.md](c:\Users\krzys\Projects\PourOverFlow\README.md)
2. [AGENTS.md](c:\Users\krzys\Projects\PourOverFlow\AGENTS.md)
3. [01-zepp-architecture.md](c:\Users\krzys\Projects\PourOverFlow\docs\01-zepp-architecture.md)
4. [02-domain-model.md](c:\Users\krzys\Projects\PourOverFlow\docs\02-domain-model.md)
5. [03-sync-and-storage.md](c:\Users\krzys\Projects\PourOverFlow\docs\03-sync-and-storage.md)
6. [04-watch-and-phone-flows.md](c:\Users\krzys\Projects\PourOverFlow\docs\04-watch-and-phone-flows.md)
7. [05-seed-library.md](c:\Users\krzys\Projects\PourOverFlow\docs\05-seed-library.md)
8. [06-manifest-and-ui-contract.md](c:\Users\krzys\Projects\PourOverFlow\docs\06-manifest-and-ui-contract.md)
9. [TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md)

## Startup protocol for a new agent

Every new agent starting work must do these steps in this order:

1. read the documents from the list above,
2. review [TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md),
3. clean up stale or completed items if the backlog is outdated,
4. point out the best next step,
5. only then move into implementation.

Do not start from a random task without reviewing the backlog and documentation first.

## Hard rules

- Do not add new tool types outside the whitelist.
- Do not treat the watch as the source of truth for history.
- Do not mix recipe CRUD with watch UI.
- Do not build the session timer on top of `AppService`.
- Do not add features outside v1 without updating the documents and getting an explicit decision.

## Most important entities

- `ToolDefinition`
- `RecipeRecord`
- `RecipeStep`
- `RecipeSnapshot`
- `ActiveBrewSession`
- `HistoryEntry`
- `SyncEnvelope`

If any of these entities changes shape, documentation updates are mandatory.

## Most important storage keys

Phone:

- `pof_tools_v1`
- `pof_recipe_index_v1`
- `pof_recipe_<id>_v1`
- `pof_history_index_v1`
- `pof_history_<id>_v1`
- `pof_sync_meta_v1`

Watch:

- `active_session_v1`
- `catalog_cache_v1`
- `last_result_v1`
- `sync_meta_v1`

Helper phone key, non-canonical for sync:

- `pof_settings_ui_state_v1`

## Most important sync messages

- `REQUEST_BOOTSTRAP`
- `PUSH_TOOL_CATALOG`
- `PUSH_CATALOG_SNAPSHOT`
- `PUSH_HISTORY_SNAPSHOT`
- `UPSERT_HISTORY_ENTRY`
- `ACK_HISTORY_ENTRY`

## Nearest goal

Execute Stage 6 from [TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md), which means hardening resume, offline queue replay, and active-session behavior under real watch usage.

## TODO and document maintenance

- Every newly discovered task, risk, or follow-up must go into [TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md) or the relevant architecture document.
- When work finishes, the agent must remove or update completed items.
- `TODO.md` should stay a living backlog, not a storage place for stale notes.

## Definition of done for Stage 5

- `home` shows a resume gate,
- `tool-list` and `recipe-list` use the synced catalog and recipe data,
- `active_session_v1` is persisted locally,
- timed steps, confirm steps, and finish steps have separate reducer semantics,
- `brew-active` shows both the step timer and session timer,
- the feedback layer is best-effort and capability-gated,
- baseline session reducer tests exist,
- `npm test` and `zeus build` pass.

## Important discoveries from Stages 2, 3, 4, and 5

- The Zeus v4 scaffold builds target-based icons correctly from `assets/common.r/icon.png` and `assets/common.s/icon.png`.
- `setting/index.js` is a practical toolchain entrypoint even when the main Settings App code lives in `.jsx`.
- The current watch flow is no longer a local seed preview, and `active_session_v1` is already storage-backed; the remaining follow-up is resume hardening, not session persistence itself.
- The session reducer is already much closer to the target model, but real resume and screen-sleep behavior still need confirmation in Stage 6.
- `setting/` uses the helper key `pof_settings_ui_state_v1` to persist view state and drafts. That key must be ignored by `app-side` and future runtime sync.
- With the current watch UI, lists and summary screens already refresh on runtime events, but this is not yet a fully reactive rendering system.
