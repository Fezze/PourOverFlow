import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPage, createCatalogFixture, createLayoutMock, loadPageHarness } from "./support/watch-page-harness.ts";
import { WATCH_STORAGE_KEYS } from "../zepp-app/shared/storage/keys.js";

beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });

describe("watch browsing gestures", () => {
  it("switches only the two existing browsing tabs and preserves vertical scrolling", async () => {
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/tool-list/index.js", createLayoutMock());
    const instance = buildPage(pageDefinition);
    const gesture = runtime.__zeusRuntime.interactionState.gestureHandler!;
    expect(gesture(runtime.interaction.GESTURE_UP)).toBe(false);
    expect(gesture(runtime.interaction.GESTURE_DOWN)).toBe(false);
    expect(gesture(runtime.interaction.GESTURE_RIGHT)).toBe(false);
    expect(runtime.router.replace).not.toHaveBeenCalled();
    expect(gesture(runtime.interaction.GESTURE_LEFT)).toBe(true);
    expect(runtime.router.replace).toHaveBeenCalledWith({ url: "page/result-summary/index" });
    pageDefinition.onDestroy.call(instance);
    expect(runtime.__zeusRuntime.interactionState.gestureHandler).toBeNull();
  });

  it("returns from the latest result without creating a new navigation stack", async () => {
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/result-summary/index.js", createLayoutMock());
    const fixture = createCatalogFixture();
    runtime.setLocalStorageState({ [WATCH_STORAGE_KEYS.lastResult]: JSON.stringify(fixture.lastResult) });
    const instance = buildPage(pageDefinition);
    const gesture = runtime.__zeusRuntime.interactionState.gestureHandler!;
    expect(gesture(runtime.interaction.GESTURE_LEFT)).toBe(false);
    expect(gesture(runtime.interaction.GESTURE_RIGHT)).toBe(true);
    expect(runtime.router.replace).toHaveBeenCalledWith({ url: "page/tool-list/index" });
    expect(runtime.router.push).not.toHaveBeenCalled();
    pageDefinition.onDestroy.call(instance);
  });
});

describe("recipe content preservation", () => {
  it("gives overflowing detail text its full scrollable height and retains Start", async () => {
    const fixture = createCatalogFixture();
    const description = "A long instruction with every detail preserved. ".repeat(20);
    fixture.primarySnapshot.description = description;
    const { runtime, pageDefinition } = await loadPageHarness("../zepp-app/page/recipe-detail/index.js", createLayoutMock());
    const store = await import("../zepp-app/shared/storage/watch-store.js");
    runtime.setLocalStorageState({ [WATCH_STORAGE_KEYS.catalogCache]: JSON.stringify(fixture.catalogCache) });
    store.writeSelectedRecipeId(fixture.primarySummary.recipeId);
    buildPage(pageDefinition);
    const note = runtime.findCreatedWidgetsByType("TEXT").find(w => w.text === description);
    const start = runtime.findCreatedWidgetsByType("BUTTON")[0];
    const reader = runtime.getCreatedWidgets()[note.parentIndex];
    expect(reader.type).toBe("VIEW_CONTAINER");
    expect(reader.y + reader.h).toBeLessThan(start.y);
    expect(runtime.getCreatedWidgets()[0].h).toBe(480);
    expect(start.text).toBe("Start brew");
    start.click_func();
    expect(store.readActiveSession().recipeSnapshot.description).toBe(description);
  });
});

describe("circular action safe areas", () => {
  for (const size of [416, 454, 466, 480]) {
    it(`keeps rounded action surfaces inside the ${size}px watch mask`, async () => {
      vi.doMock("@zos/device", () => ({ getDeviceInfo: () => ({ width: size, height: size }) }));
      for (const name of ["home", "recipe-detail", "brew-active", "result-summary"]) {
        const layout = await import(`../zepp-app/page/${name}/index.r.layout.js`);
        for (const button of layout.BUTTONS) {
          const radius = Math.min(button.radius, button.w / 2, button.h / 2);
          const corners = [
            [button.x + button.w - radius, button.y + radius, -90],
            [button.x + button.w - radius, button.y + button.h - radius, 0],
            [button.x + radius, button.y + button.h - radius, 90],
            [button.x + radius, button.y + radius, 180]
          ];
          for (const [cx, cy, start] of corners) {
            for (let degrees = start; degrees <= start + 90; degrees += 15) {
              const x = cx + radius * Math.cos(degrees * Math.PI / 180);
              const y = cy + radius * Math.sin(degrees * Math.PI / 180);
              expect(Math.hypot(x - size / 2, y - size / 2), `${name} action is clipped at ${x},${y}`).toBeLessThanOrEqual(size / 2 - 2);
            }
          }
        }
      }
    });
  }
});
