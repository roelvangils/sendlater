interface AuditEntry {
  id: string;
  plannedAt: number;
  label: string;
  warned: boolean;
  subject: string | null;
}

function auditScheduled(): void {
  const entries: AuditEntry[] = [];

  for (const id of allScheduledIds()) {
    const state = getScheduled(id);
    if (!state) continue;
    let subject: string | null = null;
    try {
      subject = GmailApp.getDraft(id).getMessage().getSubject();
    } catch {
      // draft no longer exists — treat as orphan
    }
    entries.push({
      id,
      plannedAt: state.plannedAt,
      label: state.label,
      warned: !!state.warned,
      subject,
    });
  }

  entries.sort((a, b) => a.plannedAt - b.plannedAt);

  if (entries.length === 0) {
    console.log("No scheduled drafts.");
    return;
  }

  for (const e of entries) {
    const when = e.warned ? "warned (parse fail)" : new Date(e.plannedAt).toISOString();
    const subj = e.subject === null ? "<orphan>" : `"${e.subject}"`;
    console.log(`[${when}]  ${e.label}  |  ${subj}`);
  }
  console.log(`Total: ${entries.length} ${entries.length === 1 ? "entry" : "entries"}.`);
}
