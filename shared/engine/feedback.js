import {
  Buzzer,
  SystemSounds,
  Vibrator,
  VIBRATOR_SCENE_DURATION_LONG,
  VIBRATOR_SCENE_SHORT_MIDDLE,
  VIBRATOR_SCENE_SHORT_STRONG
} from "@zos/sensor";

const FEEDBACK_LABELS = {
  none: "No cue",
  vibrate_short: "Short haptic cue",
  vibrate_long: "Long haptic cue",
  sound_soft: "Soft system sound",
  sound_strong: "Strong system sound",
  combo_short: "Short combo cue"
};

let buzzerInstance = null;
let systemSoundsInstance = null;
let vibratorInstance = null;

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

function getBuzzer() {
  if (buzzerInstance) {
    return buzzerInstance;
  }

  try {
    buzzerInstance = new Buzzer();
  } catch (error) {
    console.log("Buzzer unavailable", error);
    buzzerInstance = null;
  }

  return buzzerInstance;
}

function getSystemSounds() {
  if (systemSoundsInstance) {
    return systemSoundsInstance;
  }

  try {
    systemSoundsInstance = new SystemSounds();
  } catch (error) {
    console.log("SystemSounds unavailable", error);
    systemSoundsInstance = null;
  }

  return systemSoundsInstance;
}

function playBuzzer(typeName, repeatCount = 0) {
  const buzzer = getBuzzer();

  if (!buzzer || !buzzer.isEnabled()) {
    return false;
  }

  const sourceTypes = buzzer.getSourceType();
  const sourceType = sourceTypes[typeName];

  if (!Number.isFinite(sourceType)) {
    return false;
  }

  try {
    if (typeof buzzer.stop === "function") {
      buzzer.stop();
    }
  } catch (error) {
    console.log("Buzzer stop failed", error);
  }

  buzzer.start(sourceType, repeatCount);
  return true;
}

function playVibration(mode) {
  const vibrator = getVibrator();

  if (!vibrator) {
    return false;
  }

  try {
    if (typeof vibrator.stop === "function") {
      vibrator.stop();
    }

    if (Number.isFinite(mode)) {
      vibrator.start({ mode });
      return true;
    }

    vibrator.start();
    return true;
  } catch (error) {
    console.log("Vibrator start failed", error);
    return false;
  }
}

function playSystemSound(typeName, repeatCount = 0) {
  const systemSounds = getSystemSounds();

  if (!systemSounds || !systemSounds.getEnabled()) {
    return false;
  }

  const sourceTypes = systemSounds.getSourceType();
  const sourceType = sourceTypes[typeName];

  if (!Number.isFinite(sourceType)) {
    return false;
  }

  try {
    if (typeof systemSounds.stop === "function") {
      systemSounds.stop();
    }
  } catch (error) {
    console.log("SystemSounds stop failed", error);
  }

  systemSounds.start(sourceType, repeatCount);
  return true;
}

export function getFeedbackLabel(feedbackCue) {
  return FEEDBACK_LABELS[feedbackCue] || FEEDBACK_LABELS.none;
}

export function playFeedbackCue(feedbackCue) {
  switch (feedbackCue) {
    case "vibrate_short":
      return playVibration(VIBRATOR_SCENE_SHORT_MIDDLE) || playBuzzer("OPERATE");
    case "vibrate_long":
      return playVibration(VIBRATOR_SCENE_DURATION_LONG) || playBuzzer("SUCCESS");
    case "sound_soft":
      return playSystemSound("REGULAR") || playBuzzer("OPERATE");
    case "sound_strong":
      return playSystemSound("MESSAGE") || playBuzzer("SUCCESS");
    case "combo_short":
      return (
        playVibration(VIBRATOR_SCENE_SHORT_STRONG) ||
        playBuzzer("SUCCESS") ||
        playSystemSound("ACHIEVE")
      );
    default:
      return false;
  }
}
