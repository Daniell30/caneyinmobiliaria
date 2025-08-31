// src/index.11ty.js
const fs = require("fs");
const path = require("path");
const slugify = require("./_utils/slugify");

module.exports = class {
  data() {
    const dataDir = path.join(__dirname, "_data");
    const slides = JSON.parse(
      fs.readFileSync(path.join(dataDir, "featured_slides.json"), "utf-8")
    );
    const props = JSON.parse(
      fs.readFileSync(path.join(dataDir, "properties.json"), "utf-8")
    );

    // Map by filename for quick lookup
    const byFilename = new Map(
      props.map((p) => [String(p.filename || "").trim(), p])
    );

    // Resolve each slide to a final href (or none)
    const slidesResolved = slides
      .map((s) => {
        const explicit =
          typeof s.href === "string" && s.href.trim() !== "" && s.href.trim() !== "#"
            ? s.href.trim()
            : null;

        if (explicit) return { ...s, href: explicit };

        const key = String(s.refFilename || s.reffilename || "").trim();
        if (key && byFilename.has(key)) {
          const p = byFilename.get(key);
          const href = `${slugify(p.title || "")}-${slugify(p.sector || p.area || "")}.html`;
          return { ...s, href };
        }

        // No link
        return { ...s, href: "" };
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return {
      permalink: "Index.html",
      slidesResolved,
      eleventyExcludeFromCollections: true,
    };
  }

  render({ slidesResolved }) {
    const sliderItems = (slidesResolved && slidesResolved.length
      ? slidesResolved
      : [
          { image: "CSS/SLIDER/CaneyGroupbanner.png", alt: "Slide 1", href: "" },
          { image: "CSS/SLIDER/1.png", alt: "Slide 2", href: "" },
          { image: "CSS/SLIDER/2.png", alt: "Slide 3", href: "" },
          { image: "CSS/SLIDER/3.png", alt: "Slide 4", href: "" },
        ]
    )
      .map((s, i) => {
        const hasHref =
          typeof s.href === "string" &&
          s.href.trim() !== "" &&
          s.href.trim() !== "#";

        const img = `<img src="${s.image}" alt="${s.alt || "Slide"}" class="${
          i === 0 ? "active" : ""
        }">`;

        // Use <div> when there is no link
        return hasHref
          ? `<a class="slide" href="${s.href}">${img}</a>`
          : `<div class="slide">${img}</div>`;
      })
      .join("\n");

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Inmobiliaria Caney</title>
  <link href="CSS/Caneyvisual.css" rel="stylesheet">
</head>

<body>
  <!-- HEADER with logo + area-links -->
  <header> 
    <nav class="navbar">
      <img src="CSS/Images caney/GENERAL/CANEYLOGO.png" alt="CaneyLogo" class="logo">
      <div class="nav-links">
        <a href="INMUEBLES SANTO DOMINGO.html" >Santo Domingo</a>
        <a href="INMUEBLES PUNTA CANA.html" >Punta Cana</a>
        <a href="INMUEBLES JUAN DOLIO.html" >Juan Dolio</a>
        <a href="INMUEBLES SOLARES.html" >Solares</a>
        <a href="INMUEBLES OTRO.html" >Otro</a>
      </div>
    </nav>
  </header>

  <!-- 1) IMAGE SLIDER -->
  <section class="slider">
    <div class="slides">
${sliderItems}
    </div>
    <button class="slider-btn prev" aria-label="Anterior">‹</button>
    <button class="slider-btn next" aria-label="Siguiente">›</button>
  </section>

  <!-- 2) ¿Qué buscas? -->
  <main class="members">
    <section>
      <h3 class="quebuscasopening">¿Qué buscas?</h3>
      <div class="quebuscas">
        <div class="SantoDomingo">
          <img src="CSS/Images caney/GENERAL/1.png" alt="stodmg" class="icon">
          <p>Santo Domingo</p>
          <a href="INMUEBLES SANTO DOMINGO.html" target="_blank">
            <img src="CSS/Images caney/GENERAL/Verinmuebles boton.png" alt="Learn More" class="learnmore">
          </a>
        </div>
        <div class="column">
          <img src="CSS/Images caney/GENERAL/2.png" alt="puntacana" class="icon">
          <p>Punta Cana</p>
          <a href="INMUEBLES PUNTA CANA.html" target="_blank">
            <img src="CSS/Images caney/GENERAL/Verinmuebles boton.png" alt="Learn More" class="learnmore">
          </a>
        </div>
        <div class="column">
          <img src="CSS/Images caney/GENERAL/3.png" alt="Solares" class="icon">
          <p>Solares</p>
          <a href="INMUEBLES SOLARES.html" target="_blank">
            <img src="CSS/Images caney/GENERAL/Verinmuebles boton.png" alt="Learn More" class="learnmore">
          </a>
        </div>
        <div class="column">
          <img src="CSS/Images caney/GENERAL/4.png" alt="juandolio" class="icon">
          <p>Juan Dolio</p>
          <a href="INMUEBLES JUAN DOLIO.html" target="_blank">
            <img src="CSS/Images caney/GENERAL/Verinmuebles boton.png" alt="Learn More" class="learnmore">
          </a>
        </div>
        <div class="column">
          <img src="CSS/Images caney/GENERAL/OTRO.png" alt="otro" class="icon">
          <p>Otro</p>
          <a href="INMUEBLES OTRO.html" target="_blank">
            <img src="CSS/Images caney/GENERAL/Verinmuebles boton.png" alt="Learn More" class="learnmore">
          </a>
        </div>
      </div>
    </section>

    <!-- 3) Intro text -->
    <section class="intro-section">
      <h3 class="intro">
        Inmobiliaria Caney te ofrece más de dos décadas de experiencia en el mercado inmobiliario de la República Dominicana, con propiedades en las mejores zonas de Santo Domingo, Punta Cana, y más. Ya sea que busques alquilar, comprar o invertir en terrenos, estamos aquí para hacer realidad tu visión de hogar o negocio con confianza y profesionalismo.
      </h3>
      <h3 class="intro2">¡Descubre tu destino con nosotros!</h3>
    </section>
  </main>

  <!-- 4) CTA -->
  <div class="contact-cta">
    <a href="https://www.instagram.com/caneyinmobiliaria/" class="btn-contact" target="_blank">Contáctanos Hoy Mismo</a>
  </div>

  <footer>
    <span>Inmobiliaria Caney 2025</span>
  </footer>

  <!-- Slider script (no visual changes; matches your CSS) -->
  <script>
(() => {
  const wrappers = Array.from(document.querySelectorAll('.slides > a, .slides > div'));
  const imgs     = wrappers.map(w => w.querySelector('img'));
  const prevBtn  = document.querySelector('.slider .prev');
  const nextBtn  = document.querySelector('.slider .next');

  let idx = Math.max(0, imgs.findIndex(img => img.classList.contains('active')));
  if (idx < 0) idx = 0;

  function fadeIn(img) {
    // fade the newly shown image from 0 -> 1
    img.style.opacity = '0';
    img.style.transition = 'opacity 450ms ease';
    // force a reflow so the 0 opacity applies before changing to 1
    void img.offsetWidth;
    img.style.opacity = '1';
  }

  function show(i){
    const oldIdx = idx;
    idx = (i + imgs.length) % imgs.length;

    // show only the new wrapper (keeps non-active slides from catching clicks)
    wrappers.forEach((w, n) => {
  w.style.display = '';  // keep both stacked
  w.style.pointerEvents = (n === idx) ? 'auto' : 'none';
  w.style.zIndex = (n === idx) ? '2' : '1';
});

    // toggle the active img (your CSS handles display: none/block)
    imgs.forEach((image, n) => image.classList.toggle('active', n === idx));

    // animate the new one
    fadeIn(imgs[idx]);

    // cleanup previous inline styles so they don't accumulate
    if (oldIdx !== idx) {
      const prev = imgs[oldIdx];
      if (prev) { prev.style.opacity = ''; prev.style.transition = ''; }
    }
  }

  const INTERVAL_MS = 4000;
  let timer = null;
  function start(){ stop(); if (imgs.length > 1) timer = setInterval(() => show(idx + 1), INTERVAL_MS); }
  function stop(){ if (timer) { clearInterval(timer); timer = null; } }

  prevBtn && prevBtn.addEventListener('click', () => { show(idx - 1); start(); });
  nextBtn && nextBtn.addEventListener('click', () => { show(idx + 1); start(); });

  const slider = document.querySelector('.slider');
  slider && slider.addEventListener('mouseenter', stop);
  slider && slider.addEventListener('mouseleave', start);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

  // init
  show(idx);
  start();
})();
</script>

</body>
</html>`;
  }
};
