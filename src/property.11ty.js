// src/property.11ty.js
const fs = require("fs");
const path = require("path");
const slugify = require("./_utils/slugify");

// Global site data (url, name, lang, logo)
const site = JSON.parse(
  fs.readFileSync(path.join(__dirname, "_data", "site.json"), "utf-8")
);

module.exports = class {
  data() {
    const p = path.join(__dirname, "_data", "properties.json");
    const props = JSON.parse(fs.readFileSync(p, "utf-8"));

    return {
      // ✅ Use our base layout (injects SEO tags, header/footer, etc.)
      layout: "layouts/base.njk",

      // We render one page per property
      props,
      pagination: { data: "props", size: 1, alias: "p" },

      // ✅ Pretty/SEO slug per property
      permalink: (data) => {
        const slug = `${slugify(data.p.title)}-${slugify(data.p.sector || data.p.area || "")}`;
        return `${slug}.html`;
      },

      // ✅ Page-level CSS for details view (layout will include it if present)
      pageCss: "CSS/Detalles.css",

      eleventyExcludeFromCollections: true,

      // ✅ Compute SEO fields *after* pagination gives us `p`
      eleventyComputed: {
        pageTitle: (data) => `${data.p.title} | ${site.name}`,
        pageDesc: (data) => {
          const p = data.p || {};
          const fallback = `${p.type || ""} en ${p.location || ""} — ${p.size || ""} ${p.price || ""}`.trim();
          return String(p.description || fallback).replace(/\s+/g, " ").slice(0, 155);
        },
        pageImage: (data) => {
          const p = data.p || {};
          const rel = (p.images && p.images[0])
            ? `CSS/Images caney/${p.folder}/${p.images[0]}`
            : site.logo;
          return new URL(rel, site.url).toString(); // absolute for OG/Twitter
        },
        canonicalUrl: (data) => {
          const slug = `${slugify(data.p.title)}-${slugify(data.p.sector || data.p.area || "")}.html`;
          return new URL(slug, site.url).toString();
        },

        // 🧠 Put JSON-LD into <head> via `extraHead` (your base.njk should print it with {{ extraHead | safe }})
        extraHead: (data) => {
          const p = data.p || {};
          const canonical = new URL(
            `${slugify(p.title)}-${slugify(p.sector || p.area || "")}.html`,
            site.url
          ).toString();

          // Images (absolute)
          const images = Array.isArray(p.images) ? p.images : [];
          const absImages = images.map(img =>
            new URL(`CSS/Images caney/${p.folder}/${img}`, site.url).toString()
          );
          const primaryImgAbs = absImages[0] || new URL(site.logo, site.url).toString();

          // Description (escaped for JSON)
          const desc = (String(p.description || `${p.type || ""} en ${p.location || ""} — ${p.size || ""} ${p.price || ""}`)
            .replace(/\s+/g, " ")
            .slice(0, 300) || "").replace(/"/g, '\\"');

          // Currency/price parsing
          const priceCurrency = (String(p.price || "").includes("RD$")) ? "DOP" : "USD";
          const priceNumeric = String(p.price || "").replace(/[^0-9.]/g, "");

          const productLD = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": p.title || "",
            "description": desc,
            "image": absImages.length ? absImages : [primaryImgAbs],
            "sku": p.filename || "",
            "brand": { "@type": "Brand", "name": "Inmobiliaria Caney" },
            "category": "Real Estate",
            "url": canonical,
            "offers": {
              "@type": "Offer",
              "priceCurrency": priceCurrency,
              "price": priceNumeric || undefined,
              "availability": "https://schema.org/InStock",
              "url": canonical
            },
            "additionalProperty": [
              { "@type": "PropertyValue", "name": "Área", "value": p.area || "" },
              { "@type": "PropertyValue", "name": "Sector", "value": p.sector || "" },
              { "@type": "PropertyValue", "name": "Tipo", "value": Array.isArray(p.type) ? p.type.join(", ") : (p.type || "") },
              { "@type": "PropertyValue", "name": "Metraje", "value": p.size || "" },
              { "@type": "PropertyValue", "name": "Habitaciones", "value": p.bedrooms || "" },
              { "@type": "PropertyValue", "name": "Baños", "value": p.bathrooms || "" }
            ]
          };

          const crumbsLD = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Inicio",
                "item": new URL("Index.html", site.url).toString()
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": p.area || "",
                "item": new URL(encodeURI(`INMUEBLES ${p.area || ""}.html`), site.url).toString()
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": p.title || "",
                "item": canonical
              }
            ]
          };

          return `
<link rel="canonical" href="${canonical}">
<script type="application/ld+json">${JSON.stringify(productLD)}</script>
<script type="application/ld+json">${JSON.stringify(crumbsLD)}</script>`;
        }
      }
    };
  }

  render({ p }) {
    // Image paths
    const base = `CSS/Images caney/${p.folder}/`;
    const first = (p.images && p.images[0]) ? `${base}${p.images[0]}` : (site.logo || "");
    const thumbs = (p.images || [])
      .map(img => `<img src="${base}${img}" alt="${p.title || "Imagen de la propiedad"}" onclick="swapImage(this.src)">`)
      .join("\n          ");

    // ⬇️ Return ONLY the body content (layout handles <html>, <head>, header/footer, SEO tags)
    return `
<main>
  <div class="property-container">
    <div class="property-gallery">
      <img id="featuredImage" src="${first}" alt="${p.title || ""}" class="featured-image">
      <div class="property-thumbnails">
        ${thumbs}
      </div>
    </div>

    <div class="property-details">
      <h1 class="property-title">${p.title || ""}</h1>
      ${p.location  ? `<p class="property-location"><strong>Ubicación:</strong> ${p.location}</p>` : ""}
      ${p.price     ? `<p class="property-price"><strong>Precio:</strong> ${p.price}</p>` : ""}
      ${p.rent      ? `<p class="property-price"><strong>Alquiler:</strong> ${p.rent}</p>` : ""}
      ${p.size      ? `<p class="property-size"><strong>Metraje:</strong> ${p.size}</p>` : ""}
      ${p.bedrooms  ? `<p class="property-price"><strong>Habitaciones:</strong> ${p.bedrooms}</p>` : ""}
      ${p.bathrooms ? `<p class="property-price"><strong>Baños:</strong> ${p.bathrooms}</p>` : ""}

      <p class="property-description">
        ${p.description || "Para más información o agendar una visita, contáctanos."}
      </p>

      <a href="https://daniell30.github.io/caney-contact-linktree/" class="contact-button" target="_blank" rel="noopener">
        Contáctanos: 809-224-2769 / 829-380-2769
      </a>
    </div>
  </div>
</main>

<script>
  function swapImage(src){ document.getElementById('featuredImage').src = src; }
</script>
`;
  }
};
