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
2. Run `installTrigger` once → registers the 5-min time trigger.

That's it. From now on, label a draft and forget about it.

## Files

- `src/config.ts` — label-to-time mapping, time helpers.
- `src/scheduler.ts` — main loop (`processScheduledDrafts`), driven by the trigger.
- `src/parser.ts` — custom datetime parser (ISO, relative, weekday).
- `src/subject.ts` — visibility prefix apply / strip on send.
- `src/notifications.ts` — `notifyOwner` (failure mail to yourself).
- `src/state.ts` — `PropertiesService` wrapper + subject hash.
- `src/setup.ts` — one-time helpers (`installTrigger`, `ensureLabels`).
- `src/audit.ts` — `auditScheduled()` lists all scheduled drafts with their times.

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
