// src/gracias.11ty.js — confirmación tras enviar el formulario de /vender/.
const fs = require("fs");
const path = require("path");
const site = JSON.parse(fs.readFileSync(path.join(__dirname, "_data", "site.json"), "utf-8"));

module.exports = class {
  data() {
    return { permalink: "gracias/index.html", eleventyExcludeFromCollections: true };
  }

  render() {
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
  <title>Gracias | ${site.name}</title>
  <meta name="robots" content="noindex,follow">
  <link rel="stylesheet" href="/css/caneyvisual.css">
  <link rel="stylesheet" href="/css/vender.css">
</head>
<body>
  <header><nav class="navbar navbar--simple">
    <a href="/"><img src="/css/images-caney/general/caneylogo.png" alt="Inmobiliaria Caney" class="logo"></a>
  </nav></header>

  <main class="gracias">
    <h1>¡Gracias por escribirnos!</h1>
    <p>
      Recibimos los datos de tu propiedad. Un asesor de Inmobiliaria Caney te
      contactará por teléfono o correo para coordinar la evaluación.
    </p>
    <p>
      ¿Es urgente? Escríbenos por WhatsApp al
      <a href="https://wa.me/18092242769">809-224-2769</a> o al
      <a href="https://wa.me/18293802769">829-380-2769</a>.
    </p>
    <a href="/" class="vender-submit">Volver al inicio</a>
  </main>

  <footer>
    <span>Inmobiliaria Caney ${new Date().getFullYear()}</span>
  </footer>
</body>
</html>`;
  }
};
