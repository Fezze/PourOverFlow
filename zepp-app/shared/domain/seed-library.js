import {
  CURRENT_SCHEMA_VERSION,
  cloneRecipeRecord,
  normalizeRecipeSteps
} from "./schema.js";

export const SEED_LIBRARY_VERSION = 2;

const SEED_RECIPE_IDS_BY_VERSION = {
  1: [
    "seed_ap_daily_clean",
    "seed_ap_inverted_sweet",
    "seed_v60_bloom_classic",
    "seed_v60_fast_morning",
    "seed_kalita_balanced",
    "seed_kalita_sweet_small",
    "seed_chemex_classic_500",
    "seed_chemex_light_400",
    "seed_clever_full_immersion",
    "seed_clever_short_steep",
    "seed_fp_clean_classic",
    "seed_fp_quick_350"
  ],
  2: [
    "seed_ap_bypass_bright",
    "seed_ap_long_sweet",
    "seed_v60_high_sweet",
    "seed_v60_low_agitation",
    "seed_v60_evening_balance",
    "seed_kalita_evening_round",
    "seed_chemex_clear_600",
    "seed_chemex_weekend_700",
    "seed_clever_bright_release",
    "seed_fp_gentle_450",
    "seed_fp_rich_700",
    "seed_fp_rested_classic"
  ]
};

function buildSeedRecipeRecord(definition) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    recipeId: definition.recipeId,
    toolId: definition.toolId,
    name: definition.name,
    colorToken: definition.colorToken,
    description: definition.description,
    coffeeDoseG: definition.coffeeDoseG,
    totalWaterMl: definition.totalWaterMl,
    waterTempC: definition.waterTempC,
    filterLabel: definition.filterLabel,
    grindLabel: definition.grindLabel,
    estimatedTotalDurationMs: definition.estimatedTotalDurationMs,
    notes: definition.notes,
    steps: normalizeRecipeSteps(definition.steps),
    createdAt: 0,
    updatedAt: 0,
    source: "seed",
    archived: false
  };
}

export const SEED_RECIPE_LIBRARY = [
  buildSeedRecipeRecord({
    recipeId: "seed_ap_daily_clean",
    toolId: "tool_aeropress",
    name: "AeroPress Daily Clean Cup",
    colorToken: "amber",
    description: "Clean, balanced everyday AeroPress cup.",
    coffeeDoseG: 15,
    totalWaterMl: 240,
    waterTempC: 93,
    filterLabel: "Paper",
    grindLabel: "Medium-fine",
    estimatedTotalDurationMs: 120000,
    notes: "Stir gently and press slowly.",
    steps: [
      { stepId: "step_00_apdc", order: 0, kind: "instruction", title: "Prep", body: "Rinse filter, insert paper, add coffee.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_apdc", order: 1, kind: "timed_action", title: "Bloom pour", body: "Pour 50 ml water.", durationMs: 15000, waterMl: 50, targetTotalWaterMl: 50, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_apdc", order: 2, kind: "timed_wait", title: "Bloom wait", body: "Let coffee bloom.", durationMs: 30000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_03_apdc", order: 3, kind: "timed_action", title: "Main pour", body: "Pour remaining water to 240 ml.", durationMs: 20000, waterMl: 190, targetTotalWaterMl: 240, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_04_apdc", order: 4, kind: "confirm", title: "Stir and cap", body: "Stir gently and attach cap.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_05_apdc", order: 5, kind: "timed_action", title: "Press", body: "Press slowly until hiss.", durationMs: 35000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_06_apdc", order: 6, kind: "finish", title: "Done", body: "Enjoy your brew.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_ap_inverted_sweet",
    toolId: "tool_aeropress",
    name: "AeroPress Inverted Sweet",
    colorToken: "coral",
    description: "Slightly sweeter inverted AeroPress profile.",
    coffeeDoseG: 17,
    totalWaterMl: 250,
    waterTempC: 92,
    filterLabel: "Paper",
    grindLabel: "Fine-medium",
    estimatedTotalDurationMs: 140000,
    notes: "Keep inversion stable and press with control.",
    steps: [
      { stepId: "step_00_apis", order: 0, kind: "instruction", title: "Prep inverted", body: "Assemble inverted AeroPress and add coffee.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_apis", order: 1, kind: "timed_action", title: "Initial pour", body: "Pour 100 ml water.", durationMs: 20000, waterMl: 100, targetTotalWaterMl: 100, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_apis", order: 2, kind: "confirm", title: "Stir", body: "Stir thoroughly.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_03_apis", order: 3, kind: "timed_wait", title: "Steep", body: "Steep the brew.", durationMs: 45000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_04_apis", order: 4, kind: "timed_action", title: "Top up", body: "Pour remaining water to 250 ml.", durationMs: 15000, waterMl: 150, targetTotalWaterMl: 250, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_05_apis", order: 5, kind: "confirm", title: "Flip", body: "Place cup, flip brewer carefully and get ready to press.", requiresConfirm: true, feedbackCue: "vibrate_long" },
      { stepId: "step_06_apis", order: 6, kind: "timed_action", title: "Press", body: "Press slowly until finished.", durationMs: 30000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_07_apis", order: 7, kind: "finish", title: "Done", body: "Brew complete.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_v60_bloom_classic",
    toolId: "tool_v60",
    name: "V60 Bloom Classic",
    colorToken: "teal",
    description: "Balanced classic V60 with clear bloom structure.",
    coffeeDoseG: 18,
    totalWaterMl: 300,
    waterTempC: 94,
    filterLabel: "Paper",
    grindLabel: "Medium",
    estimatedTotalDurationMs: 180000,
    notes: "Keep the pour centered and controlled.",
    steps: [
      { stepId: "step_00_v60bc", order: 0, kind: "instruction", title: "Prep", body: "Rinse filter, warm brewer and add coffee bed.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_v60bc", order: 1, kind: "timed_action", title: "Bloom pour", body: "Pour to 50 ml.", durationMs: 15000, waterMl: 50, targetTotalWaterMl: 50, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_v60bc", order: 2, kind: "timed_wait", title: "Bloom wait", body: "Wait for bloom.", durationMs: 30000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_03_v60bc", order: 3, kind: "timed_action", title: "Main pour 1", body: "Pour to 180 ml.", durationMs: 35000, waterMl: 130, targetTotalWaterMl: 180, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_04_v60bc", order: 4, kind: "timed_action", title: "Main pour 2", body: "Pour to 300 ml.", durationMs: 35000, waterMl: 120, targetTotalWaterMl: 300, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_05_v60bc", order: 5, kind: "timed_wait", title: "Drawdown", body: "Let the bed draw down fully.", durationMs: 60000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_06_v60bc", order: 6, kind: "finish", title: "Done", body: "Remove dripper and serve.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_v60_fast_morning",
    toolId: "tool_v60",
    name: "V60 Fast Morning",
    colorToken: "slate",
    description: "Faster V60 profile for a lighter morning cup.",
    coffeeDoseG: 15,
    totalWaterMl: 250,
    waterTempC: 93,
    filterLabel: "Paper",
    grindLabel: "Medium",
    estimatedTotalDurationMs: 150000,
    notes: "Shorter pours, lighter body.",
    steps: [
      { stepId: "step_00_v60fm", order: 0, kind: "instruction", title: "Prep", body: "Rinse filter and add coffee bed.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_v60fm", order: 1, kind: "timed_action", title: "Bloom", body: "Pour to 45 ml.", durationMs: 15000, waterMl: 45, targetTotalWaterMl: 45, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_v60fm", order: 2, kind: "timed_wait", title: "Bloom wait", body: "Wait for bloom.", durationMs: 25000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_03_v60fm", order: 3, kind: "timed_action", title: "Main pour 1", body: "Pour to 160 ml.", durationMs: 30000, waterMl: 115, targetTotalWaterMl: 160, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_04_v60fm", order: 4, kind: "timed_action", title: "Main pour 2", body: "Pour to 250 ml.", durationMs: 25000, waterMl: 90, targetTotalWaterMl: 250, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_05_v60fm", order: 5, kind: "timed_wait", title: "Drawdown", body: "Wait until drawdown finishes.", durationMs: 55000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_06_v60fm", order: 6, kind: "finish", title: "Done", body: "Brew complete.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_kalita_balanced",
    toolId: "tool_kalita_wave",
    name: "Kalita Balanced",
    colorToken: "forest",
    description: "Balanced pulse-pour Kalita profile.",
    coffeeDoseG: 18,
    totalWaterMl: 300,
    waterTempC: 93,
    filterLabel: "Wave",
    grindLabel: "Medium",
    estimatedTotalDurationMs: 210000,
    notes: "Keep pulses even and calm.",
    steps: [
      { stepId: "step_00_kb", order: 0, kind: "instruction", title: "Prep", body: "Rinse filter and add coffee.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_kb", order: 1, kind: "timed_action", title: "Bloom", body: "Pour to 50 ml.", durationMs: 20000, waterMl: 50, targetTotalWaterMl: 50, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_kb", order: 2, kind: "timed_wait", title: "Bloom wait", body: "Wait for bloom.", durationMs: 30000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_03_kb", order: 3, kind: "timed_action", title: "Pulse 1", body: "Pour to 150 ml.", durationMs: 25000, waterMl: 100, targetTotalWaterMl: 150, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_04_kb", order: 4, kind: "timed_action", title: "Pulse 2", body: "Pour to 225 ml.", durationMs: 25000, waterMl: 75, targetTotalWaterMl: 225, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_05_kb", order: 5, kind: "timed_action", title: "Pulse 3", body: "Pour to 300 ml.", durationMs: 25000, waterMl: 75, targetTotalWaterMl: 300, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_06_kb", order: 6, kind: "timed_wait", title: "Drawdown", body: "Let the brew finish drawing down.", durationMs: 70000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_07_kb", order: 7, kind: "finish", title: "Done", body: "Serve your coffee.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_kalita_sweet_small",
    toolId: "tool_kalita_wave",
    name: "Kalita Sweet Small",
    colorToken: "amber",
    description: "Smaller Kalita brew with a sweeter profile.",
    coffeeDoseG: 16,
    totalWaterMl: 260,
    waterTempC: 92,
    filterLabel: "Wave",
    grindLabel: "Medium-fine",
    estimatedTotalDurationMs: 190000,
    notes: "Slightly finer grind, shorter total brew.",
    steps: [
      { stepId: "step_00_kss", order: 0, kind: "instruction", title: "Prep", body: "Rinse filter and level coffee bed.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_kss", order: 1, kind: "timed_action", title: "Bloom", body: "Pour to 45 ml.", durationMs: 20000, waterMl: 45, targetTotalWaterMl: 45, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_kss", order: 2, kind: "timed_wait", title: "Bloom wait", body: "Wait for bloom.", durationMs: 30000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_03_kss", order: 3, kind: "timed_action", title: "Pulse 1", body: "Pour to 130 ml.", durationMs: 22000, waterMl: 85, targetTotalWaterMl: 130, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_04_kss", order: 4, kind: "timed_action", title: "Pulse 2", body: "Pour to 200 ml.", durationMs: 22000, waterMl: 70, targetTotalWaterMl: 200, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_05_kss", order: 5, kind: "timed_action", title: "Pulse 3", body: "Pour to 260 ml.", durationMs: 22000, waterMl: 60, targetTotalWaterMl: 260, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_06_kss", order: 6, kind: "timed_wait", title: "Drawdown", body: "Wait for final drawdown.", durationMs: 52000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_07_kss", order: 7, kind: "finish", title: "Done", body: "Brew complete.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_chemex_classic_500",
    toolId: "tool_chemex",
    name: "Chemex Classic 500",
    colorToken: "indigo",
    description: "Larger Chemex batch with classic pulse structure.",
    coffeeDoseG: 30,
    totalWaterMl: 500,
    waterTempC: 94,
    filterLabel: "Chemex paper",
    grindLabel: "Medium-coarse",
    estimatedTotalDurationMs: 270000,
    notes: "Warm vessel well and keep pours steady.",
    steps: [
      { stepId: "step_00_cc500", order: 0, kind: "instruction", title: "Prep", body: "Rinse filter thoroughly and add coffee.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_cc500", order: 1, kind: "timed_action", title: "Bloom", body: "Pour to 70 ml.", durationMs: 20000, waterMl: 70, targetTotalWaterMl: 70, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_cc500", order: 2, kind: "timed_wait", title: "Bloom wait", body: "Wait for bloom.", durationMs: 40000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_03_cc500", order: 3, kind: "timed_action", title: "Main pour 1", body: "Pour to 250 ml.", durationMs: 45000, waterMl: 180, targetTotalWaterMl: 250, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_04_cc500", order: 4, kind: "timed_action", title: "Main pour 2", body: "Pour to 400 ml.", durationMs: 40000, waterMl: 150, targetTotalWaterMl: 400, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_05_cc500", order: 5, kind: "timed_action", title: "Final pour", body: "Pour to 500 ml.", durationMs: 30000, waterMl: 100, targetTotalWaterMl: 500, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_06_cc500", order: 6, kind: "timed_wait", title: "Drawdown", body: "Wait until drawdown is complete.", durationMs: 90000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_07_cc500", order: 7, kind: "finish", title: "Done", body: "Remove filter and serve.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_chemex_light_400",
    toolId: "tool_chemex",
    name: "Chemex Light 400",
    colorToken: "teal",
    description: "Smaller Chemex profile with lighter body.",
    coffeeDoseG: 24,
    totalWaterMl: 400,
    waterTempC: 93,
    filterLabel: "Chemex paper",
    grindLabel: "Medium",
    estimatedTotalDurationMs: 240000,
    notes: "Maintain gentle circular pours.",
    steps: [
      { stepId: "step_00_cl400", order: 0, kind: "instruction", title: "Prep", body: "Rinse filter and add coffee bed.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_cl400", order: 1, kind: "timed_action", title: "Bloom", body: "Pour to 60 ml.", durationMs: 18000, waterMl: 60, targetTotalWaterMl: 60, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_cl400", order: 2, kind: "timed_wait", title: "Bloom wait", body: "Wait for bloom.", durationMs: 35000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_03_cl400", order: 3, kind: "timed_action", title: "Main pour 1", body: "Pour to 220 ml.", durationMs: 40000, waterMl: 160, targetTotalWaterMl: 220, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_04_cl400", order: 4, kind: "timed_action", title: "Main pour 2", body: "Pour to 320 ml.", durationMs: 35000, waterMl: 100, targetTotalWaterMl: 320, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_05_cl400", order: 5, kind: "timed_action", title: "Final pour", body: "Pour to 400 ml.", durationMs: 25000, waterMl: 80, targetTotalWaterMl: 400, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_06_cl400", order: 6, kind: "timed_wait", title: "Drawdown", body: "Wait for complete drawdown.", durationMs: 87000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_07_cl400", order: 7, kind: "finish", title: "Done", body: "Serve and enjoy.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_clever_full_immersion",
    toolId: "tool_clever_dripper",
    name: "Clever Full Immersion",
    colorToken: "forest",
    description: "Full immersion Clever recipe with long steep.",
    coffeeDoseG: 18,
    totalWaterMl: 280,
    waterTempC: 94,
    filterLabel: "Paper",
    grindLabel: "Medium",
    estimatedTotalDurationMs: 195000,
    notes: "Brewer stays off the cup until drawdown.",
    steps: [
      { stepId: "step_00_cfi", order: 0, kind: "instruction", title: "Prep", body: "Insert filter, rinse, close valve and add coffee.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_cfi", order: 1, kind: "timed_action", title: "Full pour", body: "Pour all water to 280 ml.", durationMs: 30000, waterMl: 280, targetTotalWaterMl: 280, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_cfi", order: 2, kind: "confirm", title: "Stir", body: "Stir gently and place lid.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_03_cfi", order: 3, kind: "timed_wait", title: "Steep", body: "Let the brew steep fully.", durationMs: 120000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_04_cfi", order: 4, kind: "confirm", title: "Place on cup", body: "Set brewer on cup to start drawdown.", requiresConfirm: true, feedbackCue: "vibrate_short" },
      { stepId: "step_05_cfi", order: 5, kind: "timed_wait", title: "Drawdown", body: "Wait for drawdown.", durationMs: 30000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_06_cfi", order: 6, kind: "finish", title: "Done", body: "Brew complete.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_clever_short_steep",
    toolId: "tool_clever_dripper",
    name: "Clever Short Steep",
    colorToken: "coral",
    description: "Shorter Clever recipe for a quicker cup.",
    coffeeDoseG: 16,
    totalWaterMl: 250,
    waterTempC: 93,
    filterLabel: "Paper",
    grindLabel: "Medium-fine",
    estimatedTotalDurationMs: 165000,
    notes: "Slightly quicker drawdown and shorter steep.",
    steps: [
      { stepId: "step_00_css", order: 0, kind: "instruction", title: "Prep", body: "Rinse filter, close valve and add coffee.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_css", order: 1, kind: "timed_action", title: "Full pour", body: "Pour all water to 250 ml.", durationMs: 25000, waterMl: 250, targetTotalWaterMl: 250, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_css", order: 2, kind: "confirm", title: "Stir", body: "Give the brew a gentle stir.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_03_css", order: 3, kind: "timed_wait", title: "Steep", body: "Steep the brew.", durationMs: 90000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_04_css", order: 4, kind: "confirm", title: "Place on cup", body: "Place brewer on cup to release.", requiresConfirm: true, feedbackCue: "vibrate_short" },
      { stepId: "step_05_css", order: 5, kind: "timed_wait", title: "Drawdown", body: "Wait for drawdown.", durationMs: 25000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_06_css", order: 6, kind: "finish", title: "Done", body: "Coffee is ready.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_fp_clean_classic",
    toolId: "tool_french_press",
    name: "French Press Clean Classic",
    colorToken: "slate",
    description: "Classic French press with longer steep.",
    coffeeDoseG: 30,
    totalWaterMl: 500,
    waterTempC: 94,
    filterLabel: "Metal mesh",
    grindLabel: "Coarse",
    estimatedTotalDurationMs: 300000,
    notes: "Break crust gently before plunge.",
    steps: [
      { stepId: "step_00_fpcc", order: 0, kind: "instruction", title: "Prep", body: "Add coarse coffee to warm press.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_fpcc", order: 1, kind: "timed_action", title: "Full pour", body: "Pour all water to 500 ml.", durationMs: 35000, waterMl: 500, targetTotalWaterMl: 500, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_fpcc", order: 2, kind: "confirm", title: "Stir and cap", body: "Stir once and place lid on top.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_03_fpcc", order: 3, kind: "timed_wait", title: "Steep", body: "Let coffee steep.", durationMs: 240000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_04_fpcc", order: 4, kind: "confirm", title: "Break crust", body: "Break crust and skim foam if desired.", requiresConfirm: true, feedbackCue: "vibrate_short" },
      { stepId: "step_05_fpcc", order: 5, kind: "timed_action", title: "Plunge", body: "Plunge slowly.", durationMs: 20000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_06_fpcc", order: 6, kind: "finish", title: "Done", body: "Serve immediately.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_fp_quick_350",
    toolId: "tool_french_press",
    name: "French Press Quick 350",
    colorToken: "indigo",
    description: "Faster French press for smaller batch brewing.",
    coffeeDoseG: 22,
    totalWaterMl: 350,
    waterTempC: 93,
    filterLabel: "Metal mesh",
    grindLabel: "Coarse",
    estimatedTotalDurationMs: 240000,
    notes: "Keep plunge even and pour out quickly.",
    steps: [
      { stepId: "step_00_fpq", order: 0, kind: "instruction", title: "Prep", body: "Add coffee to French press.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_fpq", order: 1, kind: "timed_action", title: "Full pour", body: "Pour all water to 350 ml.", durationMs: 30000, waterMl: 350, targetTotalWaterMl: 350, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_fpq", order: 2, kind: "confirm", title: "Stir and cap", body: "Stir gently and place the plunger on top.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_03_fpq", order: 3, kind: "timed_wait", title: "Steep", body: "Steep for a shorter brew.", durationMs: 180000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_04_fpq", order: 4, kind: "timed_action", title: "Plunge", body: "Plunge slowly to finish.", durationMs: 20000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_05_fpq", order: 5, kind: "finish", title: "Done", body: "Serve now.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_ap_bypass_bright",
    toolId: "tool_aeropress",
    name: "AeroPress Bypass Bright",
    colorToken: "teal",
    description: "Short AeroPress concentrate finished with bypass water for a brighter cup.",
    coffeeDoseG: 16,
    totalWaterMl: 220,
    waterTempC: 93,
    filterLabel: "Paper",
    grindLabel: "Medium-fine",
    estimatedTotalDurationMs: 125000,
    notes: "Press a short concentrate, then top up in the cup.",
    steps: [
      { stepId: "step_00_apbb", order: 0, kind: "instruction", title: "Prep", body: "Rinse paper filter and add coffee.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_apbb", order: 1, kind: "timed_action", title: "Main pour", body: "Pour to 120 ml.", durationMs: 20000, waterMl: 120, targetTotalWaterMl: 120, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_apbb", order: 2, kind: "confirm", title: "Stir", body: "Stir firmly to wet the bed evenly.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_03_apbb", order: 3, kind: "timed_wait", title: "Steep", body: "Let the concentrate steep.", durationMs: 40000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_04_apbb", order: 4, kind: "timed_action", title: "Press", body: "Press the concentrate into the cup.", durationMs: 30000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_05_apbb", order: 5, kind: "confirm", title: "Bypass", body: "Top up the cup with 100 ml hot water.", requiresConfirm: true, feedbackCue: "vibrate_short" },
      { stepId: "step_06_apbb", order: 6, kind: "finish", title: "Done", body: "Swirl and serve.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_ap_long_sweet",
    toolId: "tool_aeropress",
    name: "AeroPress Long Sweet",
    colorToken: "forest",
    description: "Longer AeroPress immersion for a rounder and sweeter cup.",
    coffeeDoseG: 18,
    totalWaterMl: 260,
    waterTempC: 91,
    filterLabel: "Paper",
    grindLabel: "Medium",
    estimatedTotalDurationMs: 155000,
    notes: "Longer steep, gentle press.",
    steps: [
      { stepId: "step_00_apls", order: 0, kind: "instruction", title: "Prep", body: "Rinse the filter and add coffee.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_apls", order: 1, kind: "timed_action", title: "Bloom", body: "Pour to 70 ml.", durationMs: 20000, waterMl: 70, targetTotalWaterMl: 70, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_apls", order: 2, kind: "timed_wait", title: "Bloom wait", body: "Let the coffee bloom.", durationMs: 25000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_03_apls", order: 3, kind: "timed_action", title: "Main pour", body: "Pour to 260 ml.", durationMs: 22000, waterMl: 190, targetTotalWaterMl: 260, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_04_apls", order: 4, kind: "timed_wait", title: "Steep", body: "Let the brew steep a little longer.", durationMs: 45000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_05_apls", order: 5, kind: "timed_action", title: "Press", body: "Press gently until you hear the hiss.", durationMs: 35000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_06_apls", order: 6, kind: "finish", title: "Done", body: "Enjoy the sweeter cup.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_v60_high_sweet",
    toolId: "tool_v60",
    name: "V60 High Sweet",
    colorToken: "coral",
    description: "Slightly higher dose V60 with a sweeter pulse structure.",
    coffeeDoseG: 20,
    totalWaterMl: 320,
    waterTempC: 94,
    filterLabel: "Paper",
    grindLabel: "Medium",
    estimatedTotalDurationMs: 205000,
    notes: "Keep the center pour tall and steady.",
    steps: [
      { stepId: "step_00_v60hs", order: 0, kind: "instruction", title: "Prep", body: "Rinse the filter and settle the coffee bed.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_v60hs", order: 1, kind: "timed_action", title: "Bloom", body: "Pour to 60 ml.", durationMs: 18000, waterMl: 60, targetTotalWaterMl: 60, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_v60hs", order: 2, kind: "timed_wait", title: "Bloom wait", body: "Let the coffee bloom fully.", durationMs: 30000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_03_v60hs", order: 3, kind: "timed_action", title: "Main pour 1", body: "Pour to 190 ml.", durationMs: 35000, waterMl: 130, targetTotalWaterMl: 190, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_04_v60hs", order: 4, kind: "timed_action", title: "Main pour 2", body: "Pour to 320 ml.", durationMs: 35000, waterMl: 130, targetTotalWaterMl: 320, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_05_v60hs", order: 5, kind: "timed_wait", title: "Drawdown", body: "Let the bed draw down cleanly.", durationMs: 70000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_06_v60hs", order: 6, kind: "finish", title: "Done", body: "Serve the sweeter V60.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_v60_low_agitation",
    toolId: "tool_v60",
    name: "V60 Low Agitation",
    colorToken: "amber",
    description: "Gentler V60 pour pattern for a cleaner, tea-like cup.",
    coffeeDoseG: 17,
    totalWaterMl: 280,
    waterTempC: 92,
    filterLabel: "Paper",
    grindLabel: "Medium-coarse",
    estimatedTotalDurationMs: 185000,
    notes: "Keep the kettle low and the bed calm.",
    steps: [
      { stepId: "step_00_v60la", order: 0, kind: "instruction", title: "Prep", body: "Rinse filter and level the bed.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_v60la", order: 1, kind: "timed_action", title: "Bloom", body: "Pour to 50 ml.", durationMs: 18000, waterMl: 50, targetTotalWaterMl: 50, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_v60la", order: 2, kind: "timed_wait", title: "Bloom wait", body: "Wait for bloom.", durationMs: 28000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_03_v60la", order: 3, kind: "timed_action", title: "Main pour 1", body: "Pour to 150 ml.", durationMs: 30000, waterMl: 100, targetTotalWaterMl: 150, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_04_v60la", order: 4, kind: "timed_action", title: "Main pour 2", body: "Pour to 220 ml.", durationMs: 25000, waterMl: 70, targetTotalWaterMl: 220, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_05_v60la", order: 5, kind: "timed_action", title: "Final pour", body: "Pour to 280 ml.", durationMs: 22000, waterMl: 60, targetTotalWaterMl: 280, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_06_v60la", order: 6, kind: "timed_wait", title: "Drawdown", body: "Wait for the final drawdown.", durationMs: 62000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_07_v60la", order: 7, kind: "finish", title: "Done", body: "Clean cup ready.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_v60_evening_balance",
    toolId: "tool_v60",
    name: "V60 Evening Balance",
    colorToken: "indigo",
    description: "Rounder V60 profile with slightly longer drawdown.",
    coffeeDoseG: 19,
    totalWaterMl: 310,
    waterTempC: 93,
    filterLabel: "Paper",
    grindLabel: "Medium-fine",
    estimatedTotalDurationMs: 210000,
    notes: "Let the final pour linger slightly.",
    steps: [
      { stepId: "step_00_v60eb", order: 0, kind: "instruction", title: "Prep", body: "Rinse filter, warm server, and add coffee.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_v60eb", order: 1, kind: "timed_action", title: "Bloom", body: "Pour to 55 ml.", durationMs: 18000, waterMl: 55, targetTotalWaterMl: 55, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_v60eb", order: 2, kind: "timed_wait", title: "Bloom wait", body: "Wait for the bloom to settle.", durationMs: 30000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_03_v60eb", order: 3, kind: "timed_action", title: "Main pour 1", body: "Pour to 170 ml.", durationMs: 32000, waterMl: 115, targetTotalWaterMl: 170, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_04_v60eb", order: 4, kind: "timed_action", title: "Main pour 2", body: "Pour to 250 ml.", durationMs: 28000, waterMl: 80, targetTotalWaterMl: 250, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_05_v60eb", order: 5, kind: "timed_action", title: "Final pour", body: "Pour to 310 ml.", durationMs: 22000, waterMl: 60, targetTotalWaterMl: 310, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_06_v60eb", order: 6, kind: "timed_wait", title: "Drawdown", body: "Let the drawdown finish fully.", durationMs: 80000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_07_v60eb", order: 7, kind: "finish", title: "Done", body: "Serve and slow down.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_kalita_evening_round",
    toolId: "tool_kalita_wave",
    name: "Kalita Evening Round",
    colorToken: "slate",
    description: "Softer Kalita pulse brew for a rounder evening cup.",
    coffeeDoseG: 19,
    totalWaterMl: 320,
    waterTempC: 94,
    filterLabel: "Wave",
    grindLabel: "Medium",
    estimatedTotalDurationMs: 220000,
    notes: "Keep the pulses smooth and even.",
    steps: [
      { stepId: "step_00_ker", order: 0, kind: "instruction", title: "Prep", body: "Rinse filter and flatten the bed.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_ker", order: 1, kind: "timed_action", title: "Bloom", body: "Pour to 55 ml.", durationMs: 20000, waterMl: 55, targetTotalWaterMl: 55, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_ker", order: 2, kind: "timed_wait", title: "Bloom wait", body: "Let the coffee bloom.", durationMs: 30000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_03_ker", order: 3, kind: "timed_action", title: "Pulse 1", body: "Pour to 160 ml.", durationMs: 26000, waterMl: 105, targetTotalWaterMl: 160, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_04_ker", order: 4, kind: "timed_action", title: "Pulse 2", body: "Pour to 240 ml.", durationMs: 24000, waterMl: 80, targetTotalWaterMl: 240, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_05_ker", order: 5, kind: "timed_action", title: "Pulse 3", body: "Pour to 320 ml.", durationMs: 24000, waterMl: 80, targetTotalWaterMl: 320, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_06_ker", order: 6, kind: "timed_wait", title: "Drawdown", body: "Let the last drawdown settle.", durationMs: 76000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_07_ker", order: 7, kind: "finish", title: "Done", body: "Rounded cup ready.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_chemex_clear_600",
    toolId: "tool_chemex",
    name: "Chemex Clear 600",
    colorToken: "forest",
    description: "Clearer six-cup Chemex with gentle high pours.",
    coffeeDoseG: 36,
    totalWaterMl: 600,
    waterTempC: 95,
    filterLabel: "Chemex paper",
    grindLabel: "Medium-coarse",
    estimatedTotalDurationMs: 300000,
    notes: "Favor clarity over body with patient pours.",
    steps: [
      { stepId: "step_00_cc600", order: 0, kind: "instruction", title: "Prep", body: "Rinse the thick filter very well and add coffee.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_cc600", order: 1, kind: "timed_action", title: "Bloom", body: "Pour to 80 ml.", durationMs: 22000, waterMl: 80, targetTotalWaterMl: 80, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_cc600", order: 2, kind: "timed_wait", title: "Bloom wait", body: "Let the bloom settle.", durationMs: 40000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_03_cc600", order: 3, kind: "timed_action", title: "Main pour 1", body: "Pour to 300 ml.", durationMs: 50000, waterMl: 220, targetTotalWaterMl: 300, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_04_cc600", order: 4, kind: "timed_action", title: "Main pour 2", body: "Pour to 470 ml.", durationMs: 42000, waterMl: 170, targetTotalWaterMl: 470, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_05_cc600", order: 5, kind: "timed_action", title: "Final pour", body: "Pour to 600 ml.", durationMs: 32000, waterMl: 130, targetTotalWaterMl: 600, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_06_cc600", order: 6, kind: "timed_wait", title: "Drawdown", body: "Wait for the full drawdown.", durationMs: 94000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_07_cc600", order: 7, kind: "finish", title: "Done", body: "Serve the clear Chemex.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_chemex_weekend_700",
    toolId: "tool_chemex",
    name: "Chemex Weekend 700",
    colorToken: "amber",
    description: "Larger Chemex batch for slow weekend brews.",
    coffeeDoseG: 42,
    totalWaterMl: 700,
    waterTempC: 95,
    filterLabel: "Chemex paper",
    grindLabel: "Medium-coarse",
    estimatedTotalDurationMs: 335000,
    notes: "Large batch, relaxed pacing.",
    steps: [
      { stepId: "step_00_cw700", order: 0, kind: "instruction", title: "Prep", body: "Rinse filter and preheat the brewer.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_cw700", order: 1, kind: "timed_action", title: "Bloom", body: "Pour to 90 ml.", durationMs: 24000, waterMl: 90, targetTotalWaterMl: 90, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_cw700", order: 2, kind: "timed_wait", title: "Bloom wait", body: "Wait for a full bloom.", durationMs: 40000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_03_cw700", order: 3, kind: "timed_action", title: "Main pour 1", body: "Pour to 330 ml.", durationMs: 52000, waterMl: 240, targetTotalWaterMl: 330, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_04_cw700", order: 4, kind: "timed_action", title: "Main pour 2", body: "Pour to 540 ml.", durationMs: 46000, waterMl: 210, targetTotalWaterMl: 540, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_05_cw700", order: 5, kind: "timed_action", title: "Final pour", body: "Pour to 700 ml.", durationMs: 36000, waterMl: 160, targetTotalWaterMl: 700, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_06_cw700", order: 6, kind: "timed_wait", title: "Drawdown", body: "Wait for the final drawdown.", durationMs: 110000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_07_cw700", order: 7, kind: "finish", title: "Done", body: "Weekend batch ready.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_clever_bright_release",
    toolId: "tool_clever_dripper",
    name: "Clever Bright Release",
    colorToken: "teal",
    description: "Shorter immersion Clever recipe with a brighter release.",
    coffeeDoseG: 17,
    totalWaterMl: 270,
    waterTempC: 92,
    filterLabel: "Paper",
    grindLabel: "Medium",
    estimatedTotalDurationMs: 175000,
    notes: "Shorter steep and quicker drawdown.",
    steps: [
      { stepId: "step_00_cbr", order: 0, kind: "instruction", title: "Prep", body: "Insert filter, rinse, and add coffee.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_cbr", order: 1, kind: "timed_action", title: "Full pour", body: "Pour all water to 270 ml.", durationMs: 28000, waterMl: 270, targetTotalWaterMl: 270, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_cbr", order: 2, kind: "confirm", title: "Stir", body: "Give the brew a quick stir.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_03_cbr", order: 3, kind: "timed_wait", title: "Steep", body: "Steep briefly for clarity.", durationMs: 100000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_04_cbr", order: 4, kind: "confirm", title: "Place on cup", body: "Set brewer on the cup to release.", requiresConfirm: true, feedbackCue: "vibrate_short" },
      { stepId: "step_05_cbr", order: 5, kind: "timed_wait", title: "Drawdown", body: "Let the brew finish drawing down.", durationMs: 25000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_06_cbr", order: 6, kind: "finish", title: "Done", body: "Bright cup ready.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_fp_gentle_450",
    toolId: "tool_french_press",
    name: "French Press Gentle 450",
    colorToken: "teal",
    description: "Smaller French press with a gentler steep and quick service.",
    coffeeDoseG: 26,
    totalWaterMl: 450,
    waterTempC: 93,
    filterLabel: "Metal mesh",
    grindLabel: "Coarse",
    estimatedTotalDurationMs: 250000,
    notes: "Serve quickly after the plunge.",
    steps: [
      { stepId: "step_00_fpg450", order: 0, kind: "instruction", title: "Prep", body: "Add coarse coffee to the warm press.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_fpg450", order: 1, kind: "timed_action", title: "Full pour", body: "Pour all water to 450 ml.", durationMs: 32000, waterMl: 450, targetTotalWaterMl: 450, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_fpg450", order: 2, kind: "confirm", title: "Stir and cap", body: "Stir gently and rest the lid on top.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_03_fpg450", order: 3, kind: "timed_wait", title: "Steep", body: "Steep for a balanced cup.", durationMs: 190000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_04_fpg450", order: 4, kind: "timed_action", title: "Plunge", body: "Plunge slowly and evenly.", durationMs: 20000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_05_fpg450", order: 5, kind: "finish", title: "Done", body: "Pour out and enjoy.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_fp_rich_700",
    toolId: "tool_french_press",
    name: "French Press Rich 700",
    colorToken: "coral",
    description: "Larger rich French press batch for fuller body.",
    coffeeDoseG: 40,
    totalWaterMl: 700,
    waterTempC: 94,
    filterLabel: "Metal mesh",
    grindLabel: "Coarse",
    estimatedTotalDurationMs: 320000,
    notes: "Skim the top before plunging if you want a cleaner cup.",
    steps: [
      { stepId: "step_00_fpr700", order: 0, kind: "instruction", title: "Prep", body: "Add coffee to the large press.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_fpr700", order: 1, kind: "timed_action", title: "Full pour", body: "Pour all water to 700 ml.", durationMs: 40000, waterMl: 700, targetTotalWaterMl: 700, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_fpr700", order: 2, kind: "confirm", title: "Stir and cap", body: "Stir once and place the plunger on top.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_03_fpr700", order: 3, kind: "timed_wait", title: "Steep", body: "Steep for a fuller body.", durationMs: 250000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_04_fpr700", order: 4, kind: "confirm", title: "Break crust", body: "Break the crust before plunging.", requiresConfirm: true, feedbackCue: "vibrate_short" },
      { stepId: "step_05_fpr700", order: 5, kind: "timed_action", title: "Plunge", body: "Plunge steadily to finish.", durationMs: 20000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_06_fpr700", order: 6, kind: "finish", title: "Done", body: "Serve the rich batch.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  }),
  buildSeedRecipeRecord({
    recipeId: "seed_fp_rested_classic",
    toolId: "tool_french_press",
    name: "French Press Rested Classic",
    colorToken: "forest",
    description: "Classic French press with a short rest before serving.",
    coffeeDoseG: 32,
    totalWaterMl: 550,
    waterTempC: 93,
    filterLabel: "Metal mesh",
    grindLabel: "Coarse",
    estimatedTotalDurationMs: 305000,
    notes: "Let the brew rest briefly after breaking the crust.",
    steps: [
      { stepId: "step_00_fprc", order: 0, kind: "instruction", title: "Prep", body: "Add coffee to the preheated press.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_01_fprc", order: 1, kind: "timed_action", title: "Full pour", body: "Pour all water to 550 ml.", durationMs: 36000, waterMl: 550, targetTotalWaterMl: 550, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_02_fprc", order: 2, kind: "confirm", title: "Stir and cap", body: "Give the press one stir and place the lid on top.", requiresConfirm: true, feedbackCue: "none" },
      { stepId: "step_03_fprc", order: 3, kind: "timed_wait", title: "Steep", body: "Steep the brew.", durationMs: 230000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_04_fprc", order: 4, kind: "confirm", title: "Break crust", body: "Break the crust and skim if needed.", requiresConfirm: true, feedbackCue: "vibrate_short" },
      { stepId: "step_05_fprc", order: 5, kind: "timed_wait", title: "Rest", body: "Let the brew settle briefly.", durationMs: 20000, requiresConfirm: false, feedbackCue: "vibrate_short" },
      { stepId: "step_06_fprc", order: 6, kind: "timed_action", title: "Plunge", body: "Plunge slowly to finish.", durationMs: 18000, requiresConfirm: false, feedbackCue: "vibrate_long" },
      { stepId: "step_07_fprc", order: 7, kind: "finish", title: "Done", body: "Serve the settled cup.", requiresConfirm: false, feedbackCue: "combo_short" }
    ]
  })
];

const SEED_RECIPE_RECORDS_BY_ID = Object.fromEntries(
  SEED_RECIPE_LIBRARY.map((recipeRecord) => [recipeRecord.recipeId, recipeRecord])
);

export function getSeedRecipeRecords(seedTimestamp = 0) {
  return SEED_RECIPE_LIBRARY.map((recipeRecord) =>
    cloneRecipeRecord(recipeRecord, {
      createdAt: seedTimestamp,
      updatedAt: seedTimestamp
    })
  );
}

export function getSeedRecipeRecordById(recipeId, seedTimestamp = 0) {
  const recipeRecord = SEED_RECIPE_RECORDS_BY_ID[recipeId];

  if (!recipeRecord) {
    return null;
  }

  return cloneRecipeRecord(recipeRecord, {
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp
  });
}

export function getSeedRecipeRecordsForVersion(version, seedTimestamp = 0) {
  const recipeIds = SEED_RECIPE_IDS_BY_VERSION[version];

  if (!recipeIds) {
    return [];
  }

  return recipeIds
    .map((recipeId) => getSeedRecipeRecordById(recipeId, seedTimestamp))
    .filter(Boolean);
}

export function getSeedRecipeRecordsAddedAfterVersion(version, seedTimestamp = 0) {
  return Object.keys(SEED_RECIPE_IDS_BY_VERSION)
    .map((entryVersion) => Number(entryVersion))
    .filter((entryVersion) => entryVersion > version)
    .sort((left, right) => left - right)
    .flatMap((entryVersion) => getSeedRecipeRecordsForVersion(entryVersion, seedTimestamp));
}
