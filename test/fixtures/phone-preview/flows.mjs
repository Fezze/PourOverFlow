import assert from "node:assert/strict";

import { getLocalizedToolLabel, getToolById } from "../../../zepp-app/shared/constants/tool-catalog.js";
import { createTranslator } from "../../../zepp-app/shared/i18n/index.js";
import { readHistoryEntry, readPhoneSnapshot, readRecipeRecord } from "../../../zepp-app/shared/storage/phone-store.js";

export async function verifyPhoneFlows(page, storage, locale, flushActions) {
  const i18n = createTranslator(locale);
  const label = (key, params) => i18n.t(`settings.${key}`, params);
  const button = (key) => page.getByRole("button", { name: label(key), exact: true });
  const textbox = (key) => page.getByRole("textbox", { name: label(key), exact: true });
  const select = (key) => page.getByRole("combobox", { name: label(key), exact: true });
  const row = (title) => page.getByRole("button").filter({
    has: page.getByText(title, { exact: true })
  });
  const click = async (locator) => {
    await locator.click();
    await flushActions();
  };
  const fill = async (key, value) => {
    await textbox(key).fill(value);
    await flushActions();
  };
  const choose = async (locator, option) => {
    await locator.selectOption(option);
    await flushActions();
  };

  const initial = readPhoneSnapshot(storage);
  const aeropress = getLocalizedToolLabel(getToolById("tool_aeropress"), i18n);
  await click(row(aeropress));
  await click(button("library.newRecipe"));
  await fill("labels.name", "   ");
  await click(button("editor.saveRecipe"));
  assert.deepEqual(readPhoneSnapshot(storage).recipeIndex, initial.recipeIndex);
  await page.getByText("Recipe name cannot be empty.", { exact: true }).waitFor();

  const recipeName = "Weekend filter brew";
  const stepTitle = "Rinse the paper";
  const instructions = "Rinse with hot water.\nEmpty the brewer before adding coffee.";
  const stepSelect = select("editor.jumpToStep");
  await fill("labels.name", recipeName);
  await click(button("editor.addStep"));
  await fill("labels.title", stepTitle);
  await fill("labels.body", instructions);

  await choose(stepSelect, { index: 2 });
  assert.equal(await button("editor.addStep").count(), 0, "Finish must not offer Add step");
  await click(button("editor.previous"));
  assert.equal(await textbox("labels.body").inputValue(), instructions);
  assert.equal(await stepSelect.locator("option:checked").textContent(), `2. ${stepTitle}`);
  await click(button("editor.saveRecipe"));

  const saved = readPhoneSnapshot(storage);
  assert.equal(saved.syncMeta.recipeCatalogRevision, initial.syncMeta.recipeCatalogRevision + 1);
  const newRecipe = saved.recipeIndex.find(({ name }) => name === recipeName);
  assert.ok(newRecipe, "The browser save must create a recipe");
  const { steps } = readRecipeRecord(storage, newRecipe.recipeId);
  assert.deepEqual(steps.map(({ kind }) => kind), ["instruction", "instruction", "finish"]);

  await click(row(recipeName));
  await choose(stepSelect, { label: `2. ${stepTitle}` });
  assert.equal(await textbox("labels.body").inputValue(), instructions);

  await click(button("editor.cancel"));
  await click(row(recipeName).locator("..").getByRole("button", { name: label("library.duplicate"), exact: true }));
  const afterDuplicate = readPhoneSnapshot(storage);
  const copy = afterDuplicate.recipeIndex.find((recipe) => recipe.recipeId !== newRecipe.recipeId && recipe.name === `${recipeName} Copy`);
  assert.ok(copy, "Duplicating the recipe must create a separate record");
  const storedCopy = readRecipeRecord(storage, copy.recipeId);
  assert.deepEqual(storedCopy.steps.map(({ title }) => title), steps.map(({ title }) => title));
  assert.equal(afterDuplicate.syncMeta.recipeCatalogRevision, saved.syncMeta.recipeCatalogRevision + 1);

  await click(row(copy.name));
  await click(button("editor.down"));
  assert.equal(await stepSelect.locator("option").first().textContent(), `1. ${stepTitle}`);
  assert.equal(await textbox("labels.title").inputValue(), steps[0].title);
  await click(button("editor.delete"));
  assert.equal(await stepSelect.locator("option").count(), 2);
  assert.equal(await textbox("labels.title").inputValue(), steps.at(-1).title);
  await fill("labels.name", "Unsaved draft title");
  await click(button("editor.cancel"));
  assert.deepEqual(readRecipeRecord(storage, copy.recipeId), storedCopy);
  assert.equal(readPhoneSnapshot(storage).syncMeta.recipeCatalogRevision, afterDuplicate.syncMeta.recipeCatalogRevision);
  await click(row(copy.name));
  assert.equal(await stepSelect.locator("option").count(), 3);

  const { historyId, recipeName: archivedName, toolId } = initial.historyIndex[0];
  const archivedSnapshot = readHistoryEntry(storage, historyId).recipeSnapshot;
  await click(button("nav.history"));
  await click(row(archivedName));
  const note = "Sweet finish. Try a finer grind next time.";
  await choose(select("labels.rating"), { label: "3" });
  await fill("labels.note", note);
  await click(button("history.saveNotes"));
  assert.equal(readHistoryEntry(storage, historyId).userRating, 3);

  await click(button("history.backToHistory"));
  await page.getByText(label("history.rated", { rating: 3 }), { exact: false }).waitFor();
  await click(button("nav.library"));
  const brewer = getLocalizedToolLabel(getToolById(toolId), i18n);
  await click(row(brewer));
  const recipeCard = row(archivedName).locator("..");
  await click(recipeCard.getByRole("button", { name: label("library.delete"), exact: true }));
  assert.equal(await row(archivedName).count(), 0);
  assert.equal(readRecipeRecord(storage, archivedSnapshot.recipeId), null);

  await click(button("nav.history"));
  await click(row(archivedName));
  assert.equal(await textbox("labels.note").inputValue(), note);
  assert.equal(await select("labels.rating").locator("option:checked").textContent(), "3");
  assert.deepEqual(readHistoryEntry(storage, historyId).recipeSnapshot, archivedSnapshot);

  await click(button("nav.sync"));
  await page.getByText(label("sync.revisionsTitle"), { exact: true }).waitFor();
  const final = readPhoneSnapshot(storage);
  const revisionPanel = page.getByText(label("sync.revisionsTitle"), { exact: true }).locator("..");
  for (const [labelKey, value] of [
    ["sync.brewers", final.syncMeta.toolCatalogRevision],
    ["sync.recipes", final.syncMeta.recipeCatalogRevision],
    ["sync.history", final.syncMeta.historyRevision]
  ]) {
    const revisionRow = revisionPanel.getByText(label(labelKey), { exact: true }).locator("..");
    assert.equal(await revisionRow.getByText(String(value), { exact: true }).count(), 1);
  }
}
