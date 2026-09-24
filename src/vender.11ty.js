// src/vender.11ty.js — "Quiero vender": captación de propiedades.
// El formulario usa Netlify Forms (data-netlify), que no necesita servidor:
// Netlify detecta el <form> en el HTML publicado y guarda los envíos en el
// panel del sitio. El campo bot-field es la trampa antispam.
const fs = require("fs");
const path = require("path");
const { esc } = require("./_utils/search");
const site = JSON.parse(fs.readFileSync(path.join(__dirname, "_data", "site.json"), "utf-8"));

const S = v => String(v ?? "");

module.exports = class {
  data() {
    const props = JSON.parse(
      fs.readFileSync(path.join(__dirname, "_data", "properties.json"), "utf-8"));
    return {
      props,
      permalink: "vender/index.html",
      eleventyExcludeFromCollections: true
    };
  }

  render({ props }) {
    const sectors = [...new Set(props.map(p => S(p.sector).trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "es"));
    const sectorOpts = sectors.map(s => `<option value="${esc(s)}"></option>`).join("");

    const tipos = ["Apartamento", "Casa", "Villa", "Penthouse", "Solar",
                   "Local comercial", "Proyecto", "Otro"];
    const canonical = `${S(site.url)}/vender/`;
    const desc = "¿Quieres vender o alquilar tu propiedad? Inmobiliaria Caney la evalúa "
               + "y la promociona. Déjanos tus datos y te contactamos.";

    return `<!DOCTYPE html>
<html lang="es">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-17897616535"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'AW-17897616535');
</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Vende tu propiedad con Inmobiliaria Caney</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${canonical}">

  <meta property="og:type" content="website">
  <meta property="og:title" content="Vende tu propiedad con Inmobiliaria Caney">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${S(site.url)}/caneycontactpics/caney-equipo.png">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="stylesheet" href="/css/caneyvisual.css">
  <link rel="stylesheet" href="/css/vender.css">
</head>
<body>
  <header><nav class="navbar navbar--simple">
    <a href="/"><img src="/css/images-caney/general/caneylogo.png" alt="Inmobiliaria Caney" class="logo"></a>
  </nav></header>

  <main class="vender">
    <section class="vender-intro">
      <h1>Vende tu propiedad con nosotros</h1>
      <p class="vender-lead">
        Más de dos décadas acompañando a familias dominicanas a comprar, vender y
        alquilar. Cuéntanos qué tienes disponible y te contactamos para evaluarla
        y ponerla frente a los compradores correctos.
      </p>

      <figure class="vender-equipo">
        <img src="/caneycontactpics/caney-equipo.png" alt="Equipo de Inmobiliaria Caney" loading="lazy" decoding="async">
        <figcaption>El equipo de Inmobiliaria Caney</figcaption>
      </figure>

      <ul class="vender-puntos">
        <li><strong>Evaluación sin compromiso</strong> del precio de tu propiedad.</li>
        <li><strong>Publicación profesional</strong> con fotos y ficha técnica completa.</li>
        <li><strong>Acompañamiento</strong> en visitas, negociación y cierre.</li>
      </ul>

      <p class="vender-directo">
        ¿Prefieres escribirnos directo?
        <a href="https://wa.me/18092242769">809-224-2769</a> ·
        <a href="https://wa.me/18293802769">829-380-2769</a>
      </p>
    </section>

    <section class="vender-form-wrap" aria-labelledby="form-title">
      <h2 id="form-title">Cuéntanos sobre tu propiedad</h2>

      <form class="vender-form" name="vender" method="POST"
            data-netlify="true" netlify-honeypot="bot-field" action="/gracias/">
        <input type="hidden" name="form-name" value="vender">
        <p class="vender-hp">
          <label>No llenar este campo: <input name="bot-field"></label>
        </p>

        <div class="campo">
          <label for="nombre">Nombre completo <span aria-hidden="true">*</span></label>
          <input type="text" id="nombre" name="nombre" required autocomplete="name">
        </div>

        <div class="campo-fila">
          <div class="campo">
            <label for="telefono">Teléfono <span aria-hidden="true">*</span></label>
            <input type="tel" id="telefono" name="telefono" required autocomplete="tel"
                   placeholder="809-000-0000">
          </div>
          <div class="campo">
            <label for="email">Correo electrónico <span aria-hidden="true">*</span></label>
            <input type="email" id="email" name="email" required autocomplete="email"
                   placeholder="nombre@correo.com">
          </div>
        </div>

        <div class="campo-fila">
          <div class="campo">
            <label for="tipo">Tipo de propiedad <span aria-hidden="true">*</span></label>
            <select id="tipo" name="tipo" required>
              <option value="">Selecciona una opción</option>
              ${tipos.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}
            </select>
          </div>
          <div class="campo">
            <label for="sector">Sector</label>
            <input type="text" id="sector" name="sector" list="sectoresVender"
                   placeholder="Ej. Piantini, Bella Vista">
            <datalist id="sectoresVender">${sectorOpts}</datalist>
          </div>
        </div>

        <div class="campo">
          <label for="ubicacion">Ubicación <span aria-hidden="true">*</span></label>
          <input type="text" id="ubicacion" name="ubicacion" required
                 placeholder="Ciudad, avenida o referencia cercana">
        </div>

        <div class="campo">
          <label for="detalles">Detalles de la propiedad</label>
          <textarea id="detalles" name="detalles" rows="5"
                    placeholder="Metros cuadrados, habitaciones, baños, parqueos, precio esperado…"></textarea>
        </div>

        <div class="campo campo--check">
          <label>
            <input type="checkbox" name="operacion" value="Venta" checked> Quiero vender
          </label>
          <label>
            <input type="checkbox" name="operacion" value="Alquiler"> Quiero alquilar
          </label>
        </div>

        <button type="submit" class="vender-submit">Enviar mi propiedad</button>
        <p class="vender-nota">Al enviar, un asesor de Caney te contacta por teléfono o correo.</p>
      </form>
    </section>
  </main>

  <footer>
    <span>Inmobiliaria Caney ${new Date().getFullYear()}</span>
    <span><a href="/" class="footerbutton" rel="noopener">Ver propiedades</a></span>
  </footer>
</body>
</html>`;
  }
};
