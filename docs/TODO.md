# PourOverFlow v1 - current backlog

## Working rules

- Keep this file in English.
- Keep the repo-standard verify path green before every commit.
- Move stable architecture, tooling, or UX rules into the proper docs instead of leaving them here.
- Use this file for open work only; do not keep a long archive of completed milestones.

## Current priorities

### Real-device validation

- Confirm that the current haptics-only feedback tuning is comfortable during a full real brew, not just technically working.
- Use `npm run validation:logs` against the captured log file during hardware tests and write back concrete findings instead of leaving raw `[pof-validation]` lines in chat only.
- Re-run the real-device smoke path on `Amazfit Balance` after the runtime floor change to `3.6`, and confirm that bootstrap sync, resume, and `brew-active` still behave correctly on Balance 1 hardware.
- Re-run the watch smoke path in Polish on real hardware and confirm that localized copy still fits on `home`, chooser pages, `recipe-detail`, `brew-active`, and `result-summary`.

### Watch UI follow-up

- Confirm on real hardware that the latest round-screen spacing pass clears the mask comfortably on `home`, `recipe-detail`, `brew-active`, and `result-summary`.
- Re-check the new compact-round tuning on `Amazfit Balance` after the `API_LEVEL 3.6` floor change and confirm that the smaller round layout still preserves the intended spacing without over-tightening the 480 baseline.
- Confirm on real hardware that the simplified paired-pill `brew-active` dock feels balanced and that the primary-right / secondary-left emphasis reads clearly during a live brew.
- Confirm on real hardware that the new `Discard` label on the `home` resume gate reads clearly and does not feel too heavy compared with the primary `Resume` action.
- Confirm on real hardware that the larger `brew-active` instruction panel still reads comfortably when step metadata updates every second.
- If tighter visual matching is still desired later, store a concrete project Figma node or page link in the repo and map the watch screens to it explicitly.

### Seed-library follow-up

- Re-run watch browse and sync checks after the new 24-recipe uneven seed expansion to confirm larger per-brewer lists stay comfortable on-device.

### Tooling follow-up

- Revisit the simulator-side `@zos/ble` send behavior and replace the current simulator heuristic with a more authoritative transport check if possible.
- Decide whether the Playwright module harness should stay focused on browser-safe shared modules or grow browser stubs for selected `@zos/*` modules.
- Confirm that the new `zepp-app/` subtree plus root-level `coverage/` split stays comfortable on both Windows and Linux after a few normal `zeus dev` cycles.
- Only keep pushing toward literal `100%` local coverage if it still matters; the main remaining hotspots are defensive branches in `sync-bridge`, storage helpers, validators, router edge paths, display-guard behavior, and the browser-harness copies of `session-reducer`, `recipe-engine`, and `phone-sync-plan`.

### Phone UX follow-up

- Confirm on a real phone that the simplified `Library` screen reads clearly with only brewer and recipe counts in the shell header, compact left badges, and no secondary dashboard panel.
- Confirm on a real phone that the shared brewer PNG icons render correctly in `setting/` and that the separate right-side count badges stay aligned across short and long brewer names.
- Confirm on a real phone that the new Polish Settings copy still fits cleanly across `Library`, `History`, `Sync`, and the paginated recipe editor.

### Localization follow-up

- Decide whether starter recipe localization should remain sticky per phone install through `seedLocale` or whether a later product decision should support explicit reseeding after the user changes language.
- If more locales are added later, keep them as separate `shared/i18n/locales/<locale>.js` and `shared/domain/seed-library/<locale>.js` modules instead of folding everything back into one file.

## Verify checklist

- `npm test`
- `npm run test:coverage`
- `npm run test:playwright:harness`
- `npm run test:playwright:coverage:harness`
- `npm run build`

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
