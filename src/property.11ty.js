// src/property.11ty.js
const fs = require("fs");
const path = require("path");
const slugify = require("./_utils/slugify");
const site = JSON.parse(fs.readFileSync(path.join(__dirname, "_data", "site.json"), "utf-8"));

const S = v => String(v ?? ""); // <- safe string

module.exports = class {
  data() {
    const p = path.join(__dirname, "_data", "properties.json");
    const props = JSON.parse(fs.readFileSync(p, "utf-8"));
    return {
      props,
      pagination: { data: "props", size: 1, alias: "p" },
      permalink: (data) => {
        const slug = `${slugify(S(data.p.title))}-${slugify(S(data.p.sector || data.p.area))}`;
        return `${slug}.html`;
      },
      eleventyExcludeFromCollections: true
    };
  }

  render({ p }) {
    const base = `/CSS/Images caney/${S(p.folder)}/`;
    const first = (p.images && p.images[0]) ? S(p.images[0]) : "";
    const thumbs = (p.images || []).map(img => `<img src="${base}${S(img)}" alt="img" onclick="swapImage(this.src)">`).join("\n          ");

    const pageSlug = `${slugify(S(p.title))}-${slugify(S(p.sector || p.area))}`;
    const permalink = `${pageSlug}.html`;

    const primaryImg = (p.images && p.images[0]) ? `/CSS/Images caney/${S(p.folder)}/${S(p.images[0])}` : S(site.logo);
    const canonical  = new URL(permalink, S(site.url)).toString();
    const imgAbs     = new URL(primaryImg, S(site.url)).toString();

    const descRaw = S(p.description) || `${S(p.type)} en ${S(p.location)} — ${S(p.size)} ${S(p.price)}`;
    const desc    = descRaw.trim().slice(0, 155);

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${S(p.title)} | ${S(site.name)}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${canonical}">
  <link rel="stylesheet" href="/CSS/Detalles.css">

  <meta property="og:type" content="product">
  <meta property="og:title" content="${S(p.title)} — ${S(p.location)}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${imgAbs}">
  <link rel="alternate" hreflang="${S(site.lang)}" href="${canonical}">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "${S(p.title)}",
    "description": "${desc.replace(/"/g, '\\"')}",
    "image": ["${imgAbs}"],
    "sku": "${S(p.filename)}",
    "brand": {"@type":"Brand","name":"Inmobiliaria Caney"},
    "category": "Real Estate",
    "url": "${canonical}",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "${S(p.price).includes("RD$") ? "DOP" : "USD"}",
      "price": "${S(p.price).replace(/[^0-9.]/g, "")}",
      "availability": "https://schema.org/InStock",
      "url": "${canonical}"
    },
    "additionalProperty": [
      {"@type":"PropertyValue","name":"Área","value":"${S(p.area)}"},
      {"@type":"PropertyValue","name":"Sector","value":"${S(p.sector)}"},
      {"@type":"PropertyValue","name":"Tipo","value":"${Array.isArray(p.type) ? p.type.map(S).join(", ") : S(p.type)}"},
      {"@type":"PropertyValue","name":"Metraje","value":"${S(p.size)}"},
      {"@type":"PropertyValue","name":"Habitaciones","value":"${S(p.bedrooms)}"},
      {"@type":"PropertyValue","name":"Baños","value":"${S(p.bathrooms)}"}
    ]
  }
  </script>
</head>
<body>
  <header><nav><a href="/"><img src="/CSS/Images caney/GENERAL/CANEYLOGO.png" alt="Caney Logo"></a></nav></header>

  <main>
    <div class="property-container">
      <div class="property-gallery">
        <img id="featuredImage" src="${base}${first}" alt="" class="featured-image">
        <div class="property-thumbnails">
          ${thumbs}
        </div>
      </div>

      <div class="property-details">
        <h1 class="property-title">${S(p.title)}</h1>
        ${p.location ? `<p class="property-location"><strong>Ubicación:</strong> ${S(p.location)}</p>` : ""}
        ${p.price ? `<p class="property-price"><strong>Precio:</strong> ${S(p.price)}</p>` : ""}
        ${p.rent ? `<p class="property-price"><strong>Alquiler:</strong> ${S(p.rent)}</p>` : ""}
        ${p.size ? `<p class="property-size"><strong>Metraje:</strong> ${S(p.size)}</p>` : ""}
        ${p.bedrooms ? `<p class="property-price"><strong>Habitaciones:</strong> ${S(p.bedrooms)}</p>` : ""}
        ${p.bathrooms ? `<p class="property-price"><strong>Baños:</strong> ${S(p.bathrooms)}</p>` : ""}
        <p class="property-description">${S(p.description) || "Para más información o agendar una visita, contáctanos."}</p>
        <a href="https://daniell30.github.io/caney-contact-linktree/" class="contact-button">Contáctanos: 809-224-2769 / 829-380-2769</a>
      </div>
    </div>
  </main>

  <footer>
    <span>Inmobiliaria Caney 2025</span>
    <span><a href="/" class="footerbutton" rel="noopener">Ver más propiedades</a></span>
  </footer>

  <script>function swapImage(s){ document.getElementById('featuredImage').src = s; }</script>
</body>
</html>`;
  }
};
