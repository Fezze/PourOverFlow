# AGENTS.md

## Purpose of this file

This file is a repo-level instruction set for the next AI agent. Treat it as higher priority than generic project assumptions, but lower priority than explicit user instructions.

## Repo status

- The repo has the Zepp app scaffold, seed library, canonical phone storage using `index + records`, real CRUD in `setting/`, runtime sync `setting/ -> app-side/ -> watch`, watch cache in `LocalStorage`, storage-backed `active_session_v1`, timestamp-based resume reconciliation, a haptics-first feedback layer, and baseline logic plus sync tests.
- The current starter catalog is a versioned uneven 24-recipe seed set, and existing installs now migrate forward through `seedCatalogVersion` instead of replaying the whole seed library.
- The actual Zeus package now lives under `zepp-app/`, while docs, scripts, tests, editor tasks, and coverage stay at repo root.
- The current work scope is cleanup, remaining real-watch comfort validation, and follow-up tooling or watch UX hardening.
- This repo is a Zepp OS project, so any task involving implementation, architecture, debugging, or validation must use the `zepp-miniapp-builder` skill as the default workflow.

## Project language

This project must be run in English.

- Repository documentation must be kept in English.
- Backlog maintenance in `docs/TODO.md` must be kept in English.
- Architecture notes, persistent handoff notes, and repo-facing agent instructions must be kept in English.
- If an agent discovers new work, risks, debt, or constraints, the written follow-up must be added in English.

## Mandatory reading order

Before any implementation, read these files in this exact order:

1. [README.md](c:\Users\krzys\Projects\PourOverFlow\README.md)
2. [docs/START-HERE.md](c:\Users\krzys\Projects\PourOverFlow\docs\START-HERE.md)
3. [docs/01-zepp-architecture.md](c:\Users\krzys\Projects\PourOverFlow\docs\01-zepp-architecture.md)
4. [docs/02-domain-model.md](c:\Users\krzys\Projects\PourOverFlow\docs\02-domain-model.md)
5. [docs/03-sync-and-storage.md](c:\Users\krzys\Projects\PourOverFlow\docs\03-sync-and-storage.md)
6. [docs/04-watch-and-phone-flows.md](c:\Users\krzys\Projects\PourOverFlow\docs\04-watch-and-phone-flows.md)
7. [docs/05-seed-library.md](c:\Users\krzys\Projects\PourOverFlow\docs\05-seed-library.md)
8. [docs/06-manifest-and-ui-contract.md](c:\Users\krzys\Projects\PourOverFlow\docs\06-manifest-and-ui-contract.md)
9. [docs/TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md)

Do not start writing code from memory if you have not read these files.

## Mandatory skill

This repo is a Zepp OS mini-app project, so the agent must always:

- start work assuming use of the `zepp-miniapp-builder` skill,
- evaluate runtime, manifest, surface architecture, and permission decisions through that skill,
- avoid treating this project like a generic web app or generic mobile app.

If a task touches Zepp runtime and the agent is not using `zepp-miniapp-builder`, the workflow is inconsistent with the repo rules.

## Frozen decisions

- Target runtime floor is `API_LEVEL 3.6`.
- Screen scope is `round + square`.
- `band` is out of scope for v1.
- The `Tool` catalog is closed and read-only.
- The phone is the source of truth for recipes and history.
- The watch stores only cache, active session, last result, and sync metadata.
- The watch browse flow is `tool-list -> recipe-list -> recipe-detail -> active brew`.
- The active session runs on `RecipeSnapshot`.
- Deleting a recipe does not delete history.
- `PUSH_HISTORY_SNAPSHOT` syncs only the latest result, not the full archive.
- `AppService` is an experimental spike only, not part of the v1 baseline.

## What must not change without an explicit decision

- Storage key names.
- Sync message type names.
- The supported `toolId` catalog without updating product documentation and the data model.
- The "phone is source of truth" rule.
- The v1 scope by adding cloud, backend, external import, or BLE.

## How to implement

- Build according to the current open work in [docs/TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md).
- Keep domain logic in shared, testable modules without Zepp runtime dependencies.
- The watch UI layer should stay thin: read state and render.
- `setting/` must remain the only place for recipe and history CRUD.
- `app-side/` must remain the only sync bridge to the watch.

## Commit and verification discipline

- Before every commit, run the repo-standard verification stack or an equivalent full local verify pass and make sure it is green.
- The preferred verify path is the VS Code compound task `Verify: all tests and coverage`; command-line equivalents are acceptable when they cover the same stack.
- After finishing a meaningful chunk of work, create a commit instead of leaving completed work uncommitted.
- If the user explicitly asks not to commit yet, follow that instruction and keep the tree ready instead.
- Do not commit known-broken code, stale docs, or partially updated contracts.

## Mandatory backlog and documentation hygiene

Every agent working in this repo must keep the backlog and documentation usable for the next agent.

### At the start of every session

- Review [docs/TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md) and recently changed documents.
- Identify the nearest sensible implementation step.
- Recommend the best next task to the user instead of starting from a random request.
- If you find stale, completed, or outdated items, clean up the backlog first.

### During the work

- Every new task, risk, spike, debt item, or discovered constraint must be written into [docs/TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md) or into a more appropriate document if it affects a stable architectural decision.
- Do not leave important conclusions only in chat replies or in your head.
- If implementation changes the data model, sync contracts, flow, or scope, update the relevant document immediately, not later.

### When closing the task

- Remove or clearly mark TODO items that were completed.
- Add new follow-ups created by the work you just did.
- Clean `TODO.md` of stale, duplicated, or no-longer-needed items.
- Make sure `README.md`, `docs/START-HERE.md`, and `docs/TODO.md` still guide the next agent toward a sensible next step.

### Hard rule

A new agent starting work in this repo must always:

1. review the backlog and documentation,
2. assess what the best next step currently is,
3. communicate that recommendation to the user,
4. only then begin implementation.

## How to test

Minimum standard:

- pure-logic tests for the model, session reducer, and sync,
- simulator validation for layout and flow,
- real-device validation for haptics, screen sleep, resume, and queue replay.
- improve coverage when meaningful tests can be added without turning the suite into coverage padding.
- prefer behavior-focused tests over superficial assertions written only to move the percentage.

Do not treat the simulator as proof of feedback behavior or screen-off behavior.

## What to do first

The first implementation task from the current repo state is the nearest sensible item in [docs/TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md), which is usually one of:

- remaining comfort validation for haptics on a real brew,
- round-screen comfort cleanup on real hardware,
- repo cleanup or tooling follow-up that does not change the product scope.

## Discovered toolchain nuances

- For target-based scaffolding with `configVersion: "v3"`, Zeus expects icons under `assets/<target>.<shape>/icon.png`, not only the logical `icon.png` name in `app.json`. In this repo those files are under `zepp-app/assets/...`.
- The `setting.path` entry is safest when exposed through `setting/index.js`; if the source lives in `.jsx`, keep a thin JS shim instead of relying only on `index.jsx`. In this repo that shim lives under `zepp-app/setting/index.js`.
- Timestamp-based resume reconciliation and active-brew display guard handling are implemented, and real-watch logs already confirmed the core wake, resume, and queue replay paths.
- `setting/` writes a helper key `pof_settings_ui_state_v1` into `settingsStorage`; `app-side` and future sync must ignore it because it is not part of the canonical domain model.
- The phone-side Settings UI now relies on active top navigation, contextual shell headers, summary cards, and card-tap record opening; avoid regressing it back to row-heavy admin-style screens with redundant `Edit` buttons.
- Keep phone `Library` selector-first too: the shell header should carry the high-level brewer/recipe counts, while the body stays focused on compact brewer rows with left badges instead of a second dashboard-style `Recipe library` panel.
- In phone `Library`, prefer the same brewer PNG assets as the watch on the left and a separate numeric count badge on the right; do not fall back to text initials or bury the count inside the main label if the icon assets are available.
- Keep phone `History` and `Sync` calmer as well; if the shell header already carries the context, do not reintroduce another heavy top summary card with the same information.
- Watch browse and result pages already refresh on runtime events when new snapshots arrive, but this is not yet a fully reactive UI system.
- Watch browse now uses scrollable brewer and recipe lists plus a dedicated `recipe-detail` start page; if a later agent redesigns watch browse, update the flow docs and backlog instead of changing it silently.
- `brew-active` now binds the Zepp shortcut key as a secondary confirm / next-step action when the device exposes it; keep it additive, not mandatory.
- The watch no longer includes a dedicated hardware-check page. Use the normal brew flow plus `[pof-validation]` logs for real-device validation instead of reintroducing a watch-side debug menu.
- Keep populated watch chooser pages quiet. `tool-list` and `recipe-list` should prioritize selection, not bridge/cache diagnostics or redundant home actions.
- Keep empty watch chooser pages explicit too. If a brewer has no recipes, the watch should say recipes are created on the phone first and only then offer a refresh action from the watch.
- `recipe-detail` now stays static for normal-length summaries and only falls back to scrolling when the recipe metadata genuinely overflows; populated `result-summary` follows the same rule for its normal short summary rows instead of using a scroll list by default.
- Keep populated `result-summary` calm too: prefer one primary `Home` CTA and a continuous summary panel instead of bringing back a redundant `Browse + Home` pair.
- The current feedback baseline is haptics-only. Treat audio cues as unsupported unless product scope changes explicitly.
- The phone-side seed flow now stores `seedCatalogVersion` inside `pof_sync_meta_v1`; later seed growth should be additive and migration-based, and must not resurrect deleted older seeds.
- The `home` resume gate now uses `Discard` as the secondary action label, and `brew-active` now gives the main instruction body most of the page height while scrolling only on real overflow.
- The `brew-active` action row now follows a simpler paired-pill dock pattern: one rounded base surface, a clearer primary-right action, and no extra divider or mask chrome.
- The latest UX pass follows official Zepp design-system list patterns. If stricter Figma matching is needed later, the repo should first store a concrete project Figma page or node link instead of relying on a generic "use Figma" instruction.
- `app-side` now coalesces storage-driven snapshot pushes with a small debounce, so high-frequency Settings edits do not immediately spam the bridge.
- In local simulator workflows, `zeus dev` may push the app more reliably than bridge `install`; if bridge `install` appears to do nothing in the simulator, prefer `zeus dev` for deployment and keep bridge for connection/debug tasks.
- Zeus Bridge may prompt for explicit target selection when more than one online simulator or device is visible; picking the intended target such as `Balance 2` is expected behavior, not a failure case.
- `zeus dev` may also prompt for explicit device selection with text such as `Which device would you like to preview?`; on this repo, `Amazfit Balance 2` was a valid target for simulator deployment.
- A successful simulator push can be confirmed without visual inspection by checking `last_app_info.json`, the deployed app folder under the resolved simulator root (`%APPDATA%/simulator` on Windows or `${XDG_CONFIG_HOME:-~/.config}/simulator` on Linux), and recent `side-service` `status:opened` lines in `renderer.log`.
- `zepp-app/shared/watch/layouts.js` now depends on `getDeviceInfo()` together with `data:os.device.info`; keep that permission in the manifest baseline, and keep the fallback path so a permission issue does not immediately crash first paint.
- In the latest simulator debugging pass, `zepp-app/page/home/index.js` reached full widget render successfully; a simulator-console `ui pause` line alone is not enough evidence that the page crashed during build.
- Current WIP state: automatic startup bootstrap is restored for real hardware, while `zepp-app/shared/watch/sync-bridge.js` skips simulator auto-bootstrap using a battery heuristic (`Battery().getCurrent() === 0`) until the simulator-side `@zos/ble.send` behavior is better understood.
- Real-watch feedback showed that recipe bootstrap sync works end to end; the watch can display synced recipes from the phone even when the simulator bridge remains noisy.
- `app-side` no longer needs to replay the full bootstrap payload set on every storage change. It now classifies phone-side writes by slice and can answer `REQUEST_BOOTSTRAP` only for stale revisions.
- Watch-side bootstrap and queue replay should fail fast when the bridge is disconnected so offline startup stays responsive instead of repeatedly attempting transport.
- The repo now includes a Vitest-backed mocked Zepp runtime harness under `test/zeus-runtime/`; use it for flow-level watch tests before leaning on the simulator for every regression.
- `npm test` now runs the unified Vitest suite, and `npm run test:coverage` is the repo-standard JS coverage command.
- Coverage reports should stay repo-local in the normal root-level `coverage/` directory, while Zeus watches only `zepp-app/`. Use `POF_REPORTS_ROOT` only when you need to override that root intentionally.
- The current meaningful local coverage baselines are `93.79% / 83.81% / 97.98% / 93.69%` for `npm run test:coverage` and `93.36% / 82.40% / 92.76% / 93.36%` for `npm run test:playwright:coverage:harness`; if a later agent pushes for literal 100%, the remaining hotspots are mostly defensive Zepp-runtime branches in `sync-bridge`, `phone-store`, `validators`, `tool-list`, `home`, `recipe-list`, `brew-active`, and the browser-harness copies of `session-reducer` and `recipe-engine`.
- The mocked Zepp runtime harness now covers page-shell behavior too. It aliases `@zos/ui`, `@zos/device`, and `@zos/interaction`, mocks `zosLoader:./index.[pf].layout.js`, captures `Page(...)` definitions, and asserts widget creation, scroll-list routing, empty or stale-state fallbacks, and runtime-event-driven `replace(...)` refreshes without relying on the simulator.
- The repo includes `npm run test:playwright` and `npm run test:playwright:harness` as no-coverage Playwright smoke runs, so the simulator path and the browser module harness can both be exercised without writing coverage reports.
- The same script supports `npm run test:playwright:coverage:harness`, which opens a local browser harness page and executes real browser-safe project modules for Playwright/V8 coverage without a simulator; keep treating it as complementary to Vitest, not as proof of Zepp-only runtime behavior.
- The repo also includes `npm run validation:logs`, which summarizes `[pof-validation]` events from the simulator `renderer.log` by default or from an explicit `--file` path when you are reviewing exported real-device logs.
- The simulator smoke script now resolves simulator metadata from `%APPDATA%/simulator` on Windows, `${XDG_CONFIG_HOME:-~/.config}/simulator` on Linux, or an explicit `ZEPP_SIMULATOR_ROOT` override.
- The repo-standard full local verification job is the VS Code compound task `Verify: all tests and coverage` in `.vscode/tasks.json`; it runs Vitest, Vitest coverage, Playwright harness smoke, Playwright harness coverage, and the Zeus build wrapper in one pass.
- Root-level Zeus commands should go through the repo wrappers such as `npm run build` and `npm run zepp:dev -- ...`, or by running Zeus directly from `zepp-app/`.
- The repo Zeus-root helper now walks upward from nested working directories too, so root wrappers still find `zepp-app/` when a command is launched from `scripts/`, `test/`, or a deeper app subfolder.
- Prefer the task-based job over wrapper scripts, because wrapper orchestration proved less reliable than direct task execution for Vitest and Zeus on this Windows-local toolchain.
- There is no repo-level CI assumption right now. Treat the VS Code verification task as the single source of truth for the full non-simulator verification stack, and only mirror it into CI later if CI is actually introduced.
- On Windows shells, plain PowerShell `npm run ...` may hit `npm.ps1` execution-policy blocking. Prefer the VS Code verification task or `cmd /c npm ...` if a direct PowerShell npm call fails before the repo code even starts.
- The no-coverage simulator smoke run currently works best by polling the simulator DevTools page list instead of using a full Playwright `connectOverCDP()` browser attach, because the Zepp simulator may reject that path with `Browser.setDownloadBehavior` context-management errors.
- Current verified limitation: the simulator DevTools endpoint may expose only the Electron shell page under `Program Files/simulator/resources/app.asar/...`; in that state simulator-side V8 coverage is not meaningful for app-code assertions and should be treated as blocked by the simulator, not by the app code.
- The simulator-side Playwright commands now include a freshness gate: they verify that `last_app_info.json` points at this repo and that the deployed simulator app is not older than the latest app-facing source files. If the gate fails, redeploy with `zeus dev` before trusting simulator results.
- Do not launch the simulator smoke test in parallel with `zeus dev`. Wait for the deploy to finish first, or the freshness gate may fail transiently while the simulator app folder is still updating.
- Additional verified limitation after a fresh deploy: the simulator Playwright coverage path may still yield only framework/preload scripts such as `mobile-main-service.js` and simulator preload code, not PourOverFlow app scripts. The repo intentionally keeps simulator Playwright as smoke-only and uses module-harness coverage as the meaningful Playwright coverage path.
- Cross-platform simulator-root helpers must not rely on the host OS path separator when interpreting Linux or Flatpak `XDG_CONFIG_HOME` values. Keep Linux path detection slash-agnostic so coverage and simulator helpers still work when the repo is edited from Windows but validated against Linux-style paths in tests.
- Current compatibility note: the official device list reports `Amazfit Balance` at `API_LEVEL 3.7`, but the local simulator path may report `3.6`; the repo currently uses a `3.6` floor so Balance 1 support and simulator preview do not drift apart unnecessarily.

## When to update documents

Update documents whenever any of these change:

- data model,
- sync contracts,
- supported tool catalog,
- watch/phone flow,
- v1 scope decisions.

If implementation reveals a Zepp technical limitation, update the appropriate document before closing the task.

This also applies to TODO hygiene:

- close completed items,
- add newly discovered tasks,
- do not let `docs/TODO.md` become an archive of stale notes.

