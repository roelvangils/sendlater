# sendlater

Schedule Gmail sends by labeling a draft. Built for [Mimestream](https://mimestream.com)
users who miss Gmail's native "Schedule send" feature.

Runs entirely as a Google Apps Script bound to your account — no separate server,
no OAuth app to register. Works while your Mac is off.

## How it works

1. Write a draft in Mimestream (or anywhere).
2. Apply a `Send Later/…` label to it.
3. A time-based trigger runs every 5 min on Google's servers:
   - First sighting → schedules the draft, prefixes the subject with `⏳ Weekday HH:MM ——`
     so you can see when it'll go out.
   - On send time → strips the prefix and sends. State auto-cleaned.

## Supported email clients

This tool watches Gmail labels on drafts. For it to work directly from your
client, that client must let you **apply a Gmail label to a draft without moving
the draft out of the Drafts folder**. Surprisingly few clients do this — most
IMAP clients turn Gmail labels into folders, so "labeling" actually moves the
message.

| Client | Own scheduled send? | Can label drafts? | Use sendlater? |
|---|---|---|---|
| **Mimestream** (macOS) | No | Yes (Gmail API) | ⭐ Primary use case |
| Apple Mail (macOS Ventura+, iOS) | Yes | No (labels = folders) | Use built-in scheduling |
| Spark (all platforms) | Yes | Yes | Use Spark's scheduling |
| Gmail web / mobile | Yes | Yes | Use Gmail's scheduling |
| Outlook (new) + Gmail | No | No (labels = folders) | Label via Gmail web (fallback) |
| Outlook (classic) | Client-side delay only | No | Fallback recommended |
| Thunderbird | Via "Send Later" addon | No (labels = folders) | Use the addon |
| Airmail | Yes | Varies | Use Airmail's scheduling |
| Other IMAP clients | Varies | Usually no | Universal fallback |

**Universal fallback.** Even if your client can't apply Gmail labels to drafts,
you can still use sendlater: write the draft in your client, then open
[mail.google.com](https://mail.google.com) or the Gmail mobile app, find the
draft, and apply the `Send Later/…` label there. One extra step, works for any
client.

## Labels

```
Send Later/
  Tonight     vandaag 20:00 (or tomorrow 20:00 if already past)
  Tomorrow    next non-weekend day 09:00
  Monday      next Monday 09:00
  Custom      time read from [send: …] token in subject
  Hold        kill-switch — pauses scheduling without losing state
  Test        now + 2 min (handy while iterating)
```

Apply just one `Send Later/…` label per draft. `Hold` is the exception — combine
it with a timing label to pause; remove `Hold` to resume with the original time.

## Custom datetime token

For one-off times, use `Send Later/Custom` and put a token at the start of the
subject:

| Token                       | Resolves to                          |
|-----------------------------|--------------------------------------|
| `[send: 2026-06-15 14:30]`  | absolute, Europe/Brussels            |
| `[send: 2026-06-15]`        | that date, 09:00                     |
| `[send: +3d]`               | now + 3 days, 09:00                  |
| `[send: +2h]`               | now + 2 hours                        |
| `[send: mon 14:00]`         | next Monday 14:00                    |
| `[send: fri]`               | next Friday 09:00                    |
| `[send: tomorrow 18:00]`    | tomorrow 18:00                       |
| `[send: tonight]`           | same logic as `Send Later/Tonight`   |

Unparseable token → you get a `[sendlater]` notification mail. Fix the subject,
the next run picks it up.

The token is stripped from the subject before the mail goes out.

## Prerequisites

- **Node.js 18+** and npm — for `clasp` and the docs build.
- **A Google account** — free Gmail works; Google Workspace gets you higher
  daily quotas (1500 vs 100 mails/day).
- **Apps Script API enabled** — one-time toggle at
  <https://script.google.com/home/usersettings> if you've never created an
  Apps Script project before.
- Any platform with a shell — `clasp` works on macOS, Linux, Windows.

## Configure

Two files hold every user-tunable knob. Edit them before your first push.

**`src/userconfig.ts`** — scheduling defaults:

| Constant | Default | What it controls |
|---|---|---|
| `DEFAULT_SEND_HOUR` | `9` | When `Tomorrow` / `Monday` labels send |
| `TONIGHT_HOUR` | `20` | When `Tonight` sends (and the cutoff for "already past") |
| `TEST_OFFSET_MINUTES` | `2` | How far in the future the `Test` label schedules |
| `TRIGGER_INTERVAL_MIN` | `5` | How often the scheduler checks (allowed: 1, 5, 10, 15, 30) |

**`appsscript.json`** — your timezone:

```json
"timeZone": "Europe/Brussels"
```

Use any [IANA timezone name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
(`Europe/Amsterdam`, `America/New_York`, `Asia/Tokyo`, …).

## Setup

```bash
npm install
npx clasp login
npx clasp create --type standalone --title "Send Later"
npx clasp push
npm run open
```

In the Apps Script web IDE:

1. Run `ensureLabels` once → creates the label tree, prompts for Gmail consent.
2. Run `installTrigger` once → registers the time trigger.

That's it. From now on, label a draft and forget about it.

> **First-time OAuth consent**: Google will show an "unverified app" warning
> because the script isn't published. Click **Advanced → Go to "Send Later"
> (unsafe)** to grant the `gmail.modify` scope. For Google Workspace
> accounts, an admin can pre-approve the script in the Admin Console if
> personal consent is blocked.

## Files

- `src/userconfig.ts` — the four user-tunable constants (edit first).
- `src/config.ts` — label-to-time mapping, time helpers.
- `src/scheduler.ts` — main loop (`processScheduledDrafts`), driven by the trigger.
- `src/parser.ts` — custom datetime parser (ISO, relative, weekday).
- `src/subject.ts` — visibility prefix apply / strip on send.
- `src/notifications.ts` — `notifyOwner` (failure mail to yourself).
- `src/state.ts` — `PropertiesService` wrapper + subject hash.
- `src/setup.ts` — one-time helpers (`installTrigger`, `ensureLabels`).
- `src/audit.ts` — `auditScheduled()` lists all scheduled drafts with their times.

## Troubleshooting

- **`clasp login` opened the wrong Google account.** Run `npx clasp logout`,
  log out of all Google accounts in your browser, then `npx clasp login` again.
- **`clasp create` fails with an API error.** Enable the Apps Script API at
  <https://script.google.com/home/usersettings>.
- **OAuth consent shows "unverified app".** Expected — click through via
  **Advanced**. The script is yours, running under your own account.
- **Labels don't appear in Mimestream after `ensureLabels`.** Force-refresh
  Mimestream (⌘R) — labels sync from Gmail on next pull.
- **Mail not sending despite the label.** Open the IDE → Executions tab.
  Most common: draft has multiple `Send Later/*` labels (use just one), or
  the trigger isn't installed (run `installTrigger` once).
- **`[sendlater] Send failed: Quota exceeded`.** Free Gmail caps at 100
  sends/day, Workspace at 1500. Quota resets at midnight Pacific time. The
  draft stays in your queue and retries automatically.
- **You see "Another run is in progress; skipping this tick." in the log.**
  That's normal — `LockService` is preventing overlap. The next tick will
  pick up where this one left off.

## Uninstall

If you want to take it all back out:

1. IDE → Triggers (clock icon, left sidebar) → delete the
   `processScheduledDrafts` trigger.
2. Gmail Settings → Labels → delete `Send Later/Tonight`, `…/Tomorrow`,
   `…/Monday`, `…/Custom`, `…/Hold`, `…/Test`, and the parent `Send Later`.
3. Delete the Apps Script project at <https://script.google.com>.
4. Locally: `rm -rf node_modules .clasp.json` to remove tracking files.

Any drafts you'd labeled stay where they are — just unscheduled.

## Privacy

The script runs entirely under your Google account. No third-party servers
are involved.

- **Data location**: all draft content, state, and labels live in your
  Gmail and Apps Script tenant. Nothing is sent to the author, GitHub, or
  any external service.
- **What the script reads**: draft subjects, bodies, recipients, and
  attachments — to send them on schedule. Same things any mail client
  reads.
- **State in `PropertiesService`** contains only draft IDs, planned
  timestamps, label names, and short MD5 hashes of subjects (for parse-
  failure throttling). No message content, no recipient addresses.
- **Notifications** (`[sendlater] …`) go to your own Gmail inbox via
  `MailApp`. They never leave your account.
- **OAuth scope**: `gmail.modify` (read, send, label) plus
  `script.scriptapp` (manage your own triggers). No other scopes requested.

## Documentation site

The user guide is built from Markdown sources:

- `docs-src/template.html` — CSS shell + placeholders.
- `docs-src/en.md` / `docs-src/nl.md` — content (Markdown with inline HTML for mockups, label cards, FAQ).
- `build-docs.mjs` — Node script that runs `markdown-it` over the sources and writes `docs/index.html` and `docs/handleiding.html`.

To regenerate after editing the sources:

```bash
npm run docs:build
```

The `docs/` folder is the committed build output served by GitHub Pages at https://roelvangils.github.io/sendlater/.

## Observability

- `npm run logs` — tail Apps Script logs.
- IDE → **Executions** tab — every trigger run, including failures.
- IDE → run `auditScheduled` any time — chronological list of pending sends.
- Failure → `[sendlater] Send failed` mail in your inbox.

## Limits

- Free Gmail: 100 sends/day via `GmailApp`. Workspace: 1500. Per-account.
- Trigger granularity: 5 min, so actual send = planned ± 5 min.
- One `Send Later/…` label per draft. If you stack two by accident, the script
  picks the first one Gmail returns (unpredictable). Use one.
