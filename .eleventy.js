// .eleventy.js  (project root)
const slugify = require("./src/_utils/slugify");
const { loadProperties } = require("./src/_utils/catalogo");

module.exports = function (eleventyConfig) {
  // ---------------- Filters ----------------
  eleventyConfig.addNunjucksFilter("slug", s => slugify(s || ""));

  // Robust link resolver: uses featured slide, tries passed-in "properties";
  // if not available, loads the catalog (src/propiedades/) directly.
  eleventyConfig.addNunjucksFilter("slideHref", (s, propsMaybe) => {
    if (s && s.href) return s.href;        // explicit link wins
    if (!s || !s.refFilename) return "#";

    let list = Array.isArray(propsMaybe) && propsMaybe.length ? propsMaybe : null;
    if (!list) {
      try {
        list = loadProperties();
      } catch {
        list = [];
      }
    }

    const prop = list.find(p => String(p.filename).trim() === String(s.filename).trim());
    if (!prop) return "#";

    return `/${prop.slug}`;
  });

  // ---------------- Passthrough copy ----------------
  // Preserve directory structure by passing the *directory* (no globs!)
  eleventyConfig.addPassthroughCopy("src/css");

  eleventyConfig.addPassthroughCopy({ "src/favicon.ico": "favicon.ico" });
  eleventyConfig.addPassthroughCopy({ "src/favicon-32x32.png": "favicon-32x32.png" });
  eleventyConfig.addPassthroughCopy({ "src/favicon-16x16.png": "favicon-16x16.png" });
  eleventyConfig.addPassthroughCopy({ "src/apple-touch-icon.png": "apple-touch-icon.png" });

  // robots.txt is not a template, so it must be copied explicitly or it
  // never reaches the publish directory.
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
  eleventyConfig.addPassthroughCopy({ "src/_redirects": "_redirects" });

  // --- Added passthrough mappings (safe, additive) ---
  // Ensure linktree.css is available at site root: /linktree.css
  eleventyConfig.addPassthroughCopy({ "src/linktree.css": "linktree.css" });

  // Ensure contact page images are available at site root: /caneycontactpics/...
  eleventyConfig.addPassthroughCopy({ "src/caneycontactpics": "caneycontactpics" });

  // ---------------- Watch targets ----------------
  eleventyConfig.addWatchTarget("src/css");
  // Catalog: one JSON file per listing, read by src/_utils/catalogo.js
  eleventyConfig.addWatchTarget("src/propiedades");

  // --- Added watch targets (safe, additive) ---
  eleventyConfig.addWatchTarget("src/linktree.css");
  eleventyConfig.addWatchTarget("src/caneycontactpics");

  // ---------------- Eleventy dirs & engines ----------------
  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    dataTemplateEngine: "njk",
  };
};
