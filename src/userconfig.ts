// Edit this file after cloning. Other files in src/ usually don't need to change.
// The Apps Script global scope makes these constants available to all .ts files
// once compiled (clasp drops type annotations, no module imports needed).

// Default hour for the "Tomorrow" and "Monday" labels (24h clock, local time).
const DEFAULT_SEND_HOUR = 9;

// Target hour for the "Tonight" label. If the current time is already past
// this hour when you label, the script schedules for tomorrow evening instead.
const TONIGHT_HOUR = 20;

// Start of the "Morning" window. The actual send time is randomised between
// MORNING_HOUR:00 and MORNING_HOUR:MORNING_RANDOM_MINUTES (inclusive) — feels
// more human than a server-precise top-of-hour send. Same-day if labeled
// before MORNING_HOUR, else next workday; weekends are skipped.
const MORNING_HOUR = 8;
const MORNING_RANDOM_MINUTES = 45;

// How many minutes from now the "Test" label schedules. Don't set lower than
// the trigger interval — you'll wait at least one tick for the send anyway.
const TEST_OFFSET_MINUTES = 2;

// How often the scheduler trigger runs. Allowed values in Apps Script:
// 1, 5, 10, 15, 30. Smaller is more responsive but uses more script-runtime
// quota; 5 is plenty for personal use.
const TRIGGER_INTERVAL_MIN = 5;

// NOTE: timezone is configured in appsscript.json under the "timeZone" field.
// Change it there if you're not in Europe/Brussels.
