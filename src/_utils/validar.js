// src/_utils/validar.js
// Red de seguridad del catálogo, dentro del build: las reglas que antes
// corría a mano scripts/check_properties.py. src/_data/properties.js llama a
// assertValidCatalog() antes de que Eleventy renderice nada; si hay errores
// lanza uno solo con la lista completa, el build falla y Netlify no publica.
// JavaScript puro, sin dependencias: también corre en JavaScriptCore.
const fs = require("fs");
const path = require("path");
const { readFiles, prepare } = require("./catalogo");

const IMG_ROOT = path.join(__dirname, "..", "css", "images-caney");
const VALID_STATUS = ["Alquilado", "Disponible", "Reservado", "Vendido"];
const REQUIRED = ["title", "filename", "area", "sector", "type", "folder"];
const BAD_NAME = /[ ()]|[A-Z]|%20/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const S = v => String(v ?? "");
const isDir = p => fs.existsSync(p) && fs.statSync(p).isDirectory();
const isFile = p => fs.existsSync(p) && fs.statSync(p).isFile();

// { errors, warnings, count }: cada mensaje dice qué archivo y qué campo.
function validateCatalog({ files = readFiles(), imgRoot = IMG_ROOT } = {}) {
  const errors = [], warnings = [];
  const where = new Map();          // propiedad -> "src/propiedades/<archivo>"
  const codes = new Map();

  // Por archivo: lo que mantiene fijas la URL, el orden y la fecha.
  for (const { file, data: p } of files) {
    const at = `src/propiedades/${file}`;
    where.set(p, at);
    const slug = p.slug;
    if (!S(slug).trim()) {
      errors.push(`${at}: falta 'slug' (la URL fija de la ficha)`);
    } else if (typeof slug !== "string" || !SLUG.test(slug)) {
      errors.push(`${at}: 'slug' debe ir en minúsculas, con números y guiones — recibido '${slug}'`);
    } else if (file !== `${slug}.json`) {
      errors.push(`${at}: 'slug' es '${slug}' pero el archivo se llama ${file}. El slug es la URL `
        + `publicada y no se edita: devuélvelo a '${file.replace(/\.json$/, "")}'. Para cambiar la URL `
        + `a propósito, renombra también el archivo y agrega la URL vieja en scripts/legacy-slugs.json`);
    }
    const orden = p.orden;
    if (orden !== undefined && orden !== null && !Number.isInteger(orden)) {
      errors.push(`${at}: 'orden' debe ser un número entero — recibido '${orden}'`);
    }
    if (typeof p.datePosted !== "string" || !DATE.test(p.datePosted)) {
      errors.push(`${at}: 'datePosted' debe tener formato AAAA-MM-DD — recibido '${p.datePosted}'`);
    }
    const code = S(p.filename).trim();
    if (code && codes.has(code)) {
      errors.push(`${at}: 'filename' ${code} repetido (también en ${codes.get(code)})`);
    }
    codes.set(code, at);
  }

  // Por propiedad, en el orden del sitio.
  const props = prepare(files.map(f => f.data));
  const slugs = new Map();
  for (const p of props) {
    const at = where.get(p);
    for (const field of REQUIRED) {
      if (!S(p[field] || "").trim()) errors.push(`${at}: falta el campo obligatorio '${field}'`);
    }

    if (slugs.has(p.slug)) errors.push(`${at}: tiene el mismo URL que ${slugs.get(p.slug)} (/${p.slug})`);
    slugs.set(p.slug, at);

    const folder = S(p.folder).trim();
    if (folder) {
      if (BAD_NAME.test(folder)) {
        errors.push(`${at}: 'folder' debe ir en minúsculas y con guiones, sin espacios ni paréntesis — recibido '${folder}'`);
      }
      const fpath = path.join(imgRoot, folder);
      if (!isDir(fpath)) {
        errors.push(`${at}: 'folder': la carpeta src/css/images-caney/${folder} no existe`);
      } else {
        const imgs = p.images || [];
        if (!imgs.length) warnings.push(`${at}: no tiene imágenes listadas`);
        for (const img of imgs) {
          if (!isFile(path.join(fpath, S(img)))) {
            errors.push(`${at}: 'images': la imagen ${folder}/${img} no existe`);
          } else if (BAD_NAME.test(S(img))) {
            errors.push(`${at}: 'images': el archivo '${img}' debe ir en minúsculas, sin espacios ni paréntesis`);
          }
        }
      }
    }

    const status = S(p.status).trim();
    if (status && !VALID_STATUS.includes(status)) {
      errors.push(`${at}: 'status' debe ser uno de ${VALID_STATUS.join(", ")} — recibido '${status}'`);
    }

    const updated = S(p.updated).trim();
    if (updated && !DATE.test(updated)) {
      errors.push(`${at}: 'updated' debe tener formato AAAA-MM-DD — recibido '${updated}'`);
    }

    const faq = p.faq;
    if (faq && !Array.isArray(faq)) {
      errors.push(`${at}: 'faq' debe ser una lista`);
    } else if (Array.isArray(faq)) {
      for (const q of faq) {
        if (!q || typeof q !== "object" || Array.isArray(q) || !S(q.q || "").trim() || !S(q.a || "").trim()) {
          errors.push(`${at}: cada entrada de 'faq' necesita 'q' y 'a' con texto`);
        }
      }
    }
  }

  // Carpetas de fotos que ninguna propiedad usa (aviso, no error).
  const used = new Set(props.map(p => S(p.folder).trim()));
  for (const area of fs.readdirSync(imgRoot).sort()) {
    const apath = path.join(imgRoot, area);
    if (area === "general" || !isDir(apath)) continue;
    for (const sub of fs.readdirSync(apath).sort()) {
      if (isDir(path.join(apath, sub)) && !used.has(`${area}/${sub}`)) {
        warnings.push(`carpeta sin usar (ninguna propiedad la referencia): ${area}/${sub}`);
      }
    }
  }

  return { errors, warnings, count: props.length };
}

function assertValidCatalog(options) {
  const { errors, warnings, count } = validateCatalog(options);
  for (const w of warnings) console.warn(`[catálogo] AVISO  ${w}`);
  if (errors.length) {
    throw new Error(`Catálogo inválido: ${errors.length} ${errors.length === 1 ? "error" : "errores"} `
      + `en ${count} propiedades. No se publica nada hasta corregirlos:\n`
      + errors.map(e => `  - ${e}`).join("\n"));
  }
}

module.exports = { validateCatalog, assertValidCatalog };
