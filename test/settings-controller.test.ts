import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createCatalogFixture } from "./support/watch-page-harness.ts";
import { createDefaultRecipeSteps } from "../zepp-app/shared/domain/schema.js";
import { SETTINGS_UI_STORAGE_KEY } from "../zepp-app/shared/storage/keys.js";

const store = vi.hoisted(() => ({
  createUserRecipeRecord: vi.fn(),
  deleteRecipeRecord: vi.fn(),
  duplicateRecipeRecord: vi.fn(),
  ensurePhoneStorage: vi.fn(),
  readHistoryEntry: vi.fn(),
  readPhoneSnapshot: vi.fn(),
  readRecipeRecord: vi.fn(),
  readSettingsJson: vi.fn(),
  saveRecipeRecord: vi.fn(),
  updateHistoryEntryFeedback: vi.fn(),
  writeSettingsJson: vi.fn()
}));
vi.mock("../zepp-app/shared/storage/phone-store.js", () => store);

type Element = {
  type: string;
  props: Record<string, any>;
  children: Array<Element | string>;
};
const { primaryRecord, primarySummary, primarySnapshot, catalogCache } = createCatalogFixture();
const toolId = primaryRecord.toolId;
const archive = {
  historyId: "archive-1", recipeSnapshot: primarySnapshot, status: "completed",
  elapsedMs: 81_000, endedAt: 25_000, userRating: 4, userNote: "Original note",
  deviationSummary: { totalDeltaMs: 62_000 },
  stepRunResults: [
    { order: 0, title: "", actualDurationMs: 16_000 },
    { order: 1, title: "Pour", kind: "timed_action", actualDurationMs: 45_000 }
  ]
};
const snapshot = {
  tools: catalogCache.tools,
  recipesByTool: { [toolId]: [primarySummary] },
  recipeIndex: [primarySummary],
  historyIndex: [{ historyId: archive.historyId, recipeName: primaryRecord.name }],
  syncMeta: { toolCatalogRevision: 5, recipeCatalogRevision: 12, historyRevision: 31 }
};

let definition: Record<string, any>;
let persisted: Record<string, any> | undefined;

beforeAll(async () => {
  vi.stubGlobal("AppSettingsPage", (page) => { definition = page; });
  vi.stubGlobal("navigator", { language: "en-US" });
  for (const type of ["View", "Text", "Button", "TextInput", "Select"]) {
    vi.stubGlobal(type, (props = {}, children = []) => ({
      type, props, children: (Array.isArray(children) ? children : [children]).filter(Boolean)
    }));
  }
  await import("../zepp-app/setting/index.js");
});
afterAll(() => vi.unstubAllGlobals());

beforeEach(() => {
  vi.resetAllMocks();
  persisted = undefined;
  store.readPhoneSnapshot.mockReturnValue(snapshot);
  store.readRecipeRecord.mockReturnValue(primaryRecord);
  store.readHistoryEntry.mockReturnValue(archive);
  store.readSettingsJson.mockImplementation((_storage, _key, fallback) => persisted ?? fallback);
  store.writeSettingsJson.mockImplementation((_storage, _key, value) => { persisted = value; });
  store.createUserRecipeRecord.mockImplementation(({ toolId, steps }) => ({
    ...primaryRecord, recipeId: "", toolId, name: "", steps
  }));
});

function descendants(element: Element | string): Element[] {
  return typeof element === "string" ? [] : [element, ...element.children.flatMap(descendants)];
}

function visit() {
  const storage = {};
  const props = { settingsStorage: storage };
  const page = { ...definition, state: structuredClone(definition.state) };
  const elements: () => Element[] = () => descendants(definition.build.call(page, props));
  const text = () => elements().flatMap((el) => el.type === "Text" ? el.children : []).join(" ");
  const click = (label: string) => {
    const button = elements().find((el) => el.type === "Button" && el.props.label === label);
    expect(button, label).toBeDefined();
    button!.props.onClick();
  };
  const row = (title: string) => {
    const card = elements().find((el) => el.type === "View" && typeof el.props.onClick === "function"
      && descendants(el).some(({ children }) => children.includes(title)));
    expect(card, title).toBeDefined();
    card!.props.onClick();
  };
  const edit = (label: string, value: string) => {
    const field = elements().find((el) => el.type === "TextInput" && el.props.label === label);
    expect(field, label).toBeDefined();
    field!.props.onChange(value);
  };
  const options = (label: string) => elements().find((el) => el.type === "Select" && el.props.label === label)?.props;
  const select = (label: string, index: number) => {
    const control = options(label)!;
    expect(control?.options[index], label).toBeDefined();
    control.onChange(control.options[index].value);
  };
  return { page, storage, props, row, click, edit, select, options, text };
}

it("renders the library, opens a recipe through its row and sends field changes only to the draft", () => {
  const view = visit();
  expect(view.text()).toContain("PourOverFlow");
  expect(store.ensurePhoneStorage).toHaveBeenCalledWith(view.storage, { preferredLocale: "en-US" });
  view.row("AeroPress");
  expect(view.text()).toContain(primaryRecord.name);
  view.row(primaryRecord.name);
  view.edit("Name", "Draft name");
  view.edit("Description", "A new instruction");
  const oldStep = persisted!.draftRecipe.steps[0];
  view.select("Go to step", 1);
  view.edit("Instructions", "Pour slowly");
  expect(persisted!.draftRecipe.name).toBe("Draft name");
  expect(persisted!.draftRecipe.steps[0]).toEqual(oldStep);
  expect(persisted!.draftRecipe.steps[1].body).toBe("Pour slowly");
  expect(store.writeSettingsJson).toHaveBeenCalledWith(view.storage, SETTINGS_UI_STORAGE_KEY, expect.any(Object));
  expect(store.saveRecipeRecord).not.toHaveBeenCalled();
  view.click("Cancel");
  expect(persisted!.draftRecipe).toBeNull();
  expect(persisted!.view).toBe("recipe-list");
});

it("tracks the selected step through insertion, movement, deletion and reset", () => {
  const view = visit();
  view.row("AeroPress");
  view.click("New recipe");
  expect(store.createUserRecipeRecord).toHaveBeenCalledWith({
    toolId, locale: "en-US", steps: createDefaultRecipeSteps().map((step) => ({
      ...step, stepId: expect.any(String)
    }))
  });
  view.click("Add step");
  view.edit("Title", "Pour");
  view.select("Requires confirmation", 0);
  view.click("Up");
  expect(persisted!.draftRecipe.steps[0].title).toBe("Pour");
  view.click("Up");
  expect(persisted!.stepPageIndex).toBe(0);
  view.click("Down");
  expect(persisted!.stepPageIndex).toBe(1);
  view.click("Delete");
  expect(persisted!.draftRecipe.steps).toHaveLength(2);
  view.click("Previous");
  view.click("Delete");
  expect(view.options("Go to step")).toBeUndefined();
  view.click("Reset");
  expect(view.options("Go to step")?.options).toHaveLength(2);
});

it("shows validation errors, then displays successful save, duplicate and deletion responses", () => {
  const view = visit();
  view.row("AeroPress");
  store.duplicateRecipeRecord.mockReturnValueOnce({ ok: false, issues: ["That recipe was removed"] })
    .mockReturnValueOnce({ ok: true, recipeRecord: { ...primaryRecord, name: "Duplicate" } });
  view.click("Duplicate");
  expect(view.text()).toContain("That recipe was removed");
  view.click("Duplicate");
  expect(view.text()).toContain("Duplicated recipe: Duplicate");
  view.row(primaryRecord.name);
  store.saveRecipeRecord.mockReturnValueOnce({ ok: false, issues: ["Name is required"] })
    .mockReturnValueOnce({ ok: true, recipeRecord: { ...primaryRecord, name: "Saved name" } });
  view.click("Save recipe");
  expect(view.text()).toContain("Name is required");
  expect(persisted!.view).toBe("recipe-editor");
  view.edit("Name", "Saved name");
  view.click("Save recipe");
  expect(view.text()).toContain("Saved recipe: Saved name");
  expect(store.saveRecipeRecord).toHaveBeenLastCalledWith(view.storage, expect.objectContaining({ name: "Saved name" }));
  store.deleteRecipeRecord.mockReturnValueOnce(false).mockReturnValueOnce(true);
  view.click("Delete");
  expect(view.text()).toContain("Recipe record not found.");
  view.click("Delete");
  expect(view.text()).toContain("Recipe deleted. History was preserved.");
  view.click("Brewers");
  expect(persisted!.view).toBe("library-home");
});

it("renders empty and missing-record states without calling canonical write methods", () => {
  const view = visit();
  store.readPhoneSnapshot.mockReturnValue({ ...snapshot, tools: [], recipesByTool: {}, historyIndex: [] });
  view.row("AeroPress");
  expect(view.text()).toContain("No recipes yet");
  view.click("History");
  expect(view.text()).toContain("No history entries");
  persisted = { view: "history-detail", selectedHistoryId: "missing" };
  store.readHistoryEntry.mockReturnValue(null);
  expect(view.text()).toContain("History entry not found.");
  persisted = { view: "recipe-editor", draftRecipe: null };
  expect(view.text()).toContain("Recipe draft is missing.");
  expect(store.saveRecipeRecord).not.toHaveBeenCalled();
  expect(store.updateHistoryEntryFeedback).not.toHaveBeenCalled();
});

it("links archived feedback to its history id and shows the independent sync revisions", () => {
  const view = visit();
  view.click("History");
  view.row(primaryRecord.name);
  expect(view.text()).toContain("1m 02s over planned");
  expect(view.text()).toContain("Rated 4/5");
  expect(view.text()).toContain("2. Pour");
  view.edit("Note", "Update from Settings");
  view.select("Rating", 5);
  store.updateHistoryEntryFeedback.mockReturnValueOnce({ ok: false, issues: ["Archive missing"] })
    .mockReturnValueOnce({ ok: true });
  view.click("Save notes");
  expect(view.text()).toContain("Archive missing");
  view.click("Save notes");
  expect(store.updateHistoryEntryFeedback).toHaveBeenLastCalledWith(view.storage, archive.historyId, {
    userRating: "5", userNote: "Update from Settings"
  });
  expect(view.text()).toContain("History note saved.");
  view.click("Back to history");
  expect(persisted!.view).toBe("history-list");
  view.click("Sync");
  for (const expected of ["Data revisions", "5", "12", "31"]) expect(view.text()).toContain(expected);
});
