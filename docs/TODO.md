# PourOverFlow v1 - current backlog

## Working rules

- Keep this file in English.
- Keep the repo-standard verify path green before every commit.
- Move stable architecture, tooling, or UX rules into the proper docs instead of leaving them here.
- Use this file for open work only; do not keep a long archive of completed milestones.

## Current priorities

### Real-device validation

- Validate the review fixes on hardware: replay a result after editing its phone note/rating, and edit a recipe immediately before a history result arrives; confirm feedback survives and the watch receives the recipe update.
- Confirm that the current haptics-only feedback tuning is comfortable during a full real brew, not just technically working.
- Use `npm run validation:logs` against the captured log file during hardware tests and write back concrete findings instead of leaving raw `[pof-validation]` lines in chat only.
- Re-run the real-device smoke path on `Amazfit Balance` after the runtime floor change to `3.6`, and confirm that bootstrap sync, resume, and `brew-active` still behave correctly on Balance 1 hardware.
- Re-run the watch smoke path in Polish on real hardware and confirm that localized copy still fits on `home`, chooser pages, `recipe-detail`, `brew-active`, and `result-summary`.
- Confirm target-matrix packaging on at least one `round-416`/Balance 1-class device or simulator profile and one `square-390x450` profile after the Parallax-style manifest split.

### Watch UI follow-up


- Confirm the compact brewing header, wide instructions, a circle-safe reader and pinned actions, long description scrolling and dynamic recipe-name rows on physical round and rectangular watches; retain the Brewers/Latest Result gesture checks.
- Confirm on real hardware that the latest round-screen spacing pass clears the mask comfortably on `home`, `recipe-detail`, `brew-active`, and `result-summary`.
- Re-check the new compact-round tuning on `Amazfit Balance` after the `API_LEVEL 3.6` floor change and confirm that the smaller round layout still preserves the intended spacing without over-tightening the 480 baseline.
- Confirm on real hardware that the simplified paired-pill `brew-active` dock feels balanced and that the primary-right / secondary-left emphasis reads clearly during a live brew.
- Confirm on real hardware that the new `Discard` label on the `home` resume gate reads clearly and does not feel too heavy compared with the primary `Resume` action.
- Confirm on real hardware that the larger `brew-active` instruction panel still reads comfortably when step metadata updates every second.
- If tighter visual matching is still desired later, store a concrete project Figma node or page link in the repo and map the watch screens to it explicitly.

### Seed-library follow-up

- Re-run watch browse and sync checks after the new 24-recipe uneven seed expansion to confirm larger per-brewer lists stay comfortable on-device.

### Tooling follow-up

- Resolve the simulator Side Service RPC timeout and complete real phone-to-watch catalog bootstrap validation. Native round/square interactive brewing, result saving, vertical scrolling and horizontal tabs were validated during the interface redesign using a separate fixture catalog; that run does not establish working simulator sync.

- Re-run a clean Ubuntu 26 checkout with `npm ci`, `npm run doctor:ubuntu`, and `npm run verify` to confirm the new local-Zeus path is enough without any global Zeus install.
- Keep the Parallax-style screenshot matrix current: every new watch screen or page must add at least one deterministic `verify:visual` scenario.
- Revisit the simulator-side `@zos/ble` send behavior and replace the current simulator heuristic with a more authoritative transport check if possible.
- Keep browser-safe module coverage separate from the existing watch preview with `@zos/*` stubs; use the mocked runtime suite and hardware checks for transport and lifecycle behavior.
- Confirm that the new `zepp-app/` subtree plus root-level `coverage/` split stays comfortable on both Windows and Linux after a few normal `zeus dev` cycles.
- Only keep pushing toward literal `100%` local coverage if it still matters; the main remaining hotspots are defensive branches in `sync-bridge`, storage helpers, validators, router edge paths, display-guard behavior, and the browser-harness copies of `session-reducer`, `recipe-engine`, and `phone-sync-plan`.

### Phone UX follow-up

- Verify the shared espresso theme in the physical Zepp app in light and dark appearance modes. Check native Select and multiline TextInput contrast, brewer icons and full-row tap behavior, and Polish wrapping across the library, recipe editor, history and sync.

### Localization follow-up

- Decide whether starter recipe localization should remain sticky per phone install through `seedLocale` or whether a later product decision should support explicit reseeding after the user changes language.
- If more locales are added later, keep them as separate `shared/i18n/locales/<locale>.js` and `shared/domain/seed-library/<locale>.js` modules instead of folding everything back into one file.

## Verify checklist

- `npm test`
- `npm run test:coverage`
- `npm run verify:visual`
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
