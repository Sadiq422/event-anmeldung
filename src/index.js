// Cloudflare Worker: Einladung Familie Yousufi
// Routes:
//   GET  /            -> HTML Einladung + Form
//   POST /api/submit  -> Speichert Anmeldung in Notion
//   GET  /event.ics   -> Kalender-Datei (iOS / Apple Kalender)
// ENV: NOTION_TOKEN (Secret), NOTION_DATABASE_ID

const VALID_ZUSAGE = new Set([
  'Kommen',
  'Gebe bis 04.07.2026 Bescheid',
]);

const EVENT = {
  title: 'Wir feiern gemeinsam — Familie Yousufi',
  description: 'Einladung zu einem besonderen Anlass. 10 Jahre in Deutschland, KFZ-Meister, staatlich geprüfte sozialpädagogische Assistentin, deutsche Staatsbürgerschaft.',
  location: 'Käthe-Kollwitz-Straße 16a, 15827 Blankenfelde-Mahlow',
  // 11. Juli 2026 17:00 CEST = 15:00 UTC ; Ende geschätzt 23:00 CEST = 21:00 UTC
  dtstartUTC: '20260711T150000Z',
  dtendUTC: '20260711T210000Z',
};

// Google Calendar Add-Event URL (öffnet Browser, User klickt "Speichern")
const GOOGLE_CAL_URL = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(EVENT.title)}&dates=${EVENT.dtstartUTC}/${EVENT.dtendUTC}&details=${encodeURIComponent(EVENT.description)}&location=${encodeURIComponent(EVENT.location)}`;

const HTML = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Einladung — Familie Yousufi</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body { height: 100%; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1a2d4f;
      background-image: radial-gradient(ellipse at top, #2a4470 0%, #1a2d4f 60%, #0f1d35 100%);
      min-height: 100vh;
      padding: 20px;
      color: #1a2d4f;
      -webkit-font-smoothing: antialiased;
      line-height: 1.6;
    }
    .container { max-width: 560px; margin: 24px auto; }
    .card {
      background: #faf7f0;
      border-radius: 18px;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
      padding: 40px 32px;
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 4px;
      background: linear-gradient(90deg, #c9a55c, #e6c789, #c9a55c);
    }
    h1 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 40px; font-weight: 600; line-height: 1.1;
      color: #1a2d4f; margin-bottom: 28px; letter-spacing: -0.01em;
      text-align: center;
    }
    h1 em { color: #c9a55c; font-style: italic; font-weight: 500; }
    .event-info {
      background: #fff; border-radius: 12px; padding: 22px 24px;
      margin: 0 0 8px; border: 1px solid #ead7b0;
    }
    .info-row {
      display: flex; align-items: flex-start; gap: 12px;
      font-size: 16px; color: #1a2d4f; padding: 6px 0;
    }
    .info-row + .info-row { border-top: 1px solid #f0e5cc; margin-top: 6px; padding-top: 12px; }
    .info-icon { color: #c9a55c; flex-shrink: 0; font-size: 18px; line-height: 1.4; }
    .info-text { flex: 1; }
    .info-label { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; }
    .divider {
      border: none; height: 1px;
      background: linear-gradient(90deg, transparent, #d4c193, transparent);
      margin: 32px 0;
    }
    h2 {
      font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px;
      font-weight: 600; color: #1a2d4f; margin-bottom: 8px;
    }
    .form-sub { color: #64748b; margin-bottom: 22px; font-size: 14px; }
    .field { margin-bottom: 16px; }
    label.field-label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 13px; color: #1a2d4f; }
    input[type="text"], input[type="number"] {
      width: 100%; padding: 13px 14px; border: 1.5px solid #d4c193;
      border-radius: 10px; font-size: 16px; transition: border-color 0.15s, box-shadow 0.15s;
      font-family: inherit; -webkit-appearance: none; background: #fff; color: #1a2d4f;
    }
    input[type="text"]:focus, input[type="number"]:focus {
      outline: none; border-color: #c9a55c;
      box-shadow: 0 0 0 3px rgba(201, 165, 92, 0.15);
    }
    .radios { display: flex; flex-direction: column; gap: 8px; }
    .radio-option {
      display: flex; align-items: center; padding: 13px 14px;
      border: 1.5px solid #d4c193; border-radius: 10px; cursor: pointer;
      transition: all 0.15s ease; font-size: 15px; background: #fff;
      user-select: none; color: #1a2d4f;
    }
    .radio-option input[type="radio"] {
      margin-right: 12px; accent-color: #c9a55c;
      width: 20px; height: 20px; flex-shrink: 0;
    }
    .radio-option.selected { border-color: #c9a55c; background: #fdf8eb; }
    .conditional { display: none; }
    .conditional.visible { display: block; }
    button {
      width: 100%; padding: 16px;
      background: #1a2d4f; color: #faf7f0; border: none;
      border-radius: 10px; font-size: 15px; font-weight: 600; letter-spacing: 0.04em;
      cursor: pointer; margin-top: 12px;
      transition: opacity 0.2s ease, transform 0.1s ease; font-family: inherit;
      -webkit-appearance: none; text-transform: uppercase;
    }
    button:active:not(:disabled) { transform: translateY(1px); }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .button-row { display: flex; gap: 10px; }
    .button-row button { flex: 1; }
    button.outline {
      background: #fff; color: #1a2d4f; border: 1.5px solid #1a2d4f;
    }
    .secondary-btn {
      background: #fff; color: #1a2d4f; border: 1.5px solid #1a2d4f;
      text-transform: none; letter-spacing: 0; font-size: 14px;
      padding: 13px; text-decoration: none; display: flex;
      align-items: center; justify-content: center; gap: 8px;
      margin-top: 10px; border-radius: 10px; font-weight: 600;
    }
    .message {
      margin-top: 18px; padding: 14px; border-radius: 10px;
      text-align: center; font-size: 14px; line-height: 1.5;
    }
    .error { background: #fee2e2; color: #991b1b; }
    .hidden { display: none !important; }
    .success-screen { text-align: center; padding: 16px 0; }
    .success-check {
      width: 64px; height: 64px; border-radius: 50%;
      background: #c9a55c; color: #fff; display: flex;
      align-items: center; justify-content: center;
      font-size: 32px; margin: 0 auto 16px;
    }
    .success-screen h2 { margin-bottom: 8px; }
    .success-screen p { color: #475569; margin-bottom: 20px; font-size: 15px; }
    .prompt-box {
      background: #fff; border: 1px solid #ead7b0; border-radius: 12px;
      padding: 22px; margin: 22px 0 8px; text-align: left;
    }
    .prompt-box h3 {
      font-family: 'Cormorant Garamond', Georgia, serif; font-size: 22px;
      font-weight: 600; color: #1a2d4f; margin-bottom: 6px;
    }
    .prompt-box p { font-size: 14px; color: #475569; margin-bottom: 16px; }
    .calendar-options { display: flex; flex-direction: column; gap: 10px; }
    .cal-btn {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      padding: 14px; border-radius: 10px; font-size: 14px; font-weight: 600;
      text-decoration: none; transition: all 0.15s; cursor: pointer;
      font-family: inherit; border: 1.5px solid transparent;
    }
    .cal-google { background: #1a2d4f; color: #faf7f0; }
    .cal-google:active { transform: translateY(1px); }
    .cal-apple { background: #fff; color: #1a2d4f; border-color: #1a2d4f; }
    @media (max-width: 480px) {
      .container { margin: 0 auto; }
      .card { padding: 28px 22px; border-radius: 14px; }
      h1 { font-size: 32px; }
      h2 { font-size: 22px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card" id="main-card">
      <div id="invitation-content">
        <h1>Wir feiern <em>gemeinsam</em></h1>

        <div class="event-info">
          <div class="info-row">
            <span class="info-icon">&#x1F4C5;</span>
            <span class="info-text">
              <span class="info-label">Wann</span>
              Samstag, 11. Juli 2026 &middot; 17:00 Uhr
            </span>
          </div>
          <div class="info-row">
            <span class="info-icon">&#x1F4CD;</span>
            <span class="info-text">
              <span class="info-label">Wo</span>
              Käthe-Kollwitz-Straße 16a<br>15827 Blankenfelde-Mahlow
            </span>
          </div>
        </div>

        <hr class="divider">

        <h2>Bitte gib uns Bescheid</h2>
        <p class="form-sub">Damit wir besser planen können.</p>

        <form id="rsvp-form" novalidate>
          <div class="field">
            <label class="field-label" for="vorname">Vorname</label>
            <input type="text" id="vorname" name="vorname" autocomplete="given-name" required>
          </div>
          <div class="field">
            <label class="field-label" for="nachname">Nachname</label>
            <input type="text" id="nachname" name="nachname" autocomplete="family-name" required>
          </div>
          <div class="field">
            <label class="field-label">Zusage</label>
            <div class="radios">
              <label class="radio-option"><input type="radio" name="zusage" value="Kommen" required><span>Ich komme</span></label>
              <label class="radio-option"><input type="radio" name="zusage" value="Gebe bis 04.07.2026 Bescheid" required><span>Gebe bis 04.07.2026 Bescheid</span></label>
            </div>
          </div>
          <div class="field conditional" id="personen-field">
            <label class="field-label" for="anzahl">Anzahl Personen (inkl. dir)</label>
            <input type="number" id="anzahl" name="anzahl" min="1" max="20" step="1" value="1" inputmode="numeric">
          </div>
          <button type="submit" id="submit-btn">Absenden</button>
        </form>
        <div id="message" class="message hidden"></div>
      </div>

      <!-- Success: Ich komme -->
      <div id="success-kommen" class="success-screen hidden">
        <div class="success-check">&#10003;</div>
        <h2>Vielen Dank!</h2>
        <p>Deine Anmeldung ist gespeichert. Wir freuen uns auf dich.</p>

        <div class="prompt-box" id="calendar-prompt">
          <h3>Termin im Kalender speichern?</h3>
          <p>Wähle deine Kalender-App. Der Termin wird direkt geöffnet, du musst nur noch auf "Speichern" tippen.</p>
          <div class="calendar-options">
            <a class="cal-btn cal-google" href="${GOOGLE_CAL_URL}" target="_blank" rel="noopener" id="cal-google-btn">
              <span>&#x1F4C5;</span><span>Google Kalender öffnen</span>
            </a>
            <a class="cal-btn cal-apple" href="/event.ics" id="cal-apple-btn">
              <span>&#xF8FF;</span><span>Apple / iPhone Kalender</span>
            </a>
            <button type="button" class="outline" id="cal-skip">Nein, überspringen</button>
          </div>
        </div>

        <div id="post-calendar" class="hidden">
          <a href="https://www.google.com/maps/search/?api=1&query=K%C3%A4the-Kollwitz-Stra%C3%9Fe+16a%2C+15827+Blankenfelde-Mahlow" target="_blank" rel="noopener" class="secondary-btn">
            <span>&#x1F5FA;&#xFE0F;</span><span>Route in Karte öffnen</span>
          </a>
          <a href="tel:+4917647008225" class="secondary-btn">
            <span>&#x1F4DE;</span><span>Hakim anrufen · 0176 47008225</span>
          </a>
        </div>
      </div>

      <!-- Success: Gebe bis 04.07.2026 Bescheid -->
      <div id="success-pending" class="success-screen hidden">
        <div class="success-check">&#10003;</div>
        <h2>Vielen Dank!</h2>
        <p>Deine Rückmeldung ist gespeichert. Bitte gib uns spätestens <strong>bis zum 04.07.2026</strong> endgültig Bescheid, ob du kommen kannst.</p>
        <a href="tel:+4917647008225" class="secondary-btn">
          <span>&#x1F4DE;</span><span>Hakim anrufen · 0176 47008225</span>
        </a>
      </div>
    </div>
  </div>

  <script>
    const form = document.getElementById('rsvp-form');
    const submitBtn = document.getElementById('submit-btn');
    const message = document.getElementById('message');
    const personenField = document.getElementById('personen-field');
    const anzahlInput = document.getElementById('anzahl');
    const invitationContent = document.getElementById('invitation-content');
    const successKommen = document.getElementById('success-kommen');
    const successPending = document.getElementById('success-pending');
    const calendarPrompt = document.getElementById('calendar-prompt');
    const postCalendar = document.getElementById('post-calendar');

    document.querySelectorAll('.radio-option').forEach((opt) => {
      const input = opt.querySelector('input[type="radio"]');
      input.addEventListener('change', () => {
        document.querySelectorAll('.radio-option').forEach((o) => o.classList.remove('selected'));
        opt.classList.add('selected');
        if (input.value === 'Kommen') {
          personenField.classList.add('visible');
        } else {
          personenField.classList.remove('visible');
        }
      });
    });

    function showError(text) { message.textContent = text; message.className = 'message error'; }

    function showPostCalendar() {
      calendarPrompt.classList.add('hidden');
      postCalendar.classList.remove('hidden');
    }

    document.getElementById('cal-google-btn').addEventListener('click', () => setTimeout(showPostCalendar, 400));
    document.getElementById('cal-apple-btn').addEventListener('click', () => setTimeout(showPostCalendar, 400));
    document.getElementById('cal-skip').addEventListener('click', showPostCalendar);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const vorname = document.getElementById('vorname').value.trim();
      const nachname = document.getElementById('nachname').value.trim();
      const zusageEl = document.querySelector('input[name="zusage"]:checked');

      if (!vorname || !nachname || !zusageEl) {
        showError('Bitte alle Felder ausfüllen.');
        return;
      }

      const body = { vorname, nachname, zusage: zusageEl.value };
      if (zusageEl.value === 'Kommen') {
        const anzahl = parseInt(anzahlInput.value, 10);
        if (!anzahl || anzahl < 1 || anzahl > 20) {
          showError('Anzahl Personen muss zwischen 1 und 20 liegen.');
          return;
        }
        body.anzahl_personen = anzahl;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Wird gesendet...';
      message.classList.add('hidden');

      try {
        const res = await fetch('/api/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Submit failed'); }
        invitationContent.classList.add('hidden');
        if (zusageEl.value === 'Kommen') {
          successKommen.classList.remove('hidden');
        } else {
          successPending.classList.remove('hidden');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        showError('Fehler beim Senden. Bitte später erneut versuchen.');
        submitBtn.textContent = 'Absenden';
        submitBtn.disabled = false;
      }
    });
  </script>
</body>
</html>`;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function escapeICS(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function buildICS() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Familie Yousufi//Einladung//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:familie-yousufi-2026-07-11@event-anmeldung',
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${EVENT.dtstartUTC}`,
    `DTEND:${EVENT.dtendUTC}`,
    `SUMMARY:${escapeICS(EVENT.title)}`,
    `DESCRIPTION:${escapeICS(EVENT.description)}`,
    `LOCATION:${escapeICS(EVENT.location)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

async function handleSubmit(request, env) {
  if (!env.NOTION_TOKEN || !env.NOTION_DATABASE_ID) {
    return json({ error: 'Server misconfigured (missing env vars)' }, 500);
  }
  let payload;
  try { payload = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const vorname = String(payload.vorname || '').trim().slice(0, 200);
  const nachname = String(payload.nachname || '').trim().slice(0, 200);
  const zusage = String(payload.zusage || '').trim();
  const anzahlRaw = payload.anzahl_personen;

  if (!vorname || !nachname || !VALID_ZUSAGE.has(zusage)) {
    return json({ error: 'Invalid input' }, 400);
  }

  const properties = {
    Vorname: { title: [{ text: { content: vorname } }] },
    Nachname: { rich_text: [{ text: { content: nachname } }] },
    Zusage: { select: { name: zusage } },
  };

  if (zusage === 'Kommen') {
    const anzahl = parseInt(anzahlRaw, 10);
    if (!anzahl || anzahl < 1 || anzahl > 20) {
      return json({ error: 'Invalid anzahl_personen' }, 400);
    }
    properties['Anzahl Personen'] = { number: anzahl };
  }

  const notionRes = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: env.NOTION_DATABASE_ID },
      properties,
    }),
  });

  if (!notionRes.ok) {
    const errText = await notionRes.text();
    console.error('Notion API error:', notionRes.status, errText);
    return json({ error: 'Notion API error', detail: errText }, 502);
  }
  return json({ success: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/submit' && request.method === 'POST') {
      return handleSubmit(request, env);
    }
    if (url.pathname === '/event.ics') {
      return new Response(buildICS(), {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'inline; filename="familie-yousufi-2026-07-11.ics"',
        },
      });
    }
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    return new Response('Not found', { status: 404 });
  },
};
