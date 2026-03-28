# PourOverFlow v1 - seed library

## Purpose of this document

This document freezes the starter recipe library for v1. The seed library is a curated built-in catalog, not an online import and not a user-generated community feed.

The repo source of truth for the exact seeded records is:

- [seed-library.js](c:\Users\krzys\Projects\PourOverFlow\zepp-app\shared\domain\seed-library.js)
- [seed-library/en-US.js](c:\Users\krzys\Projects\PourOverFlow\zepp-app\shared\domain\seed-library\en-US.js)
- [seed-library/pl-PL.js](c:\Users\krzys\Projects\PourOverFlow\zepp-app\shared\domain\seed-library\pl-PL.js)

## Seed library rules

- All seed recipes use `source: "seed"`.
- Every seed recipe is a normal `RecipeRecord`, not a special entity type.
- The user may edit, duplicate, or delete seed recipes after first launch.
- Later app launches must not overwrite user changes to existing seed recipes.
- Seed-library growth must happen through versioned migration, not by reseeding the whole catalog.

## Current seed baseline

- `SEED_LIBRARY_VERSION`: `2`
- total recipes: `24`
- every supported brewer now has more than `2` recipes
- recipe counts are intentionally uneven so watch browse and sync can be tested against a more realistic catalog shape

## Brewer distribution

| toolId | brewer | recipe count |
| --- | --- | ---: |
| `tool_aeropress` | AeroPress | 4 |
| `tool_v60` | V60 | 5 |
| `tool_kalita_wave` | Kalita Wave | 3 |
| `tool_chemex` | Chemex | 4 |
| `tool_clever_dripper` | Clever Dripper | 3 |
| `tool_french_press` | French Press | 5 |

## Seed matrix

| recipeId | toolId | name |
| --- | --- | --- |
| `seed_ap_daily_clean` | `tool_aeropress` | AeroPress Daily Clean Cup |
| `seed_ap_inverted_sweet` | `tool_aeropress` | AeroPress Inverted Sweet |
| `seed_ap_bypass_bright` | `tool_aeropress` | AeroPress Bypass Bright |
| `seed_ap_long_sweet` | `tool_aeropress` | AeroPress Long Sweet |
| `seed_v60_bloom_classic` | `tool_v60` | V60 Bloom Classic |
| `seed_v60_fast_morning` | `tool_v60` | V60 Fast Morning |
| `seed_v60_high_sweet` | `tool_v60` | V60 High Sweet |
| `seed_v60_low_agitation` | `tool_v60` | V60 Low Agitation |
| `seed_v60_evening_balance` | `tool_v60` | V60 Evening Balance |
| `seed_kalita_balanced` | `tool_kalita_wave` | Kalita Balanced |
| `seed_kalita_sweet_small` | `tool_kalita_wave` | Kalita Sweet Small |
| `seed_kalita_evening_round` | `tool_kalita_wave` | Kalita Evening Round |
| `seed_chemex_classic_500` | `tool_chemex` | Chemex Classic 500 |
| `seed_chemex_light_400` | `tool_chemex` | Chemex Light 400 |
| `seed_chemex_clear_600` | `tool_chemex` | Chemex Clear 600 |
| `seed_chemex_weekend_700` | `tool_chemex` | Chemex Weekend 700 |
| `seed_clever_full_immersion` | `tool_clever_dripper` | Clever Full Immersion |
| `seed_clever_short_steep` | `tool_clever_dripper` | Clever Short Steep |
| `seed_clever_bright_release` | `tool_clever_dripper` | Clever Bright Release |
| `seed_fp_clean_classic` | `tool_french_press` | French Press Clean Classic |
| `seed_fp_quick_350` | `tool_french_press` | French Press Quick 350 |
| `seed_fp_gentle_450` | `tool_french_press` | French Press Gentle 450 |
| `seed_fp_rich_700` | `tool_french_press` | French Press Rich 700 |
| `seed_fp_rested_classic` | `tool_french_press` | French Press Rested Classic |

## Migration policy

- Existing seed `recipeId` values are frozen and must not change.
- `SEED_LIBRARY_VERSION` tracks additive seed-catalog growth.
- New versions should add new seed records rather than rewriting or silently replacing old ones.
- Existing installs should receive only seed recipes introduced after their stored `seedCatalogVersion`.
- Existing seed recipes that the user deleted must not be silently resurrected.
- If a seed recipe ever needs retirement, prefer an explicit migration strategy over deleting its history from the codebase without a trace.

## Phone-side storage behavior

`pof_sync_meta_v1` now carries `seedCatalogVersion` so the phone can:

1. seed the full current library on a brand-new install,
2. migrate older installs by appending only newer seed recipes,
3. avoid overwriting edited seed recipes or re-adding deleted older seeds.

`pof_sync_meta_v1` also carries `seedLocale` so the phone can:

1. seed starter recipes in a supported locale on a new install,
2. keep older installs on the legacy English starter baseline when they predate this field,
3. keep later additive seed migrations consistent with the locale that was originally chosen for starter data.

## Implementation notes

- Seed timestamps still come from phone-side first-run or migration time.
- `createdAt` and `updatedAt` for newly introduced seed records should use the migration timestamp.
- `RecipeSummary` records should always be derived from the full `RecipeRecord`.
- The implementation should keep locale-neutral seed definitions and locale overrides split into separate files instead of recreating one mega seed module.
- The wrapper [seed-library.js](c:\Users\krzys\Projects\PourOverFlow\zepp-app\shared\domain\seed-library.js) should localize from the locale-specific modules instead of duplicating the full seed graph inline.
