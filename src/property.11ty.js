// src/property.11ty.js
const fs = require("fs");
const path = require("path");
const slugify = require("./_utils/slugify");
const site = JSON.parse(fs.readFileSync(path.join(__dirname, "_data", "site.json"), "utf-8"));

const S = v => String(v ?? ""); // <- safe string
const THUMB_PLACEHOLDER = (label) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <rect width="80" height="80" rx="10" fill="#f5efe8"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#7f6558" font-family="Arial, sans-serif" font-size="20">${label}</text>
    </svg>`
  )}`;

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
    const imageSources = (p.images || []).map((img) => `${base}${S(img)}`);
    const preloadLinks = imageSources
      .slice(0, 1)
      .map((src) => `<link rel="preload" as="image" href="${src}" fetchpriority="high">`)
      .join("\n  ");
    const thumbs = imageSources
      .map((src, index) => {
        const placeholder = index === 0 ? src : THUMB_PLACEHOLDER(index + 1);
        return `<img src="${placeholder}" data-full="${src}" data-thumb="${src}" alt="Vista ${index + 1} de ${S(p.title)}" class="thumbnail-image${index === 0 ? " is-active" : " is-placeholder"}" loading="lazy" decoding="async" fetchpriority="low" onclick="swapImage(this)">`;
      })
      .join("\n          ");

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
  <link rel="stylesheet" href="/CSS/Detalles.css">
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
  <header><nav><a href="/"><img src="/CSS/Images caney/GENERAL/CANEYLOGO.png" alt="Caney Logo"></a></nav></header>

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
        <a href="contact.html" class="contact-button">Contáctanos: 809-224-2769 / 829-380-2769</a>
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

    function hydrateThumbnail(thumb) {
      if (!thumb || thumb.dataset.loaded === 'true') return;
      const thumbSrc = thumb.dataset.thumb;
      if (!thumbSrc) return;

      preloadImage(thumbSrc, 'low').then(() => {
        thumb.src = thumbSrc;
        thumb.dataset.loaded = 'true';
        thumb.classList.remove('is-placeholder');
      });
    }

    function hydrateThumbnailsSequentially() {
      const thumbs = Array.from(document.querySelectorAll('.thumbnail-image'));
      let index = 1;

      function next() {
        if (index >= thumbs.length) return;
        hydrateThumbnail(thumbs[index]);
        index += 1;
        window.setTimeout(next, 180);
      }

      next();
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
      const thumbs = Array.from(document.querySelectorAll('.thumbnail-image'));
      if (thumbs[0]) {
        thumbs[0].dataset.loaded = 'true';
        thumbs[0].classList.remove('is-placeholder');
      }

      thumbs.forEach((thumb) => {
        thumb.addEventListener('mouseenter', () => hydrateThumbnail(thumb), { passive: true });
        thumb.addEventListener('focus', () => hydrateThumbnail(thumb), { passive: true });
      });

      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => hydrateThumbnailsSequentially(), { timeout: 1200 });
      } else {
        window.setTimeout(hydrateThumbnailsSequentially, 700);
      }

      gallerySources.slice(1, 3).forEach((src) => preloadImage(src, 'low'));
    });
  </script>
</body>
</html>`;
  }
};






