// src/sector.11ty.js — Phase 5 sector aggregate pages.
// One page per sector with real inventory: a comparison table of every Caney
// listing there plus ItemList schema referencing each listing's
// RealEstateListing @id, so one fetch answers a whole sector query.
// Market-context prose is deliberately NOT generated (see TODO-content.md).
const fs = require("fs");
const path = require("path");
const slugify = require("./_utils/slugify");
const { sectorPages } = require("./_utils/sectors");
const site = JSON.parse(fs.readFileSync(path.join(__dirname, "_data", "site.json"), "utf-8"));

const S = v => String(v ?? "");
const esc = v => S(v).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const listingSlug = p => `${slugify(S(p.title))}-${slugify(S(p.sector || p.area))}`;

module.exports = class {
  data() {
    const props = JSON.parse(
      fs.readFileSync(path.join(__dirname, "_data", "properties.json"), "utf-8"));
    return {
      pages: sectorPages(props),
      pagination: { data: "pages", size: 1, alias: "sp" },
      permalink: (data) => `${data.sp.slug}.html`,
      eleventyExcludeFromCollections: true
    };
  }

  render({ sp }) {
    const canonical = new URL(sp.slug, S(site.url)).toString();
    const items = sp.items;

    const rows = items.map((p) => {
      const href = `/${listingSlug(p)}`;
      const size = Array.isArray(p.size) ? p.size.map(S).join(" / ") : S(p.size);
      const type = Array.isArray(p.type) ? p.type.map(S).join(", ") : S(p.type);
      return `<tr>
                <th scope="row"><a href="${href}">${esc(p.title)}</a></th>
                <td>${esc(type)}</td>
                <td>${esc(p.price)}</td>
                <td>${esc(size)}</td>
                <td>${esc(p.bedrooms)}</td>
                <td>${esc(p.bathrooms)}</td>
              </tr>`;
    }).join("\n              ");

    const cards = items.map((p) => {
      const img = (p.images && p.images[0])
        ? `/css/images-caney/${S(p.folder)}/${S(p.images[0])}` : S(site.logo);
      return `<article class="property-item">
          <img src="${img}" alt="${esc(p.title)}" class="property-image" loading="lazy" decoding="async">
          <div class="property-info">
            <h3>${esc(p.title)}</h3>
            <p>Ubicación: ${esc(p.location)}</p>
            ${p.price ? `<p>Precio: ${esc(p.price)}</p>` : ""}
            ${p.size ? `<p>Metraje: ${esc(Array.isArray(p.size) ? p.size.join(" / ") : p.size)}</p>` : ""}
            <a href="/${listingSlug(p)}" class="view-details">Ver Detalles</a>
          </div>
        </article>`;
    }).join("\n        ");

    const desc = `${sp.label}${sp.opPart} en ${sp.sector}: ${items.length} `
      + `propiedades de Inmobiliaria Caney con precio, metraje, habitaciones y baños.`;

    const schema = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          "@id": `${canonical}#page`,
          "url": canonical,
          "name": sp.h1,
          "description": desc,
          "inLanguage": S(site.lang) || "es-DO",
          "isPartOf": { "@id": `${S(site.url)}/#website` },
          "about": { "@type": "Place", "name": sp.sector },
          "provider": { "@id": `${S(site.url)}/#organization` },
          "mainEntity": { "@id": `${canonical}#inventory` }
        },
        {
          "@type": "ItemList",
          "@id": `${canonical}#inventory`,
          "name": sp.h1,
          "numberOfItems": items.length,
          "itemListOrder": "https://schema.org/ItemListUnordered",
          "itemListElement": items.map((p, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "url": new URL(listingSlug(p), S(site.url)).toString(),
            "item": { "@id": `${new URL(listingSlug(p), S(site.url)).toString()}#listing` }
          }))
        }
      ]
    }, null, 2);

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
  <title>${esc(sp.h1)} | ${esc(site.name)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${canonical}">
  <link rel="stylesheet" href="/css/santodomingoinmuebles.css">

  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(sp.h1)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${new URL(S(site.logo), S(site.url)).toString()}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="alternate" hreflang="${S(site.lang)}" href="${canonical}">

  <script type="application/ld+json">
${schema}
  </script>
</head>
<body>
  <header><nav><a href="/"><img src="/css/images-caney/general/caneylogo.png" alt="Inmobiliaria Caney"></a></nav></header>

  <main>
    <h1>${esc(sp.h1)}</h1>
    <p class="sector-intro">${items.length} ${items.length === 1 ? "propiedad disponible" : "propiedades disponibles"} en ${esc(sp.sector)} con Inmobiliaria Caney.</p>

    <table class="spec-table sector-table">
      <caption>Comparación de ${esc(sp.label.toLowerCase())} en ${esc(sp.sector)}</caption>
      <thead>
        <tr><th scope="col">Propiedad</th><th scope="col">Tipo</th><th scope="col">Precio</th><th scope="col">Metros²</th><th scope="col">Habitaciones</th><th scope="col">Baños</th></tr>
      </thead>
      <tbody>
              ${rows}
      </tbody>
    </table>

    <!-- TODO (dueño): 400-600 palabras de contexto de mercado sobre ${esc(sp.sector)}
         — referencias locales, tipo de comprador, servicios cercanos, tendencia de
         precios. Ver TODO-content.md. No generar este texto automáticamente. -->

    <section class="property-listing">
        ${cards}
    </section>

    <p><a href="/contact/" class="contact-button">Contáctanos: 809-224-2769 / 829-380-2769</a></p>
  </main>

  <footer>
    <span>Inmobiliaria Caney ${new Date().getFullYear()}</span>
    <span><a href="/" class="footerbutton" rel="noopener">Ver más propiedades</a></span>
  </footer>
</body>
</html>`;
  }
};
