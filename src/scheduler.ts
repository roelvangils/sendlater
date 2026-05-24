function processScheduledDrafts(): void {
  // Bail if another run is in progress. Overlap can happen if a previous run
  // is still finishing when the next trigger fires, or if a manual Run from
  // the IDE overlaps with the scheduled trigger. Without this guard, two
  // concurrent runs could both reach draft.send() for the same draft.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(0)) {
    console.log("Another run is in progress; skipping this tick.");
    return;
  }

  try {
    const now = Date.now();
    const drafts = GmailApp.getDrafts();
    const seenIds = new Set<string>();

    for (const draft of drafts) {
      const id = draft.getId();
      const labelNames = collectLabelNames(draft);

      if (labelNames.indexOf(HOLD_LABEL) !== -1) {
        seenIds.add(id);
        continue;
      }

      const labelName = findMatchingLabel(labelNames);
      if (!labelName) continue;
      seenIds.add(id);

      handleDraft(draft, id, labelName, getScheduled(id), now);
    }

    cleanupOrphans(seenIds);
  } finally {
    lock.releaseLock();
  }
}

function collectLabelNames(draft: GoogleAppsScript.Gmail.GmailDraft): string[] {
  return draft.getMessage().getThread().getLabels().map((l) => l.getName());
}

function findMatchingLabel(labels: string[]): string | null {
  for (const name of labels) if (LABEL_RULES[name]) return name;
  return null;
}

function handleDraft(
  draft: GoogleAppsScript.Gmail.GmailDraft,
  id: string,
  labelName: string,
  state: ScheduledState | null,
  now: number
): void {
  const isCustom = labelName === CUSTOM_LABEL;

  if (!state || state.label !== labelName) {
    planAndApply(draft, id, labelName, isCustom);
    return;
  }

  if (state.warned) {
    const currentHash = hashSubject(draft.getMessage().getSubject());
    if (state.subjectHash !== currentHash) {
      planAndApply(draft, id, labelName, isCustom);
    }
    return;
  }

  if (now >= state.plannedAt) {
    sendDraft(draft, id, isCustom);
    return;
  }

  // Keep the visibility prefix in sync with the current planned time and
  // the current icon/format. Idempotent: applyVisibilityPrefix skips the
  // draft.update() call if the subject is already correct.
  applyVisibilityPrefix(draft, new Date(state.plannedAt), isCustom);
}

function planAndApply(
  draft: GoogleAppsScript.Gmail.GmailDraft,
  id: string,
  labelName: string,
  isCustom: boolean
): void {
  const currentSubject = draft.getMessage().getSubject();
  const plannedAt = LABEL_RULES[labelName](draft);

  if (!plannedAt) {
    setScheduled(id, {
      plannedAt: 0,
      label: labelName,
      warned: true,
      subjectHash: hashSubject(currentSubject),
    });
    notifyOwner(
      "Could not parse [send: …] token",
      `Draft "${currentSubject}" has label "${labelName}" but no parseable [send: …] token in the subject.\n\n` +
        `Edit the subject (e.g. [send: 2026-06-15 14:30]) and the script will retry on the next run.`
    );
    console.warn(`Parse fail for draft ${id}: "${currentSubject}"`);
    return;
  }

  applyVisibilityPrefix(draft, plannedAt, isCustom);
  setScheduled(id, {
    plannedAt: plannedAt.getTime(),
    label: labelName,
  });
  console.log(
    `Scheduled draft ${id} (label "${labelName}") for ${plannedAt.toISOString()}`
  );
}

function sendDraft(
  draft: GoogleAppsScript.Gmail.GmailDraft,
  id: string,
  isCustom: boolean
): void {
  let sentSubject = "(unknown)";
  try {
    clearPrefixesOnDraft(draft, isCustom);
    try {
      sentSubject = draft.getMessage().getSubject();
    } catch (_) {
      // draft ref may already be stale after the strip — keep placeholder
    }
    draft.send();
    deleteScheduled(id);
    console.log(`Sent draft ${id}: "${sentSubject}"`);
  } catch (err) {
    const errStr = String(err);
    if (errStr.indexOf("Not found") !== -1) {
      // Same Apps Script quirk as draft.update(): the API throws "Not found"
      // even though the send was committed server-side. Treat as success.
      deleteScheduled(id);
      console.warn(`Send for ${id} threw "Not found" but mail likely went out`);
      return;
    }
    notifyOwner(
      "Send failed",
      `Failed to send draft "${sentSubject}".\n\nError: ${err}\n\n` +
        `The draft remains scheduled and the next run will retry.`
    );
    console.error(`Failed to send draft ${id}: ${err}`);
  }
}

function cleanupOrphans(activeIds: Set<string>): void {
  for (const id of allScheduledIds()) {
    if (!activeIds.has(id)) {
      deleteScheduled(id);
      console.log(`Cleaned up orphan state for draft ${id}`);
    }
  }
}
