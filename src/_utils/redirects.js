// src/_utils/redirects.js
// Contenido de _redirects, generado en cada build por src/redirects.11ty.js
// (antes lo escribía a mano scripts/generate_redirects.py). Las páginas de
// zona salen de sectors.js, la misma lógica que las publica, así que ya no
// hay una copia que pueda desincronizarse.
//
// Netlify notes:
//   - first match wins; `301!` forces the redirect even when a file exists
//     at the source path (needed while both URL forms exist)
//   - redirect sources are matched case-sensitively, so renamed assets are
//     emitted in every casing that was ever published
//   - spaces in the `from` column must be percent-encoded
const slugify = require("./slugify");
const { sectorPages } = require("./sectors");

const PER_PAGE = 20; // keep in sync with the list-*.11ty.js templates

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// Python's urllib.parse.quote(path, safe="/()!_.~-"): the rules were first
// generated with it, and the output has to stay byte for byte the same.
function enc(p) {
  let out = "";
  for (const ch of String(p)) {
    if (/[A-Za-z0-9_.~\-\/()!]/.test(ch)) out += ch;
    else if (ch === "'" || ch === "*") out += "%" + ch.charCodeAt(0).toString(16).toUpperCase();
    else out += encodeURIComponent(ch);
  }
  return out;
}

const AREAS = [
  ["Santo Domingo", "INMUEBLES SANTO DOMINGO", "inmuebles-santo-domingo"],
  ["Punta Cana", "INMUEBLES PUNTA CANA", "inmuebles-punta-cana"],
  ["Juan Dolio", "INMUEBLES JUAN DOLIO", "inmuebles-juan-dolio"],
  ["Solares", "INMUEBLES SOLARES", "inmuebles-solares"],
  ["Otro", "INMUEBLES OTRO", "inmuebles-otro"],
];

// props: el catálogo en el orden del sitio (loadProperties()).
function buildRedirects(props, renameMap, legacySlugs) {
  const lines = [
    "# GENERATED FILE — do not edit by hand.",
    "# Rebuild with: python3 scripts/generate_redirects.py",
    "",
    "# Contact variants",
    "/contact.html            /contact/   301!",
    "/caney-contact-linktree  /contact/   301!",
    "",
    "# Old homepage filename",
    "/Index.html              /           301!",
    "",
    "# Category pages: old spaced filenames -> slugs",
  ];

  const counts = {};
  for (const p of props) counts[p.area] = (counts[p.area] || 0) + 1;
  for (const [area, old, now] of AREAS) {
    const pages = Math.max(1, Math.ceil((counts[area] || 0) / PER_PAGE));
    for (let i = 0; i < pages; i++) {
      const suf = i === 0 ? "" : `-${i + 1}`;
      lines.push(`/${enc(old)}${suf}.html  /${now}${suf}  301!`);
      // Netlify's Pretty URLs was 301ing the spaced .html to a lowercased
      // spaced extensionless URL; catch that form too.
      lines.push(`/${enc(old.toLowerCase())}${suf}  /${now}${suf}  301!`);
    }
  }

  lines.push("", "# Listing pages: .html -> extensionless (generated per listing)");
  for (const p of props) lines.push(`/${p.slug}.html  /${p.slug}  301!`);

  // Fichas renombradas: la URL sale del campo `slug`, que no cambia al
  // editar el título; si alguna vez se cambia a propósito, la anterior
  // tiene que seguir resolviendo.
  const legacy = Object.entries(legacySlugs || {}).sort((a, b) => cmp(a[0], b[0]));
  if (legacy.length) {
    const current = new Set(props.map(p => p.slug));
    const legacyLines = [];
    for (const [oldSlug, newSlug] of legacy) {
      if (current.has(oldSlug)) {
        throw new Error(`scripts/legacy-slugs.json: '${oldSlug}' sigue siendo una ficha activa; `
          + `no puede redirigir a '${newSlug}'.`);
      }
      if (!current.has(newSlug)) {
        throw new Error(`scripts/legacy-slugs.json: '${newSlug}' no existe entre las fichas actuales `
          + `(destino de '${oldSlug}').`);
      }
      legacyLines.push(`/${oldSlug}       /${newSlug}  301!`);
      legacyLines.push(`/${oldSlug}.html  /${newSlug}  301!`);
    }
    lines.push("", "# Fichas renombradas: URL anterior -> URL actual", ...legacyLines);
  }

  // Zone pages: the slug carries "en venta" only while every listing in the
  // sector is a sale. Adding one rental flips the URL, so the previous form
  // must keep resolving. Listed in catalog order (first listing of each zone).
  const firstSeen = new Map();
  props.forEach((p, i) => {
    const key = `${String(p.area ?? "").trim()}|${String(p.sector ?? "").trim()}`;
    if (!firstSeen.has(key)) firstSeen.set(key, i);
  });
  const zones = sectorPages(props)
    .map(sp => ({ slug: sp.slug, alt: slugify(`${sp.label}${sp.allSale ? "" : " en venta"} ${sp.sector}`),
                  order: firstSeen.get(`${sp.area}|${sp.sector}`) }))
    .sort((a, b) => a.order - b.order);
  const active = new Set(zones.map(z => z.slug));
  const zoneLines = zones
    .filter(z => z.alt !== z.slug && !active.has(z.alt))
    .map(z => `/${z.alt}  /${z.slug}  301!`);
  if (zoneLines.length) lines.push("", "# Zone pages: previous slug -> current slug", ...zoneLines);

  lines.push("", "# Renamed assets (spaces/parens removed). Netlify SERVES files",
    "# case-insensitively (case-only renames need no rule) but MATCHES",
    "# redirect sources case-sensitively — so each rule is emitted both",
    "# in the on-disk casing and in the 'Images caney' casing that the",
    "# old templates actually put into og:image/HTML.");
  for (const [old, now] of Object.entries(renameMap).sort((a, b) => cmp(a[0], b[0]))) {
    if (old.toLowerCase() === now.toLowerCase()) continue;
    const variants = [...new Set([old, old.replace("/CSS/Images Caney/", "/CSS/Images caney/")])].sort(cmp);
    for (const v of variants) lines.push(`${enc(v)}  ${enc(now)}  301`);
  }

  return lines.join("\n") + "\n";
}

module.exports = { buildRedirects, enc };
