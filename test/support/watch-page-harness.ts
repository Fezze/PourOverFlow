import { vi } from "vitest";

import { getSupportedTools } from "../../zepp-app/shared/constants/tool-catalog.js";
import { getSeedRecipeRecordById, getSeedRecipeRecords } from "../../zepp-app/shared/domain/seed-library.js";
import { CURRENT_SCHEMA_VERSION, createRecipeSnapshot, createRecipeSummary } from "../../zepp-app/shared/domain/schema.js";

export type PreviewPage = "home" | "tool-list" | "recipe-list" | "recipe-detail" | "brew-active" | "result-summary";

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
    BACKGROUND: {
      x: 0,
      y: 0,
      w: 480,
      h: 480
    },
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

export function createSquareLayoutMock(page: PreviewPage) {
  const baseLayout = {
    BACKGROUND: {
      x: 0,
      y: 0,
      w: 480,
      h: 480
    },
    TITLE_TEXT: {
      x: 28,
      y: 30,
      w: 424,
      h: 34,
      text_size: 28
    },
    SUBTITLE_TEXT: {
      x: 28,
      y: 66,
      w: 424,
      h: 30,
      text_size: 16
    },
    BODY_TEXT: {
      x: 28,
      y: 102,
      w: 424,
      h: 74,
      text_size: 18
    },
    FOOTER_TEXT: {
      x: 28,
      y: 424,
      w: 424,
      h: 38,
      text_size: 14
    }
  };

  if (page === "home") {
    return {
      ...baseLayout,
      ACTION_DOCK: {
        x: 28,
        y: 286,
        w: 424,
        h: 60,
        radius: 30
      },
      BUTTONS: [
        { x: 28, y: 286, w: 424, h: 60, radius: 30 },
        { x: 28, y: 238, w: 206, h: 40, radius: 20 },
        { x: 246, y: 238, w: 206, h: 40, radius: 20 }
      ]
    };
  }

  if (page === "tool-list") {
    return {
      ...baseLayout,
      TITLE_TEXT: {
        ...baseLayout.TITLE_TEXT,
        align_h: "CENTER_H"
      },
      SUBTITLE_TEXT: {
        ...baseLayout.SUBTITLE_TEXT,
        align_h: "CENTER_H"
      },
      LIST_FRAME: {
        x: 18,
        y: 112,
        w: 344,
        h: 228,
        itemHeight: 92,
        itemSpace: 10,
        itemRadius: 20,
        titleHeight: 40,
        metaHeight: 24
      },
      PRIMARY_BUTTON: {
        x: 28,
        y: 214,
        w: 424,
        h: 44,
        radius: 18,
        text_size: 18
      }
    };
  }

  if (page === "recipe-list") {
    return {
      ...baseLayout,
      LIST_PANEL: {
        x: 28,
        y: 108,
        w: 424,
        h: 228,
        radius: 24
      },
      LIST_FRAME: {
        x: 36,
        y: 116,
        w: 408,
        h: 212,
        itemHeight: 96,
        itemSpace: 8,
        itemRadius: 18,
        titleHeight: 38,
        metaHeight: 24
      },
      EMPTY_BUTTON: {
        x: 28,
        y: 214,
        w: 424,
        h: 44,
        radius: 18,
        text_size: 18
      }
    };
  }

  if (page === "recipe-detail") {
    return {
      ...baseLayout,
      DETAIL_PANEL: {
        x: 24,
        y: 100,
        w: 336,
        h: 176,
        radius: 24
      },
      BODY_TEXT: {
        ...baseLayout.BODY_TEXT,
        y: 116,
        h: 144
      },
      FOOTER_TEXT: {
        ...baseLayout.FOOTER_TEXT,
        y: 262,
        h: 28
      },
      ACTION_DOCK: {
        x: 28,
        y: 302,
        w: 424,
        h: 60,
        radius: 30
      },
      BUTTONS: [
        { x: 28, y: 302, w: 424, h: 60, radius: 30 }
      ]
    };
  }

  if (page === "brew-active") {
    return {
      ...baseLayout,
      ACTION_DOCK: {
        x: 36,
        y: 304,
        w: 408,
        h: 76,
        radius: 38,
        color: 0x202833
      },
      BUTTONS: [
        { x: 243, y: 311, w: 182, h: 62, radius: 31, text_size: 24 },
        { x: 55, y: 311, w: 182, h: 62, radius: 31, text_size: 24 }
      ]
    };
  }

  return {
    ...baseLayout,
    TITLE_TEXT: {
      ...baseLayout.TITLE_TEXT,
      align_h: "CENTER_H"
    },
    SUBTITLE_TEXT: {
      ...baseLayout.SUBTITLE_TEXT,
      align_h: "CENTER_H"
    },
    ACTION_DOCK: {
      x: 28,
      y: 300,
      w: 424,
      h: 60,
      radius: 30
    },
    BUTTONS: [
      { x: 28, y: 300, w: 424, h: 60, radius: 30, text_size: 20 },
      { x: 28, y: 252, w: 206, h: 40, radius: 20 },
      { x: 246, y: 252, w: 206, h: 40, radius: 20 }
    ]
  };
}

export function createCompactRoundLayoutMock(page: PreviewPage) {
  const baseLayout = {
    BACKGROUND: {
      x: 0,
      y: 0,
      w: 416,
      h: 416
    },
    TITLE_TEXT: {
      x: 68,
      y: 56,
      w: 280,
      h: 38,
      text_size: 24,
      align_h: "CENTER_H"
    },
    SUBTITLE_TEXT: {
      x: 68,
      y: 88,
      w: 280,
      h: 34,
      text_size: 14,
      align_h: "CENTER_H"
    },
    BODY_TEXT: {
      x: 68,
      y: 126,
      w: 280,
      h: 74,
      text_size: 16
    },
    FOOTER_TEXT: {
      x: 68,
      y: 328,
      w: 280,
      h: 26,
      text_size: 13
    }
  };

  if (page === "home") {
    return {
      ...baseLayout,
      ACTION_DOCK: {
        x: 68,
        y: 350,
        w: 280,
        h: 60,
        radius: 30
      },
      BUTTONS: [
        { x: 68, y: 350, w: 280, h: 60, radius: 30 },
        { x: 68, y: 300, w: 135, h: 38, radius: 19 },
        { x: 213, y: 300, w: 135, h: 38, radius: 19 }
      ]
    };
  }

  if (page === "recipe-detail") {
    return {
      ...baseLayout,
      DETAIL_PANEL: {
        x: 62,
        y: 104,
        w: 292,
        h: 236,
        radius: 24
      },
      BODY_TEXT: {
        ...baseLayout.BODY_TEXT,
        y: 120,
        h: 204
      },
      FOOTER_TEXT: {
        ...baseLayout.FOOTER_TEXT,
        y: 314
      },
      ACTION_DOCK: {
        x: 68,
        y: 370,
        w: 280,
        h: 60,
        radius: 30
      },
      BUTTONS: [
        { x: 68, y: 370, w: 280, h: 60, radius: 30 }
      ]
    };
  }

  if (page === "brew-active") {
    return {
      ...baseLayout,
      ACTION_DOCK: {
        x: 76,
        y: 372,
        w: 264,
        h: 78,
        radius: 39,
        color: 0x202833
      },
      BUTTONS: [
        { x: 211, y: 379, w: 118, h: 64, radius: 32, text_size: 26 },
        { x: 87, y: 379, w: 118, h: 64, radius: 32, text_size: 26 }
      ]
    };
  }

  if (page === "result-summary") {
    return {
      ...baseLayout,
      TITLE_TEXT: {
        ...baseLayout.TITLE_TEXT,
        x: 56,
        y: 62,
        w: 304
      },
      SUBTITLE_TEXT: {
        ...baseLayout.SUBTITLE_TEXT,
        x: 62,
        y: 98,
        w: 292
      },
      ACTION_DOCK: {
        x: 68,
        y: 370,
        w: 280,
        h: 60,
        radius: 30
      },
      BUTTONS: [
        { x: 68, y: 370, w: 280, h: 60, radius: 30, text_size: 20 },
        { x: 68, y: 312, w: 135, h: 38, radius: 19 },
        { x: 213, y: 312, w: 135, h: 38, radius: 19 }
      ]
    };
  }

  return createLayoutMock();
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