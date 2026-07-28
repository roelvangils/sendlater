const VISIBILITY_ICON = "⏳";
const VISIBILITY_SEP = "——";
const VISIBILITY_PREFIX_REGEX = /^⏳ [^—]*?—— /u;

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
  updateDraftSubjectRaw(draft.getId(), newSubject);
}

function clearPrefixesOnDraft(
  draft: GoogleAppsScript.Gmail.GmailDraft,
  isCustom: boolean
): void {
  const msg = draft.getMessage();
  const currentSubject = msg.getSubject();
  const cleanSubject = stripPrefixes(currentSubject, isCustom);
  if (cleanSubject === currentSubject) return;
  updateDraftSubjectRaw(draft.getId(), cleanSubject);
}
