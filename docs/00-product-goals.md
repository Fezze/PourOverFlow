# PourOverFlow v1 - product goals

## Mission

PourOverFlow should help users brew coffee consistently on a Zepp watch without forcing them to stare at their phone during the whole process. The watch should act as a lightweight brew coach: guide the recipe step by step, keep time, remind the user about actions, and allow the session to resume after a short interruption.

## Problem we are solving

Manual home coffee brewing often requires doing all of these at once:

- tracking total session time,
- tracking time for individual steps,
- remembering water amounts or upcoming actions,
- keeping the recipe nearby,
- resuming quickly after screen sleep or stepping away for a moment.

The phone is good for editing and archiving, but poor as the operational screen during brewing. The watch is good for execution, but not for rich editing. The product should use this split of responsibilities intentionally.

## Target user

### Primary persona

A home coffee enthusiast who:

- brews manually several times per week,
- uses several known brewing tools,
- stores personal recipe variants,
- wants repeatability without constantly checking the phone.

### Secondary persona

A Zepp/Amazfit user who wants a simple `choose -> start -> execute` flow, without cloud, account setup, or multi-phone sync.

## V1 scope

### Watch experience

- tool selection from a limited global catalog of supported brewers,
- recipe selection within the chosen tool,
- start of the brewing session,
- guided steps with a step timer and full-session timer,
- steps that require manual progression,
- best-effort haptic feedback and optional audio,
- session resume after reopening the app or waking the watch,
- saving the latest result when the session ends.

### Phone experience

- full recipe manager in `setting/`,
- browsing brewing history,
- editing notes and rating after a finished brew,
- seeding and storing the canonical tool catalog, recipes, and history,
- syncing data to the watch through `app-side/`.

## Hard product assumptions

- v1 has no cloud, accounts, backend, or external recipe import,
- the tool catalog is closed and global,
- the user cannot create custom tool types in v1,
- history is canonical on the phone side,
- the watch should tolerate temporary phone absence and start from local cache,
- a running session always uses a recipe snapshot taken at session start.

## Supported v1 tool catalog

The list below is frozen for v1. Every `toolId` is stable, ASCII-safe, and must not change after release.

| toolId | Label | Icon stem | Default order | Notes |
| --- | --- | --- | --- | --- |
| `tool_aeropress` | AeroPress | `tool-aeropress` | `10` | richest launch category |
| `tool_v60` | Hario V60 | `tool-v60` | `20` | classic pour-over dripper |
| `tool_kalita_wave` | Kalita Wave | `tool-kalita-wave` | `30` | flat-bed geometry, different pour pacing |
| `tool_chemex` | Chemex | `tool-chemex` | `40` | larger capacity, longer steps |
| `tool_clever_dripper` | Clever Dripper | `tool-clever-dripper` | `50` | immersion + drawdown hybrid |
| `tool_french_press` | French Press | `tool-french-press` | `60` | immersion, longer brew times |

### Tool catalog rules

- These are the only tools the user may select in v1.
- The phone does not offer a form for creating a new `Tool`.
- Seed data must install the entire catalog on first launch.
- A recipe with an unknown `toolId` is invalid and must be rejected on the phone side.

## Seed library v1

The seed library should be curated but lightweight:

- minimum shipping bar: at least 1 starter recipe for each supported tool,
- product target: 2 starter recipes for each tool,
- seed recipes must be editable and clonable by the user,
- seed recipes must use only the step model supported by v1.

## How to treat examples from external services

Services such as AeroPrecipe are domain references only, not import sources. They may inspire:

- the set of recipe metadata fields,
- step naming,
- how dose, temperature, filter, and time are written down,
- the distinction between a recipe and the result of a concrete session.

Do not design v1 as if the app were about to ingest external recipe databases.

## Minimal product model

### Recipe

A recipe must store:

- name,
- assigned tool,
- recipe color,
- description,
- coffee dose,
- total water amount,
- water temperature,
- filter type,
- grind description,
- estimated full duration,
- step list,
- recipe author notes.

### Recipe step

A single step must be able to describe:

- instruction text,
- per-step duration when applicable,
- whether the user must press `Next`,
- optional water amount for the step,
- optional target total water after the step,
- feedback type.

### Session result

A session result must be able to describe:

- which recipe and tool were used,
- when the session started and ended,
- whether it completed, was aborted, or expired,
- how long it took,
- actual per-step timing,
- note and rating, edited mainly on the phone.

## UX principles

### 1. The watch should be execution-first, not editing-first

The watch UI should simplify decisions during brewing as much as possible. The watch is not the place for building complex recipes or browsing the full archive.

### 2. The phone should be the source of truth

The phone is responsible for editing, catalog management, and archive ownership. The watch works from local cache and session data.

### 3. Resume matters more than "full background"

When the user comes back, they should see a sensible session state. V1 does not promise a fully reliable background engine.

### 4. Minimize decisions during brewing

On the watch, the flow should have only three primary modes:

- choose tool,
- choose recipe,
- execute session.

### 5. History must survive library changes

Deleting a recipe must not destroy history. History always stores its own snapshot.

## V1 success

V1 is considered ready when:

- the user can select one of the supported tools and start a recipe on the watch,
- the watch correctly guides the user through timed and manual steps,
- the active session can be resumed after returning to the app,
- the phone allows the user to create, edit, and delete recipes,
- history is saved, visible on the phone, and does not disappear after recipe deletion,
- the watch works from local cache when the phone is temporarily unavailable.

## Out of scope for v1

- backend, login, cloud, and multi-device sync,
- import from external services,
- user-defined tools,
- full history on the watch,
- workout extension, widgets, and shortcut cards,
- `AppService` as a hard timer foundation,
- advanced analytics such as extraction, TDS, or scale/BLE integrations.

## Decisions the next agent should not revisit

- The tool catalog is closed.
- History is canonical on the phone.
- The watch shows only the latest result, not the full archive.
- A running session works on a snapshot.
- Multi-brewer support is in scope for v1.
- Round and square are in scope for v1; band is not.
