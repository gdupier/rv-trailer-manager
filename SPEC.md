# RV Trailer Manager — Spec & Build Plan

> Status: **Draft v1** — agreed scope from planning Q&A. No code is final yet; the
> existing `index.html` in this folder is a throwaway prototype and will be replaced.

---

## 1. What this is

A personal, offline-first web app to manage one RV travel trailer through the full
trip lifecycle — from pulling it out of storage to putting it back. It runs on the
owner's **phone**, works with **no cell signal**, and installs to the home screen
like a native app (PWA). No accounts, no server, no internet required after first load.

### Usage context (drives every design choice)
- Used **outdoors, one-handed, in bright sun**, sometimes with gloves on.
- Used **where there is no signal** (storage lot, remote campgrounds).
- Used by **one person on one phone** — no multi-device sync, no sharing.
- Reliability and large touch targets matter more than visual flourish.

---

## 2. Decisions locked in (from planning)

| Question | Decision |
|---|---|
| Core feature | Six trip-lifecycle checklists |
| Extra features | Maintenance/service log, Trip log/history, Packing inventory |
| Devices & sync | **One phone, offline-first** — local storage only, no login, no backend |
| Hosting | **GitHub Pages + installable PWA** (add to home screen, works offline) |
| Checklist editing | **Fully editable** — add/edit/delete/reorder items, and create new custom lists |
| Trip flow | **"Start a Trip" resets all checkmarks and archives the finished trip to history** |
| Look & feel | **Outdoorsy / rugged** — forest greens, warm accents, earthy |
| Maintenance | **Simple log, no reminders** — record what/when (+ optional mileage, cost, notes) |
| Rig profile | **Yes** — a reference page of specs (tire PSI, tank sizes, weights, hitch height, fuse/bulb types…) |
| Packing inventory | **Master list feeds Loading** — categorized gear inventory; Loading checks off what's packed |

---

## 3. Goals & non-goals

**Goals**
- One tap to see "what's left to do" at any stage of a trip.
- Never lose data; everything saved locally and survives reloads/offline.
- Tailorable to *this* rig over time (edit lists, store rig specs, build a gear inventory).
- Fast and legible on a phone outdoors.

**Non-goals (for now)**
- No cloud sync, no multi-user, no login.
- No push notifications or maintenance "due" reminders (simple log only).
- No native app store build — PWA is the install path.
- No backend/database — all state is on-device.

---

## 4. Information architecture (screens)

A bottom tab bar (thumb-reachable) with five destinations:

1. **Trip (Home)** — the active trip and its six checklists with live progress.
2. **Checklists** — manage/edit the six lists and any custom lists (templates).
3. **Packing** — master gear inventory by category; feeds the Loading list.
4. **Maintenance** — service log entries.
5. **More** — Rig Profile, Trip History, data export/import, about.

> Note: Checklists are reachable both from the Trip screen (to *use* during a trip) and
> from the Checklists tab (to *edit the templates*). Same lists, two contexts.

### The six checklists (chronological flow of one trip)
1. 🏪 **Pickup from Storage** — pre-trip inspection before towing home
2. 📦 **Loading** — stock and pack (this is where the packing inventory appears)
3. 🏕️ **Arrive at Campsite** — setup on site
4. 🛻 **Depart Campsite** — break camp and hitch up
5. 🏠 **Unload at Home** — clean out after the trip
6. 🔒 **Drop at Storage** — long-term storage / winterizing

---

## 5. Feature detail

### 5.1 Trips (the spine of the app)
- A **Trip** represents one outing and spans all six checklists.
- **Start a Trip**: prompts for a name + optional campground/dates, clears all
  checkmarks for a fresh start.
- While active, the Trip screen shows the six checklists with per-list progress
  (e.g. "Loading 8/14") and an overall progress indicator.
- **Finish a Trip**: archives the trip — name, dates, campground, notes, and a
  snapshot of what was checked — into **Trip History**, then clears the board.
- Only one active trip at a time. History is read-only (view past trips & notes).

### 5.2 Checklists
- Six built-in lists ship with sensible defaults (content in §7).
- **Fully editable**: add, edit, delete, and **reorder** items; **restore defaults**
  per list; and **create new custom checklists** (own name + emoji).
- Editing changes the *template*; the active trip's checkmarks track which template
  items are done. (Edge cases to handle: item deleted/added mid-trip — see §8.)

### 5.3 Packing inventory ✅ **(Phase 2 — shipped)**
> Implementation note: during Phase 2 planning the owner opted to keep the Loading
> checklist exactly as-is (it already contains hand-added "Pack X" items) and add a
> **separate, independent Packing inventory** rather than have Loading consume it. The
> two are intentionally decoupled.

- A **master inventory** of gear you own, grouped by **category** (Kitchen, Bedding,
  Tools & leveling, Hookups, Outdoor, Safety & personal), each item with a **quantity**.
- Edited on its own **Packing tab** (5th bottom-tab) — add/rename/delete categories and
  items, set quantities. This is the catalog and isn't itself "checked."
- **Tied to the trip like a checklist:** during an active trip a **🎒 Packing tile**
  appears on the Trip screen; tapping it opens a check-off view grouped by category
  (quantities shown as `×N`). Packed state resets on **Start Trip**, counts toward the
  trip's overall progress, and is archived into **Trip History** on finish.
- Defaults seeded on first run / reset; existing saved data is migrated to add the
  inventory (schema v2).

### 5.4 Maintenance & service log
- A simple chronological **log**. Each entry: **date**, **task/description**,
  optional **mileage**, optional **cost**, optional **notes**.
- Sortable/most-recent-first; no "due" logic or reminders.
- Useful as a record to eyeball ("when did I last repack the bearings?").

### 5.5 Rig profile (reference page)
A quick-reference page of specs you look up at the campsite. All fields editable; it's
a static reference, not connected to other features.

**Pre-filled for the owner's rig — 2026 Forest River Cherokee Wolf Pup 16BHSW:**

| Field | Value | Note |
|---|---|---|
| Make / Model | Forest River Cherokee Wolf Pup 16BHSW | |
| Year | 2026 | |
| Floorplan | Single-axle bunkhouse, sleeps 5 | |
| Exterior length | 21 ft 9 in (overall) | |
| Exterior height | 10 ft 6 in | |
| Exterior width | 7 ft 6 in (96 in) | |
| Dry weight (UVW) | ~3,594 lb | ⚠️ verify on sticker |
| GVWR | ~5,575 lb | ⚠️ verify on cert label |
| Cargo capacity (CCC) | ~1,981 lb | ⚠️ verify on yellow sticker |
| Hitch / tongue weight | ~475 lb | ⚠️ verify (scale it loaded) |
| Hitch ball size | 2 in | typical for this class |
| Fresh water | 26 gal | |
| Gray water | 23 gal | |
| Black water | 23 gal | |
| Propane | 1 × 20 lb tank | ⚠️ verify |
| Awning | 12 ft power awning | |
| A/C | 13,500 BTU | |
| Furnace | 20,000 BTU | |
| Water heater | Tankless (on-demand) | |
| Shore power | 30 amp | |
| Axles | Single | |
| Tire size | ST205/75 R14 (likely) | ⚠️ **verify on sidewall** |
| Tire cold PSI | _from tire sidewall / cert label_ | ⚠️ **must read off your tires** |
| Lug torque | _per owner's manual_ | ⚠️ verify |
| VIN / plate | _(blank — fill in app)_ | |

> **Safety note carried into the app:** the weight, tire PSI, and torque figures above
> are from public 2026 brochure/dealer listings, which disagree between sources and can
> differ from your unit. The app will display a small "verify against the trailer's
> federal certification label and tire sidewall" reminder on these fields. PSI and lug
> torque in particular are intentionally left for the owner to read off the actual rig.

### 5.6 Data export / import (safety net)
- Because data is on-device only, offer **Export** (download a JSON backup) and
  **Import** (restore from a backup file). Protects against phone loss / cache clears.

---

## 6. Visual & interaction design

- **Theme — outdoorsy/rugged.** Forest greens (`#1b4332` / `#2d6a4f` / `#40916c`),
  warm accent (`#f4a261`), soft off-white background, dark earthy text.
- **Big touch targets** (checkboxes ≥ 24px, list rows tall), generous spacing.
- **High legibility** outdoors: strong contrast, no thin light-gray text on white.
- Checked items: filled green check, struck-through muted label, subtle row tint.
- Per-list **progress bars** and a complete-state ✓ on finished lists.
- Bottom **tab bar** for thumb navigation; sticky header with trip name.
- Light mode first; dark mode is a nice-to-have (deferred).

---

## 7. Default checklist contents

These ship as the editable defaults.

**🏪 Pickup from Storage**
- Locate all keys
- Walk around — check exterior for damage
- Remove ball hitch lock
- Inspect tires: pressure & tread (incl. spare)
- Inspect roof and sealant/seams
- Verify tank valves are closed
- Connect / verify battery is charged
- Check propane tank levels & valves closed
- Install anti-sway bars
- Connect ball hitch
- Raise hitch and connect anti-sway bars to trailer
- Attach safety chains (crossed)
- Connect & test breakaway cable
- Plug in 7-pin connector
- Test running, brake & turn lights
- Test trailer brakes
- Confirm registration / plate current
- Remove wheel chocks

**📦 Loading** (procedural steps; packing inventory items appear here too)
- Power fridge on / pre-cool
- Balance load — check tongue weight
- Secure loose items & latch cabinets
- *(+ packing inventory by category — see §5.3)*

**🏕️ Arrive at Campsite**
- Check in
- Drink thinking juice
- Position trailer on the pad
- Level side-to-side with blocks
- Chock the wheels
- Unhitch from tow vehicle
- Level front-to-back with tongue jack
- Lower stabilizer jacks
- Connect shore power (surge protector first)
- Connect water w/ pressure regulator
- Connect & secure sewer hose
- Open propane valve
- Turn on water heater
- Setup outdoor mat and chairs
- Deploy awning
- Load fridges with food
- Add sanitizing tablet to toilet
- Setup trash bags
- Make bed
- Check all systems working

**🛻 Depart Campsite**
- Bring in & secure awning
- Close roof vents & windows
- Secure interior — latch cabinets & fridge
- Empty black tank, then gray tank
- Disconnect, rinse & stow sewer hose
- Disconnect & stow water hose
- Disconnect shore power
- Close propane valves
- Raise stabilizer jacks
- Install sway bars
- Connect ball coupling
- Attach sway bars to trailer
- Attach safety chains & breakaway
- Plug in 7-pin connector & test all lights
- Remove wheel chocks
- Final walk-around — leave nothing behind

**🏠 Unload at Home** (mirrors the Loading list — each pack/load reversed)
- Empty fridges & power off, clean
- Remove pantry & dry goods
- Unpack clothing & bedding
- Unpack toiletries & first-aid kit
- Unload camp chairs & outdoor gear
- Unload water hose & pressure regulator
- Unload sewer hose & disposable gloves
- Unload power cord and surge protector
- Unload leveling blocks & wheel chocks
- Unload tools, gloves & duct tape
- Unload firewood / grill propane
- Remove trash
- Unload dog food and bowls
- Unload dog bed
- Unload Coleman Grill
- Unload TV
- Unload paper towels
- Unload toilet paper
- Sweep & wipe down interior
- Note anything that ran low for next trip

**🔒 Drop at Storage**
- Back trailer into parking spot
- Set wheel chocks
- Add holding-tank treatment / antifreeze
- Defrost & prop fridge door open
- Disconnect battery (or trickle charge)
- Confirm propane tank closed
- Disconnect trailer safety chains, 7-pin electrical cord, and emergency disconnect
- Block and raise trailer hitch
- Disconnect sway bars
- Disconnect ball hitch
- Remove sway bars
- Level trailer front to back
- Lock all doors & storage bays
- Record mileage & maintenance notes
- Put ball lock on trailer hitch
- Remove anti-sway hitch from truck at home

**Default packing inventory** (starter categories, editable)
- *Kitchen:* pots/pans, utensils, dish soap, paper towels, coffee maker, trash bags
- *Bedding:* sheets, pillows, blankets, towels
- *Tools:* leveling blocks, wheel chocks, tool kit, work gloves, duct tape
- *Hookups:* water hose, pressure regulator, sewer hose, disposable gloves, surge protector
- *Outdoor:* camp chairs, mat/rug, lantern, firewood, grill propane
- *Safety/personal:* first-aid kit, toiletries, flashlight, bug spray, sunscreen

---

## 8. Technical approach

- **Single-page app, vanilla HTML/CSS/JS**, no build step, no framework (consistent
  with the owner's existing style and the no-dependency philosophy). Likely split into
  `index.html` + `app.js` + `styles.css` + `manifest.webmanifest` + `sw.js` once it
  grows past the prototype's single file.
- **Persistence:** `localStorage` (JSON blob) for v1; revisit IndexedDB only if size
  becomes an issue. A single versioned root object with a `schemaVersion` for safe
  migrations.
- **PWA/offline:** web app manifest (name, icons, theme color, `display: standalone`)
  + a service worker that precaches the app shell so it loads with no network.
- **No external requests** at runtime — fonts/icons are system or inlined.

### Data model (sketch — to refine in build)
```
rvManager_v1 = {
  schemaVersion: 1,
  rig: { name, make, model, year, fields: [{label, value}] },
  checklists: {                    // editable templates
    pickup:  { name, emoji, items: [{id, text}] },
    loading: { name, emoji, items: [{id, text}] },
    ...,
    custom:  [ { id, name, emoji, items: [...] } ]
  },
  inventory: { categories: [ { id, name, items: [{id, name, qty}] } ] },
  maintenance: [ { id, date, task, mileage?, cost?, notes? } ],
  currentTrip: {                   // null when no active trip
    id, name, campground?, startDate,
    checks: { [listId]: { [itemId]: true } },
    packed: { [inventoryItemId]: true }
  },
  history: [ { ...trip snapshot, endDate, notes } ]
}
```

### Edge cases to handle
- Item **added/deleted/reordered** mid-trip: checks keyed by stable item `id`, so
  deleting an item drops its check; adding an item appears unchecked. Safe.
- **Restore defaults** on a list during an active trip: warn it clears that list's
  checks.
- **localStorage cleared / new phone:** mitigated by Export/Import (§5.6).
- Quantity/packed state when inventory item qty changes mid-trip: packed is a simple
  on/off per item; quantities are reference only.

---

## 9. Deployment & repo note

⚠️ **Repo decision needed.** `RVManager/` currently lives *inside* the existing
**tic-tac-toe** git repo (remote: `gdupier/tic-tac-toe`). For its own GitHub Pages
site it should be its **own repository** (e.g. `gdupier/rv-trailer-manager`).
Recommended: initialize a fresh git repo at `RVManager/`, create the GitHub repo, and
enable Pages on `main` root — mirroring the tic-tac-toe deploy workflow (every push to
`main` auto-deploys in ~1 min). To confirm before building.

- Entry point stays `index.html` at the repo root for Pages.
- PWA requires HTTPS — GitHub Pages provides it.

---

## 10. Build phasing (proposed)

**Phase 1 — Core checklists + trip flow + offline shell**
- Six default checklists, check/uncheck, per-list & overall progress
- Start/Finish Trip + Trip History
- Full editing (add/edit/delete/reorder, restore defaults, custom lists)
- localStorage persistence + Export/Import
- PWA manifest + service worker (installable, offline)
- Outdoorsy theme, bottom tab nav

**Phase 2 — Packing inventory** ✅ **shipped**
- Master inventory by category with quantities, edited on its own Packing tab
- Decoupled from Loading (kept separate per owner's choice); tied to the trip and
  archived to history; schema v2 migration for existing data

**Phase 3 — Maintenance log + Rig profile**
- Simple service log entries
- Rig reference page

**Phase 4 — Polish**
- Icons/splash, dark mode, small UX refinements

---

## 11. Resolved / open questions

1. **Repo/deploy:** ✅ **New repo** `gdupier/rv-trailer-manager` with its own GitHub
   Pages site.
2. **Trip granularity:** ✅ **One "Trip" spans all six lists** (pickup → storage);
   starting a trip resets all six.
3. **Defaults:** _Open_ — anything you *always* do that's missing from the §7 lists, or
   items you'd remove? (Easy to tweak in-app later since lists are editable.)
4. **Rig specs:** ✅ Pre-filled for the 2026 Wolf Pup 16BHSW (§5.5). Please **verify the
   ⚠️-flagged numbers** against your trailer's federal cert label, yellow cargo sticker,
   and tire sidewalls — public listings disagreed and these are safety-critical.
5. **Phasing:** ✅ **Phase 1 first, then iterate.**
```
