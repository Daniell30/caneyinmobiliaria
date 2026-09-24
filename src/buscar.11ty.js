// src/buscar.11ty.js — página de resultados del buscador.
// Renderiza TODO el catálogo en el servidor y el JS solo oculta lo que no
// coincide con ?sector=&tipo=&op=. Así sin JavaScript se sigue viendo el
// catálogo completo en vez de una página vacía.
const fs = require("fs");
const path = require("path");
const slugify = require("./_utils/slugify");
const { operationOf } = require("./_utils/sectors");
const { searchSection, esc } = require("./_utils/search");
const site = JSON.parse(fs.readFileSync(path.join(__dirname, "_data", "site.json"), "utf-8"));

const S = v => String(v ?? "");
const norm = v => S(v).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

module.exports = class {
  data() {
    const props = JSON.parse(
      fs.readFileSync(path.join(__dirname, "_data", "properties.json"), "utf-8"));
    return {
      props,
      permalink: "buscar/index.html",
      eleventyExcludeFromCollections: true
    };
  }

  render({ props }) {
    const sectors = [...new Set(props.map(p => S(p.sector).trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "es"));
    const types = [...new Set(
      props.flatMap(p => (Array.isArray(p.type) ? p.type : [p.type]))
           .map(t => S(t).trim()).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "es"));

    const cards = props.map((p) => {
      const img = (p.images && p.images[0])
        ? `/css/images-caney/${S(p.folder)}/${S(p.images[0])}` : S(site.logo);
      const tipos = (Array.isArray(p.type) ? p.type : [p.type]).map(t => norm(t)).filter(Boolean);
      const tipoLabel = Array.isArray(p.type) ? p.type.join(", ") : S(p.type);
      const size = Array.isArray(p.size) ? p.size.join(" / ") : S(p.size);
      return `
        <article class="property-item"
                 data-sector="${esc(norm(p.sector))}"
                 data-tipo="${esc(tipos.join("|"))}"
                 data-operation="${esc(operationOf(p))}"
                 data-area="${esc(norm(p.area))}">
          <img src="${img}" alt="${esc(p.title)}" class="property-image" loading="lazy" decoding="async">
          <div class="property-info">
            <h2>${esc(p.title)}</h2>
            <p>Ubicación: ${esc(p.location)}</p>
            ${p.price ? `<p>Precio: ${esc(p.price)}</p>` : ""}
            ${size ? `<p>Metraje: ${esc(size)}</p>` : ""}
            ${p.sector ? `<p>Sector: ${esc(p.sector)}</p>` : ""}
            ${tipoLabel ? `<p>Tipo: ${esc(tipoLabel)}</p>` : ""}
            <a href="/${slugify(S(p.title))}-${slugify(S(p.sector || p.area))}" class="view-details">Ver Detalles</a>
          </div>
        </article>`;
    }).join("\n");

    return `<!DOCTYPE html>
<html lang="es">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-17897616535"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'AW-17897616535');
</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Buscar propiedades | ${esc(site.name)}</title>
  <meta name="description" content="Busca propiedades de Inmobiliaria Caney por sector, tipo y operación en Santo Domingo, Punta Cana, Juan Dolio y más.">
  <!-- Página de resultados: no debe indexarse, pero sí seguirse. -->
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="${S(site.url)}/buscar/">
  <link rel="stylesheet" href="/css/caneyvisual.css">
  <link rel="stylesheet" href="/css/santodomingoinmuebles.css">
</head>
<body>
  <header><nav><a href="/"><img src="/css/images-caney/general/caneylogo.png" alt="Inmobiliaria Caney"></a></nav></header>

  <main>
    ${searchSection(sectors, types)}

    <h1 id="resultadosTitulo">Resultados de búsqueda</h1>
    <p class="sector-intro" id="resultadosResumen"></p>

    <div class="property-listing" id="resultados">
      ${cards}
    </div>

    <div class="empty-msg" id="sinResultados" hidden>
      No encontramos propiedades con esos criterios.
      <a href="/buscar/">Ver todo el catálogo</a>.
    </div>
  </main>

  <footer>
    <span>Inmobiliaria Caney ${new Date().getFullYear()}</span>
    <span><a href="/" class="footerbutton" rel="noopener">Ver más propiedades</a></span>
  </footer>

  <script>
(() => {
  const norm = (v) => String(v || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
  const params = new URLSearchParams(location.search);
  const sector = norm(params.get('sector'));
  const tipo   = norm(params.get('tipo'));
  const op     = String(params.get('op') || '').toLowerCase();

  const cards = Array.from(document.querySelectorAll('#resultados .property-item'));
  let visibles = 0;

  cards.forEach((c) => {
    const okSector = !sector || c.dataset.sector.indexOf(sector) !== -1;
    const okTipo   = !tipo   || c.dataset.tipo.split('|').indexOf(tipo) !== -1;
    const okOp     = !op     || c.dataset.operation === op;
    const visible  = okSector && okTipo && okOp;
    c.hidden = !visible;
    if (visible) visibles += 1;
  });

  // Titular en español natural: "Apartamentos en venta en Bella Vista".
  const PLURAL = {
    'Apartamento': 'Apartamentos', 'Casa': 'Casas', 'Villa': 'Villas',
    'Penthouse': 'Penthouses', 'Solar': 'Solares',
    'Hotel Boutique': 'Hoteles boutique',
    'Proyecto Residencial': 'Proyectos residenciales'
  };
  const tipoRaw = params.get('tipo') || '';
  const sectorRaw = params.get('sector') || '';
  let encabezado = tipoRaw ? (PLURAL[tipoRaw] || tipoRaw) : 'Propiedades';
  if (op === 'venta') encabezado += ' en venta';
  else if (op === 'alquiler') encabezado += ' en alquiler';
  if (sectorRaw) encabezado += ' en ' + sectorRaw;
  if (!tipoRaw && !sectorRaw && !op) encabezado = 'Todas las propiedades';

  const titulo = document.getElementById('resultadosTitulo');
  const resumen = document.getElementById('resultadosResumen');
  if (titulo) {
    titulo.textContent = encabezado;
    document.title = encabezado + ' | Inmobiliaria Caney';
  }
  if (resumen) {
    resumen.textContent = visibles === 1
      ? '1 propiedad encontrada'
      : visibles + ' propiedades encontradas';
  }
  const vacio = document.getElementById('sinResultados');
  if (vacio) vacio.hidden = visibles !== 0;
})();
  </script>
</body>
</html>`;
  }
};
