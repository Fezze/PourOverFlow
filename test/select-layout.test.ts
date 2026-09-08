import { afterEach, expect, test, vi } from "vitest";

afterEach(() => { vi.doUnmock("@zos/device"); vi.resetModules(); });

test.each([
  [{ screenShape: 1, width: 416, height: 416 }, "round"],
  [{ screenShape: 0, width: 390, height: 450 }, "square"],
  [{ screenShape: 0, width: 480, height: 480 }, "square"],
  [{ width: 390, height: 450 }, "square"],
  [{ width: 480, height: 480 }, "round"],
  [{}, "round"]
])("selects the layout for device %j", async (info, expected) => {
  vi.doMock("@zos/device", () => ({
    getDeviceInfo: () => info, SCREEN_SHAPE_ROUND: 1, SCREEN_SHAPE_SQUARE: 0
  }));
  const { selectDeviceLayout } = await import("../zepp-app/shared/watch/select-layout.js");
  expect(selectDeviceLayout("round", "square")).toBe(expected);
});

test("retains the fallback when device info is unavailable", async () => {
  vi.doMock("@zos/device", () => ({
    getDeviceInfo: () => { throw new Error("permission unavailable"); },
    SCREEN_SHAPE_ROUND: 1, SCREEN_SHAPE_SQUARE: 0
  }));
  const { selectDeviceLayout } = await import("../zepp-app/shared/watch/select-layout.js");
  expect(selectDeviceLayout("round", "square")).toBe("round");
});

test.each(["home", "tool-list", "recipe-list", "recipe-detail", "brew-active", "result-summary"])("loads real %s layouts for both screen shapes", async (page) => {
  for (const shape of [1, 0]) {
    vi.resetModules();
    vi.doMock("@zos/device", () => ({
      getDeviceInfo: () => ({ screenShape: shape, width: shape ? 480 : 390, height: shape ? 480 : 450 }),
      SCREEN_SHAPE_ROUND: 1, SCREEN_SHAPE_SQUARE: 0
    }));
    const selected = await import(`../zepp-app/page/${page}/index.layout.js`);
    const expected = await import(`../zepp-app/page/${page}/index.${shape ? "r" : "s"}.layout.js`);
    expect(Object.keys(selected).sort()).toEqual(Object.keys(expected).sort());
    for (const key of Object.keys(expected)) expect(selected[key]).toBe(expected[key]);
  }
});
