import { beforeEach, describe, expect, it, vi } from "vitest";

function getLastItem(setLike: Set<any>) {
  return Array.from(setLike).at(-1);
}

async function loadFeedbackModule() {
  return import("../shared/engine/feedback.js");
}

async function loadRuntimeModule() {
  return import("./zeus-runtime/runtime.ts");
}

beforeEach(() => {
  vi.resetModules();
});

describe("feedback helpers", () => {
  it("returns stable human-readable labels", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { getFeedbackLabel } = await loadFeedbackModule();

    expect(getFeedbackLabel("vibrate_short")).toBe("Short haptic cue");
    expect(getFeedbackLabel("sound_strong")).toBe("Strong system sound");
    expect(getFeedbackLabel("unknown")).toBe("No cue");
  });

  it("plays a buzzer cue for short vibration feedback", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCue } = await loadFeedbackModule();

    expect(playFeedbackCue("vibrate_short")).toBe(true);

    const buzzer = getLastItem(runtime.__zeusRuntime.buzzerInstances);
    expect(buzzer.start).toHaveBeenCalledWith(1, 0);
  });

  it("falls back to a system sound when combo feedback cannot vibrate", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCue } = await loadFeedbackModule();

    playFeedbackCue("vibrate_short");
    const buzzer = getLastItem(runtime.__zeusRuntime.buzzerInstances);
    buzzer.isEnabled.mockReturnValue(false);

    expect(playFeedbackCue("combo_short")).toBe(true);

    const systemSound = getLastItem(runtime.__zeusRuntime.systemSoundInstances);
    expect(systemSound.start).toHaveBeenCalledWith(12, 0);
  });

  it("plays the long vibration cue and rejects unsupported buzzer source types", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCue } = await loadFeedbackModule();

    expect(playFeedbackCue("vibrate_long")).toBe(true);
    const buzzer = getLastItem(runtime.__zeusRuntime.buzzerInstances);
    expect(buzzer.start).toHaveBeenCalledWith(2, 0);

    buzzer.getSourceType.mockReturnValue({
      OPERATE: 1
    });
    expect(playFeedbackCue("vibrate_long")).toBe(false);
  });

  it("rejects system sound cues when the runtime is missing source types", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCue } = await loadFeedbackModule();

    playFeedbackCue("sound_soft");
    const systemSound = getLastItem(runtime.__zeusRuntime.systemSoundInstances);
    systemSound.getSourceType.mockReturnValue({
      REGULAR: 10
    });
    expect(playFeedbackCue("sound_strong")).toBe(false);
  });

  it("returns false when the requested cue cannot be played", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCue } = await loadFeedbackModule();

    expect(playFeedbackCue("unknown")).toBe(false);

    playFeedbackCue("sound_soft");
    const systemSound = getLastItem(runtime.__zeusRuntime.systemSoundInstances);
    systemSound.getEnabled.mockReturnValue(false);

    expect(playFeedbackCue("sound_strong")).toBe(false);
  });
});
