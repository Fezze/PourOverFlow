# PourOverFlow v1 - model domeny

## Zasady ogolne

- Wszystkie identyfikatory sa ASCII, lowercase, stable.
- Wszystkie rekordy maja `schemaVersion: 1`.
- Wszystkie daty i timestampy sa zapisywane jako Unix epoch w milisekundach.
- Wszystkie wartosci liczbowe dla masy i wody sa w gramach lub mililitrach jako `number`.
- Jednostki nie sa konfigurowalne w v1.

## Enumeracje domenowe

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
  | 'sound_soft'
  | 'sound_strong'
  | 'combo_short'
```

### `RecipeColorToken`

Kolor receptury ma byc tokenem z ograniczonej palety, a nie dowolnym hexem. To upraszcza watch UI i seed danych.

```ts
type RecipeColorToken =
  | 'amber'
  | 'teal'
  | 'forest'
  | 'coral'
  | 'indigo'
  | 'slate'
```

Mapowanie tokenow:

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

`ToolDefinition` jest globalny, kontrolowany i nieedytowalny przez uzytkownika.

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

### Seed katalogu narzedzi

Implementacja ma seedowac dokladnie ten zestaw:

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

### Reguly `RecipeRecord`

- `toolId` musi istniec w `ToolDefinition`.
- `name` nie moze byc pusty.
- `steps.length >= 1`.
- Ostatni krok musi miec `kind: 'finish'`.
- `order` musi byc ciagly od `0`.
- `estimatedTotalDurationMs` to suma timerow krokow albo recznie policzona wartosc orientacyjna, ale nie moze byc mniejsza od sumy `durationMs`.
- `archived: false` oznacza widocznosc w katalogu. V1 nie potrzebuje dodatkowego kosza.

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

### Semantyka krokow

#### `instruction`

- zwykla instrukcja bez odliczania,
- moze miec `requiresConfirm: true`,
- uzyteczne dla "add filter", "rinse", "invert", "stir".

#### `timed_action`

- krok z licznikiem czasu i aktywna akcja do wykonania,
- przyklad: "pour 100 ml in 15 seconds",
- domyslnie auto-konczony po czasie, chyba ze `requiresConfirm: true`.

#### `timed_wait`

- krok z licznikiem czasu i oczekiwaniem,
- przyklad: "let bloom for 30 seconds",
- domyslnie auto-konczony po czasie.

#### `confirm`

- zero-timer albo jawnie reczny checkpoint,
- zawsze wymaga potwierdzenia.

#### `finish`

- ostatni krok sesji,
- nie powinien miec `durationMs`,
- moze miec `feedbackCue`.

## `RecipeSummary`

Indeks receptur na telefonie nie powinien przechowywac pelnych krokow.

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

Snapshot jest kopia receptury zapisana do sesji i historii.

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

### Regula snapshotu

Snapshot powstaje w momencie startu sesji i pozostaje niezmienny do jej konca. Zmiany w `RecipeRecord` nie modyfikuja `RecipeSnapshot`.

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

### Reguly `ActiveBrewSession`

- w danym momencie istnieje maksymalnie jedna aktywna sesja,
- `currentStepIndex` wskazuje krok biezacy albo ostatni krok przed `completed`,
- `stepRunResults` przechowuje wyniki tylko dla zakonczonych krokow,
- `elapsedSessionMs` jest przeliczane na biezaco podczas resume.

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

### Reguly historii

- `HistoryEntry` zawsze zawiera `recipeSnapshot`,
- `recipeId` moze pozostac dla linkowania, ale nie wolno polegac na nim przy renderowaniu historii,
- usuniecie receptury nie usuwa wpisow historii,
- notatki i ocena sa opcjonalne i glownie edytowane na telefonie.

## `LastResultSummary`

Na zegarku nie zapisujemy pelnej historii, tylko ostatni wynik do szybkiego podsumowania.

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

## Konwencja generowania identyfikatorow

Nie dodawac zewnetrznej biblioteki UUID do v1. Uzywac prostych, czytelnych prefiksow:

- `recipe_<timestamp>_<rand4>`
- `hist_<timestamp>_<rand4>`
- `sess_<timestamp>_<rand4>`
- `step_<index>_<rand4>`
- `req_<timestamp>_<rand4>`

`rand4` oznacza cztery znaki base36.

## Przyklad kompletnej receptury

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

## Decyzje zamrozone

- Uzywamy snapshotu receptury w sesji i historii.
- Kolor receptury jest tokenem z malej palety.
- `ToolDefinition` jest nieedytowalne przez usera.
- Ostatni krok to zawsze `finish`.
- Pelna historia zostaje na telefonie.
