// src/_data/featured_slides_resolved.js
const fs = require("fs");
const path = require("path");
const { loadProperties } = require("../_utils/catalogo"); // note the ../_utils path from _data/

module.exports = () => {
  const dataDir = path.join(process.cwd(), "src", "_data");

  const slides = JSON.parse(
    fs.readFileSync(path.join(dataDir, "featured_slides.json"), "utf-8")
  );
  const props = loadProperties();

  const byFilename = new Map(
    props.map(p => [String(p.filename || "").trim(), p])
  );

  return slides.map(s => {
    // keep explicit hrefs if you set them
    if (s.href) return s;

    const key = String(s.refFilename || "").trim();
    if (key && byFilename.has(key)) {
      const p = byFilename.get(key);
      return { ...s, href: `/${p.slug}` };
    }
    // fallback if no match
    return { ...s, href: "#" };
  });
};
