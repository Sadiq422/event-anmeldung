// Single Cloudflare Worker: serves HTML on GET / and handles POST /api/submit
// ENV vars required: NOTION_TOKEN, NOTION_DATABASE_ID

const VALID_ZUSAGE = new Set([
  'Kommen',
  'Noch nicht sicher',
  'Gebe bis 06.07.2026 Bescheid',
]);

const HTML = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anmeldung zum Anlass</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      padding: 20px; color: #1a1a2e;
    }
    .card {
      background: #fff; border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      padding: 40px; max-width: 480px; width: 100%;
    }
    h1 { font-size: 26px; margin-bottom: 8px; letter-spacing: -0.02em; }
    .subtitle { color: #6b7280; margin-bottom: 32px; font-size: 15px; line-height: 1.5; }
    .field { margin-bottom: 20px; }
    label.field-label { display: block; font-weight: 600; margin-bottom: 8px; font-size: 14px; }
    input[type="text"] {
      width: 100%; padding: 12px 14px; border: 2px solid #e5e7eb;
      border-radius: 8px; font-size: 15px; transition: border-color 0.15s ease;
      font-family: inherit;
    }
    input[type="text"]:focus { outline: none; border-color: #667eea; }
    .radios { display: flex; flex-direction: column; gap: 10px; }
    .radio-option {
      display: flex; align-items: center; padding: 12px 14px;
      border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer;
      transition: all 0.15s ease; font-size: 15px;
    }
    .radio-option:hover { border-color: #c7d2fe; background: #f8f9ff; }
    .radio-option input[type="radio"] {
      margin-right: 12px; accent-color: #667eea; width: 18px; height: 18px;
    }
    .radio-option.selected { border-color: #667eea; background: #f0f3ff; }
    button {
      width: 100%; padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; border: none; border-radius: 8px; font-size: 16px;
      font-weight: 600; cursor: pointer; margin-top: 16px;
      transition: transform 0.1s ease, opacity 0.2s ease; font-family: inherit;
    }
    button:hover:not(:disabled) { transform: translateY(-1px); }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .message {
      margin-top: 20px; padding: 14px; border-radius: 8px;
      text-align: center; font-size: 14px; line-height: 1.5;
    }
    .success { background: #d1fae5; color: #065f46; }
    .error { background: #fee2e2; color: #991b1b; }
    .hidden { display: none; }
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
          <label class="radio-option"><input type="radio" name="zusage" value="Noch nicht sicher" required><span>Noch nicht sicher</span></label>
          <label class="radio-option"><input type="radio" name="zusage" value="Gebe bis 06.07.2026 Bescheid" required><span>Gebe bis 06.07.2026 Bescheid</span></label>
        </div>
      </div>
      <button type="submit" id="submit-btn">Absenden</button>
    </form>
    <div id="message" class="message hidden"></div>
  </div>
  <script>
    const form = document.getElementById('rsvp-form');
    const submitBtn = document.getElementById('submit-btn');
    const message = document.getElementById('message');
    document.querySelectorAll('.radio-option').forEach((opt) => {
      const input = opt.querySelector('input[type="radio"]');
      input.addEventListener('change', () => {
        document.querySelectorAll('.radio-option').forEach((o) => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
    function showMessage(text, type) { message.textContent = text; message.className = 'message ' + type; }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const vorname = document.getElementById('vorname').value.trim();
      const nachname = document.getElementById('nachname').value.trim();
      const zusageEl = document.querySelector('input[name="zusage"]:checked');
      if (!vorname || !nachname || !zusageEl) { showMessage('Bitte alle Felder ausfüllen.', 'error'); return; }
      submitBtn.disabled = true; submitBtn.textContent = 'Wird gesendet...'; message.classList.add('hidden');
      try {
        const res = await fetch('/api/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vorname, nachname, zusage: zusageEl.value }),
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Submit failed'); }
        showMessage('Vielen Dank! Deine Antwort wurde gespeichert.', 'success');
        form.reset();
        document.querySelectorAll('.radio-option').forEach((o) => o.classList.remove('selected'));
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

  if (!vorname || !nachname || !VALID_ZUSAGE.has(zusage)) {
    return json({ error: 'Invalid input' }, 400);
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
      properties: {
        Vorname: { title: [{ text: { content: vorname } }] },
        Nachname: { rich_text: [{ text: { content: nachname } }] },
        Zusage: { select: { name: zusage } },
      },
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
