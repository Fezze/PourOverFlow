const FEEDBACK_LABELS = {
  none: "No cue",
  vibrate_short: "Short haptic cue",
  vibrate_long: "Long haptic cue",
  sound_soft: "Soft system sound",
  sound_strong: "Strong system sound",
  combo_short: "Short combo cue"
};

export function getFeedbackLabel(feedbackCue) {
  return FEEDBACK_LABELS[feedbackCue] || FEEDBACK_LABELS.none;
}
