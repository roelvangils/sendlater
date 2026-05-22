const TRIGGER_HANDLER = "processScheduledDrafts";
const TRIGGER_INTERVAL_MIN = 10;

function installTrigger(): void {
  const existing = ScriptApp.getProjectTriggers().filter(
    (t) => t.getHandlerFunction() === TRIGGER_HANDLER
  );
  for (const t of existing) ScriptApp.deleteTrigger(t);

  ScriptApp.newTrigger(TRIGGER_HANDLER)
    .timeBased()
    .everyMinutes(TRIGGER_INTERVAL_MIN)
    .create();

  console.log(`Installed trigger: ${TRIGGER_HANDLER} every ${TRIGGER_INTERVAL_MIN} min`);
}

function ensureLabels(): void {
  const names = Object.keys(LABEL_RULES).concat([HOLD_LABEL]);
  for (const name of names) {
    const existing = GmailApp.getUserLabelByName(name);
    if (!existing) {
      GmailApp.createLabel(name);
      console.log(`Created label "${name}"`);
    } else {
      console.log(`Label "${name}" already exists`);
    }
  }
}
