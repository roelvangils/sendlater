// User-tunable constants (DEFAULT_SEND_HOUR, TONIGHT_HOUR, TEST_OFFSET_MINUTES,
// TRIGGER_INTERVAL_MIN) live in src/userconfig.ts. The Apps Script global
// scope makes them visible here without an import.

const HOLD_LABEL = "Send Later/Hold";
const CUSTOM_LABEL = "Send Later/Custom";

function atHourToday(hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function atHourTomorrow(hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function nextNonWeekend(hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(hour, 0, 0, 0);
  return d;
}

function nextWeekday(weekday: number, hour: number, minute = 0): Date {
  const d = new Date();
  const offset = ((weekday - d.getDay() + 7) % 7) || 7;
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function tonightOrTomorrowEvening(): Date {
  const now = new Date();
  return now.getHours() < TONIGHT_HOUR
    ? atHourToday(TONIGHT_HOUR)
    : atHourTomorrow(TONIGHT_HOUR);
}

function addMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

type LabelRule = (draft: GoogleAppsScript.Gmail.GmailDraft) => Date | null;

const LABEL_RULES: Record<string, LabelRule> = {
  "Send Later/Tonight": () => tonightOrTomorrowEvening(),
  "Send Later/Tomorrow": () => nextNonWeekend(DEFAULT_SEND_HOUR),
  "Send Later/Monday": () => nextWeekday(1, DEFAULT_SEND_HOUR),
  "Send Later/Custom": (draft) => parseCustomToken(draft.getMessage().getSubject()),
  "Send Later/Test": () => addMinutes(TEST_OFFSET_MINUTES),
};
