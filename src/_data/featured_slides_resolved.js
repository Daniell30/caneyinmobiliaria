// src/_data/featured_slides_resolved.js
const fs = require("fs");
const path = require("path");
const slugify = require("../_utils/slugify"); // note the ../_utils path from _data/

module.exports = () => {
  const dataDir = path.join(process.cwd(), "src", "_data");

  const slides = JSON.parse(
    fs.readFileSync(path.join(dataDir, "featured_slides.json"), "utf-8")
  );
  const props = JSON.parse(
    fs.readFileSync(path.join(dataDir, "properties.json"), "utf-8")
  );

  const byFilename = new Map(
    props.map(p => [String(p.filename || "").trim(), p])
  );

  return slides.map(s => {
    // keep explicit hrefs if you set them
    if (s.href) return s;

    const key = String(s.refFilename || "").trim();
    if (key && byFilename.has(key)) {
      const p = byFilename.get(key);
      const href =
        `${slugify(p.title || "")}-${slugify(p.sector || p.area || "")}.html`;
      return { ...s, href };
    }
    // fallback if no match
    return { ...s, href: "#" };
  });
};
