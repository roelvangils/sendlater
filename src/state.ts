interface ScheduledState {
  plannedAt: number;
  label: string;
  warned?: boolean;
  subjectHash?: string;
  // Set after the first "Send failed" notification so retries don't mail the
  // owner on every tick. Cleared implicitly when the draft is re-planned.
  failNotified?: boolean;
  // For Custom drafts: the full "[send: …]" token as it appeared in the
  // subject. The visibility prefix strips the token from the subject, so this
  // is the surviving copy — used to re-plan and to restore the subject when
  // the label is removed.
  customToken?: string;
}

const STATE_PREFIX = "sched:";

function stateKey(draftId: string): string {
  return STATE_PREFIX + draftId;
}

function getScheduled(draftId: string): ScheduledState | null {
  const raw = PropertiesService.getScriptProperties().getProperty(stateKey(draftId));
  return raw ? (JSON.parse(raw) as ScheduledState) : null;
}

function setScheduled(draftId: string, state: ScheduledState): void {
  PropertiesService.getScriptProperties().setProperty(stateKey(draftId), JSON.stringify(state));
}

function deleteScheduled(draftId: string): void {
  PropertiesService.getScriptProperties().deleteProperty(stateKey(draftId));
}

function hashSubject(subject: string): string {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5,
    subject,
    Utilities.Charset.UTF_8
  );
  return bytes
    .map((b) => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0"))
    .join("");
}

function allScheduledIds(): string[] {
  const keys = PropertiesService.getScriptProperties().getKeys();
  return keys
    .filter((k) => k.indexOf(STATE_PREFIX) === 0)
    .map((k) => k.substring(STATE_PREFIX.length));
}
