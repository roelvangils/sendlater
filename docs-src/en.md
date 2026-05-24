<header>
<h1>sendlater</h1>
<p class="lede">Schedule Gmail messages by labeling your drafts.</p>
<p>Mimestream doesn't (yet) have a "schedule send" feature. Gmail does — but only through the web interface. <strong>sendlater</strong> bridges that gap: write your email as a draft in Mimestream, slap a label on it, and the mail goes out at the right moment. Even if your Mac is off.</p>
</header>

## How it works

<ol class="steps">
<li><strong>Write a draft in Mimestream.</strong> Just like any regular email — recipient, subject, body.</li>
<li><strong>Apply a label from the <span class="chip">Send Later/…</span> set.</strong> For example <span class="chip">Send Later/Tomorrow</span>. Done.</li>
<li><strong>Forget about it.</strong> Google's servers check every 5 minutes which labeled drafts need to go out and send them at the right time. Your laptop doesn't need to be on.</li>
</ol>

## Supported email clients

This tool watches Gmail labels on drafts. For it to work directly from your client, that client must let you **apply a Gmail label to a draft without moving the draft out of the Drafts folder**. Surprisingly few clients do this — most IMAP clients turn Gmail labels into folders, so "labeling" actually moves the message.

| Client | Own send-later? | Labels on drafts? | Use sendlater? |
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

### Universal fallback

Even if your client can't apply Gmail labels to drafts, you can still use sendlater: write the draft in your client, then open [mail.google.com](https://mail.google.com) or the Gmail mobile app, find the draft, and apply the <span class="chip">Send Later/…</span> label there. One extra step, works for any client.

## One-time setup

The project runs as a Google Apps Script under your own account. No separate server, no OAuth app to register.

<ol class="steps">
<li>
<strong>Install dependencies.</strong>
<pre><code>npm install</code></pre>
</li>
<li>
<strong>Log in to <code>clasp</code> (Google's CLI for Apps Script) and push the code.</strong>
<pre><code>npx clasp login
npx clasp create --type standalone --title "Send Later"
npx clasp push</code></pre>
</li>
<li>
<strong>Run two functions in the Apps Script IDE.</strong>
<p>From the function dropdown at the top:</p>
<ul>
<li>Once: <code>ensureLabels</code> — creates the label tree. Gmail will ask for permission for the <code>gmail.modify</code> scope.</li>
<li>Once: <code>installTrigger</code> — registers the 5-minute time trigger on Google's servers.</li>
</ul>
</li>
</ol>

From that point on, you never need to touch the script again.

## The labels

Apply one label per draft. Optionally combine with <span class="chip">Send Later/Hold</span> to pause a scheduled mail temporarily.

<div class="label-card">
<div class="label-card-header"><span class="chip">Send Later/Tonight</span></div>
<p><strong>What:</strong> Tonight at 20:00.</p>
<p><strong>When:</strong> When you want something to land only after the work day — perfect for "I'm writing now but don't want it hitting an inbox immediately". If it's already past 20:00 when you label, the scheduled time shifts to tomorrow evening at 20:00.</p>
</div>

<div class="label-card">
<div class="label-card-header"><span class="chip">Send Later/Tomorrow</span></div>
<p><strong>What:</strong> Tomorrow morning at 09:00.</p>
<p><strong>When:</strong> By far the most used. For emails you write in the evening but want your colleague to see during office hours. Weekends are automatically skipped — a Friday-late label = Monday 09:00, no extra setting required.</p>
</div>

<div class="label-card">
<div class="label-card-header"><span class="chip">Send Later/Monday</span></div>
<p><strong>What:</strong> Next Monday at 09:00.</p>
<p><strong>When:</strong> For topics that should land at the start of the week — a weekly update, a follow-up you don't want to send before the weekend.</p>
</div>

<div class="label-card">
<div class="label-card-header"><span class="chip">Send Later/Custom</span></div>
<p><strong>What:</strong> A specific date and/or time, specified at the start of the subject.</p>
<p><strong>When:</strong> When none of the standard labels fit — for example a birthday email on June 15, or a follow-up in 3 days at 14:00. See below for the syntax.</p>
</div>

<div class="label-card">
<div class="label-card-header"><span class="chip">Send Later/Hold</span></div>
<p><strong>What:</strong> Pause a scheduled mail without losing the planning.</p>
<p><strong>When:</strong> You've prepared a mail for tomorrow but you're still on the fence. Slap <code>Hold</code> on it — the script skips the mail as long as this label is present. Remove <code>Hold</code> and the mail still goes out at the originally planned time.</p>
</div>

<div class="label-card">
<div class="label-card-header"><span class="chip">Send Later/Test</span></div>
<p><strong>What:</strong> Send in 2 minutes.</p>
<p><strong>When:</strong> Only to test the tool itself, e.g. after a change. Don't use it for real emails — picking the wrong label will send your mail out within minutes.</p>
</div>

## Custom: precise times via the subject

With <span class="chip">Send Later/Custom</span>, the scheduled time is read from the subject. Place a token at the very start of the subject between square brackets:

```
[send: 2026-06-15 14:30] Meeting proposal
```

On send, the token is automatically removed, so the recipient only sees "Meeting proposal".

### Supported formats

| Token | Resolves to |
|---|---|
| `[send: 2026-06-15 14:30]` | June 15, 2026 at 14:30 (local time, Brussels) |
| `[send: 2026-06-15]` | June 15, 2026 at 09:00 (default hour) |
| `[send: +3d]` | In 3 days, at 09:00 |
| `[send: +2h]` | In exactly 2 hours (to the second) |
| `[send: mon 14:00]` | Next Monday at 14:00 |
| `[send: fri]` | Next Friday at 09:00 |
| `[send: tomorrow 18:00]` | Tomorrow at 18:00 |
| `[send: tonight]` | Tonight 20:00 (same rule as <span class="chip">Tonight</span>) |

<div class="note">
<strong>Unparseable token?</strong> You'll get a <code>[sendlater] Could not parse</code> email in your inbox. The draft stays put and isn't sent. Adjust the subject and the next trigger run will pick it up.
</div>

## Subject line examples

Once a labeled draft is detected, the subject gets an hourglass-icon prefix with the scheduled time. That's visible only to you — right before sending, the prefix is stripped again.

### Example 1 — Send Later/Tomorrow on a Saturday

<p class="mockup-caption"><strong>a)</strong> Draft with label, before the next trigger run:</p>
<div class="mockup">
<div class="mockup-titlebar">
<span class="mockup-dot red"></span>
<span class="mockup-dot yellow"></span>
<span class="mockup-dot green"></span>
</div>
<div class="mockup-body">
<div class="mockup-row">
<span class="mockup-label">To:</span>
<span class="mockup-value">colleague@company.com</span>
</div>
<div class="mockup-row">
<span class="mockup-label">Subject:</span>
<span class="mockup-value subject">Meeting proposal</span>
<span class="chip">Send Later/Tomorrow</span>
</div>
</div>
</div>

<p class="mockup-caption"><strong>b)</strong> After detection (weekend skipped → Monday 09:00):</p>
<div class="mockup">
<div class="mockup-titlebar">
<span class="mockup-dot red"></span>
<span class="mockup-dot yellow"></span>
<span class="mockup-dot green"></span>
</div>
<div class="mockup-body">
<div class="mockup-row">
<span class="mockup-label">To:</span>
<span class="mockup-value">colleague@company.com</span>
</div>
<div class="mockup-row">
<span class="mockup-label">Subject:</span>
<span class="mockup-value subject">⏳ Monday 09:00 —— Meeting proposal</span>
<span class="chip">Send Later/Tomorrow</span>
</div>
</div>
</div>

<p class="mockup-caption"><strong>c)</strong> Arrived at the recipient on Monday morning:</p>
<div class="mockup">
<div class="mockup-titlebar">
<span class="mockup-dot red"></span>
<span class="mockup-dot yellow"></span>
<span class="mockup-dot green"></span>
</div>
<div class="mockup-body">
<div class="mockup-row">
<span class="mockup-label">From:</span>
<span class="mockup-value">you@company.com</span>
</div>
<div class="mockup-row">
<span class="mockup-label">Subject:</span>
<span class="mockup-value subject">Meeting proposal</span>
</div>
</div>
</div>

### Example 2 — Send Later/Custom with token

<p class="mockup-caption"><strong>a)</strong> Draft with token in the subject and the Custom label:</p>
<div class="mockup">
<div class="mockup-titlebar">
<span class="mockup-dot red"></span>
<span class="mockup-dot yellow"></span>
<span class="mockup-dot green"></span>
</div>
<div class="mockup-body">
<div class="mockup-row">
<span class="mockup-label">To:</span>
<span class="mockup-value">colleague@company.com</span>
</div>
<div class="mockup-row">
<span class="mockup-label">Subject:</span>
<span class="mockup-value subject">[send: 2026-06-15 14:30] Project follow-up</span>
<span class="chip">Send Later/Custom</span>
</div>
</div>
</div>

<p class="mockup-caption"><strong>b)</strong> After detection (token stripped, prefix added):</p>
<div class="mockup">
<div class="mockup-titlebar">
<span class="mockup-dot red"></span>
<span class="mockup-dot yellow"></span>
<span class="mockup-dot green"></span>
</div>
<div class="mockup-body">
<div class="mockup-row">
<span class="mockup-label">To:</span>
<span class="mockup-value">colleague@company.com</span>
</div>
<div class="mockup-row">
<span class="mockup-label">Subject:</span>
<span class="mockup-value subject">⏳ 15 Jun 14:30 —— Project follow-up</span>
<span class="chip">Send Later/Custom</span>
</div>
</div>
</div>

<p class="mockup-caption"><strong>c)</strong> Arrived on June 15 at 14:30:</p>
<div class="mockup">
<div class="mockup-titlebar">
<span class="mockup-dot red"></span>
<span class="mockup-dot yellow"></span>
<span class="mockup-dot green"></span>
</div>
<div class="mockup-body">
<div class="mockup-row">
<span class="mockup-label">From:</span>
<span class="mockup-value">you@company.com</span>
</div>
<div class="mockup-row">
<span class="mockup-label">Subject:</span>
<span class="mockup-value subject">Project follow-up</span>
</div>
</div>
</div>

## What's scheduled?

In the Apps Script IDE you can run the `auditScheduled` function at any time (function dropdown → `auditScheduled` → ▶ Run). It logs a chronological overview of every scheduled draft in the Execution log:

```
[2026-05-25T07:00:00.000Z]  Send Later/Tomorrow  | "Meeting proposal"
[2026-05-27T12:30:00.000Z]  Send Later/Custom    | "Follow-up X"
[2026-06-01T07:00:00.000Z]  Send Later/Monday    | "Monday update"
Total: 3 entries.
```

Handy for a weekly review — if there's anything you no longer want to send, slap <span class="chip">Send Later/Hold</span> on it or remove the time label.

## Frequently asked questions

<section class="faq">

<details>
<summary>What if I accidentally remove the label?</summary>
<div class="faq-body">
<p>The scheduled send is cancelled. On the next trigger run (within 5 minutes) the stored planning is cleaned up automatically. The draft stays as a draft in Mimestream — nothing happens to it.</p>
<p>You can simply re-apply the label to schedule again. Note: the time gets recalculated at the moment of re-labeling.</p>
</div>
</details>

<details>
<summary>Can I still change the scheduled time after labeling?</summary>
<div class="faq-body">
<p>The <code>⏳ …</code> prefix in the subject is display-only. Editing the time there has no effect on the planning.</p>
<p>To actually change the time:</p>
<ul>
<li>Switch to a different <span class="chip">Send Later/…</span> label, or</li>
<li>Remove the label, wait for a trigger run to clean up state (max. 5 min), then re-apply, or</li>
<li>Use <span class="chip">Send Later/Custom</span> with a new <code>[send: …]</code> token for precise control.</li>
</ul>
</div>
</details>

<details>
<summary>What if the tool can't parse the [send: …] token?</summary>
<div class="faq-body">
<p>You'll get a <code>[sendlater] Could not parse</code> email in your inbox. The draft stays put and isn't sent. Check the table of formats, fix the token, and the next trigger run will retry.</p>
<p>To avoid mail spam you only get one warning per draft, unless you change the subject — then a new warning can follow.</p>
</div>
</details>

<details>
<summary>What does Send Later/Hold do exactly?</summary>
<div class="faq-body">
<p><span class="chip">Send Later/Hold</span> pauses a scheduled mail without losing the originally planned time. As long as this label is present alongside a time label, the script skips the mail on every trigger run.</p>
<p>Remove <code>Hold</code> and the mail still goes out at the stored time.</p>
<p>Have only <code>Hold</code> (no time label)? Then nothing happens — a handy way to put a draft "on the bench" without scheduling anything specific.</p>
</div>
</details>

<details>
<summary>What if my Mac is off at the send time?</summary>
<div class="faq-body">
<p>No problem. The script runs on Google's own servers, triggered by a time-based trigger registered during the one-time setup. Your laptop is only needed to write drafts and apply labels — not for the actual sending.</p>
</div>
</details>

<details>
<summary>Is the calendar-icon prefix sent to the recipient?</summary>
<div class="faq-body">
<p>No. Right before the actual send, the script strips the prefix from the subject. The recipient sees your original subject without any trace of sendlater.</p>
<p>Same goes for the <code>[send: …]</code> token with Custom: it's stripped before the mail goes out.</p>
</div>
</details>

<details>
<summary>Can I still edit the draft after labeling?</summary>
<div class="faq-body">
<p>Yes. The script always sends the <em>current</em> contents of the draft at the moment of sending — not a snapshot from when you labeled. Up until just before the scheduled time you can still adjust text, recipients, and attachments.</p>
</div>
</details>

<details>
<summary>What if sending fails (e.g. quota exceeded)?</summary>
<div class="faq-body">
<p>You'll get a <code>[sendlater] Send failed</code> email in your inbox with the error. The draft stays put and the script retries on the next trigger run.</p>
<p>The most common cause is the daily quota: 100 mails/day on free Gmail, 1500 on Workspace. The quota resets every 24 hours.</p>
</div>
</details>

<details>
<summary>What if I apply two Send Later/* labels at once?</summary>
<div class="faq-body">
<p>The script picks whichever Gmail returns first — there's no guarantee which one. Better to apply just one at a time.</p>
<p>Exception: <span class="chip">Send Later/Hold</span> can sit next to a time label. Hold doesn't act as a time label but as a switch (see above).</p>
</div>
</details>

<details>
<summary>What's the difference between Send Later/Tomorrow on a Friday vs Saturday?</summary>
<div class="faq-body">
<p>None — both result in Monday 09:00. <span class="chip">Send Later/Tomorrow</span> automatically skips the weekend:</p>
<ul>
<li>Friday-late label → Monday 09:00</li>
<li>Saturday label → Monday 09:00</li>
<li>Sunday label → Monday 09:00</li>
<li>Monday label → Tuesday 09:00</li>
</ul>
<p>If you really mean "tomorrow" regardless of weekday, use <span class="chip">Send Later/Custom</span> with <code>[send: tomorrow]</code> or an explicit date.</p>
</div>
</details>

<details>
<summary>What if something goes wrong — clasp errors, missing labels, mails not sending?</summary>
<div class="faq-body">
<p>Quick checks, top to bottom:</p>
<ul>
<li><strong>clasp logged into the wrong Google account</strong> → <code>npx clasp logout</code>, log out of Google in your browser, then <code>npx clasp login</code> again.</li>
<li><strong><code>clasp create</code> fails with an API error</strong> → enable the Apps Script API at <a href="https://script.google.com/home/usersettings">script.google.com/home/usersettings</a>.</li>
<li><strong>OAuth shows "unverified app"</strong> → expected, click through via <strong>Advanced</strong>.</li>
<li><strong>Labels don't appear in Mimestream</strong> → force-refresh (⌘R). Labels sync from Gmail on next pull.</li>
<li><strong>Mail not sending despite the label</strong> → open the IDE → Executions tab. Most common cause: the draft has multiple <span class="chip">Send Later/…</span> labels (use just one) or the trigger isn't installed (run <code>installTrigger</code> once).</li>
<li><strong>Quota exceeded</strong> → free Gmail caps at 100 sends/day, Workspace at 1500. Resets at midnight Pacific time. The draft stays queued and retries automatically.</li>
<li><strong>"Another run is in progress; skipping this tick."</strong> → normal — <code>LockService</code> is preventing overlap. The next tick picks it up.</li>
</ul>
</div>
</details>

<details>
<summary>How do I remove sendlater entirely?</summary>
<div class="faq-body">
<ol>
<li>IDE → Triggers (clock icon, left sidebar) → delete the <code>processScheduledDrafts</code> trigger.</li>
<li>Gmail Settings → Labels → delete the <span class="chip">Send Later/…</span> labels and the <span class="chip">Send Later</span> parent.</li>
<li>Delete the Apps Script project at <a href="https://script.google.com">script.google.com</a>.</li>
<li>Locally: <code>rm -rf node_modules .clasp.json</code> if you want to clean up the working tree.</li>
</ol>
<p>Any drafts you'd labeled stay where they are — just unscheduled.</p>
</div>
</details>

<details>
<summary>What data can the script see, and where does it live?</summary>
<div class="faq-body">
<p>Everything runs inside your own Google account. No third-party servers, no telemetry.</p>
<ul>
<li><strong>Data location</strong>: drafts, state, and labels live in your Gmail and Apps Script tenant. Nothing is sent to the author, GitHub, or any external service.</li>
<li><strong>What the script reads</strong>: draft subjects, bodies, recipients, and attachments — the same things any mail client reads — to send them on schedule.</li>
<li><strong>State in <code>PropertiesService</code></strong> contains only draft IDs, planned timestamps, label names, and short MD5 hashes of subjects. No message content, no recipient addresses.</li>
<li><strong>Notifications</strong> (<code>[sendlater] …</code>) go to your own Gmail inbox via <code>MailApp</code>. They never leave your account.</li>
<li><strong>OAuth scope</strong>: <code>gmail.modify</code> (read, send, label) plus <code>script.scriptapp</code> (manage your own triggers). No other scopes requested.</li>
</ul>
</div>
</details>

</section>

<footer>
<p>Source: <a href="https://github.com/roelvangils/sendlater">github.com/roelvangils/sendlater</a></p>
<p>Quotas: 100 mails/day on free Gmail, 1500 on Workspace. Trigger granularity: 5 minutes — actual send time is planned time ± 5 min.</p>
</footer>
