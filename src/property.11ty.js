const fs = require("fs");
const path = require("path");
const slugify = require("./_utils/slugify"); // keep this

// Load global site data (url, name, lang, logo)
const site = JSON.parse(
  fs.readFileSync(path.join(__dirname, "_data", "site.json"), "utf-8")
);

module.exports = class {
  data() {
    const p = path.join(__dirname, "_data", "properties.json");
    const props = JSON.parse(fs.readFileSync(p, "utf-8"));

    return {
      props,
      pagination: { data: "props", size: 1, alias: "p" },

      // ✅ Use slugs for the output file
      permalink: (data) => {
        const slug = `${slugify(data.p.title)}-${slugify(data.p.sector || data.p.area || "")}`;
        return `${slug}.html`;
      },

      eleventyExcludeFromCollections: true
    };
  }

  render({ p }) {
    // Gallery
    const base = `CSS/Images caney/${p.folder}/`;
    const first = (p.images && p.images[0]) || "";
    const thumbs = (p.images || [])
      .map(img => `<img src="${base}${img}" alt="img" onclick="swapImage(this.src)">`)
      .join("\n          ");

    // ✅ Build the same slug here for canonical/meta
    const pageSlug = `${slugify(p.title)}-${slugify(p.sector || p.area || "")}`;
    const permalink = `${pageSlug}.html`;

    // SEO vars
    const primaryImg = (p.images && p.images[0]) ? `CSS/Images caney/${p.folder}/${p.images[0]}` : site.logo;
    const canonical = new URL(permalink, site.url).toString();
    const imgAbs = new URL(primaryImg, site.url).toString();
    const desc = (p.description || `${p.type || ""} en ${p.location || ""} — ${p.size || ""} ${p.price || ""}`)
      .trim()
      .slice(0, 155);

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${p.title} | ${site.name}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${canonical}">
  <link rel="stylesheet" href="CSS/Detalles.css">

  <!-- Open Graph -->
  <meta property="og:type" content="product">
  <meta property="og:title" content="${p.title} — ${p.location || ""}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${imgAbs}">
  <link rel="alternate" hreflang="${site.lang}" href="${canonical}">

  <!-- JSON-LD: Product -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "${p.title}",
    "description": "${desc.replace(/"/g, '\\"')}",
    "image": ["${imgAbs}"],
    "sku": "${p.filename}",
    "brand": {"@type":"Brand","name":"Inmobiliaria Caney"},
    "category": "Real Estate",
    "url": "${canonical}",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "${(p.price || "").includes("RD$") ? "DOP" : "USD"}",
      "price": "${String(p.price || "").replace(/[^0-9.]/g, "")}",
      "availability": "https://schema.org/InStock",
      "url": "${canonical}"
    },
    "additionalProperty": [
      {"@type":"PropertyValue","name":"Área","value":"${p.area || ""}"},
      {"@type":"PropertyValue","name":"Sector","value":"${p.sector || ""}"},
      {"@type":"PropertyValue","name":"Tipo","value":"${Array.isArray(p.type) ? p.type.join(", ") : (p.type || "")}"},
      {"@type":"PropertyValue","name":"Metraje","value":"${p.size || ""}"},
      {"@type":"PropertyValue","name":"Habitaciones","value":"${p.bedrooms || ""}"},
      {"@type":"PropertyValue","name":"Baños","value":"${p.bathrooms || ""}"}
    ]
  }
  </script>

  <!-- JSON-LD: Breadcrumbs -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type":"ListItem","position":1,"name":"Inicio","item":"${new URL("Index.html", site.url).toString()}"},
      {"@type":"ListItem","position":2,"name":"${p.area || ""}","item":"${new URL(encodeURI("INMUEBLES " + (p.area || "")) + ".html", site.url).toString()}"},
      {"@type":"ListItem","position":3,"name":"${p.title}","item":"${canonical}"}
    ]
  }
  </script>
</head>

<body>
  <header>
    <nav>
      <a href="Index.html">
        <img src="CSS/Images caney/GENERAL/CANEYLOGO.png" alt="Caney Logo">
      </a>
    </nav>
  </header>

  <main>
    <div class="property-container">
      <div class="property-gallery">
        <img id="featuredImage" src="${base}${first}" alt="" class="featured-image">
        <div class="property-thumbnails">
          ${thumbs}
        </div>
      </div>

      <div class="property-details">
        <h1 class="property-title">${p.title || ""}</h1>
        ${p.location ? `<p class="property-location"><strong>Ubicación:</strong> ${p.location}</p>` : ""}
        ${p.price ? `<p class="property-price"><strong>Precio:</strong> ${p.price}</p>` : ""}
        ${p.rent ? `<p class="property-price"><strong>Alquiler:</strong> ${p.rent}</p>` : ""}
        ${p.size ? `<p class="property-size"><strong>Metraje:</strong> ${p.size}</p>` : ""}
        ${p.bedrooms ? `<p class="property-price"><strong>Habitaciones:</strong> ${p.bedrooms}</p>` : ""}
        ${p.bathrooms ? `<p class="property-price"><strong>Baños:</strong> ${p.bathrooms}</p>` : ""}
        <p class="property-description">${p.description || "Para más información o agendar una visita, contáctanos."}</p>
        <a href="https://daniell30.github.io/caney-contact-linktree/" class="contact-button">Contáctanos: 809-224-2769 / 829-380-2769</a>
      </div>
    </div>
  </main>

  <footer>
    <span>Inmobiliaria Caney 2025</span>
    <span><a href="Index.html" class="footerbutton" target="_blank" rel="noopener">Ver más propiedades</a></span>
  </footer>

  <script>
    function swapImage(s){ document.getElementById('featuredImage').src = s; }
  </script>
</body>
</html>`;
  }
};

