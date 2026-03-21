# PourOverFlow

PourOverFlow is a planned Zepp OS app for guiding manual coffee brewing from a watch. V1 combines a simple watch-first execution flow with a phone-side recipe and history manager.

## Current status

The repo already has Stages 3, 4, and 5 completed. It includes a Zepp app scaffold with a passing `zeus build`, a seed library, canonical phone storage using `index + records`, real recipe CRUD in `setting/`, runtime sync `setting/ -> app-side/ -> watch`, watch cache in `LocalStorage`, storage-backed `active_session_v1`, a more production-shaped session reducer, timed step UI, and baseline logic tests.

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

The next practical stage is Stage 6 from [TODO](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md): resume hardening, `setWakeUpRelaunch(true)`, `setPageBrightTime(...)`, offline queue replay, and hard validation on a real device.

## What is still missing in the repo

- resume hardening after leaving and returning to the app,
- `setWakeUpRelaunch(true)` and `setPageBrightTime(...)` during an active session,
- hard validation of haptic and audio feedback on a real device,
- mocked Zepp runtime coverage for lifecycle and queue replay.

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
