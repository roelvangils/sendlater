<header>
<h1>sendlater</h1>
<p class="lede">Stuur Gmail-berichten later via een label op je concept.</p>
<p>Mimestream heeft (nog) geen "schedule send"-functie. Gmail wel — maar alleen via de webinterface. <strong>sendlater</strong> overbrugt dat: schrijf je mail als concept in Mimestream, plak er een label op, en de mail vertrekt op het juiste moment. Ook als je Mac uit staat.</p>
</header>

## Hoe werkt het

<ol class="steps">
<li><strong>Schrijf een concept in Mimestream.</strong> Net zoals een gewone mail — ontvanger, onderwerp, inhoud.</li>
<li><strong>Plak een label uit de <span class="chip">Send Later/…</span>-reeks.</strong> Bijvoorbeeld <span class="chip">Send Later/Tomorrow</span>. Klaar.</li>
<li><strong>Niks meer te doen.</strong> Google's servers checken elke 5 minuten of er gelabelde concepten klaarstaan, en versturen ze op het juiste tijdstip. Je laptop hoeft niet aan te staan.</li>
</ol>

## Ondersteunde e-mail clients

Deze tool kijkt naar Gmail-labels op drafts. Om hem rechtstreeks vanuit je e-mail client te gebruiken, moet die client toelaten dat je **een Gmail-label op een draft plakt zonder de draft uit de Drafts-folder te verplaatsen**. Verrassend weinig clients doen dit — de meeste IMAP-clients zetten Gmail-labels om in folders, waardoor "labelen" eigenlijk verplaatsen wordt.

| Client | Eigen send-later? | Labels op drafts? | Sendlater nodig? |
|---|---|---|---|
| **Mimestream** (macOS) | Nee | Ja (Gmail API) | ⭐ Primaire use case |
| Apple Mail (macOS Ventura+, iOS) | Ja | Nee (labels = folders) | Gebruik ingebouwde scheduled send |
| Spark (alle platforms) | Ja | Ja | Gebruik Spark's scheduled send |
| Gmail web / mobile | Ja | Ja | Gebruik Gmail's scheduled send |
| Outlook (new) + Gmail | Nee | Nee (labels = folders) | Label via Gmail-web (fallback) |
| Outlook (classic) | Alleen client-side delay | Nee | Fallback aangeraden |
| Thunderbird | Via "Send Later" addon | Nee (labels = folders) | Gebruik de addon |
| Airmail | Ja | Wisselend | Gebruik Airmail's scheduled send |
| Andere IMAP-clients | Wisselend | Meestal niet | Universele fallback |

### Universele fallback

Ook al kan je client geen Gmail-labels op drafts plakken, je kunt sendlater nog steeds gebruiken: schrijf de draft in je gewone client, open daarna [mail.google.com](https://mail.google.com) of de Gmail-mobiele app, zoek de draft op, en plak daar het <span class="chip">Send Later/…</span>-label. Eén extra handeling, maar werkt voor élke client.

## Eenmalige setup

Het project draait als een Google Apps Script onder je eigen account. Geen aparte server, geen OAuth-app om te registreren.

<ol class="steps">
<li>
<strong>Installeer de dependencies.</strong>
<pre><code>npm install</code></pre>
</li>
<li>
<strong>Log in bij <code>clasp</code> (Google's CLI voor Apps Script) en push de code.</strong>
<pre><code>npx clasp login
npx clasp create --type standalone --title "Send Later"
npx clasp push</code></pre>
</li>
<li>
<strong>Draai twee functies in de Apps Script-IDE.</strong>
<p>In de functie-dropdown bovenaan:</p>
<ul>
<li>Eén keer <code>ensureLabels</code> — maakt de label-boom aan. Gmail vraagt toestemming voor de <code>gmail.modify</code>-scope.</li>
<li>Eén keer <code>installTrigger</code> — registreert de 5-min time-trigger op Google's servers.</li>
</ul>
</li>
</ol>

Vanaf dat moment hoef je het script nooit meer aan te raken.

## De labels

Plak één label per concept. Combineer eventueel met <span class="chip">Send Later/Hold</span> om een geplande mail tijdelijk te pauzeren.

<div class="label-card">
<div class="label-card-header"><span class="chip">Send Later/Tonight</span></div>
<p><strong>Wat:</strong> vanavond om 20:00.</p>
<p><strong>Wanneer:</strong> als je iets pas na de werkdag wil laten aankomen — perfect voor "ik schrijf nu maar wil dat het niet meteen op een mailbox valt". Als het al ná 20:00 is wanneer je labelt, schuift de geplande tijd door naar morgenavond 20:00.</p>
</div>

<div class="label-card">
<div class="label-card-header"><span class="chip">Send Later/Tomorrow</span></div>
<p><strong>Wat:</strong> morgenochtend om 09:00.</p>
<p><strong>Wanneer:</strong> verreweg het meest gebruikt. Voor mails die je 's avonds schrijft maar die je collega tijdens kantooruren wil zien. Weekend wordt automatisch overgeslagen — een vrijdag-laat label = maandag 09:00, geen aparte instelling nodig.</p>
</div>

<div class="label-card">
<div class="label-card-header"><span class="chip">Send Later/Monday</span></div>
<p><strong>Wat:</strong> de eerstvolgende maandag om 09:00.</p>
<p><strong>Wanneer:</strong> voor onderwerpen die best aan het begin van de week landen — een wekelijkse update, een opvolging die je niet voor het weekend wil sturen.</p>
</div>

<div class="label-card">
<div class="label-card-header"><span class="chip">Send Later/Custom</span></div>
<p><strong>Wat:</strong> een specifieke datum en/of tijd, opgegeven aan het begin van het onderwerp.</p>
<p><strong>Wanneer:</strong> als geen van de standaardlabels past — bijvoorbeeld een verjaardagsmail op 15 juni, of een follow-up over 3 dagen om 14:00. Zie hieronder voor de syntax.</p>
</div>

<div class="label-card">
<div class="label-card-header"><span class="chip">Send Later/Hold</span></div>
<p><strong>Wat:</strong> pauzeer een geplande mail zonder de planning te verliezen.</p>
<p><strong>Wanneer:</strong> je hebt een mail klaargezet voor morgen maar twijfelt nog. Plak <code>Hold</code> erbij — het script slaat de mail over zolang dit label aanwezig is. Haal <code>Hold</code> weg en de mail vertrekt alsnog op het oorspronkelijk geplande tijdstip.</p>
</div>

<div class="label-card">
<div class="label-card-header"><span class="chip">Send Later/Test</span></div>
<p><strong>Wat:</strong> verstuur over 2 minuten.</p>
<p><strong>Wanneer:</strong> uitsluitend om de tool zelf te testen, bijvoorbeeld na een wijziging. Niet voor echte mails — verkeerde labelkeuze stuurt je mail binnen enkele minuten de wereld in.</p>
</div>

## Custom: precieze tijden via het onderwerp

Bij <span class="chip">Send Later/Custom</span> wordt de geplande tijd uit het onderwerp gelezen. Plaats een token aan het begin van het onderwerp tussen vierkante haken:

```
[send: 2026-06-15 14:30] Vergaderingsvoorstel
```

Bij het verzenden wordt het token automatisch verwijderd, dus de ontvanger ziet alleen "Vergaderingsvoorstel".

### Ondersteunde formaten

| Token | Wat het oplevert |
|---|---|
| `[send: 2026-06-15 14:30]` | 15 juni 2026 om 14:30 (lokale tijd, Brussel) |
| `[send: 2026-06-15]` | 15 juni 2026 om 09:00 (standaarduur) |
| `[send: +3d]` | Over 3 dagen, om 09:00 |
| `[send: +2h]` | Over precies 2 uur (datum en uur op de seconde) |
| `[send: mon 14:00]` | Eerstvolgende maandag om 14:00 |
| `[send: fri]` | Eerstvolgende vrijdag om 09:00 |
| `[send: tomorrow 18:00]` | Morgen om 18:00 |
| `[send: tonight]` | Vanavond 20:00 (zelfde regel als <span class="chip">Tonight</span>) |

<div class="note">
<strong>Onparsbaar token?</strong> Dan krijg je een <code>[sendlater] Could not parse</code>-mail in je inbox. Het concept blijft staan en wordt niet verstuurd. Pas het onderwerp aan en de volgende trigger-run pikt het opnieuw op.
</div>

## Voorbeelden van onderwerpregels

Zodra een gelabeld concept gedetecteerd wordt, krijgt het onderwerp een prefix met een zandloper-icoontje en de geplande tijd. Dat is alleen voor jou zichtbaar — vlak voor het verzenden wordt de prefix weer gestript. De tijdsaanduiding is altijd in het Engels.

### Voorbeeld 1 — Send Later/Tomorrow op een zaterdag

<p class="mockup-caption"><strong>a)</strong> Concept met label, nog vóór de eerstvolgende trigger-run:</p>
<div class="mockup">
<div class="mockup-titlebar">
<span class="mockup-dot red"></span>
<span class="mockup-dot yellow"></span>
<span class="mockup-dot green"></span>
</div>
<div class="mockup-body">
<div class="mockup-row">
<span class="mockup-label">To:</span>
<span class="mockup-value">collega@bedrijf.be</span>
</div>
<div class="mockup-row">
<span class="mockup-label">Subject:</span>
<span class="mockup-value subject">Vergaderingsvoorstel</span>
<span class="chip">Send Later/Tomorrow</span>
</div>
</div>
</div>

<p class="mockup-caption"><strong>b)</strong> Na detectie (weekend werd overgeslagen → maandag 09:00):</p>
<div class="mockup">
<div class="mockup-titlebar">
<span class="mockup-dot red"></span>
<span class="mockup-dot yellow"></span>
<span class="mockup-dot green"></span>
</div>
<div class="mockup-body">
<div class="mockup-row">
<span class="mockup-label">To:</span>
<span class="mockup-value">collega@bedrijf.be</span>
</div>
<div class="mockup-row">
<span class="mockup-label">Subject:</span>
<span class="mockup-value subject">⏳ Monday 09:00 —— Vergaderingsvoorstel</span>
<span class="chip">Send Later/Tomorrow</span>
</div>
</div>
</div>

<p class="mockup-caption"><strong>c)</strong> Aangekomen bij de ontvanger op maandagochtend:</p>
<div class="mockup">
<div class="mockup-titlebar">
<span class="mockup-dot red"></span>
<span class="mockup-dot yellow"></span>
<span class="mockup-dot green"></span>
</div>
<div class="mockup-body">
<div class="mockup-row">
<span class="mockup-label">From:</span>
<span class="mockup-value">jij@bedrijf.be</span>
</div>
<div class="mockup-row">
<span class="mockup-label">Subject:</span>
<span class="mockup-value subject">Vergaderingsvoorstel</span>
</div>
</div>
</div>

### Voorbeeld 2 — Send Later/Custom met token

<p class="mockup-caption"><strong>a)</strong> Concept met token in het onderwerp en het Custom-label:</p>
<div class="mockup">
<div class="mockup-titlebar">
<span class="mockup-dot red"></span>
<span class="mockup-dot yellow"></span>
<span class="mockup-dot green"></span>
</div>
<div class="mockup-body">
<div class="mockup-row">
<span class="mockup-label">To:</span>
<span class="mockup-value">collega@bedrijf.be</span>
</div>
<div class="mockup-row">
<span class="mockup-label">Subject:</span>
<span class="mockup-value subject">[send: 2026-06-15 14:30] Follow-up project</span>
<span class="chip">Send Later/Custom</span>
</div>
</div>
</div>

<p class="mockup-caption"><strong>b)</strong> Na detectie (token gestript, prefix toegevoegd):</p>
<div class="mockup">
<div class="mockup-titlebar">
<span class="mockup-dot red"></span>
<span class="mockup-dot yellow"></span>
<span class="mockup-dot green"></span>
</div>
<div class="mockup-body">
<div class="mockup-row">
<span class="mockup-label">To:</span>
<span class="mockup-value">collega@bedrijf.be</span>
</div>
<div class="mockup-row">
<span class="mockup-label">Subject:</span>
<span class="mockup-value subject">⏳ 15 Jun 14:30 —— Follow-up project</span>
<span class="chip">Send Later/Custom</span>
</div>
</div>
</div>

<p class="mockup-caption"><strong>c)</strong> Aangekomen op 15 juni 14:30:</p>
<div class="mockup">
<div class="mockup-titlebar">
<span class="mockup-dot red"></span>
<span class="mockup-dot yellow"></span>
<span class="mockup-dot green"></span>
</div>
<div class="mockup-body">
<div class="mockup-row">
<span class="mockup-label">From:</span>
<span class="mockup-value">jij@bedrijf.be</span>
</div>
<div class="mockup-row">
<span class="mockup-label">Subject:</span>
<span class="mockup-value subject">Follow-up project</span>
</div>
</div>
</div>

## Wat staat er gepland?

In de Apps Script-IDE kun je op elk moment de functie `auditScheduled` draaien (functie-dropdown → `auditScheduled` → ▶ Run). Die geeft een chronologisch overzicht van alle ingeplande concepten in de Execution log:

```
[2026-05-25T07:00:00.000Z]  Send Later/Tomorrow  | "Vergaderingsvoorstel"
[2026-05-27T12:30:00.000Z]  Send Later/Custom    | "Follow-up X"
[2026-06-01T07:00:00.000Z]  Send Later/Monday    | "Maandag-update"
Total: 3 entries.
```

Handig voor een wekelijkse review — staat er iets dat je toch niet meer wil versturen, plak <span class="chip">Send Later/Hold</span> erop of haal het tijdslabel weg.

## Veelgestelde vragen

<section class="faq">

<details>
<summary>Wat als ik het label per ongeluk verwijder?</summary>
<div class="faq-body">
<p>De geplande verzending wordt geannuleerd. Bij de volgende trigger-run (binnen 5 minuten) wordt de bewaarde planning automatisch opgeruimd. Het concept blijft als concept in Mimestream staan — er gebeurt niks ermee.</p>
<p>Je kunt het label gewoon opnieuw plakken om alsnog in te plannen, met dien verstande dat de tijd opnieuw berekend wordt op het moment van re-labelen.</p>
</div>
</details>

<details>
<summary>Kan ik de geplande tijd nog wijzigen nadat ik gelabeld heb?</summary>
<div class="faq-body">
<p>De <code>⏳ …</code>-prefix in het onderwerp is alleen weergave. Daar het tijdstip in editen heeft geen effect op de planning.</p>
<p>Om de tijd echt te wijzigen:</p>
<ul>
<li>Wissel naar een ander <span class="chip">Send Later/…</span>-label, of</li>
<li>Haal het label weg, wacht op een trigger-run zodat de oude staat opgeruimd wordt (max. 5 min), en plak het label opnieuw, of</li>
<li>Gebruik <span class="chip">Send Later/Custom</span> met een nieuw <code>[send: …]</code>-token voor exacte controle.</li>
</ul>
</div>
</details>

<details>
<summary>Wat als de tool het [send: …]-token niet kan parsen?</summary>
<div class="faq-body">
<p>Je krijgt automatisch een <code>[sendlater] Could not parse</code>-mail in je inbox. Het concept blijft staan, maar wordt niet verstuurd. Kijk in de tabel met formaten, pas het token aan, en de volgende trigger-run probeert het opnieuw.</p>
<p>Om mail-spam te vermijden krijg je per concept maar één waarschuwing, tenzij je het onderwerp daarna wijzigt — dan kan er een nieuwe waarschuwing volgen.</p>
</div>
</details>

<details>
<summary>Wat doet Send Later/Hold precies?</summary>
<div class="faq-body">
<p><span class="chip">Send Later/Hold</span> pauzeert een geplande mail zonder de oorspronkelijk geplande tijd te verliezen. Zolang dit label aanwezig is naast een tijdslabel, slaat het script de mail over bij elke trigger-run.</p>
<p>Haal <code>Hold</code> weg en de mail vertrekt alsnog op het bewaarde tijdstip.</p>
<p>Heb je alleen <code>Hold</code> (zonder tijdslabel)? Dan gebeurt er niks — een handige manier om een concept "in de wachtkamer" te zetten zonder iets concreets te plannen.</p>
</div>
</details>

<details>
<summary>Wat als mijn Mac uit staat tijdens het verzendmoment?</summary>
<div class="faq-body">
<p>Geen probleem. Het script draait op Google's eigen servers, getriggerd door een time-based trigger die je tijdens de eenmalige setup hebt geregistreerd. Je laptop is alleen nodig om concepten te schrijven en labels te plakken — niet voor het verzenden zelf.</p>
</div>
</details>

<details>
<summary>Wordt de agenda-icoon-prefix mee verstuurd naar de ontvanger?</summary>
<div class="faq-body">
<p>Nee. Vlak vóór de daadwerkelijke verzending verwijdert het script de prefix uit het onderwerp. De ontvanger ziet jouw oorspronkelijke onderwerp, zonder enig spoor van sendlater.</p>
<p>Hetzelfde geldt voor het <code>[send: …]</code>-token bij Custom: ook dat wordt gestript voordat de mail vertrekt.</p>
</div>
</details>

<details>
<summary>Mag ik het concept nog aanpassen na het labelen?</summary>
<div class="faq-body">
<p>Ja. Het script verstuurt altijd de <em>huidige</em> inhoud van het concept op het moment van verzenden — niet een snapshot van toen je labelde. Tot vlak voor het geplande tijdstip kan je de tekst, ontvangers en bijlagen nog aanpassen.</p>
</div>
</details>

<details>
<summary>Wat als verzenden mislukt (bv. quotum overschreden)?</summary>
<div class="faq-body">
<p>Dan krijg je een <code>[sendlater] Send failed</code>-mail in je inbox met de foutmelding. Het concept blijft staan en het script probeert opnieuw bij de volgende trigger-run.</p>
<p>De meest voorkomende oorzaak is het dagelijks quotum: 100 mails/dag op gratis Gmail, 1500 op Workspace. Het quotum reset elke 24 uur.</p>
</div>
</details>

<details>
<summary>Wat als ik twee Send Later/*-labels tegelijk plak?</summary>
<div class="faq-body">
<p>Het script pakt willekeurig de eerste die Gmail teruggeeft — er is geen garantie welke. Plak er dus liever maar één tegelijk.</p>
<p>Uitzondering: <span class="chip">Send Later/Hold</span> mag wél naast een tijdslabel staan. Hold gedraagt zich namelijk niet als een tijdslabel maar als een schakelaar (zie hierboven).</p>
</div>
</details>

<details>
<summary>Wat is het verschil tussen Send Later/Tomorrow op vrijdag versus zaterdag?</summary>
<div class="faq-body">
<p>Geen — beide resulteren in maandag 09:00. <span class="chip">Send Later/Tomorrow</span> slaat het weekend automatisch over:</p>
<ul>
<li>Vrijdag-laat label → maandag 09:00</li>
<li>Zaterdag label → maandag 09:00</li>
<li>Zondag label → maandag 09:00</li>
<li>Maandag label → dinsdag 09:00</li>
</ul>
<p>Als je écht "morgen" bedoelt ongeacht weekdag, gebruik <span class="chip">Send Later/Custom</span> met <code>[send: tomorrow]</code> of een expliciete datum.</p>
</div>
</details>

</section>

<footer>
<p>Broncode: <a href="https://github.com/roelvangils/sendlater">github.com/roelvangils/sendlater</a></p>
<p>Quota: 100 mails/dag op gratis Gmail, 1500 op Workspace. Trigger-granulariteit: 5 minuten — feitelijke verzendtijd is geplande tijd ± 5 min.</p>
</footer>
