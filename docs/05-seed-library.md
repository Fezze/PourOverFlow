# PourOverFlow v1 - seed library

## Purpose of this document

This document freezes the starter recipe library for v1. This is not an import from an external service or a community recipe aggregation. It is a curated product seed set that should:

- cover all supported `toolId` values,
- give the user a sensible start instead of an empty library,
- stay within the `RecipeRecord` and `RecipeStep` model,
- remain fully editable and clonable after seeding.

## Seed library rules

- All seed recipes use `source: "seed"`.
- Every seed recipe is a normal `RecipeRecord`, not a special entity.
- The user may edit, duplicate, or delete seed recipes.
- Seed recipes are not overwritten on later app launches.
- Seed recipes are not imported from the internet.

## Implementation priority

### V1 release target

The full product target is 12 recipes, 2 per supported tool.

### Minimum target for the first runnable runtime version

If the work order needs staging, implementation may first ship 1 recipe per `toolId`, but the final v1 backlog should still bring the seed library to the full set of 12 recipes from this document.

## Seed ID format

Seed recipe ids are stable and should not be generated randomly:

- `seed_ap_daily_clean`
- `seed_ap_inverted_sweet`
- `seed_v60_bloom_classic`
- `seed_v60_fast_morning`
- `seed_kalita_balanced`
- `seed_kalita_sweet_small`
- `seed_chemex_classic_500`
- `seed_chemex_light_400`
- `seed_clever_full_immersion`
- `seed_clever_short_steep`
- `seed_fp_clean_classic`
- `seed_fp_quick_350`

## Seed matrix

| recipeId | toolId | name | colorToken | doseG | waterMl | tempC | estMs |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| `seed_ap_daily_clean` | `tool_aeropress` | AeroPress Daily Clean Cup | `amber` | 15 | 240 | 93 | 120000 |
| `seed_ap_inverted_sweet` | `tool_aeropress` | AeroPress Inverted Sweet | `coral` | 17 | 250 | 92 | 140000 |
| `seed_v60_bloom_classic` | `tool_v60` | V60 Bloom Classic | `teal` | 18 | 300 | 94 | 180000 |
| `seed_v60_fast_morning` | `tool_v60` | V60 Fast Morning | `slate` | 15 | 250 | 93 | 150000 |
| `seed_kalita_balanced` | `tool_kalita_wave` | Kalita Balanced | `forest` | 18 | 300 | 93 | 210000 |
| `seed_kalita_sweet_small` | `tool_kalita_wave` | Kalita Sweet Small | `amber` | 16 | 260 | 92 | 190000 |
| `seed_chemex_classic_500` | `tool_chemex` | Chemex Classic 500 | `indigo` | 30 | 500 | 94 | 270000 |
| `seed_chemex_light_400` | `tool_chemex` | Chemex Light 400 | `teal` | 24 | 400 | 93 | 240000 |
| `seed_clever_full_immersion` | `tool_clever_dripper` | Clever Full Immersion | `forest` | 18 | 280 | 94 | 195000 |
| `seed_clever_short_steep` | `tool_clever_dripper` | Clever Short Steep | `coral` | 16 | 250 | 93 | 165000 |
| `seed_fp_clean_classic` | `tool_french_press` | French Press Clean Classic | `slate` | 30 | 500 | 94 | 300000 |
| `seed_fp_quick_350` | `tool_french_press` | French Press Quick 350 | `indigo` | 22 | 350 | 93 | 240000 |

## Seed recipes

Each recipe below should be implemented exactly with the listed set of steps.

### `seed_ap_daily_clean`

- `toolId`: `tool_aeropress`
- `filterLabel`: `Paper`
- `grindLabel`: `Medium-fine`
- `description`: Clean, balanced everyday AeroPress cup.
- `notes`: Stir gently and press slowly.

1. `instruction` - `Prep`
   `body`: `Rinse filter, insert paper, add coffee.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
2. `timed_action` - `Bloom pour`
   `body`: `Pour 50 ml water.`
   `durationMs`: `15000`
   `waterMl`: `50`
   `targetTotalWaterMl`: `50`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
3. `timed_wait` - `Bloom wait`
   `body`: `Let coffee bloom.`
   `durationMs`: `30000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
4. `timed_action` - `Main pour`
   `body`: `Pour remaining water to 240 ml.`
   `durationMs`: `20000`
   `waterMl`: `190`
   `targetTotalWaterMl`: `240`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
5. `confirm` - `Stir and cap`
   `body`: `Stir gently and attach cap.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
6. `timed_action` - `Press`
   `body`: `Press slowly until hiss.`
   `durationMs`: `35000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_long`
7. `finish` - `Done`
   `body`: `Enjoy your brew.`
   `requiresConfirm`: `false`
   `feedbackCue`: `combo_short`

### `seed_ap_inverted_sweet`

- `toolId`: `tool_aeropress`
- `filterLabel`: `Paper`
- `grindLabel`: `Fine-medium`
- `description`: Slightly sweeter inverted AeroPress profile.
- `notes`: Keep inversion stable and press with control.

1. `instruction` - `Prep inverted`
   `body`: `Assemble inverted AeroPress and add coffee.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
2. `timed_action` - `Initial pour`
   `body`: `Pour 100 ml water.`
   `durationMs`: `20000`
   `waterMl`: `100`
   `targetTotalWaterMl`: `100`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
3. `confirm` - `Stir`
   `body`: `Stir thoroughly.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
4. `timed_wait` - `Steep`
   `body`: `Steep the brew.`
   `durationMs`: `45000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
5. `timed_action` - `Top up`
   `body`: `Pour remaining water to 250 ml.`
   `durationMs`: `15000`
   `waterMl`: `150`
   `targetTotalWaterMl`: `250`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
6. `confirm` - `Flip`
   `body`: `Place cup, flip brewer carefully and get ready to press.`
   `requiresConfirm`: `true`
   `feedbackCue`: `vibrate_long`
7. `timed_action` - `Press`
   `body`: `Press slowly until finished.`
   `durationMs`: `30000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_long`
8. `finish` - `Done`
   `body`: `Brew complete.`
   `requiresConfirm`: `false`
   `feedbackCue`: `combo_short`

### `seed_v60_bloom_classic`

- `toolId`: `tool_v60`
- `filterLabel`: `Paper`
- `grindLabel`: `Medium`
- `description`: Balanced classic V60 with clear bloom structure.
- `notes`: Keep the pour centered and controlled.

1. `instruction` - `Prep`
   `body`: `Rinse filter, warm brewer and add coffee bed.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
2. `timed_action` - `Bloom pour`
   `body`: `Pour to 50 ml.`
   `durationMs`: `15000`
   `waterMl`: `50`
   `targetTotalWaterMl`: `50`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
3. `timed_wait` - `Bloom wait`
   `body`: `Wait for bloom.`
   `durationMs`: `30000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
4. `timed_action` - `Main pour 1`
   `body`: `Pour to 180 ml.`
   `durationMs`: `35000`
   `waterMl`: `130`
   `targetTotalWaterMl`: `180`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
5. `timed_action` - `Main pour 2`
   `body`: `Pour to 300 ml.`
   `durationMs`: `35000`
   `waterMl`: `120`
   `targetTotalWaterMl`: `300`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
6. `timed_wait` - `Drawdown`
   `body`: `Let the bed draw down fully.`
   `durationMs`: `60000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_long`
7. `finish` - `Done`
   `body`: `Remove dripper and serve.`
   `requiresConfirm`: `false`
   `feedbackCue`: `combo_short`

### `seed_v60_fast_morning`

- `toolId`: `tool_v60`
- `filterLabel`: `Paper`
- `grindLabel`: `Medium`
- `description`: Faster V60 profile for a lighter morning cup.
- `notes`: Shorter pours, lighter body.

1. `instruction` - `Prep`
   `body`: `Rinse filter and add coffee bed.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
2. `timed_action` - `Bloom`
   `body`: `Pour to 45 ml.`
   `durationMs`: `15000`
   `waterMl`: `45`
   `targetTotalWaterMl`: `45`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
3. `timed_wait` - `Bloom wait`
   `body`: `Wait for bloom.`
   `durationMs`: `25000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
4. `timed_action` - `Main pour 1`
   `body`: `Pour to 160 ml.`
   `durationMs`: `30000`
   `waterMl`: `115`
   `targetTotalWaterMl`: `160`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
5. `timed_action` - `Main pour 2`
   `body`: `Pour to 250 ml.`
   `durationMs`: `25000`
   `waterMl`: `90`
   `targetTotalWaterMl`: `250`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
6. `timed_wait` - `Drawdown`
   `body`: `Wait until drawdown finishes.`
   `durationMs`: `55000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_long`
7. `finish` - `Done`
   `body`: `Brew complete.`
   `requiresConfirm`: `false`
   `feedbackCue`: `combo_short`

### `seed_kalita_balanced`

- `toolId`: `tool_kalita_wave`
- `filterLabel`: `Wave`
- `grindLabel`: `Medium`
- `description`: Balanced pulse-pour Kalita profile.
- `notes`: Keep pulses even and calm.

1. `instruction` - `Prep`
   `body`: `Rinse filter and add coffee.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
2. `timed_action` - `Bloom`
   `body`: `Pour to 50 ml.`
   `durationMs`: `20000`
   `waterMl`: `50`
   `targetTotalWaterMl`: `50`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
3. `timed_wait` - `Bloom wait`
   `body`: `Wait for bloom.`
   `durationMs`: `30000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
4. `timed_action` - `Pulse 1`
   `body`: `Pour to 150 ml.`
   `durationMs`: `25000`
   `waterMl`: `100`
   `targetTotalWaterMl`: `150`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
5. `timed_action` - `Pulse 2`
   `body`: `Pour to 225 ml.`
   `durationMs`: `25000`
   `waterMl`: `75`
   `targetTotalWaterMl`: `225`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
6. `timed_action` - `Pulse 3`
   `body`: `Pour to 300 ml.`
   `durationMs`: `25000`
   `waterMl`: `75`
   `targetTotalWaterMl`: `300`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
7. `timed_wait` - `Drawdown`
   `body`: `Let the brew finish drawing down.`
   `durationMs`: `70000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_long`
8. `finish` - `Done`
   `body`: `Serve your coffee.`
   `requiresConfirm`: `false`
   `feedbackCue`: `combo_short`

### `seed_kalita_sweet_small`

- `toolId`: `tool_kalita_wave`
- `filterLabel`: `Wave`
- `grindLabel`: `Medium-fine`
- `description`: Smaller Kalita brew with a sweeter profile.
- `notes`: Slightly finer grind, shorter total brew.

1. `instruction` - `Prep`
   `body`: `Rinse filter and level coffee bed.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
2. `timed_action` - `Bloom`
   `body`: `Pour to 45 ml.`
   `durationMs`: `20000`
   `waterMl`: `45`
   `targetTotalWaterMl`: `45`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
3. `timed_wait` - `Bloom wait`
   `body`: `Wait for bloom.`
   `durationMs`: `30000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
4. `timed_action` - `Pulse 1`
   `body`: `Pour to 130 ml.`
   `durationMs`: `22000`
   `waterMl`: `85`
   `targetTotalWaterMl`: `130`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
5. `timed_action` - `Pulse 2`
   `body`: `Pour to 200 ml.`
   `durationMs`: `22000`
   `waterMl`: `70`
   `targetTotalWaterMl`: `200`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
6. `timed_action` - `Pulse 3`
   `body`: `Pour to 260 ml.`
   `durationMs`: `22000`
   `waterMl`: `60`
   `targetTotalWaterMl`: `260`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
7. `timed_wait` - `Drawdown`
   `body`: `Wait for final drawdown.`
   `durationMs`: `52000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_long`
8. `finish` - `Done`
   `body`: `Brew complete.`
   `requiresConfirm`: `false`
   `feedbackCue`: `combo_short`

### `seed_chemex_classic_500`

- `toolId`: `tool_chemex`
- `filterLabel`: `Chemex paper`
- `grindLabel`: `Medium-coarse`
- `description`: Larger Chemex batch with classic pulse structure.
- `notes`: Warm vessel well and keep pours steady.

1. `instruction` - `Prep`
   `body`: `Rinse filter thoroughly and add coffee.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
2. `timed_action` - `Bloom`
   `body`: `Pour to 70 ml.`
   `durationMs`: `20000`
   `waterMl`: `70`
   `targetTotalWaterMl`: `70`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
3. `timed_wait` - `Bloom wait`
   `body`: `Wait for bloom.`
   `durationMs`: `40000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
4. `timed_action` - `Main pour 1`
   `body`: `Pour to 250 ml.`
   `durationMs`: `45000`
   `waterMl`: `180`
   `targetTotalWaterMl`: `250`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
5. `timed_action` - `Main pour 2`
   `body`: `Pour to 400 ml.`
   `durationMs`: `40000`
   `waterMl`: `150`
   `targetTotalWaterMl`: `400`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
6. `timed_action` - `Final pour`
   `body`: `Pour to 500 ml.`
   `durationMs`: `30000`
   `waterMl`: `100`
   `targetTotalWaterMl`: `500`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
7. `timed_wait` - `Drawdown`
   `body`: `Wait until drawdown is complete.`
   `durationMs`: `90000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_long`
8. `finish` - `Done`
   `body`: `Remove filter and serve.`
   `requiresConfirm`: `false`
   `feedbackCue`: `combo_short`

### `seed_chemex_light_400`

- `toolId`: `tool_chemex`
- `filterLabel`: `Chemex paper`
- `grindLabel`: `Medium`
- `description`: Smaller Chemex profile with lighter body.
- `notes`: Maintain gentle circular pours.

1. `instruction` - `Prep`
   `body`: `Rinse filter and add coffee bed.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
2. `timed_action` - `Bloom`
   `body`: `Pour to 60 ml.`
   `durationMs`: `18000`
   `waterMl`: `60`
   `targetTotalWaterMl`: `60`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
3. `timed_wait` - `Bloom wait`
   `body`: `Wait for bloom.`
   `durationMs`: `35000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
4. `timed_action` - `Main pour 1`
   `body`: `Pour to 220 ml.`
   `durationMs`: `40000`
   `waterMl`: `160`
   `targetTotalWaterMl`: `220`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
5. `timed_action` - `Main pour 2`
   `body`: `Pour to 320 ml.`
   `durationMs`: `35000`
   `waterMl`: `100`
   `targetTotalWaterMl`: `320`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
6. `timed_action` - `Final pour`
   `body`: `Pour to 400 ml.`
   `durationMs`: `25000`
   `waterMl`: `80`
   `targetTotalWaterMl`: `400`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
7. `timed_wait` - `Drawdown`
   `body`: `Wait for complete drawdown.`
   `durationMs`: `87000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_long`
8. `finish` - `Done`
   `body`: `Serve and enjoy.`
   `requiresConfirm`: `false`
   `feedbackCue`: `combo_short`

### `seed_clever_full_immersion`

- `toolId`: `tool_clever_dripper`
- `filterLabel`: `Paper`
- `grindLabel`: `Medium`
- `description`: Full immersion Clever recipe with long steep.
- `notes`: Brewer stays off the cup until drawdown.

1. `instruction` - `Prep`
   `body`: `Insert filter, rinse, close valve and add coffee.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
2. `timed_action` - `Full pour`
   `body`: `Pour all water to 280 ml.`
   `durationMs`: `30000`
   `waterMl`: `280`
   `targetTotalWaterMl`: `280`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
3. `confirm` - `Stir`
   `body`: `Stir gently and place lid.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
4. `timed_wait` - `Steep`
   `body`: `Let the brew steep fully.`
   `durationMs`: `120000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_long`
5. `confirm` - `Place on cup`
   `body`: `Set brewer on cup to start drawdown.`
   `requiresConfirm`: `true`
   `feedbackCue`: `vibrate_short`
6. `timed_wait` - `Drawdown`
   `body`: `Wait for drawdown.`
   `durationMs`: `30000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_long`
7. `finish` - `Done`
   `body`: `Brew complete.`
   `requiresConfirm`: `false`
   `feedbackCue`: `combo_short`

### `seed_clever_short_steep`

- `toolId`: `tool_clever_dripper`
- `filterLabel`: `Paper`
- `grindLabel`: `Medium-fine`
- `description`: Shorter Clever recipe for a quicker cup.
- `notes`: Slightly quicker drawdown and shorter steep.

1. `instruction` - `Prep`
   `body`: `Rinse filter, close valve and add coffee.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
2. `timed_action` - `Full pour`
   `body`: `Pour all water to 250 ml.`
   `durationMs`: `25000`
   `waterMl`: `250`
   `targetTotalWaterMl`: `250`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
3. `confirm` - `Stir`
   `body`: `Give the brew a gentle stir.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
4. `timed_wait` - `Steep`
   `body`: `Steep the brew.`
   `durationMs`: `90000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_long`
5. `confirm` - `Place on cup`
   `body`: `Place brewer on cup to release.`
   `requiresConfirm`: `true`
   `feedbackCue`: `vibrate_short`
6. `timed_wait` - `Drawdown`
   `body`: `Wait for drawdown.`
   `durationMs`: `25000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_long`
7. `finish` - `Done`
   `body`: `Coffee is ready.`
   `requiresConfirm`: `false`
   `feedbackCue`: `combo_short`

### `seed_fp_clean_classic`

- `toolId`: `tool_french_press`
- `filterLabel`: `Metal mesh`
- `grindLabel`: `Coarse`
- `description`: Classic French press with longer steep.
- `notes`: Break crust gently before plunge.

1. `instruction` - `Prep`
   `body`: `Add coarse coffee to warm press.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
2. `timed_action` - `Full pour`
   `body`: `Pour all water to 500 ml.`
   `durationMs`: `35000`
   `waterMl`: `500`
   `targetTotalWaterMl`: `500`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
3. `confirm` - `Stir and cap`
   `body`: `Stir once and place lid on top.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
4. `timed_wait` - `Steep`
   `body`: `Let coffee steep.`
   `durationMs`: `240000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_long`
5. `confirm` - `Break crust`
   `body`: `Break crust and skim foam if desired.`
   `requiresConfirm`: `true`
   `feedbackCue`: `vibrate_short`
6. `timed_action` - `Plunge`
   `body`: `Plunge slowly.`
   `durationMs`: `20000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_long`
7. `finish` - `Done`
   `body`: `Serve immediately.`
   `requiresConfirm`: `false`
   `feedbackCue`: `combo_short`

### `seed_fp_quick_350`

- `toolId`: `tool_french_press`
- `filterLabel`: `Metal mesh`
- `grindLabel`: `Coarse`
- `description`: Faster French press for smaller batch brewing.
- `notes`: Keep plunge even and pour out quickly.

1. `instruction` - `Prep`
   `body`: `Add coffee to French press.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
2. `timed_action` - `Full pour`
   `body`: `Pour all water to 350 ml.`
   `durationMs`: `30000`
   `waterMl`: `350`
   `targetTotalWaterMl`: `350`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_short`
3. `confirm` - `Stir and cap`
   `body`: `Stir gently and place the plunger on top.`
   `requiresConfirm`: `true`
   `feedbackCue`: `none`
4. `timed_wait` - `Steep`
   `body`: `Steep for a shorter brew.`
   `durationMs`: `180000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_long`
5. `timed_action` - `Plunge`
   `body`: `Plunge slowly to finish.`
   `durationMs`: `20000`
   `requiresConfirm`: `false`
   `feedbackCue`: `vibrate_long`
6. `finish` - `Done`
   `body`: `Serve now.`
   `requiresConfirm`: `false`
   `feedbackCue`: `combo_short`

## Seed implementation rules

- Set `createdAt` and `updatedAt` for seed recipes to the phone seed time.
- `archived` for seed recipes must start as `false`.
- Seeding order does not matter functionally, but keep the code grouped by `toolId`.
- Generate `RecipeSummary` for seed recipes from the full record; do not maintain it manually in a second place.

## Follow-ups if the seed library is expanded

- Do not change existing `recipeId` values.
- Add new seed recipes; do not silently replace old ones.
- If a seed recipe must be retired, prefer marking it as `archived` in a migration instead of deleting it without a trace.
