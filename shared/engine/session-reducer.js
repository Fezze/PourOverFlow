function isTimedStep(step) {
  return Boolean(step && (step.kind === "timed_action" || step.kind === "timed_wait"));
}

function deriveStepStatus(step) {
  return isTimedStep(step) ? "running" : "waiting_for_confirm";
}

function enterStep(activeSession, nextStepIndex, now) {
  const nextStep = activeSession.recipeSnapshot.steps[nextStepIndex];

  if (!nextStep) {
    return {
      ...activeSession,
      status: "completed",
      sessionEndedAt: now,
      elapsedSessionMs: now - activeSession.sessionStartedAt,
      lastPersistedAt: now
    };
  }

  return {
    ...activeSession,
    currentStepIndex: nextStepIndex,
    status: deriveStepStatus(nextStep),
    currentStepStartedAt: now,
    expectedStepEndAt: isTimedStep(nextStep) ? now + (nextStep.durationMs || 0) : undefined,
    elapsedSessionMs: now - activeSession.sessionStartedAt,
    lastPersistedAt: now
  };
}

function updateElapsedSession(activeSession, now) {
  return {
    ...activeSession,
    elapsedSessionMs: Math.max(0, now - activeSession.sessionStartedAt),
    lastPersistedAt: now
  };
}

function buildStepRunResult(activeSession, step, now, confirmedManually) {
  return {
    stepId: step.stepId,
    order: step.order,
    kind: step.kind,
    startedAt: activeSession.currentStepStartedAt,
    endedAt: now,
    plannedDurationMs: step.durationMs,
    actualDurationMs: now - activeSession.currentStepStartedAt,
    confirmedManually
  };
}

function markCurrentStepCompleted(activeSession, now, confirmedManually) {
  const currentStep = activeSession.recipeSnapshot.steps[activeSession.currentStepIndex];

  if (!currentStep) {
    return activeSession;
  }

  return {
    ...activeSession,
    completedStepIds: activeSession.completedStepIds.includes(currentStep.stepId)
      ? activeSession.completedStepIds
      : [...activeSession.completedStepIds, currentStep.stepId],
    stepRunResults: [...activeSession.stepRunResults, buildStepRunResult(activeSession, currentStep, now, confirmedManually)],
    elapsedSessionMs: now - activeSession.sessionStartedAt,
    lastPersistedAt: now
  };
}

export function advanceSession(activeSession, options = {}) {
  if (!activeSession) {
    return null;
  }

  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const currentStep = activeSession.recipeSnapshot.steps[activeSession.currentStepIndex];

  if (!currentStep) {
    return {
      ...activeSession,
      status: "expired",
      sessionEndedAt: now,
      elapsedSessionMs: now - activeSession.sessionStartedAt,
      lastPersistedAt: now
    };
  }

  const completedSession = markCurrentStepCompleted(
    activeSession,
    now,
    options.confirmedManually !== false
  );

  if (currentStep.kind === "finish" || activeSession.currentStepIndex >= activeSession.recipeSnapshot.steps.length - 1) {
    return {
      ...completedSession,
      status: "completed",
      sessionEndedAt: now,
      expectedStepEndAt: undefined,
      elapsedSessionMs: now - activeSession.sessionStartedAt,
      lastPersistedAt: now
    };
  }

  return enterStep(completedSession, activeSession.currentStepIndex + 1, now);
}

export function tickSession(activeSession, options = {}) {
  if (!activeSession) {
    return null;
  }

  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const currentStep = activeSession.recipeSnapshot.steps[activeSession.currentStepIndex];

  if (!currentStep) {
    return activeSession;
  }

  if (!isTimedStep(currentStep) || !Number.isFinite(activeSession.expectedStepEndAt)) {
    return activeSession;
  }

  if (now < activeSession.expectedStepEndAt) {
    return activeSession;
  }

  if (currentStep.requiresConfirm) {
    if (activeSession.status === "waiting_for_confirm") {
      return activeSession;
    }

    return {
      ...activeSession,
      status: "waiting_for_confirm",
      elapsedSessionMs: now - activeSession.sessionStartedAt,
      lastPersistedAt: now
    };
  }

  return advanceSession(activeSession, {
    now,
    confirmedManually: false
  });
}

export function abortSession(activeSession, options = {}) {
  if (!activeSession) {
    return null;
  }

  const now = Number.isFinite(options.now) ? options.now : Date.now();

  return {
    ...updateElapsedSession(activeSession, now),
    status: "aborted",
    sessionEndedAt: now,
    expectedStepEndAt: undefined
  };
}

export function resumeSession(activeSession, options = {}) {
  if (!activeSession || !activeSession.recipeSnapshot || !Array.isArray(activeSession.recipeSnapshot.steps)) {
    return null;
  }

  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const maxIterations = Math.max(1, activeSession.recipeSnapshot.steps.length + 1);
  let nextSession = updateElapsedSession(activeSession, now);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const currentStep = nextSession.recipeSnapshot.steps[nextSession.currentStepIndex];

    if (!currentStep) {
      return {
        ...nextSession,
        status: "expired",
        sessionEndedAt: now,
        expectedStepEndAt: undefined
      };
    }

    if (!isTimedStep(currentStep)) {
      return {
        ...nextSession,
        status: "waiting_for_confirm",
        expectedStepEndAt: undefined,
        elapsedSessionMs: Math.max(0, now - nextSession.sessionStartedAt),
        lastPersistedAt: now
      };
    }

    const expectedStepEndAt = Number.isFinite(nextSession.expectedStepEndAt)
      ? nextSession.expectedStepEndAt
      : nextSession.currentStepStartedAt + (currentStep.durationMs || 0);

    if (now < expectedStepEndAt) {
      return {
        ...nextSession,
        status: "running",
        expectedStepEndAt,
        elapsedSessionMs: Math.max(0, now - nextSession.sessionStartedAt),
        lastPersistedAt: now
      };
    }

    if (currentStep.requiresConfirm) {
      return {
        ...nextSession,
        status: "waiting_for_confirm",
        expectedStepEndAt,
        elapsedSessionMs: Math.max(0, now - nextSession.sessionStartedAt),
        lastPersistedAt: now
      };
    }

    nextSession = advanceSession(nextSession, {
      now: expectedStepEndAt,
      confirmedManually: false
    });

    if (!nextSession || nextSession.status === "completed") {
      return nextSession;
    }
  }

  return {
    ...nextSession,
    status: "expired",
    sessionEndedAt: now,
    expectedStepEndAt: undefined,
    elapsedSessionMs: Math.max(0, now - nextSession.sessionStartedAt),
    lastPersistedAt: now
  };
}
