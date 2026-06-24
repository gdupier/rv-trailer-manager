# RV Trailer Manager

An offline-first web app to manage one RV travel trailer through the full trip
lifecycle — from pulling it out of storage to putting it back. Built for a phone,
works with no cell signal, and installs to the home screen like a native app (PWA).

**Rig:** 2026 Forest River Cherokee Wolf Pup 16BHSW.

## Features (Phase 1)

- **Six trip checklists** — Pickup from Storage, Loading, Arrive at Campsite, Depart
  Campsite, Unload at Home, Drop at Storage.
- **Trip flow** — start a trip (resets all checkmarks), check items off, then finish a
  trip to archive it (with notes) to **history**.
- **Fully editable lists** — add, edit, delete, reorder items; restore defaults; create
  your own custom checklists.
- **Works offline** — everything is stored on your device (localStorage); a service
  worker caches the app so it loads with no signal.
- **Installable (PWA)** — "Add to Home Screen" for an app-like experience.
- **Backup** — export/import your data as a JSON file.

## Phase 2

- **Packing inventory** — a master gear list grouped by category, each item with a
  quantity, edited on its own **Packing** tab. During a trip a 🎒 Packing tile appears
  on the Trip screen to check off what's packed; it resets per trip, counts toward
  overall progress, and is saved to history. Kept separate from the Loading checklist.

Planned next (see [SPEC.md](SPEC.md)): maintenance log, rig profile.

## Running

- **Local:** serve the folder over HTTP (a service worker needs http/https, not
  `file://`), e.g. `python -m http.server` then open <http://localhost:8000>.
- **Live:** GitHub Pages from `main` root.

## Structure

| File | Purpose |
|---|---|
| `index.html` | App shell + bottom tab nav |
| `app.js` | All logic: state, rendering, trip flow, editing, export/import |
| `styles.css` | Outdoorsy theme |
| `manifest.webmanifest` | PWA metadata |
| `sw.js` | Service worker (offline cache) |
| `icons/` | App icons |
| `SPEC.md` | Full spec & build plan |

No build step, no dependencies, no backend.
