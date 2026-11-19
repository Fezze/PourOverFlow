import { beforeEach, expect, it } from "vitest";
import { enterWatchPage, pushWatchPage, replaceWatchPage, returnToWatchPage } from "../../zepp-app/shared/watch/navigation.js";
import { __zeusRuntime, resetZeppRuntime } from "../zeus-runtime/runtime.ts";

beforeEach(resetZeppRuntime);

it("skips intermediate builds and unwinds to the existing home repeatedly", () => {
  const { router } = __zeusRuntime;
  for (let brew = 0; brew < 2; brew += 1) {
    expect(enterWatchPage("home")).toBe(true);
    for (const url of ["tools", "recipes", "details", "brew"]) {
      pushWatchPage({ url });
      expect(enterWatchPage(url)).toBe(true);
    }
    replaceWatchPage({ url: "result" });
    expect(enterWatchPage("result")).toBe(true);
    returnToWatchPage("home");
    for (const url of ["details", "recipes", "tools"]) {
      expect(enterWatchPage(url)).toBe(false);
    }
    expect(enterWatchPage("home")).toBe(true);
  }
  expect(router.back).toHaveBeenCalledTimes(8);
  expect(router.replace.mock.calls.map(([route]) => route.url)).toEqual(["result", "result"]);
});

it("recreates home from a direct app wake without backing out of the app", () => {
  expect(enterWatchPage("brew")).toBe(true);
  returnToWatchPage("home");
  expect(__zeusRuntime.router.back).not.toHaveBeenCalled();
  expect(__zeusRuntime.router.replace).toHaveBeenCalledWith({ url: "home" });
});
