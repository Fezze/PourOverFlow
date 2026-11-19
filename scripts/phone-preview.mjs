import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

import { chromium } from "playwright-core";
import { build } from "esbuild";

import { LONG_WATCH_COPY } from "../test/support/watch-long-content.js";
import { COLORS, FIELD_LABEL } from "../zepp-app/setting/appearance.js";
import { createTranslator } from "../zepp-app/shared/i18n/index.js";
import { createRecipeSnapshot } from "../zepp-app/shared/domain/schema.js";
import {
  ensurePhoneStorage,
  readPhoneSnapshot,
  readRecipeRecord,
  saveHistoryEntry
} from "../zepp-app/shared/storage/phone-store.js";
import { getPhoneRecipeRecordKey, PHONE_STORAGE_KEYS, SETTINGS_UI_STORAGE_KEY } from "../zepp-app/shared/storage/keys.js";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUT_DIR = resolve(
  readOption("--output") || process.env.PHONE_PREVIEW_OUTPUT || "output/playwright/phone-preview/screenshots"
);
const APP_ROOT = resolve(readOption("--app-root") || resolve(ROOT, "zepp-app"));
const FIXTURE_TIME = 1794690000000;
const VIEWPORTS = [360, 390, 430];
const DEVICE_HEIGHT = 844;
const LOCALES = ["en-US", "pl-PL"];
const TOOL_IDS = [
  "tool_aeropress",
  "tool_v60",
  "tool_kalita_wave",
  "tool_chemex",
  "tool_clever_dripper",
  "tool_french_press"
];

function readOption(name) {
  const exactIndex = process.argv.indexOf(name);
  if (exactIndex >= 0) return process.argv[exactIndex + 1];
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function node(type, props = {}, children = []) {
  return {
    type,
    props,
    children: (Array.isArray(children) ? children : [children]).filter(Boolean)
  };
}

class PreviewStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries));
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }

  toJSON() {
    return Object.fromEntries(this.values);
  }
}

function createHistoryEntry(recipe, historyId, endedAt, userRating, userNote) {
  return {
    schemaVersion: 1,
    historyId,
    sessionId: `session_${historyId}`,
    recipeId: recipe.recipeId,
    toolId: recipe.toolId,
    recipeSnapshot: createRecipeSnapshot(recipe),
    status: "completed",
    startedAt: endedAt - 184_000,
    endedAt,
    elapsedMs: 184_000,
    stepRunResults: (recipe.steps || []).map((step, order) => ({
      stepId: step.stepId,
      order,
      title: step.title,
      kind: step.kind,
      actualDurationMs: step.durationMs || 0
    })),
    deviationSummary: {
      totalDeltaMs: 8_000,
      worstStepDeltaMs: 5_000,
      completedSteps: recipe.steps.length,
      totalSteps: recipe.steps.length
    },
    syncedFrom: "watch",
    createdAt: endedAt,
    updatedAt: endedAt,
    userRating,
    userNote
  };
}

function seedPreviewStorage(locale, includeHistory = true) {
  const storage = new PreviewStorage();
  ensurePhoneStorage(storage, { preferredLocale: locale });
  const snapshot = readPhoneSnapshot(storage);
  const recentRecipe = readRecipeRecord(storage, snapshot.recipeIndex[0].recipeId);
  const olderRecipe = readRecipeRecord(storage, snapshot.recipeIndex[1].recipeId);
  const now = FIXTURE_TIME;

  if (includeHistory) {
    [
      createHistoryEntry(recentRecipe, `history_${locale}_recent`, now - 60_000, 5, "Honey sweetness, clear finish."),
      createHistoryEntry(olderRecipe, `history_${locale}_older`, now - 86_400_000, undefined, "Slightly finer next time.")
    ].forEach((historyEntry) => saveHistoryEntry(storage, historyEntry));
  }

  return storage;
}

function removeBrewerRecipes(storage, toolId) {
  const index = JSON.parse(storage.getItem(PHONE_STORAGE_KEYS.recipeIndex) || "[]");
  index.filter((recipe) => recipe.toolId === toolId).forEach((recipe) => {
    storage.removeItem(getPhoneRecipeRecordKey(recipe.recipeId));
  });
  storage.setItem(PHONE_STORAGE_KEYS.recipeIndex, JSON.stringify(index.filter((recipe) => recipe.toolId !== toolId)));
}

function makeUiState(storage, state) {
  storage.setItem(SETTINGS_UI_STORAGE_KEY, JSON.stringify({
    view: state.view,
    selectedToolId: state.toolId || "tool_aeropress",
    editingRecipeId: state.recipeId || null,
    selectedHistoryId: state.historyId || null,
    draftRecipe: null,
    historyDraft: null,
    stepPageIndex: 0,
    flashMessage: "",
    errorMessage: ""
  }));
}

function createPageInstance(config) {
  const instance = {
    ...config,
    state: structuredClone(config.state)
  };

  return instance;
}

function styleToCss(style = {}, iconDataUris = {}) {
  return Object.entries(style)
    .map(([key, value]) => {
      const property = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      const nextValue = typeof value === "number" && !["opacity", "zIndex", "flex", "fontWeight", "order"].includes(key)
        ? `${value}px`
        : String(value);
      const withIcons = nextValue.replace(/url\(["']?(.*?)["']?\)/g, (match, path) => {
        const stem = path.split("/").at(-1)?.replace(/\.png$/i, "");
        return stem && iconDataUris[stem] ? `url("${iconDataUris[stem]}")` : match;
      });
      return `${property}:${withIcons}`;
    })
    .join(";");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderNode(value, iconDataUris) {
  if (value === null || value === undefined || value === false) return "";
  if (Array.isArray(value)) return value.map((child) => renderNode(child, iconDataUris)).join("");
  if (typeof value === "string" || typeof value === "number") return escapeHtml(value);

  const { type, props = {}, children = [] } = value;
  const style = escapeHtml(styleToCss(props.style, iconDataUris));
  if (type === "View") {
    const role = typeof props.onClick === "function" ? ' role="button" tabindex="0"' : "";
    return `<div${role} style="${style}">${renderNode(children, iconDataUris)}</div>`;
  }
  if (type === "Text") {
    return `<div data-text style="${style};text-align:${escapeHtml(props.align || "left")}">${renderNode(children, iconDataUris)}</div>`;
  }
  if (type === "Button") {
    return `<button style="${style}" type="button">${escapeHtml(props.label)}</button>`;
  }
  if (type === "TextInput") {
    const field = props.multiline
      ? `<textarea rows="${props.rows || 3}" readonly>${escapeHtml(props.value)}</textarea>`
      : `<input value="${escapeHtml(props.value)}" readonly>`;
    return `<label class="field"><span style="${escapeHtml(styleToCss(props.labelStyle))}">${escapeHtml(props.label)}</span>${field}</label>`;
  }
  if (type === "Select") {
    const options = Array.isArray(props.options) ? props.options : [];
    return `<label class="select-field"><span>${escapeHtml(props.label)}</span><select>${options.map((option) => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(props.value) ? "selected" : ""}>${escapeHtml(option.name)}</option>`).join("")}</select></label>`;
  }
  return renderNode(children, iconDataUris);
}

function renderPageHtml(tree, iconDataUris) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}
    html,body{margin:0;background:${COLORS.background};color:${COLORS.text};font:15px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:dark}
    #device{width:100%;height:${DEVICE_HEIGHT}px;overflow:hidden}
    #root{height:100%;overflow:auto;scrollbar-width:none}
    #root::-webkit-scrollbar{display:none}
    button,input,textarea,select{font:inherit}
    button{white-space:pre-wrap}
    button,[role="button"]{cursor:pointer}
    label.field{display:flex;flex-direction:column;gap:7px;color:${FIELD_LABEL.color};font-weight:${FIELD_LABEL.fontWeight}}
    label.field :is(input,textarea,select){width:100%;min-height:44px;padding:10px 12px;border:1px solid ${COLORS.secondaryPress};border-radius:12px;background:${COLORS.surfaceMuted};color:${COLORS.text};font-size:16px;font-weight:400}
    label.select-field{display:flex;flex-direction:column;max-width:300px;min-width:120px;line-height:20px}
    label.select-field select{width:100%;height:32px;flex-shrink:0}
    textarea{resize:none}
  </style></head><body><div id="device"><div id="root">${renderNode(tree, iconDataUris)}</div></div></body></html>`;
}

async function createHarnessBundle() {
  const result = await build({
    entryPoints: [resolve(APP_ROOT, "setting/index.js")],
    bundle: true,
    format: "iife",
    platform: "browser",
    write: false
  });
  return result.outputFiles[0].text;
}

async function readToolIcons() {
  const iconDataUris = {};
  for (const toolId of TOOL_IDS) {
    const stem = toolId.replace(/^tool_/, "tool-").replaceAll("_", "-");
    const file = resolve(APP_ROOT, `assets/common.s/${stem}.png`);
    const bytes = await readFile(file);
    iconDataUris[stem] = `data:image/png;base64,${bytes.toString("base64")}`;
  }
  return iconDataUris;
}

function buildScenarios(storage, locale) {
  const populated = readPhoneSnapshot(storage);
  const recipeId = populated.recipeIndex[0].recipeId;
  const selectedRecipe = readRecipeRecord(storage, recipeId);
  const historyId = populated.historyIndex[0]?.historyId;
  const emptyRecipeStorage = new PreviewStorage(storage.toJSON());
  removeBrewerRecipes(emptyRecipeStorage, "tool_french_press");
  const emptyHistoryStorage = new PreviewStorage(storage.toJSON());
  emptyHistoryStorage.setItem(PHONE_STORAGE_KEYS.historyIndex, "[]");
  const longRecipeStorage = new PreviewStorage(storage.toJSON());
  const longCopy = LONG_WATCH_COPY[locale];
  const updatedAt = populated.recipeIndex[0].updatedAt + 1;
  longRecipeStorage.setItem(PHONE_STORAGE_KEYS.recipeIndex, JSON.stringify(populated.recipeIndex.map((entry) =>
    entry.recipeId === recipeId ? { ...entry, name: longCopy.recipeName, updatedAt } : entry
  )));
  longRecipeStorage.setItem(getPhoneRecipeRecordKey(recipeId), JSON.stringify({
    ...selectedRecipe,
    name: longCopy.recipeName,
    updatedAt,
    description: longCopy.description,
    steps: selectedRecipe.steps.map((step, index) =>
      index === 3 ? { ...step, title: longCopy.stepTitle, body: longCopy.instruction } : step
    )
  }));

  const manyStepsStorage = new PreviewStorage(storage.toJSON());
  const steps = Array.from({ length: 33 }, (_, index) => {
    const source = selectedRecipe.steps[index === 32
      ? selectedRecipe.steps.length - 1
      : index % (selectedRecipe.steps.length - 1)];
    return { ...source, stepId: `preview_step_${index}`, order: index };
  });
  manyStepsStorage.setItem(getPhoneRecipeRecordKey(recipeId), JSON.stringify({ ...selectedRecipe, steps }));

  return [
    { name: "library", storage, state: { view: "library-home" } },
    { name: "recipe-list", storage, state: { view: "recipe-list", toolId: selectedRecipe.toolId } },
    { name: "recipe-editor", storage, state: { view: "recipe-editor", toolId: selectedRecipe.toolId, recipeId } },
    { name: "recipe-editor-step-4", storage, state: { view: "recipe-editor", toolId: selectedRecipe.toolId, recipeId, stepPageIndex: 3 } },
    { name: "recipe-list-long", storage: longRecipeStorage, state: { view: "recipe-list", toolId: selectedRecipe.toolId } },
    { name: "recipe-editor-long-step", storage: longRecipeStorage, state: { view: "recipe-editor", toolId: selectedRecipe.toolId, recipeId, stepPageIndex: 3 } },
    { name: "recipe-editor-33-steps", storage: manyStepsStorage, state: { view: "recipe-editor", toolId: selectedRecipe.toolId, recipeId, stepPageIndex: 16 } },
    { name: "recipe-list-empty", storage: emptyRecipeStorage, state: { view: "recipe-list", toolId: "tool_french_press" } },
    { name: "history-list", storage, state: { view: "history-list" } },
    { name: "history-list-empty", storage: emptyHistoryStorage, state: { view: "history-list" } },
    { name: "history-detail", storage, state: { view: "history-detail", historyId } },
    { name: "sync", storage, state: { view: "about-sync" } }
  ];
}

async function verifyLayout(page, scenario, locale, width) {
  const problems = await page.locator("#root").evaluate((root) => {
    const issues = [];
    for (const element of root.querySelectorAll('[data-text], button, [role="button"], label, input, textarea, select')) {
      const bounds = element.getBoundingClientRect();
      const label = element.textContent.trim().slice(0, 60) || element.tagName;
      if (element.matches("label.select-field")) continue;
      if (bounds.left < -1 || bounds.right > root.clientWidth + 1) {
        issues.push(`outside the viewport: ${label}`);
      }
      if (element.matches('[data-text], button') && element.scrollWidth > element.clientWidth + 1) {
        issues.push(`clipped text: ${label}`);
      }
      if (element.matches('button, [role="button"], input, textarea, select') && bounds.height < 44) {
        issues.push(`target shorter than 44px: ${label}`);
      }
    }
    return issues;
  });

  if (problems.length) {
    throw new Error(`${locale}/${scenario.name}/${width}px: ${problems.join("; ")}`);
  }
  if (scenario.state.stepPageIndex) {
    const i18n = createTranslator(locale);
    const heading = page.getByText(i18n.t("settings.editor.guidedStepsTitle"), { exact: true })
      .and(page.locator("[data-text]"));
    const input = page.getByRole("textbox", { name: i18n.t("settings.labels.body"), exact: true });
    const steps = readRecipeRecord(scenario.storage, scenario.state.recipeId).steps;
    if (await input.inputValue() !== steps[scenario.state.stepPageIndex].body) {
      throw new Error(`${locale}/${scenario.name}: selected step instructions do not match the fixture`);
    }
    const stepSelect = page.getByRole("combobox", { name: i18n.t("settings.editor.jumpToStep"), exact: true });
    const stepOptions = stepSelect.locator("option");
    const title = (step) => step.title?.trim() || i18n.t("settings.editor.untitledStep");
    if (await stepOptions.count() !== steps.length ||
        await stepOptions.last().textContent() !== `${steps.length}. ${title(steps.at(-1))}` ||
        await stepSelect.locator("option:checked").textContent() !==
          `${scenario.state.stepPageIndex + 1}. ${title(steps[scenario.state.stepPageIndex])}`) {
      throw new Error(`${locale}/${scenario.name}: the step Select does not match the fixture`);
    }
    await heading.evaluate((element) => {
      element.closest("#root").scrollTop += element.getBoundingClientRect().top - 22;
    });
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const bundle = await createHarnessBundle();
  const icons = await readToolIcons();
  const browserPath = process.env.PHONE_PREVIEW_BROWSER || process.env.PLAYWRIGHT_COVERAGE_BROWSER;
  const browserOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-crash-reporter"]
  };
  if (browserPath) browserOptions.executablePath = browserPath;

  const browser = await chromium.launch(browserOptions);
  const page = await browser.newPage({ viewport: { width: VIEWPORTS[0], height: DEVICE_HEIGHT }, deviceScaleFactor: 1 });

  let screenshotCount = 0;
  for (const locale of LOCALES) {
    let pageConfig;
    const make = (type) => (props = {}, children = []) => node(type, props, children);
    runInNewContext(bundle, {
      console,
      navigator: { language: locale },
      AppSettingsPage: (config) => { pageConfig = config; },
      View: make("View"), Text: make("Text"), Button: make("Button"),
      TextInput: make("TextInput"), Select: make("Select"),
      Date: class extends Date { static now() { return FIXTURE_TIME; } }
    });
    const storage = seedPreviewStorage(locale);
    await mkdir(resolve(OUT_DIR, locale), { recursive: true });
    const scenarios = buildScenarios(storage, locale);
    for (const scenario of scenarios) {
      for (const width of VIEWPORTS) {
        makeUiState(scenario.storage, scenario.state);
        const settingsStorage = new PreviewStorage(scenario.storage.toJSON());
        const instance = createPageInstance(pageConfig);
        const props = { settingsStorage };
        instance.hydrateFromStorage(props);
        if (scenario.state.view === "recipe-editor") {
          instance.openRecipeEditor(props, scenario.state.recipeId);
          if (scenario.state.stepPageIndex) instance.setStepPage(props, scenario.state.stepPageIndex);
        } else if (scenario.state.view === "history-detail") {
          instance.openHistoryDetail(props, scenario.state.historyId);
        }
        const tree = instance.build(props);
        await page.setViewportSize({ width, height: DEVICE_HEIGHT });
        await page.setContent(renderPageHtml(tree, icons));
        await verifyLayout(page, scenario, locale, width);
        await page.locator("#device").screenshot({ path: resolve(OUT_DIR, locale, `${scenario.name}-${width}.png`) });
        await page.locator("#root").evaluate(root => {
          root.style.height = "auto";
          root.style.overflow = "visible";
          root.parentElement.style.height = "auto";
        });
        await page.locator("#device").screenshot({ path: resolve(OUT_DIR, locale, `${scenario.name}-${width}-full.png`) });
        screenshotCount += 1;
      }
    }
  }

  await browser.close();
  await writeFile(
    resolve(OUT_DIR, "README.txt"),
    `Phone Settings preview screenshots\n\nThese images render the current AppSettingsPage tree from zepp-app/setting/app-settings.jsx through a small browser adapter for the native Zepp Settings primitives. Layout and colors come from the actual component style props; native input chrome is approximated in HTML. This is a source-backed preview, not a Zepp companion app capture.\n\nLocales: en-US, pl-PL\nWidths: ${VIEWPORTS.join(", ")}px\nScenarios: library, recipe list, recipe editor, later recipe step, long recipe name and instruction, 33-step editor with the selected step and a full title list, empty recipe shelf, populated and empty history list, history detail, sync.\nScenarios verified: ${screenshotCount}\nImages written: ${screenshotCount * 2}\n`
  );
  console.log(`Rendered ${screenshotCount} phone previews to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
