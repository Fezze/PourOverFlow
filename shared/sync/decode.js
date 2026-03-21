export function fromSyncEnvelopeJson(rawValue) {
  if (!rawValue) {
    return null;
  }

  return JSON.parse(rawValue);
}
