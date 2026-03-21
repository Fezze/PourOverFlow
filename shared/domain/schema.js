export const CURRENT_SCHEMA_VERSION = 1;

export const RECIPE_STEP_KINDS = [
  "instruction",
  "timed_action",
  "timed_wait",
  "confirm",
  "finish"
];

export const FEEDBACK_CUES = [
  "none",
  "vibrate_short",
  "vibrate_long",
  "sound_soft",
  "sound_strong",
  "combo_short"
];

export const RECIPE_COLOR_TOKENS = [
  "amber",
  "teal",
  "forest",
  "coral",
  "indigo",
  "slate"
];

export const SESSION_STATUSES = [
  "running",
  "waiting_for_confirm",
  "completed",
  "aborted",
  "expired"
];

export const RECIPE_SOURCES = ["seed", "user"];
export const HISTORY_STATUSES = ["completed", "aborted", "expired"];
export const DEFAULT_RECIPE_COLOR_TOKEN = RECIPE_COLOR_TOKENS[0];

function createRandomSuffix() {
  return Math.random().toString(36).slice(2, 6).padEnd(4, "0").slice(0, 4);
}

export function createGeneratedId(prefix, timestamp = Date.now()) {
  return `${prefix}_${timestamp}_${createRandomSuffix()}`;
}

export function toOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsedNumber = Number(value);
  return Number.isFinite(parsedNumber) ? parsedNumber : undefined;
}

export function toNumberOrFallback(value, fallbackValue = 0) {
  const parsedNumber = toOptionalNumber(value);
  return parsedNumber === undefined ? fallbackValue : parsedNumber;
}

export function normalizeText(value, fallbackValue = "") {
  if (value === null || value === undefined) {
    return fallbackValue;
  }

  const nextValue = String(value).trim();
  return nextValue || fallbackValue;
}

export function normalizeBoolean(value) {
  return value === true || value === "true";
}

export function cloneRecipeSteps(steps = []) {
  return steps.map((step) => ({ ...step }));
}

export function cloneRecipeRecord(recipeRecord, overrides = {}) {
  return {
    ...recipeRecord,
    ...overrides,
    steps: cloneRecipeSteps(overrides.steps || recipeRecord.steps || [])
  };
}

export function sumRecipeStepDurations(steps = []) {
  return steps.reduce((total, step) => total + (toOptionalNumber(step.durationMs) || 0), 0);
}

export function createStepId(order, existingStepId) {
  if (normalizeText(existingStepId)) {
    return normalizeText(existingStepId);
  }

  return `step_${String(order).padStart(2, "0")}_${createRandomSuffix()}`;
}

export function normalizeRecipeSteps(steps = []) {
  return steps.map((step, index) => {
    const kind =
      RECIPE_STEP_KINDS.find((supportedKind) => supportedKind === step.kind) ||
      (index === steps.length - 1 ? "finish" : "instruction");
    const durationMs = kind === "finish" ? undefined : toOptionalNumber(step.durationMs);
    const waterMl = toOptionalNumber(step.waterMl);
    const targetTotalWaterMl = toOptionalNumber(step.targetTotalWaterMl);
    const title =
      normalizeText(step.title) || (kind === "finish" ? "Done" : kind === "confirm" ? "Confirm" : "Step");
    const body =
      normalizeText(step.body) ||
      (kind === "finish" ? "Finish the brew." : "Complete the step and continue.");

    return {
      stepId: createStepId(index, step.stepId),
      order: index,
      kind,
      title,
      body,
      ...(durationMs === undefined ? {} : { durationMs }),
      ...(waterMl === undefined ? {} : { waterMl }),
      ...(targetTotalWaterMl === undefined ? {} : { targetTotalWaterMl }),
      requiresConfirm: kind === "confirm" ? true : normalizeBoolean(step.requiresConfirm),
      feedbackCue:
        FEEDBACK_CUES.find((supportedCue) => supportedCue === step.feedbackCue) || "none"
    };
  });
}

export function createDefaultRecipeSteps() {
  return normalizeRecipeSteps([
    {
      kind: "instruction",
      title: "Prep",
      body: "Set up the brewer and add coffee.",
      requiresConfirm: true,
      feedbackCue: "none"
    },
    {
      kind: "finish",
      title: "Done",
      body: "Finish the brew.",
      requiresConfirm: false,
      feedbackCue: "combo_short"
    }
  ]);
}

export function createEmptyRecipeRecord(options = {}) {
  const now = options.now || Date.now();

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    recipeId: options.recipeId || "",
    toolId: options.toolId || "",
    name: options.name || "",
    colorToken: options.colorToken || DEFAULT_RECIPE_COLOR_TOKEN,
    description: options.description || "",
    coffeeDoseG: options.coffeeDoseG || 15,
    totalWaterMl: options.totalWaterMl || 250,
    waterTempC: options.waterTempC || 93,
    filterLabel: options.filterLabel || "Paper",
    grindLabel: options.grindLabel || "Medium",
    estimatedTotalDurationMs: options.estimatedTotalDurationMs || 120000,
    notes: options.notes || "",
    steps: cloneRecipeSteps(options.steps || createDefaultRecipeSteps()),
    createdAt: options.createdAt || now,
    updatedAt: options.updatedAt || now,
    source: options.source || "user",
    archived: Boolean(options.archived)
  };
}

export function createRecipeSummary(recipeRecord) {
  return {
    recipeId: recipeRecord.recipeId,
    toolId: recipeRecord.toolId,
    name: recipeRecord.name,
    colorToken: recipeRecord.colorToken,
    updatedAt: recipeRecord.updatedAt,
    archived: Boolean(recipeRecord.archived),
    source: recipeRecord.source
  };
}

export function createRecipeSnapshot(recipeRecord) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    recipeId: recipeRecord.recipeId,
    toolId: recipeRecord.toolId,
    name: recipeRecord.name,
    colorToken: recipeRecord.colorToken,
    coffeeDoseG: recipeRecord.coffeeDoseG,
    totalWaterMl: recipeRecord.totalWaterMl,
    waterTempC: recipeRecord.waterTempC,
    filterLabel: recipeRecord.filterLabel,
    grindLabel: recipeRecord.grindLabel,
    estimatedTotalDurationMs: recipeRecord.estimatedTotalDurationMs,
    steps: cloneRecipeSteps(recipeRecord.steps),
    recipeUpdatedAt: recipeRecord.updatedAt
  };
}

export function createHistoryIndexEntry(historyEntry) {
  return {
    historyId: historyEntry.historyId,
    toolId: historyEntry.toolId,
    recipeName: historyEntry.recipeSnapshot.name,
    status: historyEntry.status,
    endedAt: historyEntry.endedAt,
    elapsedMs: historyEntry.elapsedMs,
    updatedAt: historyEntry.updatedAt
  };
}

export function createLastResultSummary(historyEntry) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    historyId: historyEntry.historyId,
    toolId: historyEntry.toolId,
    recipeName: historyEntry.recipeSnapshot.name,
    colorToken: historyEntry.recipeSnapshot.colorToken,
    status: historyEntry.status,
    endedAt: historyEntry.endedAt,
    elapsedMs: historyEntry.elapsedMs,
    totalDeltaMs: historyEntry.deviationSummary ? historyEntry.deviationSummary.totalDeltaMs : 0
  };
}

export function compareRecipeSummaries(left, right) {
  if (right.updatedAt !== left.updatedAt) {
    return right.updatedAt - left.updatedAt;
  }

  return left.name.localeCompare(right.name);
}

export function compareHistoryIndexEntries(left, right) {
  if (right.endedAt !== left.endedAt) {
    return right.endedAt - left.endedAt;
  }

  return right.updatedAt - left.updatedAt;
}
