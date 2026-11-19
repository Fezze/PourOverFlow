# PourOverFlow interface redesign

## Scope and visual system

The redesign preserves the six watch pages, six phone views, closed brewer catalog, existing CRUD, snapshot brewing, history, sync, resume, and English/Polish support. Runtime compatibility remains configVersion v3 / API level 3.6. No storage or message contract changes were made.

The watch uses an espresso background (#11100E), warm surfaces (#211E19), cream text (#F4EEE3), and a caramel primary action (#E6B877). Main actions use dark text for contrast. Phone Settings now shares the watch palette through the same source tokens. Its wider canvas keeps contextual headings, full-width brewer and record cards, readable form groups and larger controls.

The brewing screen shows the step timer, session time and water target above a wide instruction. Recipe notes and active-brew instructions scroll between a stationary instrument header and stationary actions. Recipe-list rows expand to fit longer names. Result summaries emphasize total duration while keeping status and timing delta. The Stop button opens a localized system confirmation before aborting the brew.

Brewers and Latest Result are two horizontal browsing tabs. Swipe left from Brewers to Latest Result; swipe right to return. Two position marks identify the active tab. Vertical gestures and the outer system-back gesture remain native. Existing navigation buttons remain available. The active brew does not register these tab gestures.

## Watch design decisions from the November review

| Review | Observation | Decision |
| --- | --- | --- |
| Initial space review, `6e4c6ec` | The instruction panel had too little room for a realistic recipe. Short examples hid wrapping defects. | Added long English and Polish recipes, measured paragraph height on the watch and exercised manual and timed steps. |
| Width review, `502b597` | Horizontal padding was the main constraint. The full page could scroll, and narrower test cases did not justify shrinking the font. | Increased the 416 px instruction width from 280 to 368 px and the square width from 310 to 358 px. Scrolling the whole page made all text reachable, but also moved Start, Stop and Next off screen. |
| Fixed controls, current design | The previous 416 px reading screenshot shows a fragment of the outgoing title at the circular top edge. Reaching an action after a long paragraph required another gesture. | Place the live measurement above the reader and keep actions at the bottom. Size the reader to a rectangle whose four corners clear the circular mask, including during scrolling. |

### Brewing instrument

The brewing header pairs the current step count with a large amber timer, water target and elapsed session time. A thin line shows progress through the recipe. The reading area opens on the full step title, followed by the instruction and recipe name. The detail screen uses the same layout with the coffee dose and water volume as its main measurement. It retains the full recipe name, grind, filter, time, steps and tasting notes.

Text is cream on espresso, with amber reserved for measurements, progress and the primary action. Removing the surrounding cards gives the text one continuous reading surface. The body stays at 20 px. Both screens use 24 px side margins on round displays and 16 px on the rectangular display.

Start, Stop and the current step action are available on entry, while reading and after the last paragraph. The reader scrolls vertically inside the stationary display. A timed step that requires confirmation changes Skip to Next in place. Pressing Next opens the new step at the top. On a round screen a line can pass through the straight edge of the scrolling viewport during a swipe. The physical rim clears both ends of every visible line.

The app uses the native [Zepp VIEW_CONTAINER](https://docs.zepp.com/docs/reference/device-app-api/newAPI/ui/widget/VIEW_CONTAINER/) with a separate root-level action row. The long Polish fixtures contain 1,011 characters of instruction and 735 characters of recipe notes. Browser snapshots cover all five target sizes in Polish and English. Native gesture captures and the comparison image for this review are stored in the workspace delivery folder `fixed-controls-review`.

On Balance 2 and Active 2 Square, the native test tapped Start directly on entry, scrolled the long instruction forward and back, then tapped Next from within the text. The action strip was pixel-identical before, during and after reading. The next step opened at its beginning. The consolidated run passed 289 tests, the 240-scenario preview, browser smoke and coverage, and production packaging. Physical watch testing remains open.

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

`npm run preview:phone` renders the real AppSettingsPage component tree at 360, 390 and 430 pixels. It checks text clipping, horizontal overflow, 44 px touch targets and the selected step instructions in English and Polish. Captures include empty states, long recipe names and instructions, and full-page views. Set `PHONE_PREVIEW_OUTPUT` or use `-- --output <path>`. Native input chrome is approximated by HTML; these are source-backed browser previews, not physical phone captures.

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


## Phone Settings alignment

The phone and watch share espresso, cream and caramel color tokens. On the phone, each brewer is one tap target with its familiar PNG icon and a separate count. Recipe cards show dose, water and duration below the name. History uses the watch's clock format, with elapsed time prominent in a brew result. Sync shows individually labeled data revisions.

The recipe editor puts the current recipe and its main figures at the top. The selected step, navigation and editable instructions share one section. Previous and Next move one step at a time. A native Select lists every numbered title for direct jumps and displays the current title. Descriptions, instructions and notes use the native multiline TextInput. Select captions include the current value for the simulator renderer, which initializes its unbound Select control with an empty display. Settings control chrome remains host-rendered and should be checked on a phone with both Zepp appearance modes.

[Zepp Settings View](https://docs.zepp.com/docs/reference/app-settings-api/ui/view/), [Text](https://docs.zepp.com/docs/reference/app-settings-api/ui/text/), [TextInput](https://docs.zepp.com/docs/reference/app-settings-api/ui/textinput/)
