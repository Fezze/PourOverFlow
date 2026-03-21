import { validateSyncEnvelope } from "./contracts.js";

export function toSyncEnvelopeJson(syncEnvelope) {
  const issues = validateSyncEnvelope(syncEnvelope);

  if (issues.length) {
    throw new Error(`Invalid sync envelope: ${issues.join(" ")}`);
  }

  return JSON.stringify(syncEnvelope);
}
