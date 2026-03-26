import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("watch layouts and shortcut helpers", () => {
  it("builds scaffold and floating styles from the current device dimensions", async () => {
    vi.doMock("@zos/device", () => ({
      getDeviceInfo: () => ({
        width: 466,
        height: 466
      })
    }));

    const layouts = await import("../zepp-app/shared/watch/layouts.js");
    const roundLayout = layouts.createScaffoldLayout({ shape: "round" });
    const squareLayout = layouts.createScaffoldLayout({ shape: "square" });
    const dangerButton = layouts.createButtonStyle(squareLayout, 1, "danger");
    const fallbackButton = layouts.createButtonStyle(squareLayout, 0, "unknown_theme");
    const floatingButton = layouts.createFloatingButtonStyle(roundLayout, {
      theme: "secondary",
      x: 10,
      y: 20,
      w: 140,
      h: 72
    });
    const floatingDock = layouts.createFloatingDockStyle({
      x: 1,
      y: 2,
      w: 3,
      h: 40
    });
    const panel = layouts.createPanelStyle(squareLayout, {
      y: 99,
      h: 120
    });

    expect(roundLayout.background).toMatchObject({
      w: 466,
      h: 466,
      color: layouts.SHARED_COLORS.background
    });
    expect(roundLayout.buttonX).toBeGreaterThan(squareLayout.buttonX);
    expect(roundLayout.title.align_h).toBe("LEFT");
    expect(squareLayout.body.text_style).toBe("WRAP");
    expect(dangerButton).toMatchObject({
      y: squareLayout.buttonY + (squareLayout.buttonH + squareLayout.buttonGap),
      normal_color: layouts.SHARED_COLORS.danger,
      press_color: layouts.SHARED_COLORS.dangerPress
    });
    expect(fallbackButton.normal_color).toBe(layouts.SHARED_COLORS.primary);
    expect(floatingButton).toMatchObject({
      x: 10,
      y: 20,
      w: 140,
      h: 72,
      radius: 36,
      text_size: 22
    });
    expect(floatingDock).toMatchObject({
      x: 1,
      y: 2,
      w: 3,
      h: 40,
      radius: 20,
      color: layouts.SHARED_COLORS.surfaceMuted
    });
    expect(panel).toMatchObject({
      x: squareLayout.buttonX,
      y: 99,
      w: squareLayout.buttonW,
      h: 120,
      color: layouts.SHARED_COLORS.surface
    });
  });

  it("falls back to the default layout size when device info lookup fails", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    vi.doMock("@zos/device", () => ({
      getDeviceInfo: () => {
        throw new Error("no device info");
      }
    }));

    try {
      const layouts = await import("../zepp-app/shared/watch/layouts.js");
      const layout = layouts.createScaffoldLayout({ shape: "square" });

      expect(layout.background).toMatchObject({
        w: 480,
        h: 480
      });
      expect(consoleSpy).toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("keeps the tool-list layouts centered and wider on both shapes", async () => {
    vi.doMock("@zos/device", () => ({
      getDeviceInfo: () => ({
        width: 480,
        height: 480
      })
    }));

    const roundToolList = await import("../zepp-app/page/tool-list/index.r.layout.js");
    const squareToolList = await import("../zepp-app/page/tool-list/index.s.layout.js");

    expect(roundToolList.TITLE_TEXT.align_h).toBe("CENTER_H");
    expect(roundToolList.LIST_FRAME.x).toBeGreaterThanOrEqual(48);
    expect(roundToolList.LIST_FRAME.w).toBeGreaterThanOrEqual(384);
    expect(roundToolList.LIST_FRAME.h).toBeGreaterThan(320);
    expect(roundToolList.LIST_FRAME.y).toBeGreaterThan(roundToolList.TITLE_TEXT.y + roundToolList.TITLE_TEXT.h);
    expect(roundToolList.LIST_FRAME.itemHeight).toBeLessThan(100);

    expect(squareToolList.TITLE_TEXT.align_h).toBe("CENTER_H");
    expect(squareToolList.LIST_FRAME.x).toBeGreaterThanOrEqual(18);
    expect(squareToolList.LIST_FRAME.w).toBeGreaterThanOrEqual(344);
    expect(squareToolList.LIST_FRAME.h).toBeGreaterThan(210);
    expect(squareToolList.LIST_FRAME.y).toBeGreaterThan(squareToolList.TITLE_TEXT.y + squareToolList.TITLE_TEXT.h);
  });

  it("keeps the brew-active dock as a simple paired-pill layout on both shapes", async () => {
    vi.doMock("@zos/device", () => ({
      getDeviceInfo: () => ({
        width: 480,
        height: 480
      })
    }));

    const layouts = await import("../zepp-app/shared/watch/layouts.js");
    const roundBrewActive = await import("../zepp-app/page/brew-active/index.r.layout.js");
    const squareBrewActive = await import("../zepp-app/page/brew-active/index.s.layout.js");

    expect(roundBrewActive.ACTION_DOCK.color).toBe(layouts.SHARED_COLORS.surfaceMuted);
    expect(roundBrewActive.ACTION_DOCK.radius).toBeGreaterThan(30);
    expect(roundBrewActive.BUTTONS[0].normal_color).toBe(layouts.SHARED_COLORS.primary);
    expect(roundBrewActive.BUTTONS[1].normal_color).toBe(layouts.SHARED_COLORS.secondary);
    expect(roundBrewActive.BUTTONS[0].x).toBeGreaterThan(roundBrewActive.BUTTONS[1].x);
    expect(roundBrewActive.BUTTONS[0].radius).toBeGreaterThan(20);
    expect(roundBrewActive.BUTTONS[1].radius).toBeGreaterThan(20);

    expect(squareBrewActive.ACTION_DOCK.color).toBe(layouts.SHARED_COLORS.surfaceMuted);
    expect(squareBrewActive.ACTION_DOCK.radius).toBeGreaterThan(24);
    expect(squareBrewActive.BUTTONS[0].normal_color).toBe(layouts.SHARED_COLORS.primary);
    expect(squareBrewActive.BUTTONS[1].normal_color).toBe(layouts.SHARED_COLORS.secondary);
    expect(squareBrewActive.BUTTONS[0].x).toBeGreaterThan(squareBrewActive.BUTTONS[1].x);
    expect(squareBrewActive.BUTTONS[0].radius).toBeGreaterThan(18);
    expect(squareBrewActive.BUTTONS[1].radius).toBeGreaterThan(18);
  });

  it("registers the shortcut key handler and debounces repeated presses", async () => {
    let capturedHandler: ((key: string) => boolean) | null = null;

    vi.doMock("@zos/interaction", () => ({
      KEY_SHORTCUT: "KEY_SHORTCUT",
      onKey: ({ callback }: { callback?: (key: string) => boolean }) => {
        capturedHandler = callback ?? null;
        return true;
      }
    }));

    const { registerShortcutKey } = await import("../zepp-app/shared/watch/shortcut-key.js");
    const handler = vi.fn();

    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    try {
      expect(registerShortcutKey(handler)).toBe(true);
      expect(capturedHandler).toBeTruthy();
      expect(capturedHandler?.("KEY_SHORTCUT")).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);

      vi.setSystemTime(1_100);
      expect(capturedHandler?.("KEY_SHORTCUT")).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);

      vi.setSystemTime(1_300);
      expect(capturedHandler?.("KEY_SHORTCUT")).toBe(true);
      expect(handler).toHaveBeenCalledTimes(2);
      expect(capturedHandler?.("OTHER_KEY")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns false when shortcut registration is unavailable", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    vi.doMock("@zos/interaction", () => ({
      KEY_SHORTCUT: "KEY_SHORTCUT",
      onKey: () => {
        throw new Error("shortcut unavailable");
      }
    }));

    try {
      const { registerShortcutKey } = await import("../zepp-app/shared/watch/shortcut-key.js");
      expect(registerShortcutKey(() => {})).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
