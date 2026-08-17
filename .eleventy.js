// .eleventy.js  (project root)
const fs = require("fs");
const path = require("path");
const slugify = require("./src/_utils/slugify");

module.exports = function (eleventyConfig) {
  // ---------------- Filters ----------------
  eleventyConfig.addNunjucksFilter("slug", s => slugify(s || ""));

  // Robust link resolver: uses featured slide, tries passed-in "properties";
  // if not available, loads src/_data/properties.json directly.
  eleventyConfig.addNunjucksFilter("slideHref", (s, propsMaybe) => {
    if (s && s.href) return s.href;        // explicit link wins
    if (!s || !s.refFilename) return "#";

    let list = Array.isArray(propsMaybe) && propsMaybe.length ? propsMaybe : null;
    if (!list) {
      try {
        const p = path.join(__dirname, "src", "_data", "properties.json");
        list = JSON.parse(fs.readFileSync(p, "utf-8"));
      } catch {
        list = [];
      }
    }

    const prop = list.find(p => String(p.filename).trim() === String(s.filename).trim());
    if (!prop) return "#";

    const titleSlug = slugify(prop.title || "");
    const areaSlug  = slugify(prop.sector || prop.area || "");
    return `${titleSlug}-${areaSlug}.html`;
  });

  // ---------------- Passthrough copy ----------------
  // Preserve directory structure by passing the *directory* (no globs!)
  eleventyConfig.addPassthroughCopy("src/CSS");

  eleventyConfig.addPassthroughCopy({ "src/favicon.ico": "favicon.ico" });
  eleventyConfig.addPassthroughCopy({ "src/favicon-32x32.png": "favicon-32x32.png" });
  eleventyConfig.addPassthroughCopy({ "src/favicon-16x16.png": "favicon-16x16.png" });
  eleventyConfig.addPassthroughCopy({ "src/apple-touch-icon.png": "apple-touch-icon.png" });

  // robots.txt is not a template, so it must be copied explicitly or it
  // never reaches the publish directory.
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });

  // --- Added passthrough mappings (safe, additive) ---
  // Ensure linktree.css is available at site root: /linktree.css
  eleventyConfig.addPassthroughCopy({ "src/linktree.css": "linktree.css" });

  // Ensure contact page images are available at site root: /caneycontactpics/...
  eleventyConfig.addPassthroughCopy({ "src/caneycontactpics": "caneycontactpics" });

  // ---------------- Watch targets ----------------
  eleventyConfig.addWatchTarget("src/CSS");

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
