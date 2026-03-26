const VALIDATION_LOG_PREFIX = "[pof-validation]";

function safeSerialize(value) {
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return String(value);
  }
}

export function logValidation(eventName, details = {}) {
  console.log(`${VALIDATION_LOG_PREFIX} ${eventName} ${safeSerialize(details)}`);
}
