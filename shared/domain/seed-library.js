import {
  CURRENT_SCHEMA_VERSION,
  cloneRecipeRecord,
  normalizeRecipeSteps
} from "./schema.js";

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
  })
];

export function getSeedRecipeRecords(seedTimestamp = 0) {
  return SEED_RECIPE_LIBRARY.map((recipeRecord) =>
    cloneRecipeRecord(recipeRecord, {
      createdAt: seedTimestamp,
      updatedAt: seedTimestamp
    })
  );
}

export function getSeedRecipeRecordById(recipeId, seedTimestamp = 0) {
  const recipeRecord = SEED_RECIPE_LIBRARY.find((item) => item.recipeId === recipeId);

  if (!recipeRecord) {
    return null;
  }

  return cloneRecipeRecord(recipeRecord, {
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp
  });
}
