// src/_data/properties.js
// Variable global `properties` de Eleventy: el catálogo completo en el orden
// del sitio. Antes salía de properties.json; ahora cada propiedad tiene su
// archivo en src/propiedades/ y se lee con el cargador compartido.
const { loadProperties } = require("../_utils/catalogo");

module.exports = () => loadProperties();
