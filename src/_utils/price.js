// src/_utils/price.js
// Separa el texto libre del precio en titular + detalle, sin perder nada.
// Los precios del catálogo vienen en formatos muy distintos
// ("US$240,000", "RD$52,000 mensuales (alquiler, mantenimiento incluido)",
// "US$1,300,000 (venta) | US$7,500 (renta)"), así que sólo se recorta lo que
// se puede recortar con seguridad: lo que va antes del primer paréntesis es
// el titular y el resto se muestra como nota en texto fino.
const S = v => String(v ?? "");

function priceParts(price) {
  const raw = S(price).trim();
  if (!raw) return { main: "", note: "" };

  const i = raw.indexOf("(");
  let main = raw;
  let note = "";
  if (i > 0) {
    main = raw.slice(0, i).trim().replace(/[,;]$/, "");
    note = raw.slice(i).trim();
  }

  if (/^\((alquiler|venta|renta)\)$/i.test(note)) {
    // sólo repetía la operación, que ya va como subtítulo
    note = "";
  } else if (/^\([^()]*\)$/.test(note)) {
    // un único grupo de paréntesis: se puede abrir sin romper el texto
    note = note.slice(1, -1).replace(/^(alquiler|venta|renta)\s*,\s*/i, "").trim();
  }
  // varios grupos (p. ej. "(venta) | US$7,500 (renta)") se dejan tal cual

  return { main: main || raw, note };
}

module.exports = { priceParts };
