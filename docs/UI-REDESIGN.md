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

`npm run preview:watch` imports the real page and target layout files with mocked Zepp services, then renders their widget geometry in Chromium. It exports 240 states across five target sizes and two languages. Set `WATCH_PREVIEW_OUTPUT` to choose a separate output directory; `-- --framed` also exports framed images. Screen-only PNG dimensions match each target.

The old preview duplicated layouts and approximated list rows with CSS. The updated exporter reads real layouts, and the renderer honors every list text/image subview and row type. Browser assertions compare row geometry with serialized widget properties.

`npm run preview:phone` renders the real AppSettingsPage component tree at 390 and 430 pixels, plus selected 360-pixel views. It includes populated/empty views and a later editor step, plus full-page images. Set `PHONE_PREVIEW_OUTPUT` or use `-- --output <path>`. Native input chrome is approximated by HTML; these are source-backed browser previews, not physical phone captures.

## Evidence and limitations

Before-redesign source snapshots and native simulator screenshots were captured before UI changes. Native round and square startup, brewer lists and empty recipe states were captured. The existing simulator Side Service RPC timeout prevented real phone-to-watch catalog bootstrap in that baseline; this is separate from deterministic fixture rendering.

After the redesign, native Balance 2 and Active 2 Square runs covered recipe selection, detail, manual and timed brew steps, completion, result display, vertical brewer scrolling and horizontal tab navigation. A separate simulator-only copy supplied a deterministic catalog; that fixture startup code is excluded from the delivered source and production build. These captures validate the native widgets and interactions, not successful phone-to-watch bootstrap.

The initial redesign verification and focused repairs passed: 234 tests in 25 files, Vitest coverage, browser module smoke and coverage, 200 watch preview states, 42 phone preview states and the five-target Zeus build. Additional scrolled captures bring the watch collection to 254 PNGs. A watch regression run passed 45 tests after the initial visual adjustment. The follow-up passed 236 tests and repeated the full brewing, tab, and Stop flow on both simulator profiles. Real-device haptics, screen sleep, native phone field appearance and sync remain hardware checks.

Artifacts for this task are stored in `/home/krzysztof/Documents/ChatGPT/PourOverFlow/redesign-2026-11-14/`. Final verification results and image provenance are recorded with the delivery.


## Small-screen space review (2026-11-15; validated 2026-11-18)

The active-brew header uses tighter vertical spacing and the instruction panel has one inset instead of nested padding. The 20 px instruction font, 54–60 px timer and existing action sizes remain intact. Every target reserves at least 100 px of instruction height (four lines in the browser metric model) while keeping the timer, elapsed time, water target and actions visible. Actual line count depends on the firmware font.

Recipe details use native `getTextLayout` measurements for paragraph-aware row heights, shared by static and scrollable rendering. Square details start higher and use the gap above the Start action. Recipe-list rows grow only when a name needs more than their usual two lines. The phone's recipe description is now included in new snapshots; legacy snapshots keep their existing fallback.

The preview matrix includes realistic long English/Polish instructions, manual and timed steps, medium instructions, long recipe names and multi-paragraph recipe descriptions with long grind/filter labels. The browser gate checks wrapped-text bounds and the last line of both description and instruction lists. Firmware font metrics and physical comfort still require native/real-watch checks. API profile remains `configVersion: v3`, target `3.6` (legacy 3.x); no newer API is introduced. Text measurement is available from [API level 2.0](https://docs.zepp.com/docs/reference/device-app-api/newAPI/ui/getTextLayout/).

Long recipe headers in details, active brewing and saved results are fitted to the circular mask, retaining native marquee. The empty brewing-state title grows for Polish wrapping. Native round lists can scroll beyond a very long single item; the final instruction remains reachable by scrolling back, as in the preceding firmware baseline.

The final space-review batch passed 289 tests in 26 files (86.56% statement / 76.99% branch / 79.21% function / 86.51% line coverage), browser module smoke/coverage, the 240-state preview matrix and production packaging for all five targets. The review and native evidence live under `/home/krzysztof/Documents/ChatGPT/PourOverFlow/space-review-2026-11-15/`.
