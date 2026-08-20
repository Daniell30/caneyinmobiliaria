// src/list-punta-cana.11ty.js
const fs = require("fs");
const path = require("path");
const slugify = require("./_utils/slugify");
const { sectorPages, operationOf } = require("./_utils/sectors");

const PER_PAGE = 20; // cards per page

module.exports = class {
  data() {
    const p = path.join(__dirname, "_data", "properties.json");
    const props = JSON.parse(fs.readFileSync(p, "utf-8"));

    // All items for this area
    const all = props.filter(
      x => String(x.area || "").toLowerCase() === "punta cana"
    );

    // Facets from the full set
    const sectors = [...new Set(all.map(p => (p.sector || "").trim()).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b,"es"));
    const types = [...new Set(
      all.flatMap(p => Array.isArray(p.type) ? p.type : (p.type ? [p.type] : []))
         .map(t => t.trim())
         .filter(Boolean)
    )].sort((a,b)=>a.localeCompare(b,"es"));

    return {
      // ✅ Use the shared SEO layout
      layout: "layouts/base.njk",

      // ✅ Page-level SEO fields consumed by macros/seo.njk
      pageTitle: "Inmuebles en Punta Cana | Caney Inmobiliaria",
      pageDesc:
        "Compra o invierte en Punta Cana: apartamentos, villas y solares. Filtra por precio, sector y tipo. Fotos, detalles y enlaces a cada propiedad.",
      // Optional: if you have a nice OG image for this section, set it here;
      // otherwise the layout will fall back to site.logo
      // pageImage: "/css/images-caney/GENERAL/og-punta-cana.jpg",

      // ✅ Per-page stylesheet (base.njk should include it if present)
      pageCSS: "/css/santodomingoinmuebles.css",

      // List data
      all, sectors, types,

      // Static pagination (for SSR slice)
      pagination: { data: "all", size: PER_PAGE, alias: "pageItems" },

      // Permalinks per page
      permalink: (data) => {
        const n = data.pagination.pageNumber;
        return n === 0 ? "inmuebles-punta-cana.html"
                       : `inmuebles-punta-cana-${n + 1}.html`;
      }
    };
  }

  render(data) {
    // Phase 5: links to this area's sector aggregate pages (internal linking
    // so they are reachable by crawlers and users).
    const allProps = JSON.parse(
      fs.readFileSync(path.join(__dirname, "_data", "properties.json"), "utf-8"));
    const areaSectors = sectorPages(allProps)
      .filter(sp => String(sp.area || "").toLowerCase() === "punta cana");

    const sectorNav = areaSectors.length ? `
  <nav class="sector-nav" aria-label="Zonas destacadas">
    <h2>Zonas destacadas</h2>
    <ul>
      ${areaSectors.map(sp => `<li><a class="sector-chip" href="/${sp.slug}"><span class="sector-chip-name"><span class="visually-hidden">${sp.label}${sp.opPart} en </span>${sp.sector}<span class="visually-hidden">${sp.placeSuffix}</span></span> <span class="sector-chip-count">${sp.items.length}</span><span class="visually-hidden"> propiedades</span></a></li>`).join("\n      ")}
    </ul>
  </nav>` : "";

    const { pageItems, all, pagination, sectors, types } = data;

    // Quick Venta / Alquiler filter — only worth showing where the area
    // actually has both kinds of listing.
    const opCounts = all.reduce((acc, p) => {
      const op = operationOf(p);
      acc[op] = (acc[op] || 0) + 1;
      return acc;
    }, {});
    const opFilter = (opCounts.venta && opCounts.alquiler) ? `
  <div class="op-filter" role="group" aria-label="Filtrar por operación">
    <button type="button" class="op-btn" data-op="venta" aria-pressed="false">Venta <span class="op-count">${opCounts.venta}</span></button>
    <button type="button" class="op-btn" data-op="alquiler" aria-pressed="false">Alquiler <span class="op-count">${opCounts.alquiler}</span></button>
  </div>` : "";
    const priceNum = s => Number(String(s || "").replace(/[^\d.]/g, "") || 0);

    // ----- Server-rendered cards (SEO / no-JS) -----
    const cards = pageItems.map(p => {
      const img = (p.images && p.images[0]) || "";
      const sector = p.sector || "";
      const typeLabel = Array.isArray(p.type) ? p.type.join(", ") : (p.type || "");
      const typeData = (Array.isArray(p.type) ? p.type : [p.type || ""])
        .map(t => String(t).toLowerCase()).filter(Boolean).join("|");
      const href = `/${slugify(p.title)}-${slugify(p.sector || p.area || "")}`;

      return `
        <div class="property-item"
             data-price="${priceNum(p.price)}"
             data-sector="${String(sector).toLowerCase()}"
             data-type="${typeData}"
             data-operation="${operationOf(p)}">
          <img src="/css/images-caney/${p.folder}/${img}" alt="${p.title}" class="property-image">
          <div class="property-info">
            <h2>${p.title}</h2>
            <p>Ubicación: ${p.location || ""}</p>
            ${p.price ? `<p>Precio: ${p.price}</p>` : ""}
            ${p.size  ? `<p>Metraje: ${p.size}</p>` : ""}
            ${sector  ? `<p>Sector: ${sector}</p>` : ""}
            ${typeLabel ? `<p>Tipo: ${typeLabel}</p>` : ""}
            <a href="${href}" class="view-details" target="_blank" rel="noopener">Ver Detalles</a>
          </div>
        </div>`;
    }).join("\n");

    const sectorOpts = ['<option value="">Todos los sectores</option>', ...sectors.map(s => `<option value="${s}">${s}</option>`)].join("");
    const typeOpts   = ['<option value="">Todos los tipos</option>',   ...types.map(t => `<option value="${t}">${t}</option>`)].join("");

    const pageHref = (n) => (n === 0 ? "/inmuebles-punta-cana" : `/inmuebles-punta-cana-${n + 1}`);
    const totalPages = Math.ceil(all.length / PER_PAGE);
    const prev = pagination.pageNumber > 0 ? pageHref(pagination.pageNumber - 1) : null;
    const next = (pagination.pageNumber + 1) < totalPages ? pageHref(pagination.pageNumber + 1) : null;

    // ----- Minimal dataset for client-side filtering across ALL items -----
    const ALL_FOR_CLIENT = all.map(p => ({
      ...p,
      _href: `/${slugify(p.title)}-${slugify(p.sector || p.area || "")}`,
      _priceNum: priceNum(p.price),
      _operation: operationOf(p),
      _sectorLower: String(p.sector || "").toLowerCase(),
      _typeListLower: (Array.isArray(p.type) ? p.type : (p.type ? [p.type] : []))
        .map(t => String(t).toLowerCase()).filter(Boolean)
    }));

    // ----- BODY CONTENT ONLY (layout supplies <html>, <head>, SEO, header, etc.) -----
    return `

<header><nav><a href="/"><img src="/css/images-caney/general/caneylogo.png" alt="CaneyLogo"></a></nav></header>

<h1>PUNTA CANA</h1>
  ${opFilter}
  ${sectorNav}

<div class="toolbar">
  <button id="toggleFilters" class="filter-toggle">Filtros</button>
</div>

<div class="filters" id="filtersPanel" style="display:none;">
  <div>
    <label>Precio (USD) — Mín.</label>
    <input type="number" id="minPrice" placeholder="0" min="0">
  </div>
  <div>
    <label>Precio (USD) — Máx.</label>
    <input type="number" id="maxPrice" placeholder="9999999" min="0">
  </div>
  <div>
    <label>Sector</label>
    <select id="sectorFilter">${sectorOpts}</select>
  </div>
  <div>
    <label>Tipo</label>
    <select id="typeFilter">${typeOpts}</select>
  </div>
  <div class="btns">
    <button id="applyFilters">Filtrar</button>
    <button id="clearFilters">Limpiar</button>
  </div>
</div>

<div class="property-listing" id="results">
  ${cards || "<p>No hay propiedades por ahora.</p>"}
</div>

<div class="empty-msg" id="emptyMsg" style="display:none;">No hay propiedades que coincidan con los filtros.</div>

<!-- Static pager (used when no filters están activos) -->
<div class="pager" id="pager">
  ${prev ? `<a href="${prev}" class="view-details" style="margin-right:8px;">← Anterior</a>` : ""}
  ${next ? `<a href="${next}" class="view-details">Ver más</a>` : ""}
</div>

<!-- Full dataset for client-side filtering & pagination -->
<script id="ALL_DATA" type="application/json">${JSON.stringify(ALL_FOR_CLIENT)}</script>

<script>
  (function(){
    const PER_PAGE = ${PER_PAGE};
    const $ = s => document.querySelector(s);

    const panel = $('#filtersPanel');
    $('#toggleFilters').addEventListener('click', () => {
      panel.style.display = (panel.style.display === 'none' || !panel.style.display) ? 'grid' : 'none';
    });

    const results = $('#results');
    const pagerEl = $('#pager');
    const emptyMsg = $('#emptyMsg');

    const minI = $('#minPrice');
    const maxI = $('#maxPrice');
    const sectorSel = $('#sectorFilter');
    const typeSel = $('#typeFilter');

    const ALL = JSON.parse(document.getElementById('ALL_DATA').textContent);

    let activeOp = '';

    const lower = s => String(s||'').toLowerCase();
    const baseHref = n => (n === 0 ? "/inmuebles-punta-cana" : \`/inmuebles-punta-cana-\${n + 1}\`);

    function qsFromInputs(pageIndex){
      const qs = new URLSearchParams();
      if (minI.value) qs.set('min', minI.value);
      if (maxI.value) qs.set('max', maxI.value);
      if (sectorSel.value) qs.set('sector', sectorSel.value);
      if (typeSel.value) qs.set('type', typeSel.value);
      if (activeOp) qs.set('op', activeOp);
      qs.set('p', String(pageIndex || 0));
      return qs.toString();
    }

    function readQS(){
      const q = new URLSearchParams(location.search);
      if (q.has('min')) minI.value = q.get('min');
      if (q.has('max')) maxI.value = q.get('max');
      if (q.has('sector')) sectorSel.value = q.get('sector');
      if (q.has('type')) typeSel.value = q.get('type');
      if (q.has('op')) setOp(q.get('op'), false);
      return q;
    }

    function filterAll(){
      const min = parseFloat(minI.value || '0');
      const max = parseFloat(maxI.value || '999999999');
      const sector = lower(sectorSel.value || '');
      const type   = lower(typeSel.value || '');
      return ALL.filter(p => {
        const okPrice  = p._priceNum >= min && p._priceNum <= max;
        const okSector = !sector || lower(p.sector) === sector;
        const okType   = !type || p._typeListLower.includes(type);
        const okOp     = !activeOp || p._operation === activeOp;
        return okPrice && okSector && okType && okOp;
      });
    }

    function cardHTML(p){
      const img = (p.images && p.images[0]) || "";
      const typeLabel = Array.isArray(p.type) ? p.type.join(", ") : (p.type || "");
      return \`
        <div class="property-item"
             data-price="\${p._priceNum}"
             data-sector="\${lower(p.sector)}"
             data-type="\${p._typeListLower.join('|')}"
             data-operation="\${p._operation}">
          <img src="/css/images-caney/\${p.folder}/\${img}" alt="\${p.title}" class="property-image">
          <div class="property-info">
            <h2>\${p.title}</h2>
            <p>Ubicación: \${p.location || ""}</p>
            \${p.price ? \`<p>Precio: \${p.price}</p>\` : ""}
            \${p.size  ? \`<p>Metraje: \${p.size}</p>\` : ""}
            \${p.sector? \`<p>Sector: \${p.sector}</p>\` : ""}
            \${typeLabel ? \`<p>Tipo: \${typeLabel}</p>\` : ""}
            <a href="\${p._href}" class="view-details" target="_blank" rel="noopener">Ver Detalles</a>
          </div>
        </div>\`;
    }

    function renderFiltered(pageIndex){
      const list = filterAll();
      const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
      const idx = Math.min(Math.max(0, pageIndex || 0), totalPages - 1);
      const start = idx * PER_PAGE;
      const slice = list.slice(start, start + PER_PAGE);

      results.innerHTML = slice.map(cardHTML).join("") || "<p>No hay propiedades por ahora.</p>";
      emptyMsg.style.display = slice.length ? 'none' : '';

      // Pager keeping filters in the URL (?min&max&sector&type&p)
      const makeQs = (n) => qsFromInputs(n);
      let html = '';
      if (idx > 0) html += \`<a href="\${baseHref(0)}?\${makeQs(idx-1)}" class="view-details" style="margin-right:8px;">← Anterior</a>\`;
      if (idx + 1 < totalPages) html += \`<a href="\${baseHref(0)}?\${makeQs(idx+1)}" class="view-details">Ver más</a>\`;
      pagerEl.innerHTML = html;
    }

    // Apply / Clear
    document.getElementById('applyFilters').addEventListener('click', () => {
      const qs = qsFromInputs(0);
      history.replaceState(null, "", "?" + qs);
      renderFiltered(0);
    });

    document.getElementById('clearFilters').addEventListener('click', () => {
      minI.value = ""; maxI.value = ""; sectorSel.value = ""; typeSel.value = "";
      history.replaceState(null, "", location.pathname);
      location.reload(); // back to server-rendered slice + static pager
    });

    function setOp(op, rerender){

      activeOp = op || '';

      document.querySelectorAll('.op-btn').forEach(b => {

        const on = b.dataset.op === activeOp;

        b.classList.toggle('is-active', on);

        b.setAttribute('aria-pressed', String(on));

      });

      if (rerender) {

        const qs = qsFromInputs(0);

        history.replaceState(null, "", qs ? ('?' + qs) : location.pathname);

        renderFiltered(0);

      }

    }


    // Clicking the active button clears it and shows everything again.

    document.querySelectorAll('.op-btn').forEach(b => {

      b.addEventListener('click', () => setOp(activeOp === b.dataset.op ? '' : b.dataset.op, true));

    });


    // If there are query params, render client-side across ALL
    const q = readQS();
    if (['min','max','sector','type','p','op'].some(k => q.has(k))) {
      const pIdx = parseInt(q.get('p') || '0', 10) || 0;
      renderFiltered(pIdx);
    }
  })();
</script>
`;
  }
};
