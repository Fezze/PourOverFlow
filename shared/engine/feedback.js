import { Vibrator, VIBRATOR_SCENE_DURATION_LONG, VIBRATOR_SCENE_SHORT_MIDDLE, VIBRATOR_SCENE_SHORT_STRONG } from "@zos/sensor";

const FEEDBACK_LABELS = {
  none: "No cue",
  vibrate_short: "Short haptic cue",
  vibrate_long: "Long haptic cue",
  combo_short: "Short haptic cue"
};

let vibratorInstance = null;

function didStart(result) {
  return result !== false;
}

function createFeedbackResult({ success, channel = "none", sourceType = null, feedbackCue, fallback = false }) {
  return {
    success: Boolean(success),
    channel,
    sourceType,
    feedbackCue,
    fallback,
    attempts: []
  };
}

function createFailedAttempt(channel, sourceType, reason) {
  return {
    channel,
    sourceType,
    reason
  };
}

function withAttempts(result, attempts = []) {
  return {
    ...result,
    attempts
  };
}

function getVibrator() {
  if (vibratorInstance) {
    return vibratorInstance;
  }

  try {
    vibratorInstance = new Vibrator();
  } catch (error) {
    console.log("Vibrator unavailable", error);
    vibratorInstance = null;
  }

  return vibratorInstance;
}

function playVibration(mode) {
  const vibrator = getVibrator();

  if (!vibrator) {
    return withAttempts(createFeedbackResult({
      success: false,
      feedbackCue: null
    }), [createFailedAttempt("vibrator", String(mode ?? "default"), "unavailable")]);
  }

  try {
    if (typeof vibrator.stop === "function") {
      vibrator.stop();
    }

    if (Number.isFinite(mode)) {
      if (!didStart(vibrator.start({ mode }))) {
        return withAttempts(createFeedbackResult({
          success: false,
          feedbackCue: null
        }), [createFailedAttempt("vibrator", String(mode), "start_returned_false")]);
      }

      return withAttempts(createFeedbackResult({
        success: true,
        channel: "vibrator",
        sourceType: String(mode),
        feedbackCue: null
      }), []);
    }

    if (!didStart(vibrator.start())) {
      return withAttempts(createFeedbackResult({
        success: false,
        feedbackCue: null
      }), [createFailedAttempt("vibrator", "default", "start_returned_false")]);
    }

    return withAttempts(createFeedbackResult({
      success: true,
      channel: "vibrator",
      sourceType: "default",
      feedbackCue: null
    }), []);
  } catch (error) {
    console.log("Vibrator start failed", error);
    return withAttempts(createFeedbackResult({
      success: false,
      feedbackCue: null
    }), [createFailedAttempt("vibrator", String(mode ?? "default"), "start_threw")]);
  }
}

export function getFeedbackLabel(feedbackCue) {
  return FEEDBACK_LABELS[feedbackCue] || FEEDBACK_LABELS.none;
}

export function playFeedbackCueDetailed(feedbackCue) {
  switch (feedbackCue) {
    case "vibrate_short": {
      return {
        ...playVibration(VIBRATOR_SCENE_SHORT_MIDDLE),
        feedbackCue
      };
    }
    case "vibrate_long": {
      return {
        ...playVibration(VIBRATOR_SCENE_DURATION_LONG),
        feedbackCue
      };
    }
    case "sound_soft":
    case "sound_strong":
      return withAttempts(createFeedbackResult({
        success: false,
        feedbackCue
      }), [createFailedAttempt("audio", feedbackCue, "unsupported")]);
    case "combo_short": {
      return {
        ...playVibration(VIBRATOR_SCENE_SHORT_STRONG),
        feedbackCue
      };
    }
    default:
      return withAttempts(createFeedbackResult({
        success: false,
        feedbackCue
      }), [createFailedAttempt("none", feedbackCue, "unknown_feedback_cue")]);
  }
}

export function playFeedbackCue(feedbackCue) {
  return playFeedbackCueDetailed(feedbackCue).success;
}
