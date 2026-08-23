function processScheduledDrafts(): void {
  // Bail if another run is in progress. Overlap can happen if a previous run
  // is still finishing when the next trigger fires, or if a manual Run from
  // the IDE overlaps with the scheduled trigger. Without this guard, two
  // concurrent runs could both reach the send call for the same draft.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(0)) {
    console.log("Another run is in progress; skipping this tick.");
    return;
  }

  try {
    const now = Date.now();
    const drafts = GmailApp.getDrafts();
    const seenIds = new Set<string>();

    // Note: enumerating drafts and reading each one's thread labels is the
    // proven approach. Do NOT replace it with per-label getThreads() lookups:
    // Gmail's label/search layer does not reliably return draft-only threads,
    // which silently unschedules fresh drafts.
    for (const draft of drafts) {
      const id = draft.getId();
      const labelNames = collectLabelNames(draft);

      if (labelNames.indexOf(HOLD_LABEL) !== -1) {
        seenIds.add(id);
        markHeld(id);
        continue;
      }

      const labelName = findMatchingLabel(labelNames);
      if (!labelName) continue;
      seenIds.add(id);

      // One broken draft must never starve the others — especially not a
      // draft whose send time has arrived.
      try {
        handleDraft(draft, id, labelName, getScheduled(id), now);
      } catch (e) {
        console.error(`Error handling draft ${id}: ${e}`);
      }
    }

    cleanupOrphans(seenIds);
  } finally {
    lock.releaseLock();
  }
}

function collectLabelNames(draft: GoogleAppsScript.Gmail.GmailDraft): string[] {
  return draft.getMessage().getThread().getLabels().map((l) => l.getName());
}

// Iterate LABEL_RULES (not the draft's labels) so that stacked labels resolve
// in a fixed priority order rather than Gmail's undocumented label order.
function findMatchingLabel(labels: string[]): string | null {
  for (const name of Object.keys(LABEL_RULES)) {
    if (labels.indexOf(name) !== -1) return name;
  }
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
    planAndApply(draft, id, labelName, isCustom, state);
    return;
  }

  // Hold was just removed. "Resume with the original time" only makes sense
  // if that time is still ahead of us; otherwise re-plan from the label so a
  // draft paused for a week doesn't fire the instant Hold comes off.
  if (state.held) {
    if (!state.warned && now >= state.plannedAt) {
      planAndApply(draft, id, labelName, isCustom, state);
      return;
    }
    state = { ...state, held: false };
    setScheduled(id, state);
  }

  if (state.warned) {
    const currentHash = hashSubject(draft.getMessage().getSubject());
    if (state.subjectHash !== currentHash) {
      planAndApply(draft, id, labelName, isCustom, state);
    }
    return;
  }

  if (now >= state.plannedAt) {
    sendDraft(draft, id, isCustom, state);
    return;
  }

  // Keep the visibility prefix in sync with the current planned time and
  // the current icon/format. Idempotent: applyVisibilityPrefix skips the
  // update call if the subject is already correct.
  applyVisibilityPrefix(draft, new Date(state.plannedAt), isCustom);
}

function planAndApply(
  draft: GoogleAppsScript.Gmail.GmailDraft,
  id: string,
  labelName: string,
  isCustom: boolean,
  priorState: ScheduledState | null
): void {
  const message = draft.getMessage();
  const currentSubject = message.getSubject();
  const threadId = message.getThread().getId();

  // The visibility prefix strips the [send: …] token from the subject, so on
  // re-plans (label removed and re-applied, or switched away and back) the
  // token may only survive in the previous state.
  const customToken = isCustom
    ? extractCustomToken(currentSubject) ?? priorState?.customToken
    : priorState?.customToken;

  const plannedAt = isCustom
    ? customToken
      ? parseCustomToken(customToken)
      : null
    : LABEL_RULES[labelName](draft);

  if (!plannedAt) {
    setScheduled(id, {
      plannedAt: 0,
      label: labelName,
      warned: true,
      subjectHash: hashSubject(currentSubject),
      customToken,
      threadId,
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
    customToken,
    threadId,
  });
  console.log(
    `Scheduled draft ${id} (label "${labelName}") for ${plannedAt.toISOString()}`
  );
}

function sendDraft(
  draft: GoogleAppsScript.Gmail.GmailDraft,
  id: string,
  isCustom: boolean,
  state: ScheduledState
): void {
  const cleanSubject = stripPrefixes(draft.getMessage().getSubject(), isCustom);
  try {
    clearPrefixesOnDraft(draft, isCustom);
    // Send by ID via the Gmail API: immune to the stale-draft-ref "Not found"
    // quirk of GmailDraft.send() after a subject update.
    const sent = Gmail.Users!.Drafts!.send({ id }, "me");
    deleteScheduled(id);
    console.log(`Sent draft ${id}: "${cleanSubject}"`);
    removeSendLaterLabels(sent.threadId);
  } catch (err) {
    if (!state.failNotified) {
      notifyOwner(
        "Send failed",
        `Failed to send draft "${cleanSubject}".\n\nError: ${err}\n\n` +
          `The draft remains scheduled and the script keeps retrying every ` +
          `run — you won't get another mail about this draft unless it is ` +
          `rescheduled. Check the Executions tab for subsequent attempts.`
      );
      setScheduled(id, { ...state, failNotified: true });
    }
    console.error(`Failed to send draft ${id}: ${err}`);
  }
}

// Once the mail is out, the Send Later label has done its job. Leaving it on
// the (now sent) thread would re-capture any future draft reply on that
// thread and schedule it unintentionally.
function removeSendLaterLabels(threadId: string | undefined): void {
  if (!threadId) return;
  try {
    const thread = GmailApp.getThreadById(threadId);
    if (!thread) return;
    for (const label of thread.getLabels()) {
      if (label.getName().indexOf("Send Later/") === 0) {
        thread.removeLabel(label);
      }
    }
  } catch (e) {
    console.warn(`Could not remove Send Later labels on thread ${threadId}: ${e}`);
  }
}

function markHeld(id: string): void {
  const state = getScheduled(id);
  if (state && !state.held) setScheduled(id, { ...state, held: true });
}

function cleanupOrphans(activeIds: Set<string>): void {
  for (const id of allScheduledIds()) {
    if (activeIds.has(id)) continue;
    const state = getScheduled(id);
    const draft = findDraft(id);
    if (draft) {
      restoreUnlabeledDraft(draft, state);
    } else {
      // Draft gone: sent by hand from the client, or discarded. Either way
      // the Send Later label has no business staying on the thread.
      removeSendLaterLabels(state?.threadId);
    }
    deleteScheduled(id);
    console.log(`Cleaned up orphan state for draft ${id}`);
  }
}

function findDraft(id: string): GoogleAppsScript.Gmail.GmailDraft | null {
  try {
    return GmailApp.getDraft(id) ?? null;
  } catch (_) {
    return null;
  }
}

// A draft with state but no Send Later label was deliberately unlabeled. Put
// the subject back the way the user wrote it: strip the ⏳ prefix and, for
// Custom drafts, re-insert the [send: …] token so relabeling works.
function restoreUnlabeledDraft(
  draft: GoogleAppsScript.Gmail.GmailDraft,
  state: ScheduledState | null
): void {
  const id = draft.getId();
  try {
    const currentSubject = draft.getMessage().getSubject();
    let restored = stripPrefixes(currentSubject, false);
    if (state?.customToken && !extractCustomToken(restored)) {
      restored = `${state.customToken} ${restored}`.trim();
    }
    if (restored !== currentSubject) {
      updateDraftSubjectRaw(id, restored);
      console.log(`Restored subject of unlabeled draft ${id}`);
    }
  } catch (e) {
    console.warn(`Could not restore subject of draft ${id}: ${e}`);
  }
}
