import { DEFAULT_LOCALE, resolveSupportedLocale } from "../i18n/index.js";
import { cloneRecipeRecord } from "./schema.js";
import {
  SEED_LIBRARY_VERSION,
  getSeedRecipeRecordById as getEnglishSeedRecipeRecordById,
  getSeedRecipeRecords as getEnglishSeedRecipeRecords,
  getSeedRecipeRecordsAddedAfterVersion as getEnglishSeedRecipeRecordsAddedAfterVersion,
  getSeedRecipeRecordsForVersion as getEnglishSeedRecipeRecordsForVersion
} from "./seed-library/en-US.js";
import plPLSeedOverrides from "./seed-library/pl-PL.js";

const SEED_LOCALE_OVERRIDES = {
  "pl-PL": plPLSeedOverrides
};

function applyStepOverrides(recipeSteps, localizedRecipe = {}) {
  return recipeSteps.map((step, index) => {
    const stepOverride = Array.isArray(localizedRecipe.steps) ? localizedRecipe.steps[index] : null;

    if (!stepOverride) {
      return { ...step };
    }

    return {
      ...step,
      title: stepOverride.title || step.title,
      body: stepOverride.body || step.body
    };
  });
}

function localizeSeedRecipeRecord(recipeRecord, preferredLocale = DEFAULT_LOCALE) {
  const resolvedLocale = resolveSupportedLocale(preferredLocale, DEFAULT_LOCALE);
  const localeOverrides = SEED_LOCALE_OVERRIDES[resolvedLocale];

  if (!localeOverrides) {
    return cloneRecipeRecord(recipeRecord);
  }

  const localizedRecipe = localeOverrides[recipeRecord.recipeId];

  if (!localizedRecipe) {
    return cloneRecipeRecord(recipeRecord);
  }

  return cloneRecipeRecord(recipeRecord, {
    name: localizedRecipe.name || recipeRecord.name,
    description: localizedRecipe.description || recipeRecord.description,
    filterLabel: localizedRecipe.filterLabel || recipeRecord.filterLabel,
    grindLabel: localizedRecipe.grindLabel || recipeRecord.grindLabel,
    notes: localizedRecipe.notes || recipeRecord.notes,
    steps: applyStepOverrides(recipeRecord.steps || [], localizedRecipe)
  });
}

export { SEED_LIBRARY_VERSION };

export function getSeedRecipeRecordById(recipeId, seedTimestamp = 0, preferredLocale = DEFAULT_LOCALE) {
  const englishSeedRecipe = getEnglishSeedRecipeRecordById(recipeId, seedTimestamp);

  if (!englishSeedRecipe) {
    return null;
  }

  return localizeSeedRecipeRecord(englishSeedRecipe, preferredLocale);
}

export function getSeedRecipeRecords(seedTimestamp = 0, preferredLocale = DEFAULT_LOCALE) {
  return getEnglishSeedRecipeRecords(seedTimestamp).map((recipeRecord) =>
    localizeSeedRecipeRecord(recipeRecord, preferredLocale)
  );
}

export function getSeedRecipeRecordsForVersion(version, seedTimestamp = 0, preferredLocale = DEFAULT_LOCALE) {
  return getEnglishSeedRecipeRecordsForVersion(version, seedTimestamp).map((recipeRecord) =>
    localizeSeedRecipeRecord(recipeRecord, preferredLocale)
  );
}

export function getSeedRecipeRecordsAddedAfterVersion(version, seedTimestamp = 0, preferredLocale = DEFAULT_LOCALE) {
  return getEnglishSeedRecipeRecordsAddedAfterVersion(version, seedTimestamp).map((recipeRecord) =>
    localizeSeedRecipeRecord(recipeRecord, preferredLocale)
  );
}
