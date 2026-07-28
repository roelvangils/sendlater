const CUSTOM_TOKEN_REGEX = /\[send:\s*([^\]]+)\]/i;

const WEEKDAY_NAMES: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function extractTokenContent(subject: string): string | null {
  const match = subject.match(CUSTOM_TOKEN_REGEX);
  return match ? match[1].trim() : null;
}

// The full "[send: …]" token as written, for storing in state and restoring
// into the subject if the draft is unlabeled.
function extractCustomToken(subject: string): string | null {
  const match = subject.match(CUSTOM_TOKEN_REGEX);
  return match ? match[0] : null;
}

function parseCustomToken(subject: string): Date | null {
  const content = extractTokenContent(subject);
  if (!content) return null;
  const expr = content.trim();
  return (
    tryIsoDatetime(expr) ??
    tryIsoDate(expr) ??
    tryRelative(expr) ??
    tryTomorrowExpr(expr) ??
    tryTonightExpr(expr) ??
    tryWeekday(expr)
  );
}

function tryIsoDatetime(expr: string): Date | null {
  const m = expr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0);
  return isValidFutureDate(d) ? d : null;
}

function tryIsoDate(expr: string): Date | null {
  const m = expr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], DEFAULT_SEND_HOUR, 0, 0, 0);
  return isValidFutureDate(d) ? d : null;
}

function tryRelative(expr: string): Date | null {
  const m = expr.match(/^\+(\d+)([dh])$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const d = new Date();
  if (unit === "d") {
    d.setDate(d.getDate() + n);
    d.setHours(DEFAULT_SEND_HOUR, 0, 0, 0);
  } else {
    d.setTime(d.getTime() + n * 3_600_000);
  }
  return isValidFutureDate(d) ? d : null;
}

function tryWeekday(expr: string): Date | null {
  const m = expr.match(/^([a-z]+)(?:\s+(\d{1,2}):(\d{2}))?$/i);
  if (!m) return null;
  const day = WEEKDAY_NAMES[m[1].toLowerCase()];
  if (day === undefined) return null;
  const hour = m[2] ? parseInt(m[2], 10) : DEFAULT_SEND_HOUR;
  const min = m[3] ? parseInt(m[3], 10) : 0;
  return nextWeekday(day, hour, min);
}

function tryTomorrowExpr(expr: string): Date | null {
  const m = expr.match(/^tomorrow(?:\s+(\d{1,2}):(\d{2}))?$/i);
  if (!m) return null;
  const hour = m[1] ? parseInt(m[1], 10) : DEFAULT_SEND_HOUR;
  const min = m[2] ? parseInt(m[2], 10) : 0;
  return atHourTomorrow(hour, min);
}

function tryTonightExpr(expr: string): Date | null {
  return /^tonight$/i.test(expr) ? tonightOrTomorrowEvening() : null;
}

function isValidFutureDate(d: Date): boolean {
  return !isNaN(d.getTime()) && d.getTime() > Date.now();
}
