# Event-Anmeldung (Worker-Version)

Single Cloudflare Worker - serviert HTML auf `/` und nimmt POST `/api/submit` -> schreibt in Notion-DB.

## Struktur
```
event-anmeldung-worker/
  src/index.js     # Worker code (HTML + API in einer Datei)
  wrangler.toml
  package.json
```

## Deploy

### Option A: Via wrangler CLI (lokal)
```
npm install
npx wrangler login
npx wrangler secret put NOTION_TOKEN
# fragt nach Token -> ntn_... eingeben
npx wrangler secret put NOTION_DATABASE_ID
# fragt nach ID -> 1e0bbd034a45443b931e1a31fbf42edf eingeben
npm run deploy
```

### Option B: Via Cloudflare Dashboard
1. Workers & Pages -> Create -> Worker
2. Code aus `src/index.js` reinkopieren
3. Save and Deploy
4. Settings -> Variables -> Add variable (TYPE: Secret):
   - `NOTION_TOKEN` = dein Token
   - `NOTION_DATABASE_ID` = `1e0bbd034a45443b931e1a31fbf42edf`
5. Save

## Wichtig: Notion-Integration mit DB verbinden
1. Notion-DB öffnen: https://app.notion.com/p/1e0bbd034a45443b931e1a31fbf42edf
2. Oben rechts "..." -> Connections (oder "Add connections")
3. Integration "Event-Anmeldung" suchen und hinzufügen

Ohne diesen Schritt gibt die Notion-API einen 404 zurück.

## Test
Nach Deploy: `https://event-anmeldung.<dein-subdomain>.workers.dev` öffnen, Formular ausfüllen, Absenden.

Bei Fehler: F12 -> Network -> submit Request -> Response zeigt detaillierten Notion-Fehler.
