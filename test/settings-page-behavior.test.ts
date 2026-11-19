import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  createRecipeSnapshot
} from "../zepp-app/shared/domain/schema.js";
import {
  ensurePhoneStorage,
  readHistoryEntry,
  readPhoneSnapshot,
  readRecipeRecord,
  saveHistoryEntry
} from "../zepp-app/shared/storage/phone-store.js";
import { ESPRESSO_COLORS } from "../zepp-app/shared/constants/espresso-colors.js";
import { getPhoneHistoryRecordKey } from "../zepp-app/shared/storage/keys.js";

type SettingsNode = {
  type: string;
  props: Record<string, unknown>;
  children: (SettingsNode | string)[];
};

type SettingsPageConfig = {
  state: Record<string, unknown>;
  [key: string]: unknown;
};

type SettingsPageInstance = {
  state: any;
  build: (props: SettingsProps) => SettingsNode;
  [key: string]: any;
};

type SettingsProps = { settingsStorage: MockSettingsStorage };

class MockSettingsStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  dump() {
    return Object.fromEntries(this.values);
  }
}

function makeNode(type: string) {
  return (props: Record<string, unknown> = {}, children: unknown = []): SettingsNode => ({
    type,
    props,
    children: (Array.isArray(children) ? children : [children]).filter(Boolean) as (SettingsNode | string)[]
  });
}

let pageConfig: SettingsPageConfig;

beforeAll(async () => {
  vi.resetModules();
  const globals = globalThis as typeof globalThis & Record<string, unknown>;
  globals.AppSettingsPage = (config: SettingsPageConfig) => {
    pageConfig = config;
  };
  globals.View = makeNode("View");
  globals.Text = makeNode("Text");
  globals.Button = (props: Record<string, unknown>) => makeNode("Button")(props);
  globals.TextInput = (props: Record<string, unknown>) => makeNode("TextInput")(props);
  globals.Select = (props: Record<string, unknown>) => makeNode("Select")(props);

  await import("../zepp-app/setting/app-settings.jsx");
});

function createPage() {
  const settingsStorage = new MockSettingsStorage();
  ensurePhoneStorage(settingsStorage, { preferredLocale: "en-US" });
  const props = { settingsStorage };
  const instance = {
    ...pageConfig,
    state: structuredClone(pageConfig.state)
  } as SettingsPageInstance;

  return { instance, props };
}

function findNode(node: SettingsNode, matches: (node: SettingsNode) => boolean): SettingsNode | undefined {
  if (matches(node)) {
    return node;
  }

  for (const child of node.children) {
    if (typeof child === "string") continue;
    const match = findNode(child, matches);
    if (match) return match;
  }

  return undefined;
}

function findSelect(node: SettingsNode, label: string) {
  return findNode(node, (child) => child.type === "Select" && child.props.label === label)?.props as
    { options: { name: string; value: string }[]; value: string; onChange: (value: string) => void } | undefined;
}

function findButton(node: SettingsNode, label: string) {
  return findNode(node, (child) => child.type === "Button" && child.props.label === label);
}

function findText(node: SettingsNode, text: string) {
  return findNode(node, (child) => child.type === "Text" && child.children.includes(text));
}

function findRecordRow(node: SettingsNode, title: string) {
  return findNode(node, (child) =>
    child.type === "View" && typeof child.props.onClick === "function" && Boolean(findText(child, title))
  );
}

function click(node: SettingsNode | undefined) {
  expect(node?.props.onClick).toBeTypeOf("function");
  (node!.props.onClick as () => void)();
}

describe("phone settings page behavior", () => {
  it("navigates between the persistent Library, History, and Sync tabs", () => {
    const { instance, props } = createPage();
    const libraryTree = instance.build(props);
    click(findButton(libraryTree, "History"));
    expect(instance.state.ui.view).toBe("history-list");

    const historyTree = instance.build(props);
    click(findButton(historyTree, "Sync"));
    expect(instance.state.ui.view).toBe("about-sync");

    const syncTree = instance.build(props);
    click(findButton(syncTree, "Library"));
    expect(instance.state.ui.view).toBe("library-home");
  });

  it("uses the watch palette and opens a recipe through the brewer and recipe rows", () => {
    const { instance, props } = createPage();
    const library = instance.build(props);
    expect(library.props.style).toMatchObject({
      backgroundColor: `#${ESPRESSO_COLORS.background.toString(16)}`
    });
    const brewer = findRecordRow(library, "AeroPress");
    expect(findText(brewer!, "4")).toBeDefined();
    click(brewer);

    const recipes = instance.build(props);
    const recipe = instance.state.snapshot.recipesByTool.tool_aeropress[0];
    click(findRecordRow(recipes, recipe.name));

    const editor = instance.build(props);
    expect(instance.state.ui.editingRecipeId).toBe(recipe.recipeId);
    expect(findText(editor, recipe.name)).toBeDefined();
    expect(findButton(editor, "Save recipe")?.props.style).toMatchObject({
      backgroundColor: `#${ESPRESSO_COLORS.primary.toString(16)}`
    });
  });

  it("creates and saves a recipe from the editor flow", () => {
    const { instance, props } = createPage();
    instance.hydrateFromStorage(props);
    instance.openRecipeList(props, "tool_aeropress");
    instance.openRecipeEditor(props, null);
    instance.updateDraftField(props, "name", "Evening Caramel Cup");
    instance.saveDraftRecipe(props);

    const saved = readPhoneSnapshot(props.settingsStorage);
    expect(saved.recipeIndex.some((recipe) => recipe.name === "Evening Caramel Cup")).toBe(true);
    expect(instance.state.ui.view).toBe("recipe-list");
  });

  it("keeps step navigation in range and persists the selected editor step", () => {
    const { instance, props } = createPage();
    const recipe = readPhoneSnapshot(props.settingsStorage).recipeIndex[0];
    instance.hydrateFromStorage(props);
    instance.openRecipeEditor(props, recipe.recipeId);

    click(findButton(instance.build(props), "Next"));
    const secondStep = instance.build(props);
    expect(instance.state.ui.stepPageIndex).toBe(1);
    expect(findText(secondStep, `Step 2 of ${instance.state.ui.draftRecipe.steps.length}`)).toBeDefined();
    expect(findNode(secondStep, (node) => node.type === "TextInput" && node.props.label === "Instructions")?.props)
      .toMatchObject({ multiline: true, rows: 4, value: instance.state.ui.draftRecipe.steps[1].body });
    click(findButton(secondStep, "Previous"));
    expect(instance.state.ui.stepPageIndex).toBe(0);
    instance.setStepPage(props, 999);
    expect(instance.state.ui.stepPageIndex).toBe(instance.state.ui.draftRecipe.steps.length - 1);
  });

  it("inserts directly after the selected step and saves the resulting order", () => {
    const { instance, props } = createPage();
    const recipe = readRecipeRecord(props.settingsStorage, "seed_ap_bypass_bright")!;
    instance.hydrateFromStorage(props);
    instance.openRecipeEditor(props, recipe.recipeId);

    click(findButton(instance.build(props), "Next"));
    click(findButton(instance.build(props), "Add step"));
    const editor = instance.build(props);
    const steps = instance.state.ui.draftRecipe.steps;
    expect(instance.state.ui.stepPageIndex).toBe(2);
    expect(findText(editor, `Step 3 of ${recipe.steps.length + 1}`)).toBeDefined();
    expect(steps[1].stepId).toBe(recipe.steps[1].stepId);
    expect(steps[2]).toMatchObject({ kind: "instruction", stepId: "" });
    expect(steps[3].stepId).toBe(recipe.steps[2].stepId);

    click(findButton(editor, "Save recipe"));
    const savedSteps = readRecipeRecord(props.settingsStorage, recipe.recipeId)!.steps;
    expect(savedSteps).toHaveLength(recipe.steps.length + 1);
    expect(savedSteps.map((step) => step.order)).toEqual(savedSteps.map((_, index) => index));
    expect(savedSteps.filter((_, index) => index !== 2).map((step) => step.stepId))
      .toEqual(recipe.steps.map((step) => step.stepId));
    expect(savedSteps[2].stepId).toBeTruthy();
    expect(savedSteps.at(-1)?.kind).toBe("finish");
  });

  it("hides Add step on Finish and lets the preceding step insert before it", () => {
    const { instance, props } = createPage();
    const recipe = readRecipeRecord(props.settingsStorage, "seed_ap_bypass_bright")!;
    instance.hydrateFromStorage(props);
    instance.openRecipeEditor(props, recipe.recipeId);
    instance.setStepPage(props, recipe.steps.length - 1);

    const editor = instance.build(props);
    expect(findButton(editor, "Add step")).toBeUndefined();
    expect(findButton(editor, "Add step before finish")).toBeUndefined();
    click(findButton(editor, "Previous"));
    click(findButton(instance.build(props), "Add step"));
    instance.build(props);
    const steps = instance.state.ui.draftRecipe.steps;
    expect(instance.state.ui.stepPageIndex).toBe(recipe.steps.length - 1);
    expect(steps.at(-2)?.kind).toBe("instruction");
    expect(steps.at(-1)).toMatchObject({ stepId: recipe.steps.at(-1)?.stepId, kind: "finish" });
  });

  it("jumps across 33 steps and keeps the Select in sync with Previous and Next", () => {
    const { instance, props } = createPage();
    const recipe = readPhoneSnapshot(props.settingsStorage).recipeIndex[0];
    instance.hydrateFromStorage(props);
    instance.openRecipeEditor(props, recipe.recipeId);

    const draftSteps = instance.state.ui.draftRecipe.steps;
    const steps = Array.from({ length: 33 }, (_, index) => ({
      ...draftSteps[index === 32 ? draftSteps.length - 1 : 0],
      title: index === 0 ? "Prepare" : index === 32 ? "Serve" : "Pour and swirl",
      body: index === 32 ? "Serve the coffee." : "Follow the pouring target."
    }));
    instance.updateDraftField(props, "steps", steps);
    instance.setStepPage(props, 16);

    const getStepSelect = () => findSelect(instance.build(props), "Go to step")!;

    const initial = getStepSelect();
    expect(findText(instance.build(props), "17. Pour and swirl")).toBeDefined();
    expect(initial.options).toHaveLength(33);
    expect(new Set(initial.options.map(({ value }) => value)).size).toBe(33);
    expect(initial.options[32].name).toBe("33. Serve");
    initial.onChange(initial.options[32].value);
    const finalStep = instance.build(props);
    expect(findText(finalStep, "Step 33 of 33")).toBeDefined();
    expect(findButton(finalStep, "Next")).toBeUndefined();
    expect(findNode(finalStep, (node) => node.props.label === "Instructions")?.props.value).toBe("Serve the coffee.");

    click(findButton(finalStep, "Previous"));
    const previous = getStepSelect();
    expect(findText(instance.build(props), "32. Pour and swirl")).toBeDefined();
    expect(previous.options[31].value).toBe(previous.value);
    expect(previous.options[32].value).not.toBe(initial.options[32].value);
    previous.onChange(previous.options[32].value);
    expect(findText(instance.build(props), "Step 33 of 33")).toBeDefined();

    click(findButton(instance.build(props), "Previous"));
    click(findButton(instance.build(props), "Next"));
    expect(findText(instance.build(props), "33. Serve")).toBeDefined();
  });

  it("shows confirmation values in the field and allows the same choice on successive steps", () => {
    const { instance, props } = createPage();
    const recipe = readPhoneSnapshot(props.settingsStorage).recipeIndex[0];
    instance.hydrateFromStorage(props);
    instance.openRecipeEditor(props, recipe.recipeId);
    instance.setStepPage(props, 1);
    instance.updateDraftStepField(props, 1, "requiresConfirm", "false");
    instance.updateDraftStepField(props, 2, "requiresConfirm", "false");

    const firstStep = instance.build(props);
    expect(findText(firstStep, "Requires confirmation")).toBeDefined();
    expect(findText(firstStep, "No")).toBeDefined();
    const firstSelect = findSelect(firstStep, "Requires confirmation")!;
    const yes = firstSelect.options.find(({ name }) => name === "Yes")!;
    firstSelect.onChange(yes.value);
    expect(instance.state.ui.draftRecipe.steps[1].requiresConfirm).toBe("true");
    expect(findText(instance.build(props), "Yes")).toBeDefined();

    click(findButton(instance.build(props), "Next"));
    const nextStep = instance.build(props);
    const nextSelect = findSelect(nextStep, "Requires confirmation")!;
    expect(nextSelect.options.find(({ value }) => value === nextSelect.value)?.name).toBe("No");
    const nextYes = nextSelect.options.find(({ name }) => name === "Yes")!;
    expect(nextYes.value).not.toBe(yes.value);
    nextSelect.onChange(nextYes.value);
    expect(instance.state.ui.draftRecipe.steps[2].requiresConfirm).toBe("true");
  });

  it("duplicates a recipe and deletes the duplicate while retaining the original", () => {
    const { instance, props } = createPage();
    const original = readPhoneSnapshot(props.settingsStorage).recipeIndex[0];
    instance.hydrateFromStorage(props);
    instance.duplicateRecipe(props, original.recipeId);

    const afterDuplicate = readPhoneSnapshot(props.settingsStorage);
    expect(afterDuplicate.recipeIndex).toHaveLength(25);
    const duplicate = afterDuplicate.recipeIndex.find((recipe) => recipe.recipeId !== original.recipeId && recipe.name.includes("Copy"));
    expect(duplicate).toBeDefined();

    instance.deleteRecipe(props, duplicate!.recipeId);
    expect(readPhoneSnapshot(props.settingsStorage).recipeIndex).toHaveLength(24);
    expect(readRecipeRecord(props.settingsStorage, original.recipeId)).not.toBeNull();
  });

  it("saves history rating and note from the history detail view", () => {
    const { instance, props } = createPage();
    const recipe = readRecipeRecord(props.settingsStorage, "seed_ap_daily_clean")!;
    const historyEntry = {
      schemaVersion: 1,
      historyId: "hist_settings_feedback_1",
      sessionId: "sess_settings_feedback_1",
      recipeId: recipe.recipeId,
      toolId: recipe.toolId,
      recipeSnapshot: createRecipeSnapshot(recipe),
      status: "completed",
      startedAt: 1711111111111,
      endedAt: 1711111112222,
      elapsedMs: 1111,
      stepRunResults: [],
      deviationSummary: { totalDeltaMs: 0, worstStepDeltaMs: 0, completedSteps: 1, totalSteps: 1 },
      syncedFrom: "watch",
      createdAt: 1711111112222,
      updatedAt: 1711111112222
    };
    expect(saveHistoryEntry(props.settingsStorage, historyEntry).ok).toBe(true);
    click(findButton(instance.build(props), "History"));
    click(findRecordRow(instance.build(props), recipe.name));
    const detail = instance.build(props);
    expect(findText(detail, "00:01")).toBeDefined();
    instance.updateHistoryDraftField(props, "userRating", "5");
    instance.updateHistoryDraftField(props, "userNote", "Honey, cocoa, clean finish.");
    click(findButton(instance.build(props), "Save notes"));

    expect(readHistoryEntry(props.settingsStorage, historyEntry.historyId)).toMatchObject({
      userRating: 5,
      userNote: "Honey, cocoa, clean finish."
    });
    expect(props.settingsStorage.getItem(getPhoneHistoryRecordKey(historyEntry.historyId))).toBeTruthy();
  });
});
