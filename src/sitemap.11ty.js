// src/sitemap.11ty.js
const fs = require("fs");
const path = require("path");
const slugify = require("./_utils/slugify");

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
    const today = new Date().toISOString().slice(0, 10);

    // Area pages and their base filenames (match your listing pages)
    const areaFiles = {
      "Santo Domingo": "INMUEBLES SANTO DOMINGO",
      "Punta Cana": "INMUEBLES PUNTA CANA",
      "Juan Dolio": "INMUEBLES JUAN DOLIO",
      "Solares": "INMUEBLES SOLARES",
      "Otro": "INMUEBLES OTRO"
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
    urls.push(`${base}/Index.html`);

    // Area listing pages with pagination
    for (const [area, list] of Object.entries(byArea)) {
      if (!areaFiles[area]) continue;
      const baseName = areaFiles[area]; // e.g. "INMUEBLES SANTO DOMINGO"
      const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
      for (let i = 0; i < totalPages; i++) {
        const file = i === 0 ? `${baseName}.html` : `${baseName}-${i + 1}.html`;
        urls.push(`${base}/${encodeURI(file)}`);
      }
    }

    // Property detail pages (pretty slugs)
    for (const p of props) {
      const slug = `${slugify(p.title)}-${slugify(p.sector || p.area || "")}.html`;
      urls.push(`${base}/${slug}`);
    }

    // Generate XML
    const xmlItems = urls.map(u => `
  <url>
    <loc>${u}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xmlItems}
</urlset>`;
  }
};
