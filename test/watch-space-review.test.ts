import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPage, createCatalogFixture } from "./support/watch-page-harness.ts";
import { LONG_WATCH_COPY } from "./support/watch-long-content.js";
import { WATCH_STORAGE_KEYS } from "../zepp-app/shared/storage/keys.js";
import { createRecipeSnapshot } from "../zepp-app/shared/domain/schema.js";
import { createActiveBrewSession } from "../zepp-app/shared/engine/recipe-engine.js";

const targets = [[416, 416], [454, 454], [466, 466], [480, 480], [390, 450]];
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(250_000); });
afterEach(() => vi.useRealTimers());

async function load(page: string, width: number, height: number, locale: string) {
  const runtime = await import("./zeus-runtime/runtime.ts");
  runtime.resetZeppRuntime();
  runtime.setDeviceInfo({ width, height, screenShape: width === height ? 1 : 0 });
  runtime.setLanguageCode(locale === "pl-PL" ? 9 : 2);
  await import(`../zepp-app/page/${page}/index.js`);
  const store = await import("../zepp-app/shared/storage/watch-store.js");
  return { runtime, store, definition: runtime.getLastPageDefinition() };
}

async function expectTextFits(text: string, view: Record<string, any>) {
  const { getTextLayout } = await import("@zos/ui");
  const measured = getTextLayout(text, { text_size: view.text_size, text_width: view.w, wrapped: 1 });
  expect(view.h).toBeGreaterThanOrEqual(measured.height);
}

function expectHeaderInsideMask(header: Record<string, any>, width: number, height: number) {
  if (width !== height) return;
  const radius = width / 2;
  for (const x of [header.x, header.x + header.w]) {
    for (const y of [header.y, header.y + header.h]) {
      expect(Math.hypot(x - radius, y - radius)).toBeLessThanOrEqual(radius - 3);
    }
  }
}

for (const locale of ["en-US", "pl-PL"] as const) {
  const copy = LONG_WATCH_COPY[locale];
  for (const [width, height] of targets) {
    describe(`${locale} ${width}x${height} real layouts`, () => {
      it("keeps a long saved-result title inside the round mask", async () => {
        const { runtime, definition } = await load("result-summary", width, height, locale);
        const fixture = createCatalogFixture(locale);
        runtime.setLocalStorageState({ [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify({ ...fixture.lastResult, recipeName: copy.recipeName }) });
        const instance = buildPage(definition);
        const header = runtime.findCreatedWidgetsByType("TEXT").find(w => w.text === copy.recipeName);
        expectHeaderInsideMask(header, width, height);
        expect(runtime.findCreatedWidgetsByType("BUTTON")).toHaveLength(1);
        definition.onDestroy.call(instance);
      });

      it("fits a wrapped empty-state heading above its explanation", async () => {
        const { runtime, definition } = await load("brew-active", width, height, locale);
        const instance = buildPage(definition);
        const [title, body] = runtime.findCreatedWidgetsByType("TEXT");
        await expectTextFits(title.text, title);
        expect(title.y + title.h).toBeLessThan(body.y);
        expect(body.y + body.h).toBeLessThan(runtime.findCreatedWidgetsByType("BUTTON")[0].y);
        definition.onDestroy.call(instance);
      });

      it("reserves four instruction lines, preserves long copy and keeps timer/actions usable", async () => {
        const { runtime, store, definition } = await load("brew-active", width, height, locale);
        const fixture = createCatalogFixture(locale);
        const snapshot = createRecipeSnapshot({ ...fixture.primaryRecord, name: copy.recipeName });
        snapshot.steps[1].body = copy.instruction;
        snapshot.steps[1].title = copy.stepTitle;
        const session = createActiveBrewSession(snapshot, { now: 250_000 });
        Object.assign(session, { currentStepIndex: 1, expectedStepEndAt: 265_000 });
        runtime.setLocalStorageState({ [WATCH_STORAGE_KEYS.activeSession]: JSON.stringify(session) });
        const instance = buildPage(definition);
        expectHeaderInsideMask(runtime.findCreatedWidgetsByType("TEXT")[0], width, height);
        const [list] = runtime.findCreatedWidgetsByType("SCROLL_LIST");
        expect(list.data_array[0].body).toBe(copy.instruction);
        const view = list.item_config[0].text_view[0];
        expect(list.h).toBeGreaterThanOrEqual(100);
        expect(view.text_size).toBe(20);
        await expectTextFits(copy.instruction, view);
        expect(view.w).toBeGreaterThanOrEqual(width === height ? width - 136 : width - 80);
        const buttons = runtime.findCreatedWidgetsByType("BUTTON");
        const timer = runtime.findCreatedWidgetsByType("TEXT").find(w => w.text === "00:15");
        expect(timer.text_size).toBeGreaterThanOrEqual(54);
        expect(timer.y + timer.h).toBeLessThan(list.y);
        for (const button of buttons) {
          expect(button.h).toBeGreaterThanOrEqual(50);
          expect(list.y + list.h).toBeLessThan(button.y);
        }
        // A timer refresh must leave the native scroll widget (and its position) intact.
        vi.advanceTimersByTime(1000);
        expect(runtime.findCreatedWidgetsByType("SCROLL_LIST")).toEqual([list]);
        expect(timer.text).toBe("00:14");
        expect(runtime.router.replace).not.toHaveBeenCalled();
        buttons[0].click_func();
        expect(store.readActiveSession().currentStepIndex).toBe(2);
        definition.onDestroy.call(instance);
      });

      it("measures paragraph breaks and long metadata without hiding Start", async () => {
        const { runtime, store, definition } = await load("recipe-detail", width, height, locale);
        const fixture = createCatalogFixture(locale);
        const snapshot = createRecipeSnapshot({
          ...fixture.primaryRecord, description: copy.description,
          grindLabel: copy.grindLabel, filterLabel: copy.filterLabel
        });
        fixture.catalogCache.recipeSnapshotsById[snapshot.recipeId] = snapshot;
        runtime.setLocalStorageState({ [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache) });
        store.writeSelectedRecipeId(snapshot.recipeId);
        const instance = buildPage(definition);
        expectHeaderInsideMask(runtime.findCreatedWidgetsByType("TEXT")[0], width, height);
        const [list] = runtime.findCreatedWidgetsByType("SCROLL_LIST");
        expect(list.data_array.at(-1).meta).toBe(copy.description);
        for (const [index, row] of list.data_array.entries()) {
          const config = list.item_config[index];
          await expectTextFits(row.meta, config.text_view[1]);
          expect(config.item_height).toBeGreaterThanOrEqual(config.text_view[1].y + config.text_view[1].h);
        }
        const [start] = runtime.findCreatedWidgetsByType("BUTTON");
        expect(list.y + list.h).toBeLessThan(start.y);
        start.click_func();
        expect(store.readActiveSession().recipeSnapshot.description).toBe(copy.description);
        definition.onDestroy.call(instance);
      });

      it("expands long recipe names without overlapping metadata or changing the tapped recipe", async () => {
        const { runtime, store, definition } = await load("recipe-list", width, height, locale);
        const fixture = createCatalogFixture(locale);
        fixture.primarySummary.name = copy.recipeName;
        runtime.setLocalStorageState({ [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache) });
        store.getRuntimeState().selectedToolId = "tool_aeropress";
        const instance = buildPage(definition);
        const [list] = runtime.findCreatedWidgetsByType("SCROLL_LIST");
        const [title, meta] = list.item_config[0].text_view;
        await expectTextFits(copy.recipeName, title);
        expect(title.y + title.h).toBeLessThanOrEqual(meta.y);
        expect(meta.y + meta.h).toBeLessThan(list.item_config[0].item_height);
        expect(list.item_config[0].item_height).toBeGreaterThan(list.item_config[1].item_height);
        list.item_click_func(null, 0);
        expect(store.readSelectedRecipeId()).toBe(fixture.primarySummary.recipeId);
        definition.onDestroy.call(instance);
      });
    });
  }
}

it("accounts for explicit short lines that character-count estimates miss", async () => {
  const { runtime, store, definition } = await load("recipe-detail", 416, 416, "en-US");
  const fixture = createCatalogFixture();
  fixture.primarySnapshot.description = "Rinse.\nWarm.\nWeigh.\nGrind.\nPour.\nSwirl.\nWait.\nPress.\nServe.\nTaste.";
  runtime.setLocalStorageState({ [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache) });
  store.writeSelectedRecipeId(fixture.primarySnapshot.recipeId);
  const instance = buildPage(definition);
  const [list] = runtime.findCreatedWidgetsByType("SCROLL_LIST");
  await expectTextFits(fixture.primarySnapshot.description, list.item_config.at(-1).text_view[1]);
  definition.onDestroy.call(instance);
});

it("keeps a legacy snapshot without a description readable and startable", async () => {
  const { runtime, store, definition } = await load("recipe-detail", 480, 480, "en-US");
  const fixture = createCatalogFixture();
  delete fixture.primarySnapshot.description;
  runtime.setLocalStorageState({ [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache) });
  store.writeSelectedRecipeId(fixture.primarySnapshot.recipeId);
  const instance = buildPage(definition);
  expect(runtime.findCreatedWidgetsByType("TEXT").some(w => w.text === "Start when ready.")).toBe(true);
  runtime.findCreatedWidgetsByType("BUTTON")[0].click_func();
  expect(store.readActiveSession().recipeSnapshot.recipeId).toBe(fixture.primarySnapshot.recipeId);
  definition.onDestroy.call(instance);
});
