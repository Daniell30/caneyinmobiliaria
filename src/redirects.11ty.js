// src/redirects.11ty.js — publica _redirects en cada build, a partir del
// catálogo (src/propiedades/), scripts/rename-map.json y
// scripts/legacy-slugs.json. Una propiedad nueva tiene sus redirecciones sin
// que nadie corra ningún script.
const fs = require("fs");
const path = require("path");
const { loadProperties } = require("./_utils/catalogo");
const { buildRedirects } = require("./_utils/redirects");

const SCRIPTS = path.join(__dirname, "..", "scripts");
const readJson = (f, fallback) => {
  const p = path.join(SCRIPTS, f);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")) : fallback;
};

module.exports = class {
  data() {
    return { permalink: "_redirects", eleventyExcludeFromCollections: true };
  }

  render() {
    return buildRedirects(loadProperties(), readJson("rename-map.json", {}), readJson("legacy-slugs.json", {}));
  }
};
