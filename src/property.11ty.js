// src/property.11ty.js
const fs = require("fs");
const path = require("path");
const slugify = require("./_utils/slugify");
const { sectorPageFor } = require("./_utils/sectors");
const site = JSON.parse(fs.readFileSync(path.join(__dirname, "_data", "site.json"), "utf-8"));
const listingDates = JSON.parse(fs.readFileSync(path.join(__dirname, "_data", "listing_dates.json"), "utf-8"));

const S = v => String(v ?? ""); // <- safe string
const allProps = JSON.parse(fs.readFileSync(path.join(__dirname, "_data", "properties.json"), "utf-8"));

// ---------- schema.org helpers (Phase 3 migration) ----------
// Parse, never invent: every helper returns null when the source string is
// ambiguous (ranges like "1, 2 y 3", marketing text, empty fields), and the
// schema then simply omits that property.

const TYPE_MAP = {
  "apartamento": "Apartment",
  "penthouse": "Apartment",
  "casa": "House",
  "villa": "House",
  "solar": "Place",           // no LandLot type in schema.org; Place + description
  "proyecto residencial": "ApartmentComplex",
  "hotel boutique": "Hotel"
};

function schemaTypeFor(type) {
  const raw = S(Array.isArray(type) ? type[0] : type).trim().toLowerCase();
  return TYPE_MAP[raw] || "Residence";
}

// Leading integer, rejected when it starts an enumeration ("1, 2 y 3").
function parseCount(str) {
  const s = S(str).trim();
  const m = s.match(/^(\d+)/);
  if (!m) return null;
  const rest = s.slice(m[1].length).replace(/^\s+/, "");
  if (/^([,y]|y\s)/i.test(rest)) return null; // range/list, not a single value
  return parseInt(m[1], 10);
}

// "2.5 baños", "4 baños + 2 medios baños", "1 baño + 1/2 baño" ->
// { full, partial } — or null when unparseable.
function parseBathrooms(str) {
  const s = S(str).trim();
  const m = s.match(/^(\d+(?:\.5)?)/);
  if (!m) return null;
  const rest = s.slice(m[1].length).replace(/^\s+/, "");
  if (/^([,y]|y\s)/i.test(rest)) return null;
  const v = parseFloat(m[1]);
  let full = Math.floor(v);
  let partial = v % 1 ? 1 : 0;
  const extra = s.match(/\+\s*(?:(\d+)\s*medios?\s*baños?|1\/2\s*baño)/i);
  if (extra) partial += extra[1] ? parseInt(extra[1], 10) : 1;
  return { full, partial };
}

// Square meters of CONSTRUCTION: prefer the figure marked "de construcción";
// otherwise take the first figure unless it is explicitly lot area
// ("de solar"/"de terreno") — lot size is not a building's floorSize.
// Arrays (multi-typology projects) are ambiguous -> null.
function parseSqm(size) {
  if (Array.isArray(size)) return null;
  const s = S(size);
  const built = s.match(/([\d.,]+)\s*(?:m²|m2)\s*de\s*construcci/i);
  const m = built || s.match(/([\d.,]+)\s*(?:m²|m2|metros)(?!\s*de\s*(?:solar|terreno))/i);
  if (!m) return null;
  const v = parseFloat(m[1].replace(/,/g, ""));
  return Number.isFinite(v) && v > 0 ? v : null;
}

// First numeric token of the price string ("US$1,300,000 (venta) | US$7,500
// (renta)" must not concatenate to 13000007500). "1.3 MILLONES" -> 1300000.
function parsePrice(priceStr) {
  const s = S(priceStr);
  const m = s.match(/\d[\d.,]*/);
  if (!m) return null;
  let v = parseFloat(m[0].replace(/,/g, ""));
  if (!Number.isFinite(v)) return null;
  if (/millones|millón|millon/i.test(s) && v < 100) v = Math.round(v * 1e6);
  return v;
}

const isPerSquareMeter = s => /(por|x\s*cada|\/)\s*(cada\s*)?m/i.test(S(s));
const isLease = s => !/venta/i.test(S(s)) && /alquiler|renta/i.test(S(s));

// Province from the free-text location; only unambiguous markers.
function parseRegion(loc) {
  const s = S(loc);
  if (/Distrito Nacional/i.test(s)) return "Distrito Nacional";
  if (/Santo Domingo\s+(Este|Norte|Oeste)|Pedro Brand/i.test(s)) return "Santo Domingo";
  if (/San Pedro de Macor/i.test(s)) return "San Pedro de Macorís";
  if (/La Romana/i.test(s)) return "La Romana";
  if (/Puerto Plata/i.test(s)) return "Puerto Plata";
  if (/San Crist(o|ó)bal/i.test(s)) return "San Cristóbal";
  if (/Punta Cana|Cap Cana|Bávaro|Bavaro/i.test(s)) return "La Altagracia";
  if (/Las Terrenas|Saman(a|á)/i.test(s)) return "Samaná";
  return null;
}

// Street only when the location visibly starts with one.
function parseStreet(loc) {
  const first = S(loc).split(",")[0].trim();
  return /^(Av\.?|Ave\.?|Avenida|Calle|Autopista|Carretera|Res\.)\s/i.test(first) ? first : null;
}

// ---------- Phase 4 helpers: spec table, status, freshness ----------

// Operation is stated in the price string; explicit `operation` wins.
function operationOf(p) {
  if (S(p.operation).trim()) return S(p.operation).trim();
  return isLease(p.price) ? "Alquiler" : "Venta";
}

// Most specific municipality named in the location string; null if unclear.
function parseMunicipality(loc) {
  const s = S(loc);
  const known = ["Santo Domingo Este", "Santo Domingo Norte", "Santo Domingo Oeste",
                 "Distrito Nacional", "Pedro Brand", "Sabana Grande de Palenque",
                 "San Pedro de Macorís", "La Romana", "Las Terrenas", "Juan Dolio",
                 "Punta Cana", "Cabarete", "Puerto Plata", "San Cristóbal", "Bávaro"];
  for (const k of known) if (new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(s)) return k;
  return null;
}

const STATUS = {
  "disponible": { label: "Disponible", availability: "https://schema.org/InStock" },
  "reservado":  { label: "Reservado",  availability: "https://schema.org/LimitedAvailability" },
  "vendido":    { label: "Vendido",    availability: "https://schema.org/SoldOut" },
  "alquilado":  { label: "Alquilado",  availability: "https://schema.org/SoldOut" }
};
function statusOf(p) {
  const key = S(p.status).trim().toLowerCase();
  return STATUS[key] || STATUS["disponible"];   // live listing = available
}

const MONTHS = ["enero","febrero","marzo","abril","mayo","junio","julio",
                "agosto","septiembre","octubre","noviembre","diciembre"];
function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(S(iso).trim());
  if (!m) return null;
  return `${parseInt(m[3], 10)} de ${MONTHS[parseInt(m[2], 10) - 1]} de ${m[1]}`;
}

const escapeHtml = v => S(v).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Specification table rows, in the vocabulary Dominican buyers actually use.
// Only rows with real data are rendered; every gap is listed per listing in
// TODO-content.md, and the empty fields are visible in properties.json.
function specRows(p) {
  const typeLabel = Array.isArray(p.type) ? p.type.map(S).join(", ") : S(p.type);
  const sizeLabel = Array.isArray(p.size) ? p.size.map(S).join(" / ") : S(p.size);
  return [
    ["Tipo", typeLabel],
    ["Operación", operationOf(p)],
    ["Precio", S(p.price)],
    ["Sector", S(p.sector)],
    ["Dirección", S(p.location)],
    ["Municipio", parseMunicipality(p.location)],
    ["Metros cuadrados", sizeLabel],
    ["Habitaciones", S(p.bedrooms)],
    ["Baños", S(p.bathrooms)],
    ["Parqueos", S(p.parking)],
    ["Nivel", S(p.level)],
    ["Año de construcción", S(p.yearBuilt)],
    ["Condición", S(p.condition)],
    ["Amueblado", S(p.furnished)],
    ["Código de referencia", S(p.filename)]
  ].filter(([, v]) => S(v).trim() && S(v).trim().toUpperCase() !== "N/A");
}

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

    // ---------- Phase 4: spec table, status, freshness, FAQ ----------
    const rows = specRows(p);
    const specTable = `<table class="spec-table">
            <caption>Ficha técnica</caption>
            <tbody>
              ${rows.map(([k, v]) => `<tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join("\n              ")}
            </tbody>
          </table>`;

    const status = statusOf(p);
    const datePosted   = S(p.datePosted).trim() || S(listingDates[S(p.filename)]).trim();
    const dateModified = S(p.updated).trim();
    const shownDate = dateModified
      ? { label: "Actualizado", iso: dateModified }
      : (datePosted ? { label: "Publicado", iso: datePosted } : null);
    const shownDateHtml = shownDate && formatDate(shownDate.iso)
      ? `<p class="property-freshness">${shownDate.label}: <time datetime="${shownDate.iso}">${formatDate(shownDate.iso)}</time></p>`
      : "";

    // Link to the sector aggregate page this listing belongs to (Phase 5).
    const sectorPage = sectorPageFor(allProps, p);
    const sectorLinkHtml = sectorPage
      ? `<p class="sector-link">Ver todos los <a href="/${sectorPage.slug}">${sectorPage.label.toLowerCase()} en ${escapeHtml(sectorPage.sector)}</a> (${sectorPage.items.length})</p>`
      : "";

    // FAQ is owner-written (see TODO-content.md); nothing is generated here.
    const faq = Array.isArray(p.faq)
      ? p.faq.filter(f => f && S(f.q).trim() && S(f.a).trim())
      : [];
    const faqHtml = faq.length ? `
      <section class="property-faq">
        <h2>Preguntas frecuentes</h2>
        <dl>
          ${faq.map(f => `<dt>${escapeHtml(f.q)}</dt><dd>${escapeHtml(f.a)}</dd>`).join("\n          ")}
        </dl>
      </section>` : "";

    // ---------- structured data: RealEstateListing @graph ----------
    // Replaces the old Product block (never both: two overlapping JSON-LD
    // graphs on one page can be discounted by crawlers). Carried over from
    // Product per the migration notes: sku -> identifier, price/currency/
    // availability -> Offer (price as a number now), name/description.
    const ORG_ID = `${S(site.url)}/#organization`;
    const imagesAbs = imageSources.map((src) => new URL(src, S(site.url)).toString());
    const schemaType = schemaTypeFor(p.type);

    const addr = { "@type": "PostalAddress", "addressCountry": "DO" };
    const street = parseStreet(p.location);
    if (street) addr.streetAddress = street;
    if (p.sector) addr.addressLocality = S(p.sector);
    const region = parseRegion(p.location);
    if (region) addr.addressRegion = region;

    const residence = {
      "@type": schemaType,
      "@id": `${canonical}#residence`,
      "name": S(p.title),
      "address": addr
      // geo intentionally absent: no per-property coordinates in the data
      // source and they must not be fabricated (see TODO-content.md)
    };
    const bedrooms = parseCount(p.bedrooms);
    if (bedrooms !== null) {
      residence.numberOfBedrooms = bedrooms;
      residence.numberOfRooms = bedrooms;
    }
    const baths = parseBathrooms(p.bathrooms);
    if (baths) {
      residence.numberOfFullBathrooms = baths.full;
      if (baths.partial) residence.numberOfPartialBathrooms = baths.partial;
      residence.numberOfBathroomsTotal = baths.full + baths.partial;
    }
    // Optional owner-supplied facts (empty until filled in properties.json)
    const parkingCount = parseCount(p.parking);
    const amenities = [];
    if (parkingCount !== null) amenities.push({ "@type": "LocationFeatureSpecification", "name": "Parqueos", "value": parkingCount });
    if (S(p.furnished).trim()) {
      const furnishedYes = /^(s(i|í)|amueblado|true)/i.test(S(p.furnished).trim());
      amenities.push({ "@type": "LocationFeatureSpecification", "name": "Amueblado", "value": furnishedYes });
    }
    if (amenities.length) residence.amenityFeature = amenities;
    const yearBuilt = parseCount(p.yearBuilt);
    if (yearBuilt !== null && schemaType !== "Place") residence.yearBuilt = String(yearBuilt);
    const floorLevel = parseCount(p.level);
    if (floorLevel !== null && schemaType !== "Place") residence.floorLevel = String(floorLevel);

    const sqm = parseSqm(p.size);
    if (sqm !== null && schemaType !== "Place") {
      residence.floorSize = { "@type": "QuantitativeValue", "value": sqm, "unitCode": "MTK", "unitText": "m²" };
    } else if (S(p.size).trim()) {
      residence.additionalProperty = [
        { "@type": "PropertyValue", "name": "Superficie", "value": Array.isArray(p.size) ? p.size.map(S).join(" / ") : S(p.size) }
      ];
    }

    const offer = {
      "@type": "Offer",
      "@id": `${canonical}#offer`,
      "priceCurrency": S(p.price).includes("RD$") ? "DOP" : "USD",
      "availability": status.availability,
      "businessFunction": isLease(p.price)
        ? "http://purl.org/goodrelations/v1#LeaseOut"
        : "http://purl.org/goodrelations/v1#Sell",
      "url": canonical,
      "itemOffered": { "@id": `${canonical}#residence` },
      "seller": { "@id": ORG_ID }
    };
    const priceNum = parsePrice(p.price);
    if (priceNum !== null) {
      if (isPerSquareMeter(p.price)) {
        // per-m² pricing (solares): a flat price would be misleading
        offer.priceSpecification = {
          "@type": "UnitPriceSpecification",
          "price": priceNum,
          "priceCurrency": offer.priceCurrency,
          "referenceQuantity": { "@type": "QuantitativeValue", "value": 1, "unitCode": "MTK", "unitText": "m²" }
        };
      } else {
        offer.price = priceNum;
      }
    }

    const listing = {
      "@type": "RealEstateListing",
      "@id": `${canonical}#listing`,
      "url": canonical,
      "name": S(p.title),
      "description": descRaw.trim(),
      "inLanguage": S(site.lang) || "es-DO",
      ...(datePosted ? { "datePosted": datePosted } : {}),
      ...(dateModified ? { "dateModified": dateModified } : {}),
      "identifier": S(p.filename),
      "image": imagesAbs,
      "provider": { "@id": ORG_ID },
      "isPartOf": { "@id": `${S(site.url)}/#website` },
      "mainEntity": { "@id": `${canonical}#residence` },
      "offers": { "@id": `${canonical}#offer` }
    };

    const graph = [listing, residence, offer];
    if (faq.length) {
      graph.push({
        "@type": "FAQPage",
        "@id": `${canonical}#faq`,
        "mainEntity": faq.map(f => ({
          "@type": "Question",
          "name": S(f.q),
          "acceptedAnswer": { "@type": "Answer", "text": S(f.a) }
        }))
      });
    }
    const schemaJson = JSON.stringify(
      { "@context": "https://schema.org", "@graph": graph }, null, 2
    );

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
${schemaJson}
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
        <p class="property-meta"><span class="status-badge status-${slugify(status.label)}">${status.label}</span></p>
        ${shownDateHtml}
        ${p.location ? `<p class="property-location"><strong>Ubicación:</strong> ${S(p.location)}</p>` : ""}
        ${p.price ? `<p class="property-price"><strong>Precio:</strong> ${S(p.price)}</p>` : ""}
        ${p.rent ? `<p class="property-price"><strong>Alquiler:</strong> ${S(p.rent)}</p>` : ""}
        ${p.size ? `<p class="property-size"><strong>Metraje:</strong> ${S(p.size)}</p>` : ""}
        ${p.bedrooms ? `<p class="property-price"><strong>Habitaciones:</strong> ${S(p.bedrooms)}</p>` : ""}
        ${p.bathrooms ? `<p class="property-price"><strong>Baños:</strong> ${S(p.bathrooms)}</p>` : ""}
        <p class="property-description">${S(p.description) || "Para más información o agendar una visita, contáctanos."}</p>
        ${specTable}
        ${sectorLinkHtml}
        <a href="/contact/" class="contact-button">Contáctanos: 809-224-2769 / 829-380-2769</a>
      </div>
    </div>
    ${faqHtml}
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






