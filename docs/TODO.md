# PourOverFlow v1 - current backlog

## Working rules

- Keep this file in English.
- Keep the repo-standard verify path green before every commit.
- Move stable architecture, tooling, or UX rules into the proper docs instead of leaving them here.
- Use this file for open work only; do not keep a long archive of completed milestones.

## Current priorities

### Real-device validation

- Validate wake-up relaunch and anti-sleep behavior on real hardware during an active brew.
- Validate haptic and sound cues on real hardware, including silent-mode behavior and fallback paths.
- Validate that offline completion still queues history safely and replays to the phone when connectivity returns.
- Validate that partial slice pushes keep recipe edits responsive and that watch startup still feels fast when the phone is unavailable.

### Watch UI follow-up

- Confirm on real hardware that the latest round-screen spacing pass clears the mask comfortably on `home`, `recipe-detail`, `brew-active`, `result-summary`, and `validation`.
- Refine the custom side-by-side action dock on `brew-active` until it matches the intended Zepp-style shape more closely.
- Add page-level scrolling or another safe overflow strategy on static watch pages that can exceed the comfortable round-screen safe area.
- If tighter visual matching is still desired later, store a concrete project Figma node or page link in the repo and map the watch screens to it explicitly.

### Tooling follow-up

- Generalize the simulator smoke script so it does not depend on Windows-only `APPDATA` paths before treating Linux simulator smoke as a supported baseline.
- Revisit the simulator-side `@zos/ble` send behavior and replace the current simulator heuristic with a more authoritative transport check if possible.
- Decide whether the Playwright module harness should stay focused on browser-safe shared modules or grow browser stubs for selected `@zos/*` modules.
- Only keep pushing toward literal `100%` local coverage if it still matters; the main remaining hotspots are defensive branches in `sync-bridge`, storage helpers, validators, router edge paths, display-guard behavior, and the browser-harness copies of `session-reducer`, `recipe-engine`, and `phone-sync-plan`.

## Verify checklist

- `npm test`
- `npm run test:coverage`
- `npm run test:playwright:harness`
- `npm run test:playwright:coverage:harness`
- `zeus build`

## Simulator checks

- `round`
- `square`
- `tool -> recipe -> recipe detail -> brew`
- `confirm`, `timed`, and `finish` states
- resume after app restart

## Real-watch checks

- vibration
- sound and fallback behavior
- screen sleep
- wake-up relaunch
- resume comfort during a real brew

## Out of scope

- backend
- cloud sync
- external recipe import
- widgets or cards beyond the current app scope
- BLE product features
- band layout
- full history browsing on the watch
