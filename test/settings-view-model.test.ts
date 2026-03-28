import { describe, expect, it } from "vitest";

import {
  buildHistoryOverview,
  buildLibraryOverview,
  buildRecipeShelfCountLabel,
  buildSyncOverview,
  buildToolBadgeLabel,
  buildToolCardLabel,
  buildToolCountBadgeLabel,
  buildToolSettingsIconPath,
  getSnapshotCounts
} from "../zepp-app/setting/view-model.js";
import { TOOL_CATALOG } from "../zepp-app/shared/constants/tool-catalog.js";

describe("settings view model", () => {
  const snapshot = {
    recipeIndex: [{ recipeId: "recipe-1" }, { recipeId: "recipe-2" }, { recipeId: "recipe-3" }],
    historyIndex: [{ historyId: "history-1" }, { historyId: "history-2" }]
  };

  it("reports snapshot counts for library shell summaries", () => {
    expect(getSnapshotCounts(snapshot as never)).toEqual({
      toolCount: TOOL_CATALOG.length,
      recipeCount: 3,
      historyCount: 2
    });
  });

  it("keeps the default library overview focused on brewers and recipes only", () => {
    expect(buildLibraryOverview(snapshot as never)).toBe("6 brewers - 3 recipes");
    expect(buildLibraryOverview(snapshot as never, { includeHistory: true })).toBe(
      "6 brewers - 3 recipes - 2 history entries"
    );
  });

  it("formats short recipe-count labels for browse shelves", () => {
    expect(buildRecipeShelfCountLabel(1)).toBe("1 recipe");
    expect(buildRecipeShelfCountLabel(4)).toBe("4 recipes");
  });

  it("provides compact tool badges and list-card labels", () => {
    expect(buildToolBadgeLabel(TOOL_CATALOG[0])).toBe("AP");
    expect(buildToolBadgeLabel(TOOL_CATALOG[1])).toBe("V60");
    expect(buildToolCardLabel(TOOL_CATALOG[2], 5)).toBe("Kalita Wave");
    expect(buildToolCountBadgeLabel(5)).toBe("5");
    expect(buildToolSettingsIconPath(TOOL_CATALOG[3])).toBe("../assets/common.s/tool-chemex.png");
  });

  it("formats history and sync summaries for simpler secondary screens", () => {
    expect(buildHistoryOverview(snapshot as never)).toBe("2 archived brews on the phone.");
    expect(
      buildSyncOverview({
        toolCatalogRevision: 7,
        recipeCatalogRevision: 11,
        historyRevision: 13
      } as never)
    ).toBe("Tools revision: 7\nRecipes revision: 11\nHistory revision: 13");
  });
});
