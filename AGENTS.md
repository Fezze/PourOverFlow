# AGENTS.md

## Purpose of this file

This file is a repo-level instruction set for the next AI agent. Treat it as higher priority than generic project assumptions, but lower priority than explicit user instructions.

## Repo status

- The repo has Stages 3, 4, and 5 completed.
- There is a Zepp app scaffold, a seed library, canonical phone storage using `index + records`, real CRUD in `setting/`, runtime sync `setting/ -> app-side/ -> watch`, watch cache in `LocalStorage`, storage-backed `active_session_v1`, timestamp-based resume reconciliation, a best-effort feedback layer, and baseline logic plus sync tests.
- The current work scope is late Stage 6: real-device validation, lifecycle hardening, and follow-up cleanup.
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

- Target runtime is `API 4.0`.
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

- Build according to the stages in [docs/TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md).
- Scaffold and contracts first, then UI and engine, then resume and sync hardening.
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
- real-device validation for haptics, audio, screen sleep, and resume.
- improve coverage when meaningful tests can be added without turning the suite into coverage padding.
- prefer behavior-focused tests over superficial assertions written only to move the percentage.

Do not treat the simulator as proof of feedback behavior or screen-off behavior.

## What to do first

The first implementation task from the current repo state is Stage 6:

- validate `setWakeUpRelaunch(true)` and `setPageBrightTime(...)` on real hardware,
- verify resume after restart and after screen sleep on a real device,
- verify `pendingHistoryQueue` replay in an offline -> online scenario,
- validate haptic and audio feedback on a real device,
- keep `npm test` and `zeus build` green after every larger change.

## Discovered toolchain nuances

- For target-based scaffolding with `configVersion: "v3"`, Zeus expects icons under `assets/<target>.<shape>/icon.png`, not only the logical `icon.png` name in `app.json`.
- The `setting.path` entry is safest when exposed through `setting/index.js`; if the source lives in `.jsx`, keep a thin JS shim instead of relying only on `index.jsx`.
- Stage 6 adds timestamp-based resume reconciliation and active-brew display guard handling, but real-device confirmation is still pending.
- `setting/` writes a helper key `pof_settings_ui_state_v1` into `settingsStorage`; `app-side` and future sync must ignore it because it is not part of the canonical domain model.
- Watch browse and result pages already refresh on runtime events when new snapshots arrive, but this is not yet a fully reactive UI system.
- Watch browse now uses scrollable brewer and recipe lists plus a dedicated `recipe-detail` start page; if a later agent redesigns watch browse, update the flow docs and backlog instead of changing it silently.
- `brew-active` now binds the Zepp shortcut key as a secondary confirm / next-step action when the device exposes it; keep it additive, not mandatory.
- The latest UX pass follows official Zepp design-system list patterns. If stricter Figma matching is needed later, the repo should first store a concrete project Figma page or node link instead of relying on a generic "use Figma" instruction.
- `app-side` now coalesces storage-driven snapshot pushes with a small debounce, so high-frequency Settings edits do not immediately spam the bridge.
- In local simulator workflows, `zeus dev` may push the app more reliably than bridge `install`; if bridge `install` appears to do nothing in the simulator, prefer `zeus dev` for deployment and keep bridge for connection/debug tasks.
- Zeus Bridge may prompt for explicit target selection when more than one online simulator or device is visible; picking the intended target such as `Balance 2` is expected behavior, not a failure case.
- `zeus dev` may also prompt for explicit device selection with text such as `Which device would you like to preview?`; on this repo, `Amazfit Balance 2` was a valid target for simulator deployment.
- A successful simulator push can be confirmed without visual inspection by checking `C:\Users\krzys\AppData\Roaming\simulator\last_app_info.json`, the deployed app folder under `C:\Users\krzys\AppData\Roaming\simulator\apps\PourOverFlow20001`, and recent `side-service` `status:opened` lines in `C:\Users\krzys\AppData\Roaming\simulator\logs\renderer.log`.
- `shared/watch/layouts.js` now depends on `getDeviceInfo()` together with `data:os.device.info`; keep that permission in the manifest baseline, and keep the fallback path so a permission issue does not immediately crash first paint.
- In the latest simulator debugging pass, `page/home/index.js` reached full widget render successfully; a simulator-console `ui pause` line alone is not enough evidence that the page crashed during build.
- Current WIP state: automatic startup bootstrap is restored for real hardware, while `shared/watch/sync-bridge.js` skips simulator auto-bootstrap using a battery heuristic (`Battery().getCurrent() === 0`) until the simulator-side `@zos/ble.send` behavior is better understood.
- Real-watch feedback showed that recipe bootstrap sync works end to end; the watch can display synced recipes from the phone even when the simulator bridge remains noisy.
- `app-side` no longer needs to replay the full bootstrap payload set on every storage change. It now classifies phone-side writes by slice and can answer `REQUEST_BOOTSTRAP` only for stale revisions.
- Watch-side bootstrap and queue replay should fail fast when the bridge is disconnected so offline startup stays responsive instead of repeatedly attempting transport.
- The repo now includes a Vitest-backed mocked Zepp runtime harness under `test/zeus-runtime/`; use it for flow-level watch tests before leaning on the simulator for every regression.
- `npm test` now runs the unified Vitest suite, and `npm run test:coverage` is the repo-standard JS coverage command.
- The current meaningful local coverage baselines are `93.40% / 84.68% / 98.20% / 93.29%` for `npm run test:coverage` and `93.63% / 83.05% / 93.95% / 93.63%` for `npm run test:playwright:coverage:harness`; if a later agent pushes for literal 100%, the remaining hotspots are mostly defensive Zepp-runtime branches in `sync-bridge`, `phone-store`, `validators`, `tool-list`, `home`, `recipe-list`, and the browser-harness copies of `session-reducer` and `recipe-engine`.
- The mocked Zepp runtime harness now covers page-shell behavior too. It aliases `@zos/ui`, `@zos/device`, and `@zos/interaction`, mocks `zosLoader:./index.[pf].layout.js`, captures `Page(...)` definitions, and asserts widget creation, scroll-list routing, empty or stale-state fallbacks, and runtime-event-driven `replace(...)` refreshes without relying on the simulator.
- The repo includes `npm run test:playwright` and `npm run test:playwright:harness` as no-coverage Playwright smoke runs, so the simulator path and the browser module harness can both be exercised without writing coverage reports.
- The same script supports `npm run test:playwright:coverage:harness`, which opens a local browser harness page and executes real browser-safe project modules for Playwright/V8 coverage without a simulator; keep treating it as complementary to Vitest, not as proof of Zepp-only runtime behavior.
- The repo-standard full local verification job is the VS Code compound task `Verify: all tests and coverage` in `.vscode/tasks.json`; it runs Vitest, Vitest coverage, Playwright harness smoke, Playwright harness coverage, and `zeus build` in one pass.
- Prefer the task-based job over wrapper scripts, because wrapper orchestration proved less reliable than direct task execution for Vitest and Zeus on this Windows-local toolchain.
- There is no repo-level CI assumption right now. Treat the VS Code verification task as the single source of truth for the full non-simulator verification stack, and only mirror it into CI later if CI is actually introduced.
- On Windows shells, plain PowerShell `npm run ...` may hit `npm.ps1` execution-policy blocking. Prefer the VS Code verification task or `cmd /c npm ...` if a direct PowerShell npm call fails before the repo code even starts.
- The no-coverage simulator smoke run currently works best by polling the simulator DevTools page list instead of using a full Playwright `connectOverCDP()` browser attach, because the Zepp simulator may reject that path with `Browser.setDownloadBehavior` context-management errors.
- Current verified limitation: the simulator DevTools endpoint may expose only the Electron shell page under `Program Files/simulator/resources/app.asar/...`; in that state simulator-side V8 coverage is not meaningful for app-code assertions and should be treated as blocked by the simulator, not by the app code.
- The simulator-side Playwright commands now include a freshness gate: they verify that `last_app_info.json` points at this repo and that the deployed simulator app is not older than the latest app-facing source files. If the gate fails, redeploy with `zeus dev` before trusting simulator results.
- Additional verified limitation after a fresh deploy: the simulator Playwright coverage path may still yield only framework/preload scripts such as `mobile-main-service.js` and simulator preload code, not PourOverFlow app scripts. The repo intentionally keeps simulator Playwright as smoke-only and uses module-harness coverage as the meaningful Playwright coverage path.

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

