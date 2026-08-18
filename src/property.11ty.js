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
    const base = `/css/images-caney/${S(p.folder)}/`;
    const first = (p.images && p.images[0]) ? S(p.images[0]) : "";
    const imageSources = (p.images || []).map((img) => `${base}${S(img)}`);
    const preloadLinks = imageSources
      .slice(0, 1)
      .map((src) => `<link rel="preload" as="image" href="${src}" fetchpriority="high">`)
      .join("\n  ");
    // Real src on every thumbnail: most AI/search crawlers do not run JS,
    // so placeholder-src images are invisible to them. Native lazy loading
    // keeps the page light. (Descriptive per-photo alt text is tracked in
    // TODO-content.md — do not invent room descriptions here.)
    const thumbs = imageSources
      .map((src, index) => {
        return `<img src="${src}" data-full="${src}" alt="Vista ${index + 1} de ${S(p.title)}" class="thumbnail-image${index === 0 ? " is-active" : ""}" loading="lazy" decoding="async" fetchpriority="low" onclick="swapImage(this)">`;
      })
      .join("\n          ");

    const pageSlug = `${slugify(S(p.title))}-${slugify(S(p.sector || p.area))}`;
    const permalink = `${pageSlug}.html`;

    const primaryImg = (p.images && p.images[0]) ? `/css/images-caney/${S(p.folder)}/${S(p.images[0])}` : S(site.logo);
    const canonical  = new URL(pageSlug, S(site.url)).toString(); // extensionless canonical form
    const imgAbs     = new URL(primaryImg, S(site.url)).toString();

    const descRaw = S(p.description) || `${S(p.type)} en ${S(p.location)} — ${S(p.size)} ${S(p.price)}`;
    const desc    = descRaw.trim().slice(0, 155);

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
  <title>${S(p.title)} | ${S(site.name)}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${canonical}">
  <link rel="stylesheet" href="/css/detalles.css">
  ${preloadLinks}

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
  <header><nav><a href="/"><img src="/css/images-caney/general/caneylogo.png" alt="Caney Logo"></a></nav></header>

  <main>
    <div class="property-container">
      <div class="property-gallery">
        <div class="featured-image-shell">
          <img id="featuredImage" src="${base}${first}" alt="${S(p.title)}" class="featured-image" loading="eager" decoding="async" fetchpriority="high" data-current="${base}${first}">
        </div>
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
        <a href="/contact/" class="contact-button">Contáctanos: 809-224-2769 / 829-380-2769</a>
      </div>
    </div>
  </main>

  <footer>
    <span>Inmobiliaria Caney ${new Date().getFullYear()}</span>
    <span><a href="/" class="footerbutton" rel="noopener">Ver más propiedades</a></span>
  </footer>

  <script>
    const gallerySources = ${JSON.stringify(imageSources)};

    function preloadImage(src, priority) {
      if (!src) return Promise.resolve();

      const image = new Image();
      image.decoding = 'async';
      if (priority) image.fetchPriority = priority;
      image.src = src;

      if (typeof image.decode === 'function') {
        return image.decode().catch(() => {});
      }

      return new Promise((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
    }

    function markActiveThumbnail(src) {
      const thumbs = document.querySelectorAll('.thumbnail-image');
      thumbs.forEach((thumb) => {
        thumb.classList.toggle('is-active', thumb.dataset.full === src);
      });
    }

    function swapImage(target) {
      const featured = document.getElementById('featuredImage');
      const gallery = document.querySelector('.property-gallery');
      const src = typeof target === 'string' ? target : target?.dataset?.full || target?.src;

      if (!featured || !src || featured.dataset.current === src) return;

      gallery && gallery.classList.add('is-loading');

      preloadImage(src, 'high').then(() => {
        featured.src = src;
        featured.dataset.current = src;
        markActiveThumbnail(src);
        gallery && gallery.classList.remove('is-loading');
      });
    }

    document.addEventListener('DOMContentLoaded', () => {
      // Thumbnails carry real src now (native lazy loading); just warm the
      // first couple of full-size candidates for instant swaps.
      gallerySources.slice(1, 3).forEach((src) => preloadImage(src, 'low'));
    });
  </script>
</body>
</html>`;
  }
};






