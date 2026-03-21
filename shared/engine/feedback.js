import { Buzzer, SystemSounds } from "@zos/sensor";

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

  buzzer.start(sourceType, repeatCount);
  return true;
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

  systemSounds.start(sourceType, repeatCount);
  return true;
}

export function getFeedbackLabel(feedbackCue) {
  return FEEDBACK_LABELS[feedbackCue] || FEEDBACK_LABELS.none;
}

export function playFeedbackCue(feedbackCue) {
  switch (feedbackCue) {
    case "vibrate_short":
      return playBuzzer("OPERATE");
    case "vibrate_long":
      return playBuzzer("SUCCESS");
    case "sound_soft":
      return playSystemSound("REGULAR");
    case "sound_strong":
      return playSystemSound("MESSAGE");
    case "combo_short":
      return playBuzzer("SUCCESS") || playSystemSound("ACHIEVE");
    default:
      return false;
  }
}
