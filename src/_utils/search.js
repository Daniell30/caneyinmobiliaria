// src/_utils/search.js
// Buscador reutilizable: el mismo bloque se usa en el home y en /buscar/,
// así el marcado, los estilos y el comportamiento no pueden divergir.
// Funciona sin JavaScript (es un <form> GET hacia /buscar/); el script solo
// añade el autocompletado del sector, las pestañas y el relleno inicial
// a partir de los parámetros de la URL.

const esc = v => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Buscador compartido por el home y /buscar/. Es un <form> GET de verdad: sin JavaScript sigue
// llevando a /buscar/ con los parámetros, y el JS solo añade el
// autocompletado del sector y el cambio de pestaña.
function searchSection(sectors, types) {
  const tipoOpts = ['<option value="">Tipo de propiedad</option>']
    .concat(types.map(t => `<option value="${esc(t)}">${esc(t)}</option>`))
    .join("");

  return `
  <section class="search-hero" aria-labelledby="quebuscas-title">
    <h2 class="quebuscasopening" id="quebuscas-title">¿Qué buscas?</h2>

    <div class="search-tabs" role="group" aria-label="Tipo de operación">
      <button type="button" class="search-tab is-active" data-op="venta" aria-pressed="true">Quiero comprar</button>
      <button type="button" class="search-tab" data-op="alquiler" aria-pressed="false">Quiero alquilar</button>
      <a class="search-tab" href="/vender/">Quiero vender</a>
      <button type="button" class="search-tab" data-op="" data-tipo="Proyecto Residencial" aria-pressed="false">Proyectos</button>
    </div>

    <form class="search-form" action="/buscar/" method="get" role="search">
      <input type="hidden" name="op" id="searchOp" value="venta">

      <div class="search-field search-field--sector">
        <label class="visually-hidden" for="sectorInput">Sector o zona</label>
        <input type="text" id="sectorInput" name="sector" placeholder="¿En qué sector quieres mudarte?"
               autocomplete="off" role="combobox" aria-expanded="false"
               aria-controls="sectorSuggestions" aria-autocomplete="list">
        <ul class="search-suggestions" id="sectorSuggestions" role="listbox" hidden></ul>
      </div>

      <div class="search-field search-field--tipo">
        <label class="visually-hidden" for="tipoSelect">Tipo de propiedad</label>
        <select id="tipoSelect" name="tipo">${tipoOpts}</select>
      </div>

      <button class="search-submit" type="submit">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="11" cy="11" r="7"></circle>
          <line x1="16.5" y1="16.5" x2="21" y2="21"></line>
        </svg>
        <span>Buscar</span>
      </button>
    </form>

    <script id="SECTORS_DATA" type="application/json">${JSON.stringify(sectors)}</script>

  <script>
(() => {
  const input   = document.getElementById('sectorInput');
  const box     = document.getElementById('sectorSuggestions');
  const opField = document.getElementById('searchOp');
  const tipoSel = document.getElementById('tipoSelect');
  const dataEl  = document.getElementById('SECTORS_DATA');

  // Pestañas: fijan la operación (y el tipo, en "Proyectos").
  const tabs = Array.from(document.querySelectorAll('.search-tab[data-op]'));
  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabs.forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('is-active');
      btn.setAttribute('aria-pressed', 'true');
      if (opField) opField.value = btn.dataset.op || '';
      if (tipoSel) tipoSel.value = btn.dataset.tipo || '';
    });
  });

  // Relleno inicial desde la URL: así /buscar/ muestra lo que se pidió.
  const params = new URLSearchParams(location.search);
  const qSector = params.get('sector') || '';
  const qTipo   = params.get('tipo') || '';
  const qOp     = params.get('op');
  if (qSector && input) input.value = qSector;
  if (qTipo && tipoSel) tipoSel.value = qTipo;
  if (opField && qOp !== null) opField.value = qOp;
  if (qOp !== null || qTipo) {
    tabs.forEach((b) => {
      const isProyectos = !!b.dataset.tipo;
      const on = isProyectos
        ? qTipo === b.dataset.tipo
        : (b.dataset.op || '') === (qOp || '') && qTipo !== 'Proyecto Residencial';
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  if (!input || !box || !dataEl) return;
  const SECTORS = JSON.parse(dataEl.textContent);
  const norm = (s) => String(s).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
  let active = -1;

  function close() {
    box.hidden = true;
    box.innerHTML = '';
    active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function choose(value) {
    input.value = value;
    close();
  }

  function show(matches) {
    if (!matches.length) { close(); return; }
    box.innerHTML = matches.map((m, i) =>
      '<li role="option" id="sug-' + i + '" data-value="' +
      m.replace(/"/g, '&quot;') + '">' + m + '</li>').join('');
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    active = -1;
  }

  function highlight() {
    const items = box.querySelectorAll('li');
    items.forEach((li, i) => {
      li.classList.toggle('is-active', i === active);
      li.setAttribute('aria-selected', i === active ? 'true' : 'false');
    });
    if (active >= 0) input.setAttribute('aria-activedescendant', 'sug-' + active);
    else input.removeAttribute('aria-activedescendant');
  }

  const matchesFor = (q) => !q
    ? SECTORS.slice(0, 8)
    : SECTORS.filter((s) => norm(s).indexOf(q) !== -1).slice(0, 8);

  input.addEventListener('input', () => show(matchesFor(norm(input.value.trim()))));
  input.addEventListener('focus', () => { if (!input.value.trim()) show(SECTORS.slice(0, 8)); });

  input.addEventListener('keydown', (e) => {
    const items = box.querySelectorAll('li');
    if (box.hidden || !items.length) return;
    if (e.key === 'ArrowDown')      { e.preventDefault(); active = (active + 1) % items.length; highlight(); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); active = (active - 1 + items.length) % items.length; highlight(); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(items[active].dataset.value); }
    else if (e.key === 'Escape')    { close(); }
  });

  box.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li');
    if (li) { e.preventDefault(); choose(li.dataset.value); }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-field--sector')) close();
  });
})();
  </script>
  </section>`;
}

module.exports = { searchSection, esc };
