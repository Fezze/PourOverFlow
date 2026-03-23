# PourOverFlow

PourOverFlow is a planned Zepp OS app for guiding manual coffee brewing from a watch. V1 combines a simple watch-first execution flow with a phone-side recipe and history manager.

## Current status

The repo already has Stages 3, 4, and 5 completed, and the code-facing part of Stage 6 is now in place. It includes a Zepp app scaffold with a passing `zeus build`, a seed library, canonical phone storage using `index + records`, real recipe CRUD in `setting/`, runtime sync `setting/ -> app-side/ -> watch`, watch cache in `LocalStorage`, storage-backed `active_session_v1`, timestamp-based resume reconciliation, active-brew display guard handling, baseline logic tests, and mocked Zepp runtime integration tests for cached watch flow and queue replay.

## Project language

This project is to be run in English.

- Repository documentation must be written in English.
- Backlog updates in `docs/TODO.md` must be written in English.
- Architecture notes, handoff notes, and persistent repo-facing agent instructions must be written in English.

## What the product should do

- On the watch: `tool -> recipe -> active brew`
- During a session: step timer, total session timer, manual `Next` steps, haptic feedback, and optional audio
- On the phone: full recipe CRUD and history note editing
- Sync: `setting/ -> app-side/ -> messaging.peerSocket -> Device App`
- Resume: best-effort `resume`, not a guaranteed full background engine

## Hard v1 assumptions

- `configVersion: "v3"`
- `runtime.apiVersion.target: "4.0"`
- `v4` profile
- screen scope: `round + square`
- no `band`
- closed catalog of supported brewing tools
- the phone is the source of truth for recipes and history
- the watch stores only cache, active session, last result, and sync metadata

## Most important documents

- [Start Here](c:\Users\krzys\Projects\PourOverFlow\docs\START-HERE.md)
- [Product Goals](c:\Users\krzys\Projects\PourOverFlow\docs\00-product-goals.md)
- [Zepp Architecture](c:\Users\krzys\Projects\PourOverFlow\docs\01-zepp-architecture.md)
- [Domain Model](c:\Users\krzys\Projects\PourOverFlow\docs\02-domain-model.md)
- [Sync and Storage](c:\Users\krzys\Projects\PourOverFlow\docs\03-sync-and-storage.md)
- [Watch and Phone Flows](c:\Users\krzys\Projects\PourOverFlow\docs\04-watch-and-phone-flows.md)
- [Seed Library](c:\Users\krzys\Projects\PourOverFlow\docs\05-seed-library.md)
- [Manifest and UI Contract](c:\Users\krzys\Projects\PourOverFlow\docs\06-manifest-and-ui-contract.md)
- [Implementation TODO](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md)
- [Agent Instructions](c:\Users\krzys\Projects\PourOverFlow\AGENTS.md)

## Work order

1. Read [Start Here](c:\Users\krzys\Projects\PourOverFlow\docs\START-HERE.md).
2. Freeze the scaffold according to [Zepp Architecture](c:\Users\krzys\Projects\PourOverFlow\docs\01-zepp-architecture.md).
3. Follow the data model from [Domain Model](c:\Users\krzys\Projects\PourOverFlow\docs\02-domain-model.md).
4. Seed the library according to [Seed Library](c:\Users\krzys\Projects\PourOverFlow\docs\05-seed-library.md).
5. Follow the `app.json` and `setting/` contract from [Manifest and UI Contract](c:\Users\krzys\Projects\PourOverFlow\docs\06-manifest-and-ui-contract.md).
6. Do not change storage or sync contracts without updating the documents.
7. Execute the stages from [TODO](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md) in order.

## Next stage

The next practical step is to finish Stage 6 from [TODO](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md): real-device validation of wake-up relaunch, anti-sleep behavior, haptic/audio feedback, and lifecycle edge cases that cannot be proven by simulator or pure tests alone.

## Test commands

- `npm test` runs the full Vitest suite, including the pure logic tests and the mocked Zepp runtime flow tests.
- `npm run test:coverage` generates Vitest coverage reports in `coverage/`.
- `npm run test:playwright` uses the running Zepp simulator's DevTools endpoint as a lightweight no-coverage smoke check for a live simulator session.
- `npm run test:playwright:harness` launches the local browser module harness without collecting coverage, so the same browser-safe module scenarios can be exercised as plain pass/fail checks.
- `npm run test:playwright:coverage:harness` launches a local Chromium-family browser against a browser harness that imports and executes real browser-safe project modules, then writes Playwright/V8 coverage into `coverage/playwright/harness/`.
- the repo-standard local all-in-one job is the VS Code compound task `Verify: all tests and coverage` from [.vscode/tasks.json](c:\Users\krzys\Projects\PourOverFlow\.vscode\tasks.json).
- the task runs Vitest, Vitest coverage, Playwright harness smoke, Playwright harness coverage, and `zeus build` in sequence without relying on a wrapper script or CI.
- `zeus build` remains the required compile gate after larger changes.

Playwright in this repo is intentionally split in two:
- simulator smoke only, through `npm run test:playwright`
- browser module-harness coverage, through `npm run test:playwright:coverage:harness`

The simulator-side Playwright commands now also verify that `last_app_info.json` points at this repo and that the deployed simulator app is not older than the latest app-facing source files. If the deployment is stale, rerun `zeus dev` before trusting the simulator test result.
The repo no longer exposes simulator V8 coverage as a standard npm test because the current simulator DevTools endpoint may expose only the Electron shell page or framework/preload scripts such as `mobile-main-service.js` instead of reliable PourOverFlow app-code coverage.
The verification workflow is intentionally local-first and does not assume CI. If CI is added later, it should mirror the same commands as `Verify: all tests and coverage` instead of redefining the stack separately.

## What is still missing in the repo

- hard validation of wake-up relaunch, anti-sleep, haptic, and audio behavior on a real device,
- fuller page-shell mocked Zepp runtime coverage for widget refresh and page lifecycle,
- a scalable watch recipe browse pattern for more than two recipes per brewer.

## Important technical limits

- Do not treat `AppService` as the core timer engine.
- Do not add cloud sync, backend, external recipe import, or BLE to the v1 baseline.
- Do not design user-defined `Tool`.
- Do not move canonical history to the watch.

## Commit history

- `38bcd5e` - `Add PourOverFlow v1 architecture and planning docs`
- `0f7313d` - `Add agent onboarding and backlog maintenance docs`
- `48e7a1b` - `Add seed library and manifest UI contracts`

This is the starting point for further implementation.
