'use strict';

/* ============================================================
   RV Trailer Manager — Phase 1
   Offline-first checklists + trip flow. All state in localStorage.
   ============================================================ */

const STORAGE_KEY = 'rvManager_v1';
const SCHEMA = 1;

/* ---------- Default (built-in) checklists ---------- */
const DEFAULT_LISTS = [
  { id: 'pickup', emoji: '🏪', name: 'Pickup from Storage', sub: 'Pre-trip inspection before towing home', items: [
    'Walk around — check exterior for damage',
    'Inspect tires: pressure & tread (incl. spare)',
    'Inspect roof and sealant/seams',
    'Connect / verify battery is charged',
    'Check propane tank levels & valves closed',
    'Install anti-sway bars',
    'Connect ball hitch',
    'Raise hitch and connect anti-sway bars to trailer',
    'Attach safety chains (crossed)',
    'Connect & test breakaway cable',
    'Plug in 7-pin connector',
    'Test running, brake & turn lights',
    'Test trailer brakes',
    'Confirm registration / plate current',
    'Remove wheel chocks',
  ]},
  { id: 'loading', emoji: '📦', name: 'Loading', sub: 'Stock and pack before you leave home', items: [
    'Power fridge on / pre-cool',
    'Stock pantry & dry goods',
    'Pack clothing & bedding',
    'Pack toiletries & first-aid kit',
    'Load camp chairs & outdoor gear',
    'Pack water hose & pressure regulator',
    'Pack sewer hose & disposable gloves',
    'Pack power cord and surge protector',
    'Load leveling blocks & wheel chocks',
    'Load tools, gloves & duct tape',
    'Load firewood / grill propane',
    'Pack trash bags',
    'Pack dog food and bowls',
    'Pack Coleman Grill',
    'Pack TV',
    'Pack paper towels',
    'Pack toilet paper',
    'Balance load — check tongue weight',
    'Secure loose items & latch cabinets',
  ]},
  { id: 'arrive', emoji: '🏕️', name: 'Arrive at Campsite', sub: 'Setting up on site', items: [
    'Position trailer on the pad',
    'Level side-to-side with blocks',
    'Chock the wheels',
    'Unhitch from tow vehicle',
    'Level front-to-back with tongue jack',
    'Lower stabilizer jacks',
    'Connect shore power (surge protector first)',
    'Connect water w/ pressure regulator',
    'Connect & secure sewer hose',
    'Open propane valve',
    'Turn on water heater & fridge',
    'Setup outdoor mat and chairs',
    'Deploy awning',
    'Check all systems working',
  ]},
  { id: 'depart', emoji: '🛻', name: 'Depart Campsite', sub: 'Breaking camp and hitching up', items: [
    'Bring in & secure awning',
    'Retract slide-outs',
    'Close roof vents & windows',
    'Secure interior — latch cabinets & fridge',
    'Empty black tank, then gray tank',
    'Disconnect, rinse & stow sewer hose',
    'Disconnect & stow water hose',
    'Disconnect shore power',
    'Close propane valves',
    'Raise stabilizer jacks',
    'Hitch to tow vehicle & lock coupler',
    'Attach safety chains & breakaway',
    'Plug in & test all lights',
    'Remove wheel chocks',
    'Final walk-around — leave nothing behind',
  ]},
  { id: 'unload', emoji: '🏠', name: 'Unload at Home', sub: 'Clean out after the trip', items: [
    'Remove perishable food & clean fridge',
    'Remove trash',
    'Take out dirty laundry & bedding',
    'Empty & clean cooler',
    'Unload camp chairs & outdoor gear',
    'Bring tools back to garage',
    'Sweep & wipe down interior',
    'Charge batteries / devices',
    'Note anything that ran low for next trip',
  ]},
  { id: 'storage', emoji: '🔒', name: 'Drop at Storage', sub: 'Long-term storage / winterizing', items: [
    'Dump & flush black and gray tanks',
    'Add holding-tank treatment / antifreeze',
    'Drain fresh water tank & water heater',
    'Remove all food from interior',
    'Defrost & prop fridge door open',
    'Disconnect battery (or trickle charge)',
    'Close all propane valves',
    'Retract slide-outs & awning',
    'Install roof vent covers',
    'Set chocks & lower stabilizers',
    'Cover trailer (if applicable)',
    'Lock all doors & storage bays',
    'Record mileage & maintenance notes',
  ]},
];
const DEFAULT_BY_ID = Object.fromEntries(DEFAULT_LISTS.map(l => [l.id, l]));

/* ---------- Utilities ---------- */
let _idc = 0;
function uid(prefix) {
  _idc += 1;
  return prefix + Date.now().toString(36) + '_' + _idc.toString(36) + Math.random().toString(36).slice(2, 6);
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function todayISO() { return new Date().toISOString(); }

/* ---------- State ---------- */
let state = load();
let view = { tab: 'trip', sub: null, id: null };

function seedState() {
  const order = [];
  const defs = {};
  for (const l of DEFAULT_LISTS) {
    order.push(l.id);
    defs[l.id] = {
      id: l.id, emoji: l.emoji, name: l.name, sub: l.sub, builtin: true,
      items: l.items.map(t => ({ id: uid('i_'), text: t })),
    };
  }
  return { schemaVersion: SCHEMA, checklists: { order, defs }, currentTrip: null, history: [] };
}
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (raw && raw.schemaVersion && raw.checklists && raw.checklists.defs) return raw;
  } catch (e) { /* fall through */ }
  return seedState();
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { toast('⚠️ Could not save — storage full?'); }
}

/* ---------- Derived helpers ---------- */
function lists() { return state.checklists.order.map(id => state.checklists.defs[id]).filter(Boolean); }
function getList(id) { return state.checklists.defs[id]; }
function isChecked(itemId) { return !!(state.currentTrip && state.currentTrip.checks[itemId]); }
function listProgress(id) {
  const items = getList(id).items;
  const total = items.length;
  const done = items.filter(i => isChecked(i.id)).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}
function overallProgress() {
  let done = 0, total = 0;
  for (const l of lists()) { for (const it of l.items) { total++; if (isChecked(it.id)) done++; } }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/* ============================================================
   Rendering
   ============================================================ */
const viewEl = () => document.getElementById('view');

function render() {
  // header subtitle
  document.getElementById('headerSub').textContent =
    state.currentTrip ? '🧭 ' + state.currentTrip.name : 'No active trip';
  // active tab
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === view.tab));

  let html = '';
  if (view.tab === 'trip')         html = view.sub === 'list' ? renderTripList(view.id) : renderTripHome();
  else if (view.tab === 'lists')   html = view.sub === 'edit' ? renderEditList(view.id) : renderLists();
  else if (view.tab === 'history') html = view.sub === 'view' ? renderHistoryDetail(view.id) : renderHistory();
  else if (view.tab === 'data')    html = renderData();

  viewEl().innerHTML = html;
}

/* ---------- TRIP HOME ---------- */
function renderTripHome() {
  if (!state.currentTrip) {
    return `
      <div class="section-label">Start a trip</div>
      <div class="card stack">
        <p class="muted" style="margin:0">Begin a new outing. This clears all checkmarks so every list starts fresh.</p>
        <label class="field"><span>Trip name</span>
          <input type="text" id="tripName" placeholder="e.g. Lake weekend" autocomplete="off"></label>
        <label class="field"><span>Campground / destination (optional)</span>
          <input type="text" id="tripPlace" placeholder="e.g. Pine Lake State Park" autocomplete="off"></label>
        <button class="btn btn-primary btn-block" data-action="start-trip">🧭 Start Trip</button>
      </div>
      <div class="section-label" style="margin-top:22px">Your checklists</div>
      <div class="grid">${lists().map(l => `
        <div class="tile">
          <span class="emoji">${l.emoji}</span>
          <span class="name">${esc(l.name)}</span>
          <span class="count">${l.items.length} items</span>
        </div>`).join('')}
      </div>
      <p class="muted center" style="font-size:.8rem;margin-top:14px">Start a trip to begin checking things off.</p>`;
  }

  const t = state.currentTrip;
  const o = overallProgress();
  const tiles = lists().map(l => {
    const p = listProgress(l.id);
    const complete = p.total && p.done === p.total;
    return `
      <button class="tile ${complete ? 'complete' : ''}" data-action="open-list" data-id="${l.id}">
        <span class="emoji">${l.emoji}</span>
        <span class="name">${esc(l.name)}</span>
        <span class="count">${p.done} / ${p.total} done</span>
        <span class="bar"><span style="width:${p.pct}%"></span></span>
      </button>`;
  }).join('');

  return `
    <div class="trip-banner">
      <h2>${esc(t.name)}</h2>
      <div class="meta">${t.place ? esc(t.place) + ' · ' : ''}Started ${fmtDate(t.startDate)}</div>
      <div class="bar"><span style="width:${o.pct}%"></span></div>
      <div class="pctline"><span>${o.done} of ${o.total} done</span><span>${o.pct}%</span></div>
    </div>
    <div class="grid">${tiles}</div>
    <div class="stack" style="margin-top:18px">
      <button class="btn btn-accent btn-block" data-action="finish-trip">🏁 Finish Trip &amp; Save to History</button>
      <button class="btn btn-danger btn-block" data-action="cancel-trip">Discard this trip</button>
    </div>`;
}

/* ---------- TRIP: single list (check things off) ---------- */
function renderTripList(id) {
  const l = getList(id);
  if (!l) { view = { tab: 'trip', sub: null, id: null }; return renderTripHome(); }
  const p = listProgress(id);
  const items = l.items.map(it => {
    const on = isChecked(it.id);
    return `
      <li class="item ${on ? 'checked' : ''}">
        <div class="check ${on ? 'on' : ''}" role="checkbox" aria-checked="${on}" data-action="toggle-item" data-id="${it.id}"></div>
        <span class="item-label" data-action="toggle-item" data-id="${it.id}">${esc(it.text)}</span>
      </li>`;
  }).join('');

  return `
    <button class="back" data-action="back-trip">← Trip</button>
    <div class="detail-head"><span class="emoji">${l.emoji}</span><h2>${esc(l.name)}</h2></div>
    <p class="detail-sub">${esc(l.sub || '')}</p>
    <div class="progress-row" style="margin-bottom:16px">
      <div class="bar"><span style="width:${p.pct}%"></span></div>
      <div class="pct">${p.pct}%</div>
    </div>
    <ul class="items">${items || '<li class="muted">No items. Add some in the Lists tab.</li>'}</ul>
    <div class="row" style="margin-top:8px">
      <button class="btn btn-ghost btn-sm" data-action="uncheck-list" data-id="${id}">Uncheck all</button>
      <div class="spacer"></div>
      <button class="btn btn-ghost btn-sm" data-action="goto-edit" data-id="${id}">✏️ Edit items</button>
    </div>`;
}

/* ---------- LISTS (edit templates) ---------- */
function renderLists() {
  const rows = lists().map(l => `
    <button class="tile" data-action="edit-list" data-id="${l.id}" style="flex-direction:row;align-items:center">
      <span class="emoji">${l.emoji}</span>
      <span style="flex:1">
        <span class="name" style="display:block">${esc(l.name)}</span>
        <span class="count">${l.items.length} items${l.builtin ? '' : ' · custom'}</span>
      </span>
      <span class="muted">›</span>
    </button>`).join('');

  return `
    <div class="section-label">Edit checklists</div>
    <p class="muted" style="margin:0 4px 14px;font-size:.85rem">Tap a list to add, edit, reorder, or remove items. Changes apply to your next checks.</p>
    <div class="grid" style="grid-template-columns:1fr">${rows}</div>

    <div class="section-label" style="margin-top:22px">Add a custom checklist</div>
    <div class="card row" style="gap:8px">
      <input type="text" id="newListEmoji" value="📋" style="width:56px;text-align:center" aria-label="emoji">
      <input type="text" id="newListName" placeholder="Checklist name" autocomplete="off">
      <button class="btn btn-primary btn-sm" data-action="add-list">Add</button>
    </div>`;
}

/* ---------- LISTS: edit one ---------- */
function renderEditList(id) {
  const l = getList(id);
  if (!l) { view = { tab: 'lists', sub: null, id: null }; return renderLists(); }

  const items = l.items.map((it, idx) => `
    <li class="item">
      <div class="item-reorder">
        <button class="iconbtn" data-action="move-up" data-id="${it.id}" ${idx === 0 ? 'disabled' : ''} aria-label="Move up">▲</button>
        <button class="iconbtn" data-action="move-down" data-id="${it.id}" ${idx === l.items.length - 1 ? 'disabled' : ''} aria-label="Move down">▼</button>
      </div>
      <input type="text" class="item-label" style="border:1px solid var(--line);border-radius:8px;padding:8px 10px"
             value="${esc(it.text)}" data-action="rename-item" data-id="${it.id}">
      <button class="iconbtn danger" data-action="del-item" data-id="${it.id}" aria-label="Delete">✕</button>
    </li>`).join('');

  const nameField = l.builtin ? '' : `
    <div class="card row" style="gap:8px;margin-bottom:14px">
      <input type="text" style="width:56px;text-align:center" value="${esc(l.emoji)}" data-action="rename-list-emoji" data-id="${id}" aria-label="emoji">
      <input type="text" value="${esc(l.name)}" data-action="rename-list-name" data-id="${id}" aria-label="list name">
    </div>`;

  return `
    <button class="back" data-action="back-lists">← Lists</button>
    <div class="detail-head"><span class="emoji">${l.emoji}</span><h2>${esc(l.name)}</h2></div>
    <p class="detail-sub">${l.builtin ? 'Built-in list' : 'Custom list'} · ${l.items.length} items</p>
    ${nameField}
    <ul class="items">${items || '<li class="muted">No items yet — add one below.</li>'}</ul>
    <div class="add-row">
      <input type="text" id="newItemText" placeholder="Add an item…" autocomplete="off">
      <button class="btn btn-primary" data-action="add-item" data-id="${id}">Add</button>
    </div>
    <div class="row" style="flex-wrap:wrap;gap:10px;margin-top:6px">
      ${l.builtin
        ? `<button class="btn btn-ghost btn-sm" data-action="restore-defaults" data-id="${id}">↺ Restore default items</button>`
        : `<button class="btn btn-danger btn-sm" data-action="delete-list" data-id="${id}">🗑 Delete this checklist</button>`}
    </div>`;
}

/* ---------- HISTORY ---------- */
function renderHistory() {
  if (!state.history.length) {
    return `<div class="empty"><div class="big">🕘</div><p>No trips yet.<br>Finish a trip and it'll be saved here.</p></div>`;
  }
  const rows = state.history.slice().reverse().map(tr => {
    const d = tr.totals;
    const pct = d.total ? Math.round((d.done / d.total) * 100) : 0;
    return `
      <button class="tile" data-action="open-history" data-id="${tr.id}" style="flex-direction:row;align-items:center">
        <span class="emoji">🧭</span>
        <span style="flex:1">
          <span class="name" style="display:block">${esc(tr.name)}</span>
          <span class="count">${tr.place ? esc(tr.place) + ' · ' : ''}${fmtDate(tr.startDate)}${tr.endDate ? ' → ' + fmtDate(tr.endDate) : ''}</span>
        </span>
        <span class="pill ${pct === 100 ? 'pill-green' : 'pill-accent'}">${pct}%</span>
      </button>`;
  }).join('');
  return `<div class="section-label">Trip history</div><div class="grid" style="grid-template-columns:1fr">${rows}</div>`;
}

function renderHistoryDetail(id) {
  const tr = state.history.find(t => t.id === id);
  if (!tr) { view = { tab: 'history', sub: null, id: null }; return renderHistory(); }
  const lists = tr.snapshot.map(l => {
    const done = l.items.filter(i => i.done).length;
    const items = l.items.map(i => `
      <li class="item ${i.done ? 'checked' : ''}">
        <div class="check ${i.done ? 'on' : ''}"></div>
        <span class="item-label">${esc(i.text)}</span>
      </li>`).join('');
    return `
      <div class="section-label" style="margin-top:18px">${l.emoji} ${esc(l.name)} — ${done}/${l.items.length}</div>
      <ul class="items">${items}</ul>`;
  }).join('');

  return `
    <button class="back" data-action="back-history">← History</button>
    <div class="detail-head"><span class="emoji">🧭</span><h2>${esc(tr.name)}</h2></div>
    <p class="detail-sub">${tr.place ? esc(tr.place) + ' · ' : ''}${fmtDate(tr.startDate)}${tr.endDate ? ' → ' + fmtDate(tr.endDate) : ''}</p>
    ${tr.notes ? `<div class="card" style="margin-bottom:6px"><strong>Notes:</strong> ${esc(tr.notes)}</div>` : ''}
    ${lists}
    <div class="row" style="margin-top:18px">
      <button class="btn btn-danger btn-sm" data-action="delete-history" data-id="${tr.id}">🗑 Delete this trip</button>
    </div>`;
}

/* ---------- DATA ---------- */
function renderData() {
  return `
    <div class="section-label">Backup &amp; data</div>
    <div class="card stack">
      <p class="muted" style="margin:0">Everything is stored on this device only. Export a backup before clearing your browser or switching phones.</p>
      <button class="btn btn-primary btn-block" data-action="export-data">⬇️ Export backup (.json)</button>
      <button class="btn btn-ghost btn-block" data-action="import-data">⬆️ Import backup</button>
    </div>
    <div class="section-label" style="margin-top:22px">Reset</div>
    <div class="card stack">
      <p class="muted" style="margin:0">Restore all six checklists to defaults and erase trips &amp; history. This cannot be undone.</p>
      <button class="btn btn-danger btn-block" data-action="reset-all">Reset everything to defaults</button>
    </div>
    <p class="muted center" style="font-size:.75rem;margin-top:22px">RV Trailer Manager · Phase 1 · works offline</p>`;
}

/* ============================================================
   Actions
   ============================================================ */
function go(tab, sub, id) { view = { tab, sub: sub || null, id: id || null }; render(); window.scrollTo(0, 0); }

const ACTIONS = {
  /* trip */
  'start-trip': () => {
    const name = (document.getElementById('tripName').value || '').trim() || 'Untitled trip';
    const place = (document.getElementById('tripPlace').value || '').trim();
    state.currentTrip = { id: uid('t_'), name, place, startDate: todayISO(), checks: {} };
    save(); toast('Trip started — lists reset'); go('trip');
  },
  'open-list': (id) => go('trip', 'list', id),
  'back-trip': () => go('trip'),
  'toggle-item': (id) => {
    if (!state.currentTrip) return;
    const c = state.currentTrip.checks;
    if (c[id]) delete c[id]; else c[id] = true;
    save();
    // re-render current list view in place
    render();
  },
  'uncheck-list': (id) => {
    if (!state.currentTrip) return;
    for (const it of getList(id).items) delete state.currentTrip.checks[it.id];
    save(); render();
  },
  'goto-edit': (id) => go('lists', 'edit', id),
  'finish-trip': () => {
    const t = state.currentTrip; if (!t) return;
    const notes = prompt('Any notes for this trip? (optional)') || '';
    const snapshot = lists().map(l => ({
      emoji: l.emoji, name: l.name,
      items: l.items.map(it => ({ text: it.text, done: isChecked(it.id) })),
    }));
    const o = overallProgress();
    state.history.push({
      id: t.id, name: t.name, place: t.place, startDate: t.startDate, endDate: todayISO(),
      notes: notes.trim(), snapshot, totals: { done: o.done, total: o.total },
    });
    state.currentTrip = null;
    save(); toast('Trip saved to history 🎉'); go('history');
  },
  'cancel-trip': () => {
    if (!confirm('Discard this trip without saving? Checkmarks will be lost.')) return;
    state.currentTrip = null; save(); toast('Trip discarded'); go('trip');
  },

  /* lists / editing */
  'edit-list': (id) => go('lists', 'edit', id),
  'back-lists': () => go('lists'),
  'add-list': () => {
    const name = (document.getElementById('newListName').value || '').trim();
    const emoji = (document.getElementById('newListEmoji').value || '📋').trim() || '📋';
    if (!name) { toast('Enter a list name'); return; }
    const id = uid('l_');
    state.checklists.defs[id] = { id, emoji, name, sub: 'Custom checklist', builtin: false, items: [] };
    state.checklists.order.push(id);
    save(); go('lists', 'edit', id);
  },
  'add-item': (id) => {
    const input = document.getElementById('newItemText');
    const text = (input.value || '').trim();
    if (!text) return;
    getList(id).items.push({ id: uid('i_'), text });
    save(); render();
    const ni = document.getElementById('newItemText'); if (ni) ni.focus();
  },
  'del-item': (id) => {
    for (const l of lists()) {
      const i = l.items.findIndex(x => x.id === id);
      if (i >= 0) { l.items.splice(i, 1); break; }
    }
    if (state.currentTrip) delete state.currentTrip.checks[id];
    save(); render();
  },
  'move-up': (id) => moveItem(id, -1),
  'move-down': (id) => moveItem(id, 1),
  'restore-defaults': (id) => {
    const def = DEFAULT_BY_ID[id]; if (!def) return;
    if (!confirm('Replace this list with the default items? Custom edits to this list will be lost.')) return;
    getList(id).items = def.items.map(t => ({ id: uid('i_'), text: t }));
    save(); toast('Defaults restored'); render();
  },
  'delete-list': (id) => {
    const l = getList(id); if (!l || l.builtin) return;
    if (!confirm(`Delete the "${l.name}" checklist? This can't be undone.`)) return;
    for (const it of l.items) { if (state.currentTrip) delete state.currentTrip.checks[it.id]; }
    delete state.checklists.defs[id];
    state.checklists.order = state.checklists.order.filter(x => x !== id);
    save(); go('lists');
  },

  /* history */
  'open-history': (id) => go('history', 'view', id),
  'back-history': () => go('history'),
  'delete-history': (id) => {
    if (!confirm('Delete this trip from history?')) return;
    state.history = state.history.filter(t => t.id !== id);
    save(); go('history');
  },

  /* data */
  'export-data': exportData,
  'import-data': () => document.getElementById('importFile').click(),
  'reset-all': () => {
    if (!confirm('Reset EVERYTHING to defaults? All trips, history, and custom lists will be erased.')) return;
    state = seedState(); save(); toast('Reset to defaults'); go('trip');
  },
};

/* change-event actions (text inputs) */
const CHANGE_ACTIONS = {
  'rename-item': (id, value) => {
    for (const l of lists()) {
      const it = l.items.find(x => x.id === id);
      if (it) { it.text = value.trim() || it.text; break; }
    }
    save();
  },
  'rename-list-name': (id, value) => { const l = getList(id); if (l) { l.name = value.trim() || l.name; save(); } },
  'rename-list-emoji': (id, value) => { const l = getList(id); if (l) { l.emoji = (value.trim() || l.emoji); save(); } },
};

function moveItem(id, dir) {
  for (const l of lists()) {
    const i = l.items.findIndex(x => x.id === id);
    if (i >= 0) {
      const j = i + dir;
      if (j < 0 || j >= l.items.length) return;
      [l.items[i], l.items[j]] = [l.items[j], l.items[i]];
      save(); render();
      return;
    }
  }
}

/* ---------- Export / Import ---------- */
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `rv-manager-backup-${stamp}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Backup downloaded');
}
function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !data.checklists || !data.checklists.defs) throw new Error('bad file');
      if (!confirm('Replace all current data with this backup?')) return;
      state = data;
      if (!state.history) state.history = [];
      save(); toast('Backup imported'); go('trip');
    } catch (e) { toast('⚠️ Not a valid backup file'); }
  };
  reader.readAsText(file);
}

/* ---------- Toast ---------- */
let toastTimer = null;
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
}

/* ============================================================
   Wiring
   ============================================================ */
// tab bar
document.getElementById('tabbar').addEventListener('click', e => {
  const btn = e.target.closest('.tab');
  if (btn) go(btn.dataset.tab);
});

// delegated clicks inside view
viewEl().addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  // text inputs handle their own change events; don't treat their click as an action
  if (el.tagName === 'INPUT' && (action.startsWith('rename'))) return;
  const fn = ACTIONS[action];
  if (fn) { e.preventDefault(); fn(el.dataset.id); }
});

// delegated change for text fields
viewEl().addEventListener('change', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = CHANGE_ACTIONS[el.dataset.action];
  if (fn) fn(el.dataset.id, el.value);
});

// Enter key to add items / lists
viewEl().addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const t = e.target;
  if (t.id === 'newItemText') { const id = t.closest('main').querySelector('[data-action="add-item"]').dataset.id; ACTIONS['add-item'](id); }
  else if (t.id === 'newListName') ACTIONS['add-list']();
  else if (t.id === 'tripName' || t.id === 'tripPlace') ACTIONS['start-trip']();
});

// import file
document.getElementById('importFile').addEventListener('change', e => {
  if (e.target.files && e.target.files[0]) importData(e.target.files[0]);
  e.target.value = '';
});

// service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// go
render();
