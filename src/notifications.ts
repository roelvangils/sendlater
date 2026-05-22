function notifyOwner(subject: string, body: string): void {
  const to = Session.getActiveUser().getEmail();
  if (!to) {
    console.warn(`No active user email; skipping notify: ${subject}`);
    return;
  }
  MailApp.sendEmail(to, `[sendlater] ${subject}`, body);
}
