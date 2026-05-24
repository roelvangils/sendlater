const VISIBILITY_ICON = "􀧞";
const VISIBILITY_SEP = "——";

// Matches the current `􀧞 <when> —— ` prefix, as well as the legacy `[→ ...]`
// form, so drafts that were prefixed under v2.0 still strip cleanly during
// migration.
const VISIBILITY_PREFIX_REGEX = /^(?:􀧞 [^—]*?—— |\[→[^\]]*\]\s*)/u;

const WEEKDAY_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function pad2(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatShortTime(date: Date): string {
  const now = new Date();
  const diffDays = Math.round(
    (startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000
  );
  const hhmm = pad2(date.getHours()) + ":" + pad2(date.getMinutes());
  if (diffDays >= 0 && diffDays <= 6) {
    return `${WEEKDAY_EN[date.getDay()]} ${hhmm}`;
  }
  return `${date.getDate()} ${MONTH_EN[date.getMonth()]} ${hhmm}`;
}

function stripPrefixes(subject: string, isCustom: boolean): string {
  let s = subject;
  if (isCustom) s = s.replace(CUSTOM_TOKEN_REGEX, "");
  s = s.replace(VISIBILITY_PREFIX_REGEX, "");
  return s.trim();
}

function applyVisibilityPrefix(
  draft: GoogleAppsScript.Gmail.GmailDraft,
  plannedAt: Date,
  isCustom: boolean
): void {
  const msg = draft.getMessage();
  const currentSubject = msg.getSubject();
  const cleanSubject = stripPrefixes(currentSubject, isCustom);
  const newSubject = `${VISIBILITY_ICON} ${formatShortTime(plannedAt)} ${VISIBILITY_SEP} ${cleanSubject}`;
  if (newSubject === currentSubject) return;
  updateDraftSubject(draft, newSubject);
}

function clearPrefixesOnDraft(
  draft: GoogleAppsScript.Gmail.GmailDraft,
  isCustom: boolean
): void {
  const msg = draft.getMessage();
  const currentSubject = msg.getSubject();
  const cleanSubject = stripPrefixes(currentSubject, isCustom);
  if (cleanSubject === currentSubject) return;
  updateDraftSubject(draft, cleanSubject);
}

function updateDraftSubject(
  draft: GoogleAppsScript.Gmail.GmailDraft,
  newSubject: string
): void {
  const msg = draft.getMessage();
  const draftId = draft.getId();
  const to = msg.getTo();
  const plainBody = msg.getPlainBody();
  const htmlBody = msg.getBody();
  const safePlainBody = plainBody.trim() ? plainBody : " ";

  if (!to || to.trim() === "") {
    console.error("[update] empty 'to' field — refusing to update");
    return;
  }

  let labelsToRestore: GoogleAppsScript.Gmail.GmailLabel[] = [];
  try {
    labelsToRestore = msg.getThread().getLabels();
  } catch (e) {
    console.warn(`[update] could not read labels before update: ${e}`);
  }

  // Apps Script quirk: draft.update() sometimes throws "Not found" even when
  // the subject change has actually been committed server-side. Swallow the
  // throw — the side effect we wanted has already happened.
  try {
    draft.update(to, newSubject, safePlainBody, { htmlBody });
  } catch (e) {
    console.warn(`[update] threw "${e}" — subject likely committed anyway`);
  }

  // Re-apply labels via a fresh lookup. The original draft ref can go stale
  // after update, so re-fetch by ID.
  try {
    const freshDraft = GmailApp.getDraft(draftId);
    const newThread = freshDraft.getMessage().getThread();
    for (const label of labelsToRestore) {
      newThread.addLabel(label);
    }
  } catch (e) {
    console.warn(`[update] label re-apply failed: ${e}`);
  }
}
