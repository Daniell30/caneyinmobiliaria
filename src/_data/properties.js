// src/_data/properties.js
// Variable global `properties` de Eleventy: el catálogo completo en el orden
// del sitio. Antes salía de properties.json; ahora cada propiedad tiene su
// archivo en src/propiedades/ y se lee con el cargador compartido.
// Eleventy evalúa los datos globales antes de renderizar cualquier página,
// así que la validación corre aquí: un catálogo inválido detiene el build.
const { loadProperties } = require("../_utils/catalogo");
const { assertValidCatalog } = require("../_utils/validar");

module.exports = () => {
  assertValidCatalog();
  return loadProperties();
};
