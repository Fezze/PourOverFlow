# PourOverFlow

PourOverFlow is a planned Zepp OS app for guiding manual coffee brewing from a watch. V1 combines a simple watch-first execution flow with a phone-side recipe and history manager.

## Current status

The repo already includes a Zepp app scaffold with a passing `zeus build`, a seed library, canonical phone storage using `index + records`, real recipe CRUD in `setting/`, a cleaner phone-side Settings UX with contextual headers, color-banded sections, and a paginated recipe-step editor, runtime sync `setting/ -> app-side/ -> watch`, watch cache in `LocalStorage`, storage-backed `active_session_v1`, timestamp-based resume reconciliation, active-brew display guard handling, a haptics-first feedback layer, baseline logic tests, mocked Zepp runtime integration tests for cached watch flow and queue replay, and page-shell runtime coverage for `home`, `tool-list`, `recipe-list`, `recipe-detail`, `brew-active`, and `result-summary`.
The latest watch UX pass also keeps brewer and recipe chooser pages quieter on-device: populated browse screens no longer spend space on bridge/cache chatter or redundant home buttons, empty recipe lists now say recipes must be created on the phone first, real brewer method icons now render directly from the closed tool catalog assets, `recipe-detail` and populated `result-summary` screens use compact scrollable summary rows inside calmer continuous panels, the populated result screen now uses a single `Home` CTA instead of a redundant `Browse + Home` pair, and the watch flow no longer spends a separate page on manual hardware checks.

## Project language

This project is to be run in English.

- Repository documentation must be written in English.
- Backlog updates in `docs/TODO.md` must be written in English.
- Architecture notes, handoff notes, and persistent repo-facing agent instructions must be written in English.

## What the product should do

- On the watch: `tool list -> recipe list -> recipe detail -> active brew`, with native scrolling and a hardware shortcut on the active brew screen when the device exposes one
- During a session: step timer, total session timer, manual `Next` steps, and haptic feedback
- On the phone: full recipe CRUD and history note editing with color-banded browse screens and a paginated step editor
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
- `npm run test:playwright` now supports the common Linux simulator path too:
  - Windows: `%APPDATA%/simulator`
  - Linux: `${XDG_CONFIG_HOME:-~/.config}/simulator`
- if your simulator metadata lives somewhere custom, set `ZEPP_SIMULATOR_ROOT` before the simulator smoke command.

```bash
export ZEPP_SIMULATOR_ROOT="$HOME/.config/simulator"
```

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
7. Use [TODO](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md) as the live list of open work.

## Next work

The next practical step lives in [TODO](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md): confirm haptic comfort over a real brew and finish the remaining round-screen comfort pass that cannot be proven by simulator or pure tests alone.

## Test commands

- `npm test` runs the full Vitest suite, including the pure logic tests and the mocked Zepp runtime flow tests.
- `npm run test:coverage` generates Vitest coverage reports in `coverage/`.
- `npm run test:playwright` uses the running Zepp simulator's DevTools endpoint as a lightweight no-coverage smoke check for a live simulator session.
- `npm run test:playwright:harness` launches the local browser module harness without collecting coverage, so the same browser-safe module scenarios can be exercised as plain pass/fail checks.
- `npm run test:playwright:coverage:harness` launches a local Chromium-family browser against a browser harness that imports and executes real browser-safe project modules, then writes Playwright/V8 coverage into `coverage/playwright/harness/`.
- current meaningful local coverage baselines are `93.30% / 83.59% / 97.51% / 93.20%` for Vitest and `93.63% / 83.05% / 93.95% / 93.63%` for the Playwright module harness.
- the repo-standard local all-in-one job is the VS Code compound task `Verify: all tests and coverage` from [.vscode/tasks.json](c:\Users\krzys\Projects\PourOverFlow\.vscode\tasks.json).
- the task runs Vitest, Vitest coverage, Playwright harness smoke, Playwright harness coverage, and `zeus build` in sequence without relying on a wrapper script or CI.
- `zeus build` remains the required compile gate after larger changes.
- on Linux, set `PLAYWRIGHT_COVERAGE_BROWSER` before the Playwright harness commands so `playwright-core` knows which local Chromium-family browser to launch.
- the simulator smoke path now resolves Zepp simulator metadata from either `%APPDATA%/simulator`, `${XDG_CONFIG_HOME:-~/.config}/simulator`, or an explicit `ZEPP_SIMULATOR_ROOT`.

Playwright in this repo is intentionally split in two:
- simulator smoke only, through `npm run test:playwright`
- browser module-harness coverage, through `npm run test:playwright:coverage:harness`

The simulator-side Playwright commands now also verify that `last_app_info.json` points at this repo and that the deployed simulator app is not older than the latest app-facing source files. If the deployment is stale, rerun `zeus dev` before trusting the simulator test result.
Do not start the simulator smoke test in parallel with `zeus dev`. Wait for the deploy to finish first, otherwise the freshness gate may fail transiently while the simulator app folder is still being updated.
The repo no longer exposes simulator V8 coverage as a standard npm test because the current simulator DevTools endpoint may expose only the Electron shell page or framework/preload scripts such as `mobile-main-service.js` instead of reliable PourOverFlow app-code coverage.
The verification workflow is intentionally local-first and does not assume CI. If CI is added later, it should mirror the same commands as `Verify: all tests and coverage` instead of redefining the stack separately.

## What is still missing in the repo

- confirmation on real hardware that the latest haptics-only feedback tuning is comfortable and reliable over a full brew,
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
