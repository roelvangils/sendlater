function processScheduledDrafts(): void {
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
  }
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
  try {
    clearPrefixesOnDraft(draft, isCustom);
    const sentSubject = draft.getMessage().getSubject();
    draft.send();
    deleteScheduled(id);
    console.log(`Sent draft ${id}: "${sentSubject}"`);
  } catch (err) {
    const subject = draft.getMessage().getSubject();
    notifyOwner(
      "Send failed",
      `Failed to send draft "${subject}".\n\nError: ${err}\n\n` +
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
