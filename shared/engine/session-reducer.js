export function advanceSession(activeSession) {
  if (!activeSession) {
    return null;
  }

  const lastStepIndex = activeSession.steps.length - 1;
  const now = Date.now();

  if (activeSession.currentStepIndex >= lastStepIndex) {
    return {
      ...activeSession,
      status: "completed",
      updatedAt: now,
      endedAt: now,
      elapsedMs: now - activeSession.startedAt
    };
  }

  return {
    ...activeSession,
    currentStepIndex: activeSession.currentStepIndex + 1,
    updatedAt: now,
    elapsedMs: now - activeSession.startedAt
  };
}

export function abortSession(activeSession) {
  if (!activeSession) {
    return null;
  }

  const now = Date.now();

  return {
    ...activeSession,
    status: "aborted",
    updatedAt: now,
    endedAt: now,
    elapsedMs: now - activeSession.startedAt
  };
}
