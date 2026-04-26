import { vi } from "vitest";

import { getSupportedTools } from "../../zepp-app/shared/constants/tool-catalog.js";
import { getSeedRecipeRecordById, getSeedRecipeRecords } from "../../zepp-app/shared/domain/seed-library.js";
import { CURRENT_SCHEMA_VERSION, createRecipeSnapshot, createRecipeSummary } from "../../zepp-app/shared/domain/schema.js";

export function createCatalogFixture() {
  const primaryRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1_000);
  const secondaryRecord = getSeedRecipeRecordById("seed_ap_inverted_sweet", 1_100);
  const primarySummary = createRecipeSummary(primaryRecord);
  const secondarySummary = createRecipeSummary(secondaryRecord);
  const primarySnapshot = createRecipeSnapshot(primaryRecord);
  const secondarySnapshot = createRecipeSnapshot(secondaryRecord);

  return {
    primaryRecord,
    primarySummary,
    secondarySummary,
    primarySnapshot,
    secondarySnapshot,
    catalogCache: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      toolCatalogRevision: 3,
      recipeCatalogRevision: 7,
      tools: getSupportedTools(),
      recipesByTool: {
        tool_aeropress: [primarySummary, secondarySummary],
        tool_v60: [],
        tool_kalita_wave: [],
        tool_chemex: [],
        tool_clever_dripper: [],
        tool_french_press: []
      },
      recipeSnapshotsById: {
        [primarySnapshot.recipeId]: primarySnapshot,
        [secondarySnapshot.recipeId]: secondarySnapshot
      },
      cachedAt: 2_000
    },
    lastResult: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      historyId: "hist_1",
      toolId: "tool_aeropress",
      recipeName: primaryRecord.name,
      colorToken: primaryRecord.colorToken,
      status: "completed",
      endedAt: 3_000,
      elapsedMs: 120_000,
      totalDeltaMs: -1_500
    }
  };
}

export function createExpandedCatalogFixture() {
  const seedRecords = getSeedRecipeRecords(4_000);
  const recipeSummaries = seedRecords.map((recipeRecord) => createRecipeSummary(recipeRecord));
  const recipeSnapshotsById = Object.fromEntries(
    seedRecords.map((recipeRecord) => [recipeRecord.recipeId, createRecipeSnapshot(recipeRecord)])
  );
  const recipesByTool = getSupportedTools().reduce((accumulator, tool) => {
    accumulator[tool.toolId] = recipeSummaries.filter((recipeSummary) => recipeSummary.toolId === tool.toolId);
    return accumulator;
  }, {} as Record<string, ReturnType<typeof createRecipeSummary>[]>);

  return {
    catalogCache: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      toolCatalogRevision: 5,
      recipeCatalogRevision: 11,
      tools: getSupportedTools(),
      recipesByTool,
      recipeSnapshotsById,
      cachedAt: 5_000
    }
  };
}

export function createLayoutMock(overrides = {}) {
  return {
    BACKGROUND: {},
    TITLE_TEXT: {
      x: 48,
      y: 68,
      w: 384,
      h: 38,
      text_size: 26
    },
    SUBTITLE_TEXT: {
      x: 56,
      y: 106,
      w: 368,
      h: 34,
      text_size: 15
    },
    BODY_TEXT: {
      x: 64,
      y: 134,
      w: 352,
      h: 74,
      text_size: 17
    },
    FOOTER_TEXT: {
      x: 64,
      y: 398,
      w: 352,
      h: 38,
      text_size: 14
    },
    ACTION_DOCK: {},
    LIST_PANEL: {},
    DETAIL_PANEL: {
      x: 56,
      y: 110,
      w: 368,
      h: 246,
      radius: 24
    },
    STATUS_PANEL: {},
    STATUS_TEXT: {},
    ACTION_LEFT_BG: {},
    ACTION_RIGHT_BG: {},
    ACTION_TOP_MASK: {},
    ACTION_DIVIDER: {},
    LIST_FRAME: {
      x: 0,
      y: 0,
      w: 320,
      h: 220,
      itemHeight: 96,
      itemSpace: 8,
      itemRadius: 16,
      titleHeight: 40,
      metaHeight: 24
    },
    EMPTY_BUTTON: {
      x: 64,
      y: 382,
      w: 352,
      h: 64
    },
    PRIMARY_BUTTON: {
      x: 64,
      y: 382,
      w: 352,
      h: 64
    },
    HOME_BUTTON: {
      x: 64,
      y: 382,
      w: 352,
      h: 64
    },
    BUTTONS: [
      { x: 64, y: 382, w: 352, h: 64 },
      { x: 64, y: 324, w: 170, h: 40 },
      { x: 246, y: 324, w: 170, h: 40 }
    ],
    ...overrides
  };
}

export async function loadPageHarness(modulePath: string, layoutMock: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock("zosLoader:./index.[pf].layout.js", () => layoutMock);

  const runtime = await import("../zeus-runtime/runtime.ts");
  runtime.resetZeppRuntime();
  const resolvedModulePath = new URL(modulePath, new URL("../", import.meta.url)).href;
  await import(resolvedModulePath);
  const pageDefinition = runtime.getLastPageDefinition();

  return {
    runtime,
    pageDefinition
  };
}

export function buildPage(pageDefinition: Record<string, unknown>) {
  const pageInstance: Record<string, unknown> = {
    ...pageDefinition
  };
  (pageDefinition.build as () => void).call(pageInstance);
  return pageInstance;
}