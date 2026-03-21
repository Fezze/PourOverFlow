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

export const SCAFFOLD_RECIPE_BLUEPRINTS = {
  tool_aeropress: [
    {
      recipeId: "seed_ap_daily_clean",
      name: "AeroPress Daily Clean Cup",
      colorToken: "amber"
    },
    {
      recipeId: "seed_ap_inverted_sweet",
      name: "AeroPress Inverted Sweet",
      colorToken: "coral"
    }
  ],
  tool_v60: [
    {
      recipeId: "seed_v60_bloom_classic",
      name: "V60 Bloom Classic",
      colorToken: "teal"
    },
    {
      recipeId: "seed_v60_fast_morning",
      name: "V60 Fast Morning",
      colorToken: "slate"
    }
  ],
  tool_kalita_wave: [
    {
      recipeId: "seed_kalita_balanced",
      name: "Kalita Balanced",
      colorToken: "forest"
    },
    {
      recipeId: "seed_kalita_sweet_small",
      name: "Kalita Sweet Small",
      colorToken: "amber"
    }
  ],
  tool_chemex: [
    {
      recipeId: "seed_chemex_classic_500",
      name: "Chemex Classic 500",
      colorToken: "indigo"
    },
    {
      recipeId: "seed_chemex_light_400",
      name: "Chemex Light 400",
      colorToken: "teal"
    }
  ],
  tool_clever_dripper: [
    {
      recipeId: "seed_clever_full_immersion",
      name: "Clever Full Immersion",
      colorToken: "forest"
    },
    {
      recipeId: "seed_clever_short_steep",
      name: "Clever Short Steep",
      colorToken: "coral"
    }
  ],
  tool_french_press: [
    {
      recipeId: "seed_fp_clean_classic",
      name: "French Press Clean Classic",
      colorToken: "slate"
    },
    {
      recipeId: "seed_fp_quick_350",
      name: "French Press Quick 350",
      colorToken: "indigo"
    }
  ]
};

export function createScaffoldRecipeSummary(toolId, blueprint, index) {
  return {
    recipeId: blueprint.recipeId,
    toolId,
    name: blueprint.name,
    colorToken: blueprint.colorToken,
    updatedAt: Date.now() - index * 1000,
    archived: false,
    source: "seed"
  };
}

export function createScaffoldRecipeSummaryList(toolId) {
  const blueprints = SCAFFOLD_RECIPE_BLUEPRINTS[toolId] || [];
  return blueprints.map((blueprint, index) =>
    createScaffoldRecipeSummary(toolId, blueprint, index)
  );
}

export function createScaffoldRecipeSnapshot(recipeSummary) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    recipeId: recipeSummary.recipeId,
    toolId: recipeSummary.toolId,
    name: recipeSummary.name,
    colorToken: recipeSummary.colorToken,
    description: "Stage 2 scaffold snapshot placeholder.",
    coffeeDoseG: 0,
    totalWaterMl: 0,
    waterTempC: 0,
    filterLabel: "Stage 3",
    grindLabel: "Stage 3",
    estimatedTotalDurationMs: 180000,
    notes: "Real recipe records will be seeded from docs/05 in Stage 3.",
    steps: []
  };
}
