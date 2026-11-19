import { beforeEach, expect, it, vi } from "vitest";
import { resetPageBrightTime, setPageBrightTime, setWakeUpRelaunch } from "@zos/display";
import { disableActiveSessionDisplayGuard, enableActiveSessionDisplayGuard } from "../zepp-app/shared/watch/display-guard.js";

const { store, log } = vi.hoisted(() => ({
  store: { readActiveSession: vi.fn(), writeActiveSession: vi.fn() },
  log: vi.fn()
}));
vi.mock("../zepp-app/shared/storage/watch-store.js", () => store);
vi.mock("../zepp-app/shared/watch/validation-log.js", () => ({ logValidation: log }));

beforeEach(() => vi.resetAllMocks());

it.each([[undefined, 120_000], [0, 60_000], [150_000, 210_000], [9_000_000, 600_000]])(
  "bounds brightness time for a duration estimate of %s", (estimatedTotalDurationMs, expected) => {
    const session = { recipeId: "open", recipeSnapshot: { estimatedTotalDurationMs } };
    store.readActiveSession.mockReturnValue(session);
    expect(enableActiveSessionDisplayGuard()).toBe(true);
    expect(setWakeUpRelaunch).toHaveBeenCalledWith(true);
    expect(setPageBrightTime).toHaveBeenCalledWith({ brightTime: expected });
    expect(store.writeActiveSession).toHaveBeenCalledWith({
      ...session, wakeUpResumeEnabled: true, pageBrightModeEnabled: true
    });
  }
);

it("keeps the available guard when a device API throws and releases guards independently", () => {
  const diagnostics = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    expect(enableActiveSessionDisplayGuard()).toBe(false);
    vi.mocked(setWakeUpRelaunch).mockImplementationOnce(() => { throw new Error("Wake unavailable"); });
    const session = { recipeId: "open" };
    expect(enableActiveSessionDisplayGuard(session)).toBe(true);
    expect(store.writeActiveSession).toHaveBeenCalledWith({
      ...session, wakeUpResumeEnabled: false, pageBrightModeEnabled: true
    });
    vi.mocked(setPageBrightTime).mockImplementationOnce(() => { throw new Error("Brightness unavailable"); });
    expect(enableActiveSessionDisplayGuard(session)).toBe(true);
    expect(store.writeActiveSession).toHaveBeenLastCalledWith({
      ...session, wakeUpResumeEnabled: true, pageBrightModeEnabled: false
    });
    vi.mocked(setWakeUpRelaunch).mockImplementationOnce(() => { throw new Error("Wake reset unavailable"); });
    vi.mocked(resetPageBrightTime).mockImplementationOnce(() => { throw new Error("Brightness reset unavailable"); });
    disableActiveSessionDisplayGuard();
    expect(setWakeUpRelaunch).toHaveBeenLastCalledWith(false);
    expect(resetPageBrightTime).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith("display_guard_disable", { wakeDisabled: false, brightReset: false });
  } finally {
    diagnostics.mockRestore();
  }
});

it("does not record a rejected brightness change or reset as successful", () => {
  const session = { recipeId: "open", pageBrightModeEnabled: true };
  vi.mocked(setPageBrightTime).mockReturnValueOnce(1);
  vi.mocked(resetPageBrightTime).mockReturnValueOnce(2);
  expect(enableActiveSessionDisplayGuard(session)).toBe(true); // Wake relaunch is still available.
  expect(store.writeActiveSession).toHaveBeenCalledWith({
    ...session, wakeUpResumeEnabled: true, pageBrightModeEnabled: false
  });
  disableActiveSessionDisplayGuard();
  expect(log).toHaveBeenCalledWith("display_guard_disable", { wakeDisabled: true, brightReset: false });
});
