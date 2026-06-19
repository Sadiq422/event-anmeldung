// Single Cloudflare Worker: serves HTML on GET / and handles POST /api/submit
// ENV vars required: NOTION_TOKEN, NOTION_DATABASE_ID

const VALID_ZUSAGE = new Set([
  'Kommen',
  'Gebe bis 06.07.2026 Bescheid',
]);

const HTML = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Anmeldung zum Anlass</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body { height: 100%; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      padding: 16px; color: #1a1a2e;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      background: #fff; border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      padding: 28px 24px; max-width: 480px; width: 100%;
    }
    h1 { font-size: 24px; margin-bottom: 6px; letter-spacing: -0.02em; line-height: 1.2; }
    .subtitle { color: #6b7280; margin-bottom: 24px; font-size: 15px; line-height: 1.5; }
    .field { margin-bottom: 18px; }
    label.field-label { display: block; font-weight: 600; margin-bottom: 8px; font-size: 14px; }
    input[type="text"], input[type="number"] {
      width: 100%; padding: 14px; border: 2px solid #e5e7eb;
      border-radius: 10px; font-size: 16px; transition: border-color 0.15s ease;
      font-family: inherit; -webkit-appearance: none;
      background: #fff; color: #1a1a2e;
    }
    input[type="text"]:focus, input[type="number"]:focus { outline: none; border-color: #667eea; }
    .radios { display: flex; flex-direction: column; gap: 10px; }
    .radio-option {
      display: flex; align-items: center; padding: 14px;
      border: 2px solid #e5e7eb; border-radius: 10px; cursor: pointer;
      transition: all 0.15s ease; font-size: 15px;
      user-select: none;
    }
    .radio-option input[type="radio"] {
      margin-right: 12px; accent-color: #667eea;
      width: 20px; height: 20px; flex-shrink: 0;
    }
    .radio-option.selected { border-color: #667eea; background: #f0f3ff; }
    .conditional { display: none; }
    .conditional.visible { display: block; }
    button {
      width: 100%; padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; border: none; border-radius: 10px; font-size: 16px;
      font-weight: 600; cursor: pointer; margin-top: 12px;
      transition: opacity 0.2s ease; font-family: inherit;
      -webkit-appearance: none;
    }
    button:active:not(:disabled) { opacity: 0.85; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .message {
      margin-top: 18px; padding: 14px; border-radius: 10px;
      text-align: center; font-size: 14px; line-height: 1.5;
    }
    .success { background: #d1fae5; color: #065f46; }
    .error { background: #fee2e2; color: #991b1b; }
    .hidden { display: none; }
    @media (max-width: 420px) {
      .card { padding: 24px 18px; border-radius: 14px; }
      h1 { font-size: 22px; }
      .subtitle { font-size: 14px; }
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Anmeldung zum Anlass</h1>
    <p class="subtitle">Bitte gib uns Bescheid, ob du dabei bist.</p>
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
          <label class="radio-option"><input type="radio" name="zusage" value="Gebe bis 06.07.2026 Bescheid" required><span>Gebe bis 06.07.2026 Bescheid</span></label>
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
  <script>
    const form = document.getElementById('rsvp-form');
    const submitBtn = document.getElementById('submit-btn');
    const message = document.getElementById('message');
    const personenField = document.getElementById('personen-field');
    const anzahlInput = document.getElementById('anzahl');

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

    function showMessage(text, type) { message.textContent = text; message.className = 'message ' + type; }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const vorname = document.getElementById('vorname').value.trim();
      const nachname = document.getElementById('nachname').value.trim();
      const zusageEl = document.querySelector('input[name="zusage"]:checked');

      if (!vorname || !nachname || !zusageEl) {
        showMessage('Bitte alle Felder ausfüllen.', 'error');
        return;
      }

      const body = { vorname, nachname, zusage: zusageEl.value };
      if (zusageEl.value === 'Kommen') {
        const anzahl = parseInt(anzahlInput.value, 10);
        if (!anzahl || anzahl < 1 || anzahl > 20) {
          showMessage('Anzahl Personen muss zwischen 1 und 20 liegen.', 'error');
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
        showMessage('Vielen Dank! Deine Antwort wurde gespeichert.', 'success');
        form.reset();
        document.querySelectorAll('.radio-option').forEach((o) => o.classList.remove('selected'));
        personenField.classList.remove('visible');
        anzahlInput.value = 1;
      } catch (err) { showMessage('Fehler beim Senden. Bitte später erneut versuchen.', 'error'); }
      finally { submitBtn.textContent = 'Absenden'; submitBtn.disabled = false; }
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
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    return new Response('Not found', { status: 404 });
  },
};
