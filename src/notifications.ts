function notifyOwner(subject: string, body: string): void {
  // Never let a notification failure (e.g. mail quota exhausted — the very
  // thing we may be notifying about) abort the scheduler tick.
  try {
    const to = Session.getActiveUser().getEmail();
    if (!to) {
      console.warn(`No active user email; skipping notify: ${subject}`);
      return;
    }
    MailApp.sendEmail(to, `[sendlater] ${subject}`, body);
  } catch (e) {
    console.warn(`Could not send notification "${subject}": ${e}`);
  }
}
