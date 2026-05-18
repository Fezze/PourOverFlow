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

  if (page === "recipe-list") {
    return {
      ...baseLayout,
      LIST_PANEL: {
        x: 56,
        y: 118,
        w: 304,
        h: 228,
        radius: 22
      },
      LIST_FRAME: {
        x: 64,
        y: 126,
        w: 288,
        h: 212,
        itemHeight: 92,
        itemSpace: 8,
        itemRadius: 18,
        titleHeight: 36,
        metaHeight: 22
      },
      EMPTY_BUTTON: {
        x: 68,
        y: 358,
        w: 280,
        h: 46,
        radius: 23,
        text_size: 18
      }
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

export function createPreviewLayoutMock(
  page: PreviewPage,
  device: { shape: "round" | "square"; width: number; height: number }
) {
  if (device.shape === "square") {
    return createPreviewSquareLayoutMock(page, device.width, device.height);
  }

  return createPreviewRoundLayoutMock(page, device.width, device.height, device.width < 480 || device.height < 480);
}

function createPreviewRoundLayoutMock(page: PreviewPage, width: number, height: number, compact: boolean) {
  const layout = createPreviewScaffoldLayout({
    shape: "round",
    width,
    height,
    compact
  });
  const metric = (regularValue: number, compactValue: number) => compact ? compactValue : regularValue;
  const splitGap = metric(12, 10);
  const splitWidth = Math.floor((layout.buttonW - splitGap) / 2);

  if (page === "home") {
    const secondaryButton = createPreviewButtonStyle(layout, {
      theme: "secondary",
      y: metric(308, 300),
      w: splitWidth,
      h: metric(40, 38),
      radius: metric(20, 19),
      text_size: metric(18, 17)
    });
    const accentButton = createPreviewButtonStyle(layout, {
      theme: "accent",
      x: layout.buttonX + splitWidth + splitGap,
      y: metric(308, 300),
      w: splitWidth,
      h: metric(40, 38),
      radius: metric(20, 19),
      text_size: metric(18, 17)
    });
    const primaryButton = createPreviewButtonStyle(layout, {
      theme: "primary",
      y: metric(362, 350),
      h: metric(64, 60),
      radius: metric(32, 30),
      text_size: metric(21, 20)
    });

    return {
      ...layout.exports,
      ACTION_DOCK: createPreviewDockStyle(primaryButton),
      BUTTONS: [primaryButton, secondaryButton, accentButton]
    };
  }

  if (page === "tool-list") {
    const title = {
      ...layout.title,
      x: layout.buttonX - metric(16, 12),
      y: metric(66, 60),
      w: layout.buttonW + metric(32, 24),
      text_size: metric(26, 24),
      align_h: "CENTER_H"
    };
    const subtitle = {
      ...layout.subtitle,
      x: layout.buttonX - metric(8, 6),
      y: metric(106, 98),
      w: layout.buttonW + metric(16, 12),
      align_h: "CENTER_H"
    };
    const primaryButton = createPreviewButtonStyle(layout, {
      theme: "secondary",
      y: metric(388, 378),
      h: metric(40, 38),
      radius: metric(20, 19)
    });

    return {
      BACKGROUND: layout.background,
      TITLE_TEXT: title,
      SUBTITLE_TEXT: subtitle,
      LIST_FRAME: {
        x: layout.buttonX - metric(16, 12),
        y: metric(112, 108),
        w: layout.buttonW + metric(32, 24),
        h: metric(332, 320),
        itemHeight: metric(92, 88),
        itemSpace: metric(12, 10),
        itemRadius: metric(24, 22),
        titleHeight: metric(48, 44),
        metaHeight: metric(28, 26)
      },
      PRIMARY_BUTTON: primaryButton
    };
  }

  if (page === "recipe-list") {
    const listPanel = createPreviewPanelStyle(layout, {
      x: layout.buttonX - metric(6, 4),
      y: metric(114, 108),
      w: layout.buttonW + metric(12, 8),
      h: metric(270, 260)
    });
    const emptyButton = createPreviewButtonStyle(layout, {
      theme: "secondary",
      y: metric(388, 378),
      h: metric(40, 38),
      radius: metric(20, 19)
    });

    return {
      BACKGROUND: layout.background,
      TITLE_TEXT: {
        ...layout.title,
        x: layout.buttonX,
        y: metric(64, 60),
        w: layout.buttonW,
        text_size: metric(26, 24)
      },
      SUBTITLE_TEXT: {
        ...layout.subtitle,
        x: layout.buttonX,
        y: metric(100, 94),
        w: layout.buttonW
      },
      LIST_PANEL: listPanel,
      LIST_FRAME: {
        x: listPanel.x + 8,
        y: listPanel.y + 8,
        w: listPanel.w - 16,
        h: listPanel.h - 16,
        itemHeight: metric(104, 98),
        itemSpace: 8,
        itemRadius: metric(22, 20),
        titleHeight: metric(44, 40),
        metaHeight: metric(26, 24)
      },
      EMPTY_BUTTON: emptyButton
    };
  }

  if (page === "recipe-detail") {
    const primaryButton = createPreviewButtonStyle(layout, {
      theme: "primary",
      y: metric(380, 370),
      h: metric(64, 60),
      radius: metric(32, 30),
      text_size: metric(21, 20)
    });
    const detailPanel = createPreviewPanelStyle(layout, {
      x: layout.buttonX - metric(8, 6),
      y: metric(110, 104),
      w: layout.buttonW + metric(16, 12),
      h: metric(246, 236)
    });

    return {
      BACKGROUND: layout.background,
      TITLE_TEXT: {
        ...layout.title,
        align_h: "CENTER_H"
      },
      SUBTITLE_TEXT: layout.subtitle,
      DETAIL_PANEL: detailPanel,
      BODY_TEXT: {
        ...layout.body,
        y: detailPanel.y + metric(18, 16),
        h: detailPanel.h - metric(36, 32)
      },
      FOOTER_TEXT: {
        ...layout.footer,
        y: metric(326, 314),
        h: metric(28, 26)
      },
      ACTION_DOCK: createPreviewDockStyle(primaryButton),
      BUTTONS: [primaryButton]
    };
  }

  if (page === "brew-active") {
    const dockInset = metric(10, 8);
    const actionGap = metric(16, 14);
    const dockY = metric(382, 372);
    const dockHeight = metric(84, 78);
    const actionBaseY = dockY + metric(8, 7);
    const actionBaseH = dockHeight - metric(16, 14);
    const actionDockWidth = layout.buttonW - dockInset * 2;
    const actionButtonWidth = Math.floor((actionDockWidth - actionGap - metric(16, 14)) / 2);
    const centerX = layout.buttonX + Math.floor(layout.buttonW / 2);
    const primaryButton = createPreviewButtonStyle(layout, {
      theme: "primary",
      x: centerX + Math.floor(actionGap / 2),
      y: actionBaseY,
      w: actionButtonWidth,
      h: actionBaseH,
      radius: Math.floor(actionBaseH / 2),
      text_size: metric(28, 26)
    });
    const secondaryButton = createPreviewButtonStyle(layout, {
      theme: "secondary",
      x: centerX - Math.floor(actionGap / 2) - actionButtonWidth,
      y: actionBaseY,
      w: actionButtonWidth,
      h: actionBaseH,
      radius: Math.floor(actionBaseH / 2),
      text_size: metric(28, 26)
    });

    return {
      BACKGROUND: layout.background,
      TITLE_TEXT: {
        ...layout.title,
        align_h: "CENTER_H"
      },
      BODY_TEXT: layout.body,
      FOOTER_TEXT: layout.footer,
      ACTION_DOCK: {
        x: layout.buttonX + dockInset,
        y: dockY,
        w: actionDockWidth,
        h: dockHeight,
        radius: Math.floor(dockHeight / 2),
        color: 0x202833
      },
      BUTTONS: [primaryButton, secondaryButton]
    };
  }

  const secondaryButton = createPreviewButtonStyle(layout, {
    theme: "secondary",
    y: metric(324, 312),
    w: splitWidth,
    h: metric(40, 38),
    radius: metric(20, 19)
  });
  const accentButton = createPreviewButtonStyle(layout, {
    theme: "neutral",
    x: layout.buttonX + splitWidth + splitGap,
    y: metric(324, 312),
    w: splitWidth,
    h: metric(40, 38),
    radius: metric(20, 19)
  });
  const primaryButton = createPreviewButtonStyle(layout, {
    theme: "primary",
    y: metric(382, 370),
    h: metric(64, 60),
    radius: metric(32, 30),
    text_size: metric(21, 20)
  });

  return {
    ...layout.exports,
    TITLE_TEXT: {
      ...layout.title,
      x: layout.buttonX - metric(16, 12),
      y: metric(68, 62),
      w: layout.buttonW + metric(32, 24),
      align_h: "CENTER_H"
    },
    SUBTITLE_TEXT: {
      ...layout.subtitle,
      x: layout.buttonX - metric(8, 6),
      y: metric(106, 98),
      w: layout.buttonW + metric(16, 12),
      align_h: "CENTER_H"
    },
    ACTION_DOCK: createPreviewDockStyle(primaryButton),
    BUTTONS: [primaryButton, secondaryButton, accentButton]
  };
}

function createPreviewSquareLayoutMock(page: PreviewPage, width: number, height: number) {
  const layout = createPreviewScaffoldLayout({
    shape: "square",
    width,
    height,
    compact: false
  });
  const splitGap = 12;
  const splitWidth = Math.floor((layout.buttonW - splitGap) / 2);

  if (page === "home") {
    const secondaryButton = createPreviewButtonStyle(layout, {
      theme: "secondary",
      y: 238,
      w: splitWidth,
      h: 40,
      radius: 20,
      text_size: 18
    });
    const accentButton = createPreviewButtonStyle(layout, {
      theme: "accent",
      x: layout.buttonX + splitWidth + splitGap,
      y: 238,
      w: splitWidth,
      h: 40,
      radius: 20,
      text_size: 18
    });
    const primaryButton = createPreviewButtonStyle(layout, {
      theme: "primary",
      y: 286,
      h: 60,
      radius: 30,
      text_size: 20
    });

    return {
      ...layout.exports,
      ACTION_DOCK: createPreviewDockStyle(primaryButton),
      BUTTONS: [primaryButton, secondaryButton, accentButton]
    };
  }

  if (page === "tool-list") {
    return {
      BACKGROUND: layout.background,
      TITLE_TEXT: {
        ...layout.title,
        align_h: "CENTER_H"
      },
      SUBTITLE_TEXT: {
        ...layout.subtitle,
        align_h: "CENTER_H"
      },
      LIST_FRAME: {
        x: 18,
        y: 112,
        w: Math.min(344, width - 36),
        h: 228,
        itemHeight: 92,
        itemSpace: 10,
        itemRadius: 20,
        titleHeight: 40,
        metaHeight: 24
      },
      PRIMARY_BUTTON: createPreviewButtonStyle(layout, {
        theme: "secondary",
        y: layout.buttonY,
        h: layout.buttonH,
        radius: 18,
        text_size: 18
      })
    };
  }

  if (page === "recipe-list") {
    const listPanel = createPreviewPanelStyle(layout, {
      y: 108,
      h: 228
    });

    return {
      BACKGROUND: layout.background,
      TITLE_TEXT: layout.title,
      SUBTITLE_TEXT: layout.subtitle,
      LIST_PANEL: listPanel,
      LIST_FRAME: {
        x: listPanel.x + 8,
        y: listPanel.y + 8,
        w: listPanel.w - 16,
        h: listPanel.h - 16,
        itemHeight: 96,
        itemSpace: 8,
        itemRadius: 18,
        titleHeight: 38,
        metaHeight: 24
      },
      EMPTY_BUTTON: createPreviewButtonStyle(layout, {
        theme: "secondary",
        y: layout.buttonY,
        h: layout.buttonH,
        radius: 18,
        text_size: 18
      })
    };
  }

  if (page === "recipe-detail") {
    const primaryButton = createPreviewButtonStyle(layout, {
      theme: "primary",
      y: 302,
      h: 60,
      radius: 30,
      text_size: 20
    });
    const detailPanel = createPreviewPanelStyle(layout, {
      x: 24,
      y: 100,
      w: Math.min(336, width - 48),
      h: 176
    });

    return {
      BACKGROUND: layout.background,
      TITLE_TEXT: layout.title,
      SUBTITLE_TEXT: layout.subtitle,
      DETAIL_PANEL: detailPanel,
      BODY_TEXT: {
        ...layout.body,
        y: detailPanel.y + 16,
        h: detailPanel.h - 32
      },
      FOOTER_TEXT: {
        ...layout.footer,
        y: 262,
        h: 28
      },
      ACTION_DOCK: createPreviewDockStyle(primaryButton),
      BUTTONS: [primaryButton]
    };
  }

  if (page === "brew-active") {
    const dockInset = 8;
    const actionGap = 14;
    const dockY = 304;
    const dockHeight = 76;
    const actionBaseY = dockY + 7;
    const actionBaseH = dockHeight - 14;
    const actionDockWidth = layout.buttonW - dockInset * 2;
    const actionButtonWidth = Math.floor((actionDockWidth - actionGap - 14) / 2);
    const centerX = layout.buttonX + Math.floor(layout.buttonW / 2);
    const primaryButton = createPreviewButtonStyle(layout, {
      theme: "primary",
      x: centerX + Math.floor(actionGap / 2),
      y: actionBaseY,
      w: actionButtonWidth,
      h: actionBaseH,
      radius: Math.floor(actionBaseH / 2),
      text_size: 24
    });
    const secondaryButton = createPreviewButtonStyle(layout, {
      theme: "secondary",
      x: centerX - Math.floor(actionGap / 2) - actionButtonWidth,
      y: actionBaseY,
      w: actionButtonWidth,
      h: actionBaseH,
      radius: Math.floor(actionBaseH / 2),
      text_size: 24
    });

    return {
      BACKGROUND: layout.background,
      TITLE_TEXT: layout.title,
      BODY_TEXT: layout.body,
      FOOTER_TEXT: layout.footer,
      ACTION_DOCK: {
        x: layout.buttonX + dockInset,
        y: dockY,
        w: actionDockWidth,
        h: dockHeight,
        radius: Math.floor(dockHeight / 2),
        color: 0x202833
      },
      BUTTONS: [primaryButton, secondaryButton]
    };
  }

  const secondaryButton = createPreviewButtonStyle(layout, {
    theme: "secondary",
    y: 252,
    w: splitWidth,
    h: 40,
    radius: 20
  });
  const accentButton = createPreviewButtonStyle(layout, {
    theme: "neutral",
    x: layout.buttonX + splitWidth + splitGap,
    y: 252,
    w: splitWidth,
    h: 40,
    radius: 20
  });
  const primaryButton = createPreviewButtonStyle(layout, {
    theme: "primary",
    y: 300,
    h: 60,
    radius: 30,
    text_size: 20
  });

  return {
    ...layout.exports,
    TITLE_TEXT: {
      ...layout.title,
      align_h: "CENTER_H"
    },
    SUBTITLE_TEXT: {
      ...layout.subtitle,
      align_h: "CENTER_H"
    },
    ACTION_DOCK: createPreviewDockStyle(primaryButton),
    BUTTONS: [primaryButton, secondaryButton, accentButton]
  };
}

function createPreviewScaffoldLayout(options: {
  shape: "round" | "square";
  width: number;
  height: number;
  compact: boolean;
}) {
  const isRound = options.shape === "round";
  const horizontalPadding = isRound ? (options.compact ? 68 : 64) : 28;
  const buttonStartY = isRound ? (options.compact ? 224 : 232) : 214;
  const buttonHeight = isRound ? (options.compact ? 40 : 42) : 44;
  const buttonGap = 8;
  const buttonX = horizontalPadding;
  const buttonW = options.width - horizontalPadding * 2;
  const layout = {
    background: {
      x: 0,
      y: 0,
      w: options.width,
      h: options.height,
      color: 0x0e1218
    },
    title: {
      x: horizontalPadding,
      y: isRound ? (options.compact ? 56 : 60) : 30,
      w: buttonW,
      h: isRound ? 38 : 34,
      color: 0xf5f7fa,
      text_size: isRound ? (options.compact ? 24 : 26) : 28,
      align_h: "LEFT",
      align_v: "CENTER_V",
      text_style: "WRAP"
    },
    subtitle: {
      x: horizontalPadding,
      y: isRound ? (options.compact ? 88 : 94) : 66,
      w: buttonW,
      h: isRound ? 34 : 30,
      color: 0xaab4c2,
      text_size: isRound ? (options.compact ? 14 : 15) : 16,
      align_h: "LEFT",
      align_v: "CENTER_V",
      text_style: "WRAP"
    },
    body: {
      x: horizontalPadding,
      y: isRound ? (options.compact ? 126 : 134) : 102,
      w: buttonW,
      h: 74,
      color: 0xf5f7fa,
      text_size: isRound ? (options.compact ? 16 : 17) : 18,
      align_h: "LEFT",
      align_v: "TOP",
      text_style: "WRAP"
    },
    footer: {
      x: horizontalPadding,
      y: options.height - (isRound ? (options.compact ? 88 : 82) : 56),
      w: buttonW,
      h: 38,
      color: 0xaab4c2,
      text_size: isRound ? (options.compact ? 13 : 14) : 14,
      align_h: "LEFT",
      align_v: "CENTER_V",
      text_style: "WRAP"
    },
    buttonX,
    buttonY: buttonStartY,
    buttonW,
    buttonH: buttonHeight,
    buttonGap
  };

  return {
    ...layout,
    exports: {
      BACKGROUND: layout.background,
      TITLE_TEXT: layout.title,
      SUBTITLE_TEXT: layout.subtitle,
      BODY_TEXT: layout.body,
      FOOTER_TEXT: layout.footer
    }
  };
}

function createPreviewButtonStyle(
  layout: ReturnType<typeof createPreviewScaffoldLayout>,
  options: Record<string, any> = {}
) {
  const palette = {
    primary: {
      normal: 0x0986d4,
      press: 0x06649f
    },
    secondary: {
      normal: 0x2a3340,
      press: 0x202733
    },
    accent: {
      normal: 0xd9922e,
      press: 0xaf6f19
    },
    neutral: {
      normal: 0x434f5f,
      press: 0x303947
    }
  }[options.theme || "primary"] || {
    normal: 0x0986d4,
    press: 0x06649f
  };
  const h = options.h ?? layout.buttonH;

  return {
    x: options.x ?? layout.buttonX,
    y: options.y ?? layout.buttonY,
    w: options.w ?? layout.buttonW,
    h,
    radius: options.radius ?? Math.floor(h / 2),
    text_size: options.text_size ?? (h >= 64 ? 22 : 18),
    normal_color: palette.normal,
    press_color: palette.press,
    color: 0xf5f7fa
  };
}

function createPreviewDockStyle(button: Record<string, number>) {
  return {
    x: button.x,
    y: button.y,
    w: button.w,
    h: button.h,
    radius: button.radius,
    color: 0x202833
  };
}

function createPreviewPanelStyle(
  layout: ReturnType<typeof createPreviewScaffoldLayout>,
  options: Record<string, any> = {}
) {
  return {
    x: options.x ?? layout.buttonX,
    y: options.y ?? layout.body.y - 12,
    w: options.w ?? layout.buttonW,
    h: options.h ?? 104,
    radius: options.radius ?? 24,
    color: options.color ?? 0x171d26
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
