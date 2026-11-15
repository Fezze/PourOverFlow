# PourOverFlow interface redesign

## Scope and visual system

The redesign preserves the six watch pages, six phone views, closed brewer catalog, existing CRUD, snapshot brewing, history, sync, resume, and English/Polish support. Runtime compatibility remains configVersion v3 / API level 3.6. No storage or message contract changes were made.

The watch uses an espresso background (#11100E), warm surfaces (#211E19), cream text (#F4EEE3), and a caramel primary action (#E6B877). Main actions use dark text for contrast. Phone Settings uses warm paper with matching espresso and caramel accents.

The brewing screen prioritizes the large step countdown; the elapsed session time and water target remain visible. Manual steps show elapsed time. Long instructions and recipe details use native vertical lists. Active brew measures wrapped instructions at the actual text width, including the narrower width inside a scroll row, so the last lines remain reachable. Recipe list names have room for two lines; long detail titles retain native marquee behavior. Result summaries emphasize total duration while keeping status and timing delta. The Stop button opens a localized system confirmation before aborting the brew.

Brewers and Latest Result are two horizontal browsing tabs. Swipe left from Brewers to Latest Result; swipe right to return. Two position marks identify the active tab. Vertical gestures and the outer system-back gesture remain native. Existing navigation buttons remain available. The active brew does not register these tab gestures.

## Editable screen files

- `zepp-app/page/*/index.js`: page widgets and their existing actions.
- `zepp-app/page/*/index.r.layout.js`: circular layout variants.
- `zepp-app/page/*/index.s.layout.js`: rectangular layout variants.
- `zepp-app/shared/watch/layouts.js`: shared palette and button styles.
- `zepp-app/shared/watch/browse-tabs.js`: native tab gestures and position marks.
- `zepp-app/setting/app-settings.jsx`: all six phone Settings views.

## Reproducible visual previews

`npm run preview:watch` imports the real page and target layout files with mocked Zepp services, then renders their widget geometry in Chromium. It exports 200 states across five target sizes and two languages. Set `WATCH_PREVIEW_OUTPUT` to choose a separate output directory; `-- --framed` also exports framed images. Screen-only PNG dimensions match each target.

The old preview duplicated layouts and approximated list rows with CSS. The updated exporter reads real layouts, and the renderer honors every list text/image subview and row type. Browser assertions compare row geometry with serialized widget properties.

`npm run preview:phone` renders the real AppSettingsPage component tree at 390 and 430 pixels, plus selected 360-pixel views. It includes populated/empty views and a later editor step, plus full-page images. Set `PHONE_PREVIEW_OUTPUT` or use `-- --output <path>`. Native input chrome is approximated by HTML; these are source-backed browser previews, not physical phone captures.

## Evidence and limitations

Before-redesign source snapshots and native simulator screenshots were captured before UI changes. Native round and square startup, brewer lists and empty recipe states were captured. The existing simulator Side Service RPC timeout prevented real phone-to-watch catalog bootstrap in that baseline; this is separate from deterministic fixture rendering.

After the redesign, native Balance 2 and Active 2 Square runs covered recipe selection, detail, manual and timed brew steps, completion, result display, vertical brewer scrolling and horizontal tab navigation. A separate simulator-only copy supplied a deterministic catalog; that fixture startup code is excluded from the delivered source and production build. These captures validate the native widgets and interactions, not successful phone-to-watch bootstrap.

The initial redesign verification and focused repairs passed: 234 tests in 25 files, Vitest coverage, browser module smoke and coverage, 200 watch preview states, 42 phone preview states and the five-target Zeus build. Additional scrolled captures bring the watch collection to 254 PNGs. A watch regression run passed 45 tests after the initial visual adjustment. The follow-up passed 236 tests and repeated the full brewing, tab, and Stop flow on both simulator profiles. Real-device haptics, screen sleep, native phone field appearance and sync remain hardware checks.

Artifacts for this task are stored in `/home/krzysztof/Documents/ChatGPT/PourOverFlow/redesign-2026-11-14/`. Final verification results and image provenance are recorded with the delivery.
