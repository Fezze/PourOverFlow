# PourOverFlow v1 - current backlog

## Working rules

- Keep this file in English.
- Keep the repo-standard verify path green before every commit.
- Move stable architecture, tooling, or UX rules into the proper docs instead of leaving them here.
- Use this file for open work only; do not keep a long archive of completed milestones.

## Current priorities

### Real-device validation

- Confirm that the current haptics-only feedback tuning is comfortable during a full real brew, not just technically working.
- Use the new `[pof-validation]` log prefix during hardware tests and write back concrete findings instead of leaving them in chat only.

### Watch UI follow-up

- Confirm on real hardware that the latest round-screen spacing pass clears the mask comfortably on `home`, `recipe-detail`, `brew-active`, and `result-summary`.
- Refine the custom side-by-side action dock on `brew-active` until it matches the intended Zepp-style shape more closely.
- Replace the mojibake separator and action-label glyphs on `brew-active` with deliberate Zepp-safe text or icon assets, then add a regression check so the active-brew dock cannot silently render garbled characters again.
- Add page-level scrolling or another safe overflow strategy on static watch pages that can exceed the comfortable round-screen safe area.
- Align the empty `recipe-list` state with the documented watch flow: if the user really needs to create recipes on the phone first, say that directly instead of only offering `Refresh library`, or update the flow docs if refresh-only is the intended behavior.
- If tighter visual matching is still desired later, store a concrete project Figma node or page link in the repo and map the watch screens to it explicitly.

### Tooling follow-up

- Revisit the simulator-side `@zos/ble` send behavior and replace the current simulator heuristic with a more authoritative transport check if possible.
- Decide whether the Playwright module harness should stay focused on browser-safe shared modules or grow browser stubs for selected `@zos/*` modules.
- Replace environment-specific `/home/deck/...` links in `README.md` and `docs/START-HERE.md` with repo-relative wording or platform-neutral guidance so onboarding docs stay usable from both Windows and Linux.
- Only keep pushing toward literal `100%` local coverage if it still matters; the main remaining hotspots are defensive branches in `sync-bridge`, storage helpers, validators, router edge paths, display-guard behavior, and the browser-harness copies of `session-reducer`, `recipe-engine`, and `phone-sync-plan`.
- Remove or justify the leftover watch-side `validationNote` runtime state now that the dedicated validation page is gone, so runtime events and storage helpers do not keep carrying dead debug-era branches.

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
- screen sleep
- wake-up relaunch
- resume comfort during a real brew
- offline completion queued locally, then replayed after reconnect

## Out of scope

- backend
- cloud sync
- external recipe import
- widgets or cards beyond the current app scope
- BLE product features
- band layout
- full history browsing on the watch
