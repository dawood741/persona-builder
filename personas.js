'use strict';

// Saved personas library: lists every persona in the database and shows one in full.
// Field labels and section order come from the builder (window.PersonaSchema).
(() => {
  const schema = window.PersonaSchema;
  const ui = {
    list: document.getElementById('personaList'),
    message: document.getElementById('listMessage'),
    search: document.getElementById('search'),
    filter: document.getElementById('difficultyFilter'),
    count: document.getElementById('count'),
    detail: document.getElementById('detail'),
  };
  let personas = [];
  let selectedId = null;

  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text !== undefined && text !== null) el.textContent = text;
    if (className) el.className = className;
    return el;
  };

  const dateLabel = iso => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const dateTimeLabel = iso => new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  async function api(method, query = '') {
    let res;
    try {
      res = await fetch('/api/personas' + query, { method, headers: { 'content-type': 'application/json' } });
    } catch {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'The server returned an error (' + res.status + ').');
    return data;
  }

  // ── List ──────────────────────────────────────────────

  function visible() {
    const q = ui.search.value.trim().toLowerCase();
    const level = ui.filter.value;
    return personas.filter(p =>
      (!level || p.difficulty === level)
      && (!q || [p.title, p.customer_name].some(v => (v || '').toLowerCase().includes(q))));
  }

  function renderList() {
    const rows = visible();
    ui.list.replaceChildren();
    ui.count.textContent = personas.length
      ? (rows.length === personas.length ? personas.length + (personas.length === 1 ? ' persona' : ' personas')
        : rows.length + ' of ' + personas.length + ' personas')
      : '';
    if (!personas.length) {
      ui.message.hidden = false;
      ui.message.replaceChildren('No personas have been saved yet. ', Object.assign(node('a', 'Create the first one'), { href: 'index.html' }), '.');
      return;
    }
    ui.message.hidden = rows.length > 0;
    if (!rows.length) ui.message.textContent = 'No personas match your search.';
    for (const p of rows) {
      const item = node('li');
      const button = node('button', undefined, 'persona-row' + (p.id === selectedId ? ' selected' : ''));
      button.type = 'button';
      button.setAttribute('aria-pressed', String(p.id === selectedId));
      const top = node('span', undefined, 'persona-row-top');
      top.append(node('span', p.title, 'persona-row-title'));
      if (p.difficulty) top.append(node('span', p.difficulty, 'pill pill-' + p.difficulty.toLowerCase()));
      button.append(top, node('span', [p.customer_name || 'No customer name', 'Updated ' + dateLabel(p.updated_at)].join(' · '), 'persona-row-meta'));
      button.addEventListener('click', () => select(p.id));
      item.append(button);
      ui.list.append(item);
    }
  }

  async function loadList() {
    try {
      ({ personas } = await api('GET'));
      renderList();
      const fromHash = window.location.hash.slice(1);
      const first = personas.find(p => p.id === fromHash) || visible()[0];
      if (first) select(first.id);
      else showEmptyDetail();
    } catch (error) {
      ui.message.hidden = false;
      ui.message.textContent = error.message;
      ui.count.textContent = '';
    }
  }

  // ── Detail ────────────────────────────────────────────

  function showEmptyDetail() {
    ui.detail.replaceChildren();
    const box = node('div', undefined, 'detail-empty');
    box.append(node('h2', 'Select a Persona'), node('p', 'Choose a persona from the list to see everything that was entered for it.'));
    ui.detail.append(box);
  }

  /** Human-readable value for one field, or null when nothing was entered. */
  function display(f, values) {
    const raw = values[f.id];
    const pairs = new Map(schema.optionPairs(f));
    const caption = v => (v === schema.OTHER ? (values[f.id + 'Other'] || 'Other') : pairs.get(v) || v);
    if (f.type === 'checks') {
      const items = (Array.isArray(raw) ? raw : []).map(caption).filter(Boolean);
      return items.length ? items : null;
    }
    if (raw === undefined || raw === null || String(raw).trim() === '') return null;
    return f.options ? caption(raw) : String(raw);
  }

  function renderDetail(row) {
    const values = schema.clean(row.form_values || {});
    ui.detail.replaceChildren();

    const head = node('div', undefined, 'detail-head');
    const titles = node('div', undefined, 'detail-titles');
    const heading = node('h2', row.title);
    titles.append(heading);
    const meta = node('p', undefined, 'detail-meta');
    if (row.difficulty) meta.append(node('span', row.difficulty, 'pill pill-' + row.difficulty.toLowerCase()));
    meta.append(node('span', 'Created ' + dateTimeLabel(row.created_at)), node('span', 'Updated ' + dateTimeLabel(row.updated_at)));
    titles.append(meta);

    const actions = node('div', undefined, 'detail-actions');
    const open = node('a', 'Open in Builder', 'button primary');
    open.href = 'index.html?id=' + encodeURIComponent(row.id);
    const remove = node('button', 'Delete', 'danger');
    remove.type = 'button';
    remove.addEventListener('click', () => removePersona(row));
    actions.append(remove, open);
    head.append(titles, actions);
    ui.detail.append(head);

    for (const [index, group] of schema.groups.entries()) {
      const section = node('section', undefined, 'detail-section');
      const sh = node('div', undefined, 'section-head');
      sh.append(node('span', String(index + 1).padStart(2, '0'), 'number'), node('h3', schema.titleCase(group.title)));
      section.append(sh);

      const dl = node('dl', undefined, 'detail-grid');
      for (const f of group.fields) {
        if (f.customFor || !schema.active(f, values)) continue;   // custom answers are shown on their parent field
        const value = display(f, values);
        if (value === null) continue;
        const wide = f.type === 'textarea' || f.type === 'checks' || String(value).length > 60;
        const wrap = node('div', undefined, 'detail-field' + (wide ? ' wide' : ''));
        wrap.append(node('dt', schema.splitLabel(f.label).main));
        const dd = node('dd');
        if (Array.isArray(value)) {
          const chips = node('div', undefined, 'chips');
          for (const v of value) chips.append(node('span', v, 'chip'));
          dd.append(chips);
        } else {
          dd.textContent = value;
        }
        wrap.append(dd);
        dl.append(wrap);
      }
      if (dl.childElementCount) section.append(dl);
      else section.append(node('p', 'Nothing entered in this section.', 'detail-none'));
      ui.detail.append(section);
    }
  }

  async function select(id) {
    selectedId = id;
    renderList();
    if (window.location.hash.slice(1) !== id) window.history.replaceState(null, '', '#' + id);
    ui.detail.replaceChildren(node('p', 'Loading persona…', 'detail-loading'));
    try {
      const { persona } = await api('GET', '?id=' + encodeURIComponent(id));
      if (selectedId === id) renderDetail(persona);
    } catch (error) {
      if (selectedId === id) ui.detail.replaceChildren(node('p', error.message, 'detail-loading'));
    }
  }

  async function removePersona(row) {
    if (!window.confirm('Delete “' + row.title + '”? This cannot be undone.')) return;
    try {
      await api('DELETE', '?id=' + encodeURIComponent(row.id));
      const index = visible().findIndex(p => p.id === row.id);
      personas = personas.filter(p => p.id !== row.id);
      const rows = visible();
      selectedId = null;
      renderList();
      const next = rows[Math.min(index, rows.length - 1)];
      if (next) select(next.id);
      else { window.history.replaceState(null, '', window.location.pathname); showEmptyDetail(); }
    } catch (error) {
      window.alert(error.message);
    }
  }

  ui.search.addEventListener('input', renderList);
  ui.filter.addEventListener('change', renderList);
  loadList();
})();
