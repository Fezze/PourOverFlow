# PourOverFlow

PourOverFlow is a planned Zepp OS app for guiding manual coffee brewing from a watch. V1 combines a simple watch-first execution flow with a phone-side recipe and history manager.

## Current status

The repo already has Stages 3, 4, and 5 completed, and the code-facing part of Stage 6 is now in place. It includes a Zepp app scaffold with a passing `zeus build`, a seed library, canonical phone storage using `index + records`, real recipe CRUD in `setting/`, a cleaner phone-side Settings UX with contextual headers and card-based browse/edit screens, runtime sync `setting/ -> app-side/ -> watch`, watch cache in `LocalStorage`, storage-backed `active_session_v1`, timestamp-based resume reconciliation, active-brew display guard handling, a dedicated watch validation page for hardware checks, baseline logic tests, mocked Zepp runtime integration tests for cached watch flow and queue replay, and page-shell runtime coverage for `home`, `tool-list`, `recipe-list`, `recipe-detail`, `result-summary`, and `validation`.
The latest watch UX pass also keeps brewer and recipe chooser pages quieter on-device: populated browse screens no longer spend space on bridge/cache chatter or redundant home buttons, real brewer method icons now render directly from the closed tool catalog assets, and the dedicated `validation` page remains the place for runtime diagnostics and manual hardware checks.

## Project language

This project is to be run in English.

- Repository documentation must be written in English.
- Backlog updates in `docs/TODO.md` must be written in English.
- Architecture notes, handoff notes, and persistent repo-facing agent instructions must be written in English.

## What the product should do

- On the watch: `tool list -> recipe list -> recipe detail -> active brew`, with native scrolling, a hardware shortcut on the active brew screen when the device exposes one, and a dedicated validation screen reachable from the result summary
- During a session: step timer, total session timer, manual `Next` steps, haptic feedback, and optional audio
- On the phone: full recipe CRUD and history note editing with card-based browse and editor screens
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

## Development environment

Recommended local baseline for this repo:

- Node.js `20.x`
- npm `10.x`
- global Zeus CLI from `@zeppos/zeus-cli`
- a Chromium-family browser for the Playwright module harness

The repo includes [`.nvmrc`](/home/deck/Projects/PourOverFlow/.nvmrc) and `package.json` engines to make that baseline explicit.

Linux-first setup:

```bash
# install nvm from the official nvm installer
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# restart the shell, then install and use the repo baseline
nvm install 20
nvm use 20

# confirm the toolchain
node -v
npm -v

# install the Zepp CLI globally
npm i -g @zeppos/zeus-cli
zeus -v

# install repo dependencies
npm install
```

For the Playwright module harness on Linux, set `PLAYWRIGHT_COVERAGE_BROWSER` to a Chromium-family browser executable before running the harness commands. Example values are `/usr/bin/chromium`, `/snap/bin/chromium`, `/usr/bin/google-chrome`, or `/usr/bin/microsoft-edge`.

```bash
export PLAYWRIGHT_COVERAGE_BROWSER=/usr/bin/chromium
```

If VS Code itself is running as a Flatpak on Steam Deck or another Linux desktop, the sandbox may not expose the host Chromium launcher directly to Node. In that case use the checked-in wrapper [scripts/playwright-flatpak-host-browser.sh](/home/deck/Projects/PourOverFlow/scripts/playwright-flatpak-host-browser.sh), which launches host Chromium through `flatpak-spawn` and forwards the file descriptors Playwright needs for `--remote-debugging-pipe`.

```bash
export PLAYWRIGHT_COVERAGE_BROWSER=/home/deck/Projects/PourOverFlow/scripts/playwright-flatpak-host-browser.sh
```

Current platform note:

- `npm test`, `npm run test:coverage`, and `zeus build` should work once Node and Zeus CLI are installed.
- `npm run test:playwright:harness` and `npm run test:playwright:coverage:harness` need the browser path above on Linux.
- when VS Code runs as a Flatpak, prefer the repo wrapper `scripts/playwright-flatpak-host-browser.sh` so Playwright can launch host Chromium with forwarded pipe FDs.
- `npm run test:playwright` is still Windows-centric today because the simulator smoke script reads Zepp simulator metadata from `APPDATA`; treat Linux simulator smoke as unverified until that path is generalized.

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
- current meaningful local coverage baselines are `93.67% / 84.86% / 98.28% / 93.57%` for Vitest and `93.63% / 83.05% / 93.95% / 93.63%` for the Playwright module harness.
- the repo-standard local all-in-one job is the VS Code compound task `Verify: all tests and coverage` from [.vscode/tasks.json](c:\Users\krzys\Projects\PourOverFlow\.vscode\tasks.json).
- the task runs Vitest, Vitest coverage, Playwright harness smoke, Playwright harness coverage, and `zeus build` in sequence without relying on a wrapper script or CI.
- `zeus build` remains the required compile gate after larger changes.
- on Linux, set `PLAYWRIGHT_COVERAGE_BROWSER` before the Playwright harness commands so `playwright-core` knows which local Chromium-family browser to launch.
- the simulator smoke path currently assumes a Windows Zepp simulator installation because it reads simulator metadata from `APPDATA`.

Playwright in this repo is intentionally split in two:
- simulator smoke only, through `npm run test:playwright`
- browser module-harness coverage, through `npm run test:playwright:coverage:harness`

The simulator-side Playwright commands now also verify that `last_app_info.json` points at this repo and that the deployed simulator app is not older than the latest app-facing source files. If the deployment is stale, rerun `zeus dev` before trusting the simulator test result.
The repo no longer exposes simulator V8 coverage as a standard npm test because the current simulator DevTools endpoint may expose only the Electron shell page or framework/preload scripts such as `mobile-main-service.js` instead of reliable PourOverFlow app-code coverage.
The verification workflow is intentionally local-first and does not assume CI. If CI is added later, it should mirror the same commands as `Verify: all tests and coverage` instead of redefining the stack separately.

## What is still missing in the repo

- hard validation of wake-up relaunch, anti-sleep, haptic, and audio behavior on a real device,
- confirmation on real hardware that the latest Vibrator-first haptic cue and strong sound-or-buzzer validation cue both fire as expected,
- manual execution of the validation page on real hardware to confirm haptics, audio, and offline-safe sync behavior,
- literal 100% local coverage, if the team still wants to keep pushing the current baselines.
- a concrete project Figma node or page link, if the team wants tighter visual matching than the current Zepp-design-system-based UX pass.

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
