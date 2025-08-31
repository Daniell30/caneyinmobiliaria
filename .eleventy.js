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

    const prop = list.find(p => String(p.filename).trim() === String(s.refFilename).trim());
    if (!prop) return "#";

    const titleSlug = slugify(prop.title || "");
    const areaSlug  = slugify(prop.sector || prop.area || "");
    return `${titleSlug}-${areaSlug}.html`;
  });

  // ---------------- Passthrough copy ----------------
  // Preserve directory structure by passing the *directory* (no globs!)
  eleventyConfig.addPassthroughCopy("src/CSS");
  eleventyConfig.addPassthroughCopy("src/Images caney");
  eleventyConfig.addPassthroughCopy("src/SLIDER");

  // If you actually have these folders under src, keep these lines.
  // If not, you can remove them safely.
  eleventyConfig.addPassthroughCopy("src/FONTS");
  eleventyConfig.addPassthroughCopy("src/FONTSS");

  // ---------------- Watch targets ----------------
  eleventyConfig.addWatchTarget("src/CSS");
  eleventyConfig.addWatchTarget("src/Images caney");
  eleventyConfig.addWatchTarget("src/SLIDER");
  eleventyConfig.addWatchTarget("src/FONTS");
  eleventyConfig.addWatchTarget("src/FONTSS");

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
