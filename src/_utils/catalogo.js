// src/_utils/catalogo.js
// Único punto de lectura del catálogo: un archivo JSON por propiedad en
// src/propiedades/. Todas las plantillas y la variable global `properties`
// pasan por aquí; scripts/catalogo.py replica exactamente el mismo orden.
const fs = require("fs");
const path = require("path");
const slugify = require("./slugify");

const DIR = path.join(__dirname, "..", "propiedades");

// Campos que sólo sirven para administrar el catálogo. No se envían al
// navegador en el JSON de las páginas de área (ALL_DATA).
const CMS_FIELDS = ["slug", "orden", "datePosted"];

// URL de respaldo para un archivo sin `slug`: la misma fórmula de siempre.
// check_properties.py lo marca como error, porque sin slug fijo la URL
// vuelve a depender del título.
const fallbackSlug = p => `${slugify(p.title || "")}-${slugify(p.sector || p.area || "")}`;

const ordenOf = p => (typeof p.orden === "number" ? p.orden : 0);
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// Orden del sitio: `orden` ascendente (las nuevas llevan 0 y quedan arriba),
// después la fecha de publicación más reciente y, si todo empata, el slug.
function compare(a, b) {
  return (ordenOf(a) - ordenOf(b))
    || cmp(String(b.datePosted || ""), String(a.datePosted || ""))
    || cmp(a.slug, b.slug);
}

function loadProperties() {
  const props = fs.readdirSync(DIR)
    .filter(f => f.endsWith(".json"))
    .sort()
    .map(f => {
      const file = path.join(DIR, f);
      try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
      } catch (err) {
        throw new Error(`src/propiedades/${f}: JSON inválido (${err.message})`);
      }
    });
  for (const p of props) {
    if (!String(p.slug || "").trim()) p.slug = fallbackSlug(p);
  }
  return props.sort(compare);
}

// La propiedad sin los campos de administración, con el resto en su orden.
function publicFields(p) {
  return Object.fromEntries(Object.entries(p).filter(([k]) => !CMS_FIELDS.includes(k)));
}

module.exports = { loadProperties, publicFields };
