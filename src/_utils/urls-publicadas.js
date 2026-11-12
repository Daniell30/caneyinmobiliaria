// src/_utils/urls-publicadas.js
// Segunda red contra URLs perdidas: al terminar un build en Netlify se
// compara el sitemap de producción con el que acaba de generarse. Una URL
// publicada que ya no existe y que _redirects no redirige quedaría en 404
// (por ejemplo, un slug cambiado a mano junto con el nombre del archivo, sin
// agregarlo a scripts/legacy-slugs.json). Sólo avisa: borrar una propiedad
// también hace desaparecer su URL, y la comparación depende de la red.
const fs = require("fs");
const path = require("path");

const locs = xml => [...String(xml).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
const pathOf = u => String(u).replace(/^https?:\/\/[^\/]+/, "") || "/";

// Rutas que están en el sitemap publicado y que este build ni genera ni redirige.
function removedUrls(liveSitemap, newSitemap, redirects) {
  const now = new Set(locs(newSitemap).map(pathOf));
  const redirected = new Set(String(redirects).split("\n")
    .map(l => l.trim()).filter(l => l && !l.startsWith("#"))
    .map(l => l.split(/\s+/)[0]));
  return locs(liveSitemap).map(pathOf).filter(p => !now.has(p) && !redirected.has(p));
}

// Gancho de eleventy.after. Sólo corre en Netlify (NETLIFY=true): en local no
// hace falta consultar producción en cada recarga.
async function warnRemovedUrls(outputDir, siteUrl) {
  if (process.env.NETLIFY !== "true") return;
  try {
    const res = await fetch(`${siteUrl}/sitemap.xml`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const live = await res.text();
    const read = f => fs.readFileSync(path.join(outputDir, f), "utf-8");
    const gone = removedUrls(live, read("sitemap.xml"), read("_redirects"));
    for (const p of gone) {
      console.warn(`[urls] AVISO  ${p} está publicada en ${siteUrl} y este build no la genera ni la `
        + `redirige: quedará en 404. Si se cambió un slug, agrega la URL vieja en `
        + `scripts/legacy-slugs.json; si se borró la propiedad a propósito, ignora este aviso.`);
    }
    if (!gone.length) console.log(`[urls] Ninguna URL publicada en ${siteUrl} se pierde con este build.`);
  } catch (err) {
    console.warn(`[urls] AVISO  no se pudo comparar con el sitemap de ${siteUrl}: ${err.message}`);
  }
}

module.exports = { removedUrls, warnRemovedUrls };
