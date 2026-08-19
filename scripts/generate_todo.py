#!/usr/bin/env python3
"""Regenerate TODO-content.md: everything awaiting owner input, by property.

Nothing here can be produced by the tooling — these are facts and local
market knowledge only Inmobiliaria Caney has. Re-run after editing
properties.json:  python3 scripts/generate_todo.py
"""
import json, os, re, subprocess, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def slug(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"(^-|-$)", "", s)

props = json.load(open(os.path.join(ROOT, "src/_data/properties.json")))

# sector pages come from the same module the templates use
node_pages = []
groups = {}
for p in props:
    groups.setdefault((p.get("area", ""), p.get("sector", "")), []).append(p)
sector_groups = {k: v for k, v in groups.items() if len(v) >= 2}

OPTIONAL = [("parking", "Parqueos"), ("level", "Nivel"), ("yearBuilt", "Año de construcción"),
            ("condition", "Condición (nueva / usada)"), ("furnished", "Amueblado (sí / no)"),
            ("status", "Estado (Disponible / Reservado / Vendido)"),
            ("updated", "Fecha de actualización (AAAA-MM-DD)")]
CORE = [("size", "Metraje"), ("bedrooms", "Habitaciones"), ("bathrooms", "Baños")]

L = ["# TODO — contenido pendiente (para el dueño)", "",
     "Archivo generado por `scripts/generate_todo.py`. Cada punto necesita",
     "información que sólo Inmobiliaria Caney tiene: la herramienta no inventa",
     "datos, descripciones ni coordenadas.", "",
     "Los campos opcionales ya existen (vacíos) en `src/_data/properties.json`:",
     "basta con escribir el valor entre las comillas y el sitio lo muestra en la",
     "ficha técnica y en los datos estructurados.", "",
     "---", ""]

# 1. descriptions (Phase 4.4)
L += ["## 1. Descripciones ampliadas (250–400 palabras)", "",
      "Es lo que más impacto tiene en respuestas de IA: la prosa es lo que un",
      "modelo sintetiza. Incluir distribución y terminaciones, referencias del",
      "sector (parques, avenidas, colegios, supermercados), para quién es la",
      "propiedad y detalles del edificio (ascensores, planta, cisterna, seguridad,",
      "mantenimiento).", ""]
short = [(p, len(str(p.get("description") or "").split())) for p in props]
for p, w in sorted(short, key=lambda x: x[1]):
    if w < 250:
        L.append(f"- [ ] **{p['title']}** — {w} palabras, faltan ~{max(0, 250 - w)}")
L.append("")

# 2. missing structured fields
L += ["## 2. Datos de ficha técnica", ""]
for p in props:
    miss = [lbl for k, lbl in CORE
            if not str(p.get(k) or "").strip() or str(p.get(k)).strip().upper() == "N/A"]
    miss += [lbl for k, lbl in OPTIONAL if not str(p.get(k) or "").strip()]
    if miss:
        L.append(f"- [ ] **{p['title']}**: {', '.join(miss)}")
L.append("")

# 3. FAQ (Phase 4.3)
L += ["## 3. Preguntas frecuentes por propiedad", "",
      'Formato en `properties.json`: `"faq": [{"q": "¿...?", "a": "..."}]`.',
      "Al llenarlo aparece la sección visible y el schema `FAQPage`.",
      "Sugerencias de preguntas reales: mantenimiento mensual, si aplica bono de",
      "primera vivienda, formas de pago/financiamiento, tiempo de entrega,",
      "si acepta mascotas, qué incluye el precio.", ""]
for p in props:
    if not p.get("faq"):
        L.append(f"- [ ] {p['title']}")
L.append("")

# 4. photo alt text
L += ["## 4. Descripciones de fotos (texto alt)", "",
      "Hoy cada foto lleva un alt genérico («Vista N de …»). Una frase por foto",
      "que diga qué muestra (p. ej. «Sala del apartamento de 180 m² en Av.",
      "Enriquillo») las hace útiles para buscadores y asistentes de IA.", ""]
for p in props:
    L.append(f"### {p['title']}")
    for img in p.get("images", []):
        L.append(f"- [ ] `{p['folder']}/{img}` — ")
    L.append("")

# 5. sector prose (Phase 5)
L += ["## 5. Contexto de mercado por zona (400–600 palabras)", "",
      "Las páginas de zona ya tienen tabla comparativa y datos estructurados.",
      "Falta el texto: es la ventaja competitiva real frente a los portales, y",
      "por eso no se genera automáticamente. Entregar a Claude o pegarlo en el",
      "comentario TODO de cada página.", ""]
for (area, sector), items in sorted(sector_groups.items(), key=lambda kv: -len(kv[1])):
    L.append(f"- [ ] **{sector}** ({area}) — {len(items)} propiedades")
L.append("")

# 6. contact + geo
L += ["## 6. Página de contacto", "",
      "- [ ] Dirección física de la oficina (falta en /contact/ y en el schema de la organización)",
      "- [ ] Horario de atención", "",
      "## 7. Coordenadas GPS (schema `geo`)", "",
      "Opcional pero útil para búsquedas por cercanía. Google Maps → clic derecho",
      "sobre el punto → copiar coordenadas.", ""]
for p in props:
    L.append(f"- [ ] {p['title']} — lat: ____ , lng: ____")
L.append("")

open(os.path.join(ROOT, "TODO-content.md"), "w").write("\n".join(L))
n = sum(1 for x in L if x.startswith("- [ ]"))
print(f"wrote TODO-content.md: {n} pending items")
