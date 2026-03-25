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

  it("plays a direct vibration cue for short haptic feedback", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCue } = await loadFeedbackModule();

    expect(playFeedbackCue("vibrate_short")).toBe(true);

    const vibrator = getLastItem(runtime.__zeusRuntime.vibratorInstances);
    expect(vibrator.stop).toHaveBeenCalled();
    expect(vibrator.start).toHaveBeenCalledWith({
      mode: 101
    });
  });

  it("falls back to the buzzer when combo feedback cannot use the vibration motor", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCue } = await loadFeedbackModule();

    playFeedbackCue("vibrate_short");
    const vibrator = getLastItem(runtime.__zeusRuntime.vibratorInstances);
    vibrator.start.mockImplementation(() => {
      throw new Error("vibration unavailable");
    });

    expect(playFeedbackCue("combo_short")).toBe(true);

    const fallbackBuzzer = getLastItem(runtime.__zeusRuntime.buzzerInstances);
    expect(fallbackBuzzer.start).toHaveBeenCalledWith(2, 0);
  });

  it("plays the long vibration cue and rejects unsupported buzzer fallback source types", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCue } = await loadFeedbackModule();

    expect(playFeedbackCue("vibrate_long")).toBe(true);
    const vibrator = getLastItem(runtime.__zeusRuntime.vibratorInstances);
    expect(vibrator.start).toHaveBeenCalledWith({
      mode: 102
    });

    vibrator.start.mockImplementation(() => {
      throw new Error("vibration unavailable");
    });
    playFeedbackCue("vibrate_long");
    const buzzer = getLastItem(runtime.__zeusRuntime.buzzerInstances);
    buzzer.getSourceType.mockReturnValue({
      OPERATE: 1
    });
    expect(playFeedbackCue("vibrate_long")).toBe(false);
  });

  it("falls back to the buzzer when system sounds cannot provide the requested cue", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCue } = await loadFeedbackModule();

    playFeedbackCue("sound_soft");
    const systemSound = getLastItem(runtime.__zeusRuntime.systemSoundInstances);
    systemSound.getSourceType.mockReturnValue({});
    expect(playFeedbackCue("sound_strong")).toBe(true);

    const buzzer = getLastItem(runtime.__zeusRuntime.buzzerInstances);
    expect(buzzer.start).toHaveBeenCalledWith(2, 0);
  });

  it("tries alternate strong sound source types before falling back to the buzzer", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCue } = await loadFeedbackModule();

    playFeedbackCue("sound_soft");
    const systemSound = getLastItem(runtime.__zeusRuntime.systemSoundInstances);
    systemSound.getSourceType.mockReturnValue({
      REGULAR: 10,
      MESSAGE: 11
    });

    expect(playFeedbackCue("sound_strong")).toBe(true);
    expect(systemSound.start).toHaveBeenLastCalledWith(11, 0);
  });

  it("treats explicit start failures as a real failure and falls back to the buzzer", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCue } = await loadFeedbackModule();

    playFeedbackCue("sound_soft");
    const systemSound = getLastItem(runtime.__zeusRuntime.systemSoundInstances);
    systemSound.start.mockReturnValue(false);

    expect(playFeedbackCue("sound_strong")).toBe(true);

    const buzzer = getLastItem(runtime.__zeusRuntime.buzzerInstances);
    expect(buzzer.start).toHaveBeenCalledWith(2, 0);
  });

  it("returns false when the requested cue cannot be played", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCue } = await loadFeedbackModule();

    expect(playFeedbackCue("unknown")).toBe(false);

    playFeedbackCue("sound_soft");
    const systemSound = getLastItem(runtime.__zeusRuntime.systemSoundInstances);
    systemSound.getEnabled.mockReturnValue(false);
    playFeedbackCue("sound_strong");
    const buzzer = getLastItem(runtime.__zeusRuntime.buzzerInstances);
    buzzer.isEnabled.mockReturnValue(false);

    expect(playFeedbackCue("sound_strong")).toBe(false);
  });
});
