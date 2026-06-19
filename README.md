# Event-Anmeldung

Custom RSVP-Seite. HTML-Frontend + Cloudflare Pages Function als Backend, schreibt direkt in Notion-DB.

## Stack
- Static HTML/CSS/JS (kein Build)
- Cloudflare Pages + Pages Functions (Serverless Backend)
- Notion REST API

## Struktur
```
event-anmeldung/
  index.html                  # Frontend Form
  functions/api/submit.js     # Backend POST /api/submit
  README.md
```

## Deployment

### 1. GitHub-Repo erstellen
```
cd event-anmeldung
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin git@github.com:<user>/event-anmeldung.git
git push -u origin main
```

### 2. Cloudflare Pages verbinden
1. Cloudflare Dashboard -> Workers & Pages -> Create -> Pages -> Connect to Git
2. GitHub-Repo `event-anmeldung` auswählen
3. Build settings:
   - Framework preset: None
   - Build command: (leer lassen)
   - Build output directory: `/`
4. Save and Deploy

### 3. Environment Variables setzen
Im Cloudflare Pages Projekt -> Settings -> Environment variables -> Production:

| Name | Value |
|------|-------|
| `NOTION_TOKEN` | dein Notion Integration Secret (`ntn_...`) |
| `NOTION_DATABASE_ID` | `1e0bbd034a45443b931e1a31fbf42edf` |

Danach Deployment neu triggern (Deployments -> Retry deployment).

### 4. Notion Integration mit DB verbinden
DB in Notion öffnen -> "..." -> "Connections" -> Integration "Event-Anmeldung" hinzufügen.

### 5. URL teilen
Nach Deployment bekommst du URL wie `https://event-anmeldung.pages.dev`. Diese an Gäste schicken.

## Lokal testen
```
npm install -g wrangler
wrangler pages dev .
```
Lokal die ENV vars setzen über `.dev.vars`:
```
NOTION_TOKEN=ntn_xxx
NOTION_DATABASE_ID=1e0bbd034a45443b931e1a31fbf42edf
```

## Sicherheit
- Token NIEMALS ins Repo committen
- `.dev.vars` und `.env*` in `.gitignore`
- Token wurde im Chat geteilt -> nach Deployment rotieren (neue Integration erstellen, alte löschen)

## Notion DB Schema
- Vorname (title)
- Nachname (rich_text)
- Zusage (select: Kommen / Noch nicht sicher / Gebe bis 06.07.2026 Bescheid)
- Eingegangen am (created_time, auto)

DB-URL: https://app.notion.com/p/1e0bbd034a45443b931e1a31fbf42edf
