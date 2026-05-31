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
          typeof s.href === "string" &&
          s.href.trim() !== "" &&
          s.href.trim() !== "#"
            ? s.href.trim()
            : null;

        if (explicit) return { ...s, href: explicit };

        const key = String(s.refFilename || s.reffilename || "").trim();
        if (key && byFilename.has(key)) {
          const p = byFilename.get(key);
          const href = `${slugify(p.title || "")}-${slugify(
            p.sector || p.area || ""
          )}.html`;
          return { ...s, href };
        }

        // No link
        return { ...s, href: "" };
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return {
      // Use the shared layout (adds <html>, <head>, SEO tags)
      layout: "layouts/base.njk",

      // Load this page's stylesheet through the layout
      pageCSS: "/CSS/Caneyvisual.css",

      // Page URL
      permalink: "Index.html",

      // SEO fields consumed by the layout’s SEO macro
      pageTitle: "Inmobiliaria Caney | Propiedades en República Dominicana",
      pageDesc:
        "Compra y venta de apartamentos, villas, solares y proyectos inmobiliarios en todo el país. Experiencia y confianza en Santo Domingo, Punta Cana, Juan Dolio y más.",
      pageImage: "/CSS/Images caney/GENERAL/CANEYLOGO.png",

      // Page data
      slidesResolved,
      eleventyExcludeFromCollections: true,
    };
  }

  render({ slidesResolved }) {
    const sliderItems = (slidesResolved && slidesResolved.length
      ? slidesResolved
      : [
          { image: "CSS/SLIDER/CaneyGroupbanner.png", alt: "Slide 1", href: "" },
          { image: "CSS/SLIDER/4.png", alt: "Slide 2", href: "" },
          { image: "CSS/SLIDER/1.png", alt: "Slide 3", href: "" },
          { image: "CSS/SLIDER/2.png", alt: "Slide 4", href: "" },
          { image: "CSS/SLIDER/3.png", alt: "Slide 5", href: "" },
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

    // Return ONLY the body markup; the layout supplies <html> and <head>.
    return `
  <!-- HEADER with logo + area-links -->
  <header> 
    <nav class="navbar">
      <img src="CSS/Images caney/GENERAL/CANEYLOGO.png" alt="CaneyLogo" class="logo">
      <button class="menu-toggle" aria-label="Abrir menú" aria-expanded="false">☰</button>
      <div class="nav-links">
        <a href="INMUEBLES SANTO DOMINGO.html">Santo Domingo</a>
        <a href="INMUEBLES PUNTA CANA.html">Punta Cana</a>
        <a href="INMUEBLES JUAN DOLIO.html">Juan Dolio</a>
        <a href="INMUEBLES SOLARES.html">Solares</a>
        <a href="INMUEBLES OTRO.html">Otro</a>
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
    <section class="search-section">
      <h3 class="quebuscasopening">¿Qué buscas?</h3>
      <div class="quebuscas">
        <div class="SantoDomingo location-card">
          <img src="CSS/Images caney/GENERAL/1.png" alt="Santo Domingo" class="icon" loading="lazy" decoding="async">
          <p class="location-name">Santo Domingo</p>
          <a href="INMUEBLES SANTO DOMINGO.html" target="_blank" rel="noopener" class="learnmore">
            Ver inmuebles
          </a>
        </div>
        <div class="column location-card">
          <img src="CSS/Images caney/GENERAL/2.png" alt="Punta Cana" class="icon" loading="lazy" decoding="async">
          <p class="location-name">Punta Cana</p>
          <a href="INMUEBLES PUNTA CANA.html" target="_blank" rel="noopener" class="learnmore">
            Ver inmuebles
          </a>
        </div>
        <div class="column location-card">
          <img src="CSS/Images caney/GENERAL/3.png" alt="Solares" class="icon" loading="lazy" decoding="async">
          <p class="location-name">Solares</p>
          <a href="INMUEBLES SOLARES.html" target="_blank" rel="noopener" class="learnmore">
            Ver inmuebles
          </a>
        </div>
        <div class="column location-card">
          <img src="CSS/Images caney/GENERAL/4.png" alt="Juan Dolio" class="icon" loading="lazy" decoding="async">
          <p class="location-name">Juan Dolio</p>
          <a href="INMUEBLES JUAN DOLIO.html" target="_blank" rel="noopener" class="learnmore">
            Ver inmuebles
          </a>
        </div>
        <div class="column location-card">
          <img src="CSS/Images caney/GENERAL/OTRO.png" alt="Otro" class="icon" loading="lazy" decoding="async">
          <p class="location-name">Otro</p>
          <a href="INMUEBLES OTRO.html" target="_blank" rel="noopener" class="learnmore">
            Ver inmuebles
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
    <a href="https://daniell30.github.io/caney-contact-linktree/" class="btn-contact" target="_blank">Contáctanos Hoy Mismo</a>
  </div>

  <footer>
    <span>Inmobiliaria Caney 2026</span>
  </footer>

  <!-- Mobile nav toggle -->
  <script>
(() => {
  const nav = document.querySelector('.navbar');
  const toggle = document.querySelector('.menu-toggle');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('open');
    });
  }
})();
  </script>

  <!-- Slider script -->
  <script>
(() => {
  const wrappers = Array.from(document.querySelectorAll('.slides > a, .slides > div'));
  const imgs     = wrappers.map(w => w.querySelector('img'));
  const prevBtn  = document.querySelector('.slider .prev');
  const nextBtn  = document.querySelector('.slider .next');

  let idx = Math.max(0, imgs.findIndex(img => img.classList.contains('active')));
  if (idx < 0) idx = 0;

  function fadeIn(img) {
    img.style.opacity = '0';
    img.style.transition = 'opacity 450ms ease';
    void img.offsetWidth;
    img.style.opacity = '1';
  }

  function show(i){
    const oldIdx = idx;
    idx = (i + imgs.length) % imgs.length;

    wrappers.forEach((w, n) => {
      w.style.display = '';
      w.style.pointerEvents = (n === idx) ? 'auto' : 'none';
      w.style.zIndex = (n === idx) ? '2' : '1';
    });

    imgs.forEach((image, n) => image.classList.toggle('active', n === idx));
    fadeIn(imgs[idx]);

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
`;
  }
};

