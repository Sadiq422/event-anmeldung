// Cloudflare Pages Function: POST /api/submit
// Liest JSON {vorname, nachname, zusage} und schreibt eine neue Page in die Notion-DB.
// Erwartet ENV vars: NOTION_TOKEN, NOTION_DATABASE_ID

const VALID_ZUSAGE = new Set([
  'Kommen',
  'Noch nicht sicher',
  'Gebe bis 06.07.2026 Bescheid',
]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.NOTION_TOKEN || !env.NOTION_DATABASE_ID) {
    return json({ error: 'Server misconfigured' }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

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
    return json({ error: 'Notion API error' }, 502);
  }

  return json({ success: true });
}

export async function onRequest({ request }) {
  if (request.method === 'POST') return;
  return json({ error: 'Method not allowed' }, 405);
}
