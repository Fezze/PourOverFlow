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
import { getPhoneHistoryRecordKey } from "../zepp-app/shared/storage/keys.js";

type SettingsNode = {
  type: string;
  props: Record<string, unknown>;
  children: SettingsNode[];
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
    children: (Array.isArray(children) ? children : [children]).filter(Boolean) as SettingsNode[]
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
  globals.Section = makeNode("Section");
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

function findButton(node: SettingsNode, label: string): SettingsNode | undefined {
  if (node.type === "Button" && node.props.label === label) {
    return node;
  }

  for (const child of node.children) {
    const match = findButton(child, label);
    if (match) {
      return match;
    }
  }

  return undefined;
}

describe("phone settings page behavior", () => {
  it("navigates between the persistent Library, History, and Sync tabs", () => {
    const { instance, props } = createPage();
    const libraryTree = instance.build(props);
    findButton(libraryTree, "History")?.props.onClick?.();
    expect(instance.state.ui.view).toBe("history-list");

    const historyTree = instance.build(props);
    findButton(historyTree, "Sync")?.props.onClick?.();
    expect(instance.state.ui.view).toBe("about-sync");

    const syncTree = instance.build(props);
    findButton(syncTree, "Library")?.props.onClick?.();
    expect(instance.state.ui.view).toBe("library-home");
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

    instance.setStepPage(props, 1);
    expect(instance.state.ui.stepPageIndex).toBe(1);
    instance.setStepPage(props, 999);
    expect(instance.state.ui.stepPageIndex).toBe(instance.state.ui.draftRecipe.steps.length - 1);
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
    instance.hydrateFromStorage(props);
    instance.openHistoryDetail(props, historyEntry.historyId);
    instance.updateHistoryDraftField(props, "userRating", "5");
    instance.updateHistoryDraftField(props, "userNote", "Honey, cocoa, clean finish.");
    instance.saveHistoryDraft(props);

    expect(readHistoryEntry(props.settingsStorage, historyEntry.historyId)).toMatchObject({
      userRating: 5,
      userNote: "Honey, cocoa, clean finish."
    });
    expect(props.settingsStorage.getItem(getPhoneHistoryRecordKey(historyEntry.historyId))).toBeTruthy();
  });
});
