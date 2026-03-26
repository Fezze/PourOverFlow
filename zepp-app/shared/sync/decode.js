export function fromSyncEnvelopeJson(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.log("Failed to decode sync envelope JSON", error);
    return null;
  }
}
