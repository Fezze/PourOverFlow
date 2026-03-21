import { TOOL_CATALOG } from "../shared/constants/tool-catalog";
import {
  ensurePhoneScaffoldStorage,
  readPhoneScaffoldSnapshot
} from "../shared/storage/phone-store";

const NAV_BUTTON_STYLE = {
  fontSize: "12px",
  lineHeight: "30px",
  borderRadius: "30px",
  background: "#2D8C82",
  color: "white",
  textAlign: "center",
  padding: "0 12px",
  width: "31%"
};

const CARD_STYLE = {
  marginTop: "12px",
  padding: "12px",
  border: "1px solid #d8dee6",
  borderRadius: "10px",
  backgroundColor: "white",
  display: "flex",
  flexDirection: "column",
  gap: "8px"
};

const MUTED_BUTTON_STYLE = {
  fontSize: "12px",
  borderRadius: "30px",
  background: "#5E6773",
  color: "white"
};

AppSettingsPage({
  state: {
    view: "library-home",
    selectedToolId: null,
    editingRecipeId: null,
    selectedHistoryId: null,
    draftRecipe: null,
    syncMeta: null,
    snapshot: null
  },
  hydrateFromStorage(props) {
    const snapshot = ensurePhoneScaffoldStorage(props.settingsStorage);
    this.state.snapshot = readPhoneScaffoldSnapshot(props.settingsStorage);
    this.state.syncMeta = snapshot.syncMeta;

    if (!this.state.selectedToolId && TOOL_CATALOG[0]) {
      this.state.selectedToolId = TOOL_CATALOG[0].toolId;
    }
  },
  setView(viewName) {
    this.state.view = viewName;
  },
  renderNav() {
    return View(
      {
        style: {
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          gap: "8px"
        }
      },
      [
        Button({
          label: "Library",
          style: NAV_BUTTON_STYLE,
          onClick: () => {
            this.setView("library-home");
          }
        }),
        Button({
          label: "History",
          style: NAV_BUTTON_STYLE,
          onClick: () => {
            this.setView("history-list");
          }
        }),
        Button({
          label: "Sync",
          style: NAV_BUTTON_STYLE,
          onClick: () => {
            this.setView("about-sync");
          }
        })
      ]
    );
  },
  renderLibraryHome() {
    const recipesByTool = this.state.snapshot ? this.state.snapshot.recipesByTool : {};
    const toolButtons = TOOL_CATALOG.map((tool) =>
      Button({
        label: `${tool.label} (${(recipesByTool[tool.toolId] || []).length})`,
        style: MUTED_BUTTON_STYLE,
        onClick: () => {
          this.state.selectedToolId = tool.toolId;
          this.setView("recipe-list");
        }
      })
    );

    return View({ style: CARD_STYLE }, toolButtons);
  },
  renderRecipeList() {
    const tool = TOOL_CATALOG.find((item) => item.toolId === this.state.selectedToolId);
    const recipeCount =
      this.state.snapshot && tool
        ? (this.state.snapshot.recipesByTool[tool.toolId] || []).length
        : 0;

    return View(
      { style: CARD_STYLE },
      [
        Button({
          label: tool ? `${tool.label}: ${recipeCount} recipes` : "No tool selected",
          style: MUTED_BUTTON_STYLE,
          onClick: () => {}
        }),
        Button({
          label: "Create lands in Stage 3",
          style: MUTED_BUTTON_STYLE,
          onClick: () => {}
        }),
        Button({
          label: "Back to library",
          style: MUTED_BUTTON_STYLE,
          onClick: () => {
            this.setView("library-home");
          }
        })
      ]
    );
  },
  renderHistoryList() {
    const historyCount = this.state.snapshot ? this.state.snapshot.historyIndex.length : 0;

    return View(
      { style: CARD_STYLE },
      [
        Button({
          label: `History entries: ${historyCount}`,
          style: MUTED_BUTTON_STYLE,
          onClick: () => {}
        }),
        Button({
          label: "History detail lands in Stage 3",
          style: MUTED_BUTTON_STYLE,
          onClick: () => {}
        })
      ]
    );
  },
  renderAboutSync() {
    const syncMeta = this.state.syncMeta || {};

    return View(
      { style: CARD_STYLE },
      [
        Button({
          label: `Tools rev: ${syncMeta.toolCatalogRevision || 0}`,
          style: MUTED_BUTTON_STYLE,
          onClick: () => {}
        }),
        Button({
          label: `Recipes rev: ${syncMeta.recipeCatalogRevision || 0}`,
          style: MUTED_BUTTON_STYLE,
          onClick: () => {}
        }),
        Button({
          label: `History rev: ${syncMeta.historyRevision || 0}`,
          style: MUTED_BUTTON_STYLE,
          onClick: () => {}
        }),
        Button({
          label: "Phone stays source of truth",
          style: MUTED_BUTTON_STYLE,
          onClick: () => {}
        })
      ]
    );
  },
  renderView() {
    if (this.state.view === "recipe-list") {
      return this.renderRecipeList();
    }

    if (this.state.view === "history-list") {
      return this.renderHistoryList();
    }

    if (this.state.view === "about-sync") {
      return this.renderAboutSync();
    }

    return this.renderLibraryHome();
  },
  build(props) {
    this.hydrateFromStorage(props);

    return View(
      {
        style: {
          padding: "12px 20px"
        }
      },
      [
        this.renderNav(),
        View(
          {
            style: {
              marginTop: "12px"
            }
          },
          [
            Button({
              label: `Current view: ${this.state.view}`,
              style: MUTED_BUTTON_STYLE,
              onClick: () => {}
            })
          ]
        ),
        this.renderView()
      ]
    );
  }
});
