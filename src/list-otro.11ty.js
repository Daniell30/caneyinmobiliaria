const fs = require("fs");
const path = require("path");
const slugify = require("./_utils/slugify");

const PER_PAGE = 20;

module.exports = class {
  data() {
    const p = path.join(__dirname, "_data", "properties.json");
    const props = JSON.parse(fs.readFileSync(p, "utf-8"));

    // Área: OTRO
    const all = props.filter(x => String(x.area || "").toLowerCase() === "otro");

    // Facetas desde todo el set
    const sectors = [...new Set(all.map(p => (p.sector || "").trim()).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b,"es"));
    const types = [...new Set(
      all.flatMap(p => Array.isArray(p.type) ? p.type : (p.type ? [p.type] : []))
         .map(t => t.trim())
         .filter(Boolean)
    )].sort((a,b)=>a.localeCompare(b,"es"));

    return {
      all, sectors, types,
      pagination: { data: "all", size: PER_PAGE, alias: "pageItems" },
      permalink: (data) => {
        const n = data.pagination.pageNumber;
        return n === 0 ? "INMUEBLES OTRO.html"
                       : `INMUEBLES OTRO-${n + 1}.html`;
      }
    };
  }

  render(data) {
    const { pageItems, all, pagination, sectors, types } = data;

    const priceNum = s => Number(String(s || "").replace(/[^\d.]/g, "") || 0);

    // SSR cards (SEO / no-JS)
    const cards = pageItems.map(p => {
      const img = (p.images && p.images[0]) || "";
      const sector = p.sector || "";
      const typeLabel = Array.isArray(p.type) ? p.type.join(", ") : (p.type || "");
      const typeData = (Array.isArray(p.type) ? p.type : [p.type || ""])
        .map(t => String(t).toLowerCase()).filter(Boolean).join("|");
      const href = `${slugify(p.title)}-${slugify(p.sector || p.area || "")}.html`;

      return `
        <div class="property-item"
             data-price="${priceNum(p.price)}"
             data-sector="${String(sector).toLowerCase()}"
             data-type="${typeData}">
          <img src="CSS/Images caney/${p.folder}/${img}" alt="${p.title}" class="property-image">
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

    const pageHref = (n) => (n === 0 ? "INMUEBLES OTRO.html" : `INMUEBLES OTRO-${n + 1}.html`);
    // ✅ Paginación calculada desde todo el set
    const totalPages = Math.ceil(all.length / PER_PAGE);
    const prev = pagination.pageNumber > 0 ? pageHref(pagination.pageNumber - 1) : null;
    const next = (pagination.pageNumber + 1) < totalPages ? pageHref(pagination.pageNumber + 1) : null;

    // Dataset completo para filtrar/paginar en cliente
    const ALL_FOR_CLIENT = all.map(p => ({
      ...p,
      _href: `${slugify(p.title)}-${slugify(p.sector || p.area || "")}.html`,
      _priceNum: priceNum(p.price),
      _sectorLower: String(p.sector || "").toLowerCase(),
      _typeListLower: (Array.isArray(p.type) ? p.type : (p.type ? [p.type] : []))
        .map(t => String(t).toLowerCase()).filter(Boolean)
    }));

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inmobiliaria Caney</title>
  <link href="CSS/SantoDomingoinmuebles.css" rel="stylesheet">
  <style>
    .toolbar { max-width:1200px; margin:0 auto; padding:0 20px 10px; display:flex; justify-content:flex-start; }
    .filter-toggle { background:#e7ccab; border:none; padding:10px 14px; border-radius:6px; cursor:pointer; font-family:'Poppins Bold',sans-serif; }
    .filters { max-width: 1200px; margin: 0 auto; padding: 0 20px 10px;
               display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 10px; align-items: end; }
    .filters label { font-family: Poppins, sans-serif; font-weight: 700; display:block; margin-bottom:4px; }
    .filters select, .filters input[type="number"] { width:100%; padding:8px; border:1px solid #ddd; border-radius:6px; }
    .filters .btns { display:flex; gap:8px; }
    .filters button { background:#e7ccab; border:none; padding:10px 14px; border-radius:6px; cursor:pointer; font-family:'Poppins Bold',sans-serif; }
    .pager { text-align:center; margin: 30px 0; }
    .empty-msg { text-align:center; margin:20px 0; font-family:Poppins,sans-serif; }
  </style>
</head>
<body>
  <header><nav><a href="Index.html"><img src="CSS/Images caney/GENERAL/CANEYLOGO.png" alt="CaneyLogo"></a></nav></header>

  <h1>OTRO</h1>

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

  <!-- Paginador estático (sin filtros) -->
  <div class="pager" id="pager">
    ${prev ? `<a href="${prev}" class="view-details" style="margin-right:8px;">← Anterior</a>` : ""}
    ${next ? `<a href="${next}" class="view-details">Ver más</a>` : ""}
  </div>

  <!-- Dataset completo para filtrar/paginar en cliente -->
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
      const typeSel   = $('#typeFilter');

      const ALL = JSON.parse(document.getElementById('ALL_DATA').textContent);

      const lower = s => String(s||'').toLowerCase();
      const baseHref = n => (n === 0 ? "INMUEBLES OTRO.html" : \`INMUEBLES OTRO-\${n + 1}.html\`);

      function qsFromInputs(pageIndex){
        const qs = new URLSearchParams();
        if (minI.value) qs.set('min', minI.value);
        if (maxI.value) qs.set('max', maxI.value);
        if (sectorSel.value) qs.set('sector', sectorSel.value);
        if (typeSel.value) qs.set('type', typeSel.value);
        qs.set('p', String(pageIndex || 0));
        return qs.toString();
      }

      function readQS(){
        const q = new URLSearchParams(location.search);
        if (q.has('min')) minI.value = q.get('min');
        if (q.has('max')) maxI.value = q.get('max');
        if (q.has('sector')) sectorSel.value = q.get('sector');
        if (q.has('type')) typeSel.value = q.get('type');
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
          return okPrice && okSector && okType;
        });
      }

      function cardHTML(p){
        const img = (p.images && p.images[0]) || "";
        const typeLabel = Array.isArray(p.type) ? p.type.join(", ") : (p.type || "");
        return \`
          <div class="property-item"
               data-price="\${p._priceNum}"
               data-sector="\${lower(p.sector)}"
               data-type="\${p._typeListLower.join('|')}">
            <img src="CSS/Images caney/\${p.folder}/\${img}" alt="\${p.title}" class="property-image">
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

        // Pager conservando filtros en la URL (?min&max&sector&type&p)
        const makeQs = n => qsFromInputs(n);
        let html = '';
        if (idx > 0) html += \`<a href="\${baseHref(0)}?\${makeQs(idx-1)}" class="view-details" style="margin-right:8px;">← Anterior</a>\`;
        if (idx + 1 < totalPages) html += \`<a href="\${baseHref(0)}?\${makeQs(idx+1)}" class="view-details">Ver más</a>\`;
        pagerEl.innerHTML = html;
      }

      // Aplicar / Limpiar
      document.getElementById('applyFilters').addEventListener('click', () => {
        const qs = qsFromInputs(0);
        history.replaceState(null, "", "?" + qs);
        renderFiltered(0);
      });

      document.getElementById('clearFilters').addEventListener('click', () => {
        minI.value = ""; maxI.value = ""; sectorSel.value = ""; typeSel.value = "";
        history.replaceState(null, "", location.pathname);
        location.reload(); // volver al SSR con paginación estática
      });

      // Si hay query params, render en cliente sobre TODO el set
      const q = readQS();
      if (['min','max','sector','type','p'].some(k => q.has(k))) {
        const pIdx = parseInt(q.get('p') || '0', 10) || 0;
        renderFiltered(pIdx);
      }
    })();
  </script>
</body>
</html>`;
  }
};
