// src/sitemap.11ty.js
const fs = require("fs");
const path = require("path");
const slugify = require("./_utils/slugify");
const { sectorPages } = require("./_utils/sectors");

const PER_PAGE = 20;

module.exports = class {
  data() {
    return {
      permalink: "sitemap.xml",
      eleventyExcludeFromCollections: true
    };
  }

  render() {
    const dataDir = path.join(__dirname, "_data");
    const site = JSON.parse(fs.readFileSync(path.join(dataDir, "site.json"), "utf-8"));
    const props = JSON.parse(fs.readFileSync(path.join(dataDir, "properties.json"), "utf-8"));

    const base = site.url.replace(/\/+$/, "");

    // Area pages and their base filenames (match your listing pages)
    const areaFiles = {
      "Santo Domingo": "inmuebles-santo-domingo",
      "Punta Cana": "inmuebles-punta-cana",
      "Juan Dolio": "inmuebles-juan-dolio",
      "Solares": "inmuebles-solares",
      "Otro": "inmuebles-otro"
    };

    // Group properties by area
    const byArea = {};
    for (const p of props) {
      const area = String(p.area || "").trim();
      if (!byArea[area]) byArea[area] = [];
      byArea[area].push(p);
    }

    // Collect URLs
    const urls = [];

    // Home
    urls.push(`${base}/`);

    // Area listing pages with pagination
    for (const [area, list] of Object.entries(byArea)) {
      if (!areaFiles[area]) continue;
      const baseName = areaFiles[area]; // e.g. "inmuebles-santo-domingo"
      const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
      for (let i = 0; i < totalPages; i++) {
        const file = i === 0 ? baseName : `${baseName}-${i + 1}`;
        urls.push(`${base}/${file}`);
      }
    }

    // Sector aggregate pages
    for (const sp of sectorPages(props)) urls.push(`${base}/${sp.slug}`);

    // Property detail pages (pretty slugs)
    for (const p of props) {
      const slug = `${slugify(p.title)}-${slugify(p.sector || p.area || "")}`;
      urls.push(`${base}/${slug}`);
    }

    // Generate XML
    // lastmod intentionally omitted: stamping every URL with the build date
    // is fake freshness. Real per-listing dateModified arrives in Phase 4.
    const xmlItems = urls.map(u => `
  <url>
    <loc>${u}</loc>
  </url>`).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xmlItems}
</urlset>`;
  }
};
