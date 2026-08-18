// src/_utils/sectors.js
// Sector aggregate pages (Phase 5): one page per sector that has real
// inventory, so a single fetch answers "apartamentos en venta en X".
// Shared by src/sector.11ty.js, src/property.11ty.js and src/sitemap.11ty.js
// so the slugs can never drift apart.
const slugify = require("./slugify");

const MIN_LISTINGS = 2; // below this a page would be thin content

const S = v => String(v ?? "");

// Type families -> plural label used in the URL and <h1>.
const FAMILY = {
  "apartamento": "Apartamentos",
  "penthouse": "Apartamentos",
  "villa": "Villas",
  "casa": "Casas",
  "solar": "Solares"
};

const typesOf = p => (Array.isArray(p.type) ? p.type : [p.type]).map(t => S(t).trim().toLowerCase()).filter(Boolean);

function familyLabel(items) {
  const labels = new Set();
  for (const p of items) {
    for (const t of typesOf(p)) {
      if (!FAMILY[t]) return "Propiedades";   // unmapped type -> generic
      labels.add(FAMILY[t]);
    }
  }
  return labels.size === 1 ? [...labels][0] : "Propiedades";
}

const isLease = p => !/venta/i.test(S(p.price)) && /alquiler|renta/i.test(S(p.price));

// "Solares" and "Otro" are inventory categories, not places: never append
// them to a sector name in a heading.
const NON_PLACE_AREAS = new Set(["solares", "otro"]);

function sectorPages(props) {
  const groups = new Map();
  for (const p of props) {
    const sector = S(p.sector).trim();
    const area = S(p.area).trim();
    if (!sector || !area) continue;
    const key = `${area}|${sector}`;
    if (!groups.has(key)) groups.set(key, { area, sector, items: [] });
    groups.get(key).items.push(p);
  }

  const pages = [];
  for (const { area, sector, items } of groups.values()) {
    if (items.length < MIN_LISTINGS) continue;
    const label = familyLabel(items);
    const allSale = items.every(p => !isLease(p));
    const opPart = allSale ? " en venta" : "";          // mixed ops: no claim
    const place = (sector.toLowerCase() === area.toLowerCase() || NON_PLACE_AREAS.has(area.toLowerCase()))
      ? sector
      : `${sector}, ${area}`;
    pages.push({
      area, sector, items,
      slug: slugify(`${label}${opPart} ${sector}`),
      h1: `${label}${opPart} en ${place}`,
      label, opPart, allSale
    });
  }
  return pages.sort((a, b) => b.items.length - a.items.length || a.slug.localeCompare(b.slug, "es"));
}

// The sector page a given listing belongs to, or null.
function sectorPageFor(props, p) {
  const key = `${S(p.area).trim()}|${S(p.sector).trim()}`;
  return sectorPages(props).find(sp => `${sp.area}|${sp.sector}` === key) || null;
}

module.exports = { sectorPages, sectorPageFor, MIN_LISTINGS };
