import { beforeEach, describe, expect, it, vi } from "vitest";

function getLastItem(setLike: Set<any>) {
  return Array.from(setLike).at(-1);
}

async function loadFeedbackModule() {
  return import("../zepp-app/shared/engine/feedback.js");
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
    expect(getFeedbackLabel("combo_short")).toBe("Short haptic cue");
    expect(getFeedbackLabel("unknown")).toBe("No cue");
  });

  it("treats the none cue as a successful no-op", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCueDetailed, playFeedbackCue } = await loadFeedbackModule();

    expect(playFeedbackCueDetailed("none")).toMatchObject({
      success: true,
      channel: "none",
      sourceType: "none",
      feedbackCue: "none",
      attempts: []
    });
    expect(playFeedbackCue("none")).toBe(true);
    expect(runtime.__zeusRuntime.vibratorInstances.size).toBe(0);
  });

  it("reports unsupported audio cues as unavailable", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCueDetailed } = await loadFeedbackModule();

    expect(playFeedbackCueDetailed("sound_strong")).toMatchObject({
      success: false,
      channel: "none",
      attempts: [
        {
          channel: "audio",
          sourceType: "sound_strong",
          reason: "unsupported"
        }
      ]
    });
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

  it("keeps combo feedback haptic-only", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCue } = await loadFeedbackModule();

    expect(playFeedbackCue("combo_short")).toBe(true);

    const vibrator = getLastItem(runtime.__zeusRuntime.vibratorInstances);
    expect(vibrator.start).toHaveBeenCalledWith({
      mode: 103
    });
    expect(runtime.__zeusRuntime.buzzerInstances.size).toBe(0);
    expect(runtime.__zeusRuntime.systemSoundInstances.size).toBe(0);
  });

  it("plays the long vibration cue and does not fall back to non-haptic channels", async () => {
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
    expect(playFeedbackCue("vibrate_long")).toBe(false);
    expect(runtime.__zeusRuntime.buzzerInstances.size).toBe(0);
  });

  it("treats sound cues as unsupported in the haptics-only runtime", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCue } = await loadFeedbackModule();

    expect(playFeedbackCue("sound_soft")).toBe(false);
    expect(playFeedbackCue("sound_strong")).toBe(false);
    expect(runtime.__zeusRuntime.systemSoundInstances.size).toBe(0);
    expect(runtime.__zeusRuntime.buzzerInstances.size).toBe(0);
  });

  it("reports unavailable hardware and failed starts, then retries with the default scene", async () => {
    let hardwareReady = false;
    const start = vi.fn()
      .mockReturnValueOnce(false)
      .mockImplementationOnce(() => { throw new Error("actuator busy"); })
      .mockReturnValueOnce(true);
    vi.doMock("@zos/sensor", async (importOriginal) => ({
      ...await importOriginal<Record<string, unknown>>(),
      VIBRATOR_SCENE_SHORT_MIDDLE: undefined,
      Vibrator: class {
        constructor() {
          if (!hardwareReady) throw new Error("actuator unavailable");
        }
        start = start;
      }
    }));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      const { playFeedbackCueDetailed } = await loadFeedbackModule();
      const cue = () => playFeedbackCueDetailed("vibrate_short");
      expect(cue()).toMatchObject({
        success: false, attempts: [{ channel: "vibrator", sourceType: "default", reason: "unavailable" }]
      });
      expect(start).not.toHaveBeenCalled();

      hardwareReady = true;
      expect(cue()).toMatchObject({
        success: false, attempts: [{ channel: "vibrator", sourceType: "default", reason: "start_returned_false" }]
      });
      expect(cue()).toMatchObject({
        success: false, attempts: [{ channel: "vibrator", sourceType: "default", reason: "start_threw" }]
      });
      expect(cue()).toMatchObject({ success: true, sourceType: "default", channel: "vibrator", attempts: [] });
      expect(start.mock.calls).toEqual([[], [], []]);
    } finally {
      vi.doUnmock("@zos/sensor");
      log.mockRestore();
    }
  });

  it("returns false when the requested cue cannot be played", async () => {
    const runtime = await loadRuntimeModule();
    runtime.resetZeppRuntime();
    const { playFeedbackCue } = await loadFeedbackModule();

    expect(playFeedbackCue("unknown")).toBe(false);
    expect(playFeedbackCue("sound_strong")).toBe(false);
  });
});
