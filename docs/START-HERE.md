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
- timestamp-based active session reconciliation on app entry,
- active-brew display guard handling for wake-up relaunch and page bright time,
- debounced storage-driven snapshot pushes in `app-side/`,
- revision-aware slice pushes from `app-side/`, so unchanged bootstrap slices are skipped and live edits no longer replay the full snapshot set,
- baseline logic tests for validators, phone storage, sync contracts, and the session reducer,
- mocked Zepp runtime tests for cached watch browse, full brew completion, incoming catalog sync, and pending-history replay.

## Test loop

- Run `npm test` to execute the full Vitest suite across pure logic and mocked Zepp runtime flow tests.
- Run `npm run test:coverage` when you want local JS coverage output.
- Run `npm run test:playwright` when the Zepp simulator is already running and you want a no-coverage smoke check against the simulator DevTools endpoint.
- Run `npm run test:playwright:harness` when you want the browser module harness to execute real browser-safe project modules as a plain pass/fail run without generating coverage.
- Run `npm run test:playwright:coverage:harness` when you want Playwright coverage against real browser-safe project modules without a simulator.
- Current meaningful coverage baselines after the latest test expansion are `93.30% / 86.05% / 98.25% / 93.19%` for `npm run test:coverage` and `93.63% / 83.05% / 93.95% / 93.63%` for `npm run test:playwright:coverage:harness`.
- Run the VS Code task `Verify: all tests and coverage` from [.vscode/tasks.json](c:\Users\krzys\Projects\PourOverFlow\.vscode\tasks.json) when you want the repo-standard full verification path without simulator-only steps.
- The compound task runs the meaningful local stack in sequence: Vitest, Vitest coverage, Playwright harness smoke, Playwright harness coverage, and `zeus build`.
- If plain PowerShell blocks `npm run ...` through `npm.ps1` execution policy, use the VS Code task or run the npm command through `cmd /c npm ...` instead.
- Run `zeus build` after larger changes to keep the device package healthy.

Important validation rule: the simulator-side Playwright commands now check that the deployed simulator app belongs to this repo and is not older than the latest app-facing source files. If that freshness gate fails, redeploy with `zeus dev` before treating the simulator result as meaningful.
Playwright coverage here is intentionally limited to the browser module harness under `coverage/playwright/harness/`. The repo no longer treats simulator-side V8 coverage as a meaningful standard test because the current simulator DevTools endpoint may expose only the Electron shell page or framework/preload scripts instead of PourOverFlow app code.
`Verify: all tests and coverage` is the repo-standard local job. If CI is introduced later, it should mirror the same command list rather than reassemble the test stack in a second place.

## What is still missing

- hard validation of wake-up relaunch and anti-sleep behavior on a real device,
- hard feedback validation on a real device,
- literal 100% local coverage, if still desired, now mostly means the remaining hotspots in `sync-bridge`, `watch-store`, `phone-store`, `validators`, `feedback`, and the browser-harness copies of `session-reducer` and `recipe-engine`,
- fuller mocked page-shell runtime coverage if widget refresh behavior starts regressing.

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

Finish Stage 6 from [TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md), which now mostly means real-device validation of resume, anti-sleep, feedback behavior, and queue replay under real watch usage.

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
- Stage 6 now reconciles active sessions from stored timestamps on app entry and coalesces phone-side storage change pushes, but hardware validation still remains.
- The current sync path is no longer full-bootstrap-only: the phone side now classifies storage changes by slice and answers `REQUEST_BOOTSTRAP` only for stale revisions.
- Watch-side bootstrap and queue replay should now fail fast when the phone bridge is offline instead of repeatedly attempting transport during offline startup.
- The repo now includes a Vitest-backed mocked Zepp runtime harness under `test/zeus-runtime/` plus flow-level integration coverage under `test/runtime/`.
- The repo now uses `scripts/playwright-simulator-coverage.mjs` for two meaningful Playwright roles only: simulator smoke without coverage and module-harness smoke or coverage for browser-safe shared code.
- Simulator-side V8 coverage was intentionally removed from the repo-standard test menu because the current simulator exposes shell/framework/preload scripts more reliably than PourOverFlow app code.
- In simulator validation, `zeus dev` may deploy to the simulator more reliably than bridge `install`; use bridge mainly for connection and target-aware debugging if `install` looks like a no-op.
- Zeus Bridge may ask the user to choose the active online target, for example `Balance 2`, when multiple candidates are available.
- `zeus dev` may also ask the user to choose the preview target, for example `Amazfit Balance 2`, when multiple simulator device profiles are available.
- Simulator deployment can be verified from files and logs even when CLI output is quiet: `last_app_info.json`, the deployed app folder under `AppData\Roaming\simulator\apps\PourOverFlow20001`, and recent `side-service` `status:opened` lines in `renderer.log`.
- `shared/watch/layouts.js` now uses `getDeviceInfo()` together with `data:os.device.info`, and it also keeps a fallback layout size so a permission problem does not immediately crash first paint.
- The latest simulator run confirmed that `page/home/index.js` reached full widget render successfully; a later console `ui pause` entry was not, by itself, proof of a home-page build crash.
- Current WIP state: automatic startup bootstrap is restored for real hardware, but `shared/watch/sync-bridge.js` skips it in simulator heuristic mode (`Battery().getCurrent() === 0`) while the simulator-side `@zos/ble.send` path is still being debugged.
