# PourOverFlow v1 - domain model

## General rules

- All identifiers are ASCII, lowercase, and stable.
- All records use `schemaVersion: 1`.
- All dates and timestamps are stored as Unix epoch milliseconds.
- All numeric values for dose and water are stored as `number` in grams or milliliters.
- Units are not configurable in v1.

## Domain enums

### `RecipeStepKind`

```ts
type RecipeStepKind =
  | 'instruction'
  | 'timed_action'
  | 'timed_wait'
  | 'confirm'
  | 'finish'
```

### `FeedbackCue`

```ts
type FeedbackCue =
  | 'none'
  | 'vibrate_short'
  | 'vibrate_long'
  | 'combo_short'
```

### `RecipeColorToken`

Recipe color must be a token from a limited palette, not an arbitrary hex value. This simplifies watch UI and seed data.

```ts
type RecipeColorToken =
  | 'amber'
  | 'teal'
  | 'forest'
  | 'coral'
  | 'indigo'
  | 'slate'
```

Token mapping:

| token | hex |
| --- | --- |
| `amber` | `#D9922E` |
| `teal` | `#2D8C82` |
| `forest` | `#4E7A42` |
| `coral` | `#D6675A` |
| `indigo` | `#4E5FA8` |
| `slate` | `#5E6773` |

### `SessionStatus`

```ts
type SessionStatus =
  | 'running'
  | 'waiting_for_confirm'
  | 'completed'
  | 'aborted'
  | 'expired'
```

## `ToolDefinition`

`ToolDefinition` is global, controlled, and not user-editable.

```ts
interface ToolDefinition {
  schemaVersion: 1
  toolId: string
  label: string
  iconStem: string
  sortOrder: number
  supported: true
  description: string
}
```

### Seed tool catalog

Implementation should seed exactly this set:

```ts
const TOOL_CATALOG: ToolDefinition[] = [
  {
    schemaVersion: 1,
    toolId: 'tool_aeropress',
    label: 'AeroPress',
    iconStem: 'tool-aeropress',
    sortOrder: 10,
    supported: true,
    description: 'Immersion / pressure hybrid'
  },
  {
    schemaVersion: 1,
    toolId: 'tool_v60',
    label: 'Hario V60',
    iconStem: 'tool-v60',
    sortOrder: 20,
    supported: true,
    description: 'Classic conical pour-over'
  },
  {
    schemaVersion: 1,
    toolId: 'tool_kalita_wave',
    label: 'Kalita Wave',
    iconStem: 'tool-kalita-wave',
    sortOrder: 30,
    supported: true,
    description: 'Flat-bed pour-over'
  },
  {
    schemaVersion: 1,
    toolId: 'tool_chemex',
    label: 'Chemex',
    iconStem: 'tool-chemex',
    sortOrder: 40,
    supported: true,
    description: 'Large paper filter brewer'
  },
  {
    schemaVersion: 1,
    toolId: 'tool_clever_dripper',
    label: 'Clever Dripper',
    iconStem: 'tool-clever-dripper',
    sortOrder: 50,
    supported: true,
    description: 'Immersion with controlled drawdown'
  },
  {
    schemaVersion: 1,
    toolId: 'tool_french_press',
    label: 'French Press',
    iconStem: 'tool-french-press',
    sortOrder: 60,
    supported: true,
    description: 'Full immersion brewer'
  }
]
```

## `RecipeRecord`

```ts
interface RecipeRecord {
  schemaVersion: 1
  recipeId: string
  toolId: string
  name: string
  colorToken: RecipeColorToken
  description: string
  coffeeDoseG: number
  totalWaterMl: number
  waterTempC: number
  filterLabel: string
  grindLabel: string
  estimatedTotalDurationMs: number
  notes: string
  steps: RecipeStep[]
  createdAt: number
  updatedAt: number
  source: 'seed' | 'user'
  archived: boolean
}
```

### `RecipeRecord` rules

- `toolId` must exist in `ToolDefinition`.
- `name` must not be empty.
- `steps.length >= 1`.
- The last step must have `kind: 'finish'`.
- `order` must be continuous from `0`.
- `estimatedTotalDurationMs` is either the sum of timed steps or a manually calculated estimate, but it must not be smaller than the sum of `durationMs`.
- `archived: false` means visible in the catalog. V1 does not need an additional trash state.

## `RecipeStep`

```ts
interface RecipeStep {
  stepId: string
  order: number
  kind: RecipeStepKind
  title: string
  body: string
  durationMs?: number
  waterMl?: number
  targetTotalWaterMl?: number
  requiresConfirm: boolean
  feedbackCue: FeedbackCue
}
```

### Step semantics

#### `instruction`

- plain instruction without countdown,
- may use `requiresConfirm: true`,
- useful for `add filter`, `rinse`, `invert`, `stir`.

#### `timed_action`

- a timed step with an active action to perform,
- example: `pour 100 ml in 15 seconds`,
- auto-completes after time by default unless `requiresConfirm: true`.

#### `timed_wait`

- a timed waiting step,
- example: `let bloom for 30 seconds`,
- auto-completes after time by default.

#### `confirm`

- zero-timer or explicit manual checkpoint,
- always requires confirmation.

#### `finish`

- final step of the session,
- should not use `durationMs`,
- may use `feedbackCue`.

## `RecipeSummary`

The recipe index on the phone should not store full steps.

```ts
interface RecipeSummary {
  recipeId: string
  toolId: string
  name: string
  colorToken: RecipeColorToken
  updatedAt: number
  archived: boolean
  source: 'seed' | 'user'
}
```

## `RecipeSnapshot`

A snapshot is a copy of a recipe saved into the session and history.

```ts
interface RecipeSnapshot {
  schemaVersion: 1
  recipeId: string
  toolId: string
  name: string
  colorToken: RecipeColorToken
  coffeeDoseG: number
  totalWaterMl: number
  waterTempC: number
  filterLabel: string
  grindLabel: string
  estimatedTotalDurationMs: number
  steps: RecipeStep[]
  recipeUpdatedAt: number
}
```

### Snapshot rule

The snapshot is created when the session starts and stays unchanged until the session ends. Changes in `RecipeRecord` do not mutate `RecipeSnapshot`.

## `ActiveBrewSession`

```ts
interface ActiveBrewSession {
  schemaVersion: 1
  sessionId: string
  recipeSnapshot: RecipeSnapshot
  currentStepIndex: number
  status: SessionStatus
  sessionStartedAt: number
  sessionEndedAt?: number
  currentStepStartedAt: number
  expectedStepEndAt?: number
  elapsedSessionMs: number
  completedStepIds: string[]
  stepRunResults: StepRunResult[]
  lastPersistedAt: number
  wakeUpResumeEnabled: boolean
  pageBrightModeEnabled: boolean
}
```

### `ActiveBrewSession` rules

- at most one active session exists at a time,
- `currentStepIndex` points to the current step or the last step before `completed`,
- `stepRunResults` stores results only for finished steps,
- `elapsedSessionMs` is recalculated during resume.

## `StepRunResult`

```ts
interface StepRunResult {
  stepId: string
  order: number
  kind: RecipeStepKind
  startedAt: number
  endedAt: number
  plannedDurationMs?: number
  actualDurationMs?: number
  confirmedManually: boolean
}
```

## `HistoryEntry`

```ts
interface HistoryEntry {
  schemaVersion: 1
  historyId: string
  sessionId: string
  recipeId?: string
  toolId: string
  recipeSnapshot: RecipeSnapshot
  status: 'completed' | 'aborted' | 'expired'
  startedAt: number
  endedAt: number
  elapsedMs: number
  stepRunResults: StepRunResult[]
  deviationSummary: DeviationSummary
  userRating?: number
  userNote?: string
  syncedFrom: 'watch'
  createdAt: number
  updatedAt: number
}
```

### `DeviationSummary`

```ts
interface DeviationSummary {
  totalDeltaMs: number
  worstStepDeltaMs: number
  completedSteps: number
  totalSteps: number
}
```

### History rules

- `HistoryEntry` always contains `recipeSnapshot`,
- `recipeId` may remain for linking, but history rendering must not depend on it,
- deleting a recipe does not delete history entries,
- notes and rating are optional and edited mainly on the phone.

## `LastResultSummary`

The watch does not store full history, only the latest result for quick summary.

```ts
interface LastResultSummary {
  schemaVersion: 1
  historyId: string
  toolId: string
  recipeName: string
  colorToken: RecipeColorToken
  status: 'completed' | 'aborted' | 'expired'
  endedAt: number
  elapsedMs: number
  totalDeltaMs: number
}
```

## `SyncEnvelope`

```ts
interface SyncEnvelope<TPayload> {
  schemaVersion: 1
  messageType: string
  requestId: string
  sentAt: number
  payload: TPayload
}
```

## ID generation convention

Do not add an external UUID library in v1. Use simple readable prefixes:

- `recipe_<timestamp>_<rand4>`
- `hist_<timestamp>_<rand4>`
- `sess_<timestamp>_<rand4>`
- `step_<index>_<rand4>`
- `req_<timestamp>_<rand4>`

`rand4` means four base36 characters.

## Example full recipe

```json
{
  "schemaVersion": 1,
  "recipeId": "recipe_1711111111111_ab12",
  "toolId": "tool_aeropress",
  "name": "Aeropress Daily Clean Cup",
  "colorToken": "amber",
  "description": "Balanced everyday cup",
  "coffeeDoseG": 15,
  "totalWaterMl": 240,
  "waterTempC": 93,
  "filterLabel": "Paper",
  "grindLabel": "Medium-fine",
  "estimatedTotalDurationMs": 120000,
  "notes": "Stir gently and press slowly.",
  "steps": [
    {
      "stepId": "step_0_a1b2",
      "order": 0,
      "kind": "instruction",
      "title": "Prep",
      "body": "Rinse filter and add coffee.",
      "requiresConfirm": true,
      "feedbackCue": "none"
    },
    {
      "stepId": "step_1_c3d4",
      "order": 1,
      "kind": "timed_action",
      "title": "Bloom pour",
      "body": "Pour 50 ml water.",
      "durationMs": 15000,
      "waterMl": 50,
      "targetTotalWaterMl": 50,
      "requiresConfirm": false,
      "feedbackCue": "vibrate_short"
    },
    {
      "stepId": "step_2_e5f6",
      "order": 2,
      "kind": "timed_wait",
      "title": "Bloom wait",
      "body": "Let the coffee bloom.",
      "durationMs": 30000,
      "requiresConfirm": false,
      "feedbackCue": "vibrate_short"
    },
    {
      "stepId": "step_3_g7h8",
      "order": 3,
      "kind": "confirm",
      "title": "Press",
      "body": "Press slowly until hiss.",
      "requiresConfirm": true,
      "feedbackCue": "vibrate_long"
    },
    {
      "stepId": "step_4_i9j0",
      "order": 4,
      "kind": "finish",
      "title": "Done",
      "body": "Enjoy your brew.",
      "requiresConfirm": false,
      "feedbackCue": "combo_short"
    }
  ],
  "createdAt": 1711111111111,
  "updatedAt": 1711111111111,
  "source": "seed",
  "archived": false
}
```

## Frozen decisions

- We use recipe snapshots in both session and history.
- Recipe color is a token from a small palette.
- `ToolDefinition` is not editable by the user.
- The last step is always `finish`.
- Full history stays on the phone.
