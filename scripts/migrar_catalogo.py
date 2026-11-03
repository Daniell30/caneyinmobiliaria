#!/usr/bin/env python3
"""Fase 1 del CMS: divide src/_data/properties.json en un archivo por propiedad.

Se ejecuta una sola vez:  python3 scripts/migrar_catalogo.py

Escribe src/propiedades/<slug>.json para cada propiedad, sin tocar ningún
dato existente y añadiendo arriba tres campos:
  - slug        la URL actual de la ficha (slugify(title)-slugify(sector||area)),
                que a partir de ahora queda fija aunque cambie el título.
  - orden       la posición actual en el arreglo (1..N). El sitio ordena por
                `orden` ascendente y luego por `datePosted` descendente, así que
                el orden de las tarjetas no cambia.
  - datePosted  la fecha de src/_data/listing_dates.json (la que ya se publica).

El resto de los campos conserva su valor y su orden. Una excepción: TerrazasC
traía un "slug" viejo que no era su URL; se sobrescribe con la URL real.
"""
import json, os, re, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src/_data/properties.json")
DATES = os.path.join(ROOT, "src/_data/listing_dates.json")
OUT = os.path.join(ROOT, "src/propiedades")
NUEVOS = ("slug", "orden", "datePosted")


def slugify(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"(^-|-$)", "", s)


def main():
    props = json.load(open(SRC, encoding="utf-8"))
    dates = json.load(open(DATES, encoding="utf-8"))

    if os.path.isdir(OUT) and os.listdir(OUT):
        sys.exit(f"ERROR: {OUT} ya tiene archivos; no se sobrescribe nada.")

    salida, slugs, codigos = [], set(), set()
    for i, p in enumerate(props):
        slug = f"{slugify(p['title'])}-{slugify(p.get('sector') or p.get('area') or '')}"
        codigo = p["filename"]
        if slug in slugs:
            sys.exit(f"ERROR: slug repetido: {slug}")
        if codigo in codigos:
            sys.exit(f"ERROR: filename repetido: {codigo}")
        if not dates.get(codigo):
            sys.exit(f"ERROR: {codigo} no tiene fecha en listing_dates.json")
        if "datePosted" in p or "orden" in p:
            sys.exit(f"ERROR: {codigo} ya tiene datePosted u orden; revisar a mano")
        if "slug" in p and p["slug"] != slug:
            print(f"  {codigo}: slug viejo '{p['slug']}' sobrescrito con la URL real '{slug}'")
        slugs.add(slug)
        codigos.add(codigo)

        nuevo = {"slug": slug, "orden": i + 1, "datePosted": dates[codigo]}
        nuevo.update((k, v) for k, v in p.items() if k != "slug")
        salida.append(nuevo)

    os.makedirs(OUT, exist_ok=True)
    for p in salida:
        with open(os.path.join(OUT, f"{p['slug']}.json"), "w", encoding="utf-8") as fh:
            fh.write(json.dumps(p, indent=2, ensure_ascii=False) + "\n")

    # Comprobación: releer lo escrito y compararlo con el original.
    leidos = [json.load(open(os.path.join(OUT, f), encoding="utf-8"))
              for f in sorted(os.listdir(OUT))]
    leidos.sort(key=lambda p: p["orden"])
    for orig, p in zip(props, leidos):
        sin_nuevos = {k: v for k, v in p.items() if k not in NUEVOS}
        orig_sin_slug = {k: v for k, v in orig.items() if k != "slug"}
        if sin_nuevos != orig_sin_slug or list(sin_nuevos) != list(orig_sin_slug):
            sys.exit(f"ERROR: {orig['filename']} no coincide con el original")
        if p["datePosted"] != dates[orig["filename"]]:
            sys.exit(f"ERROR: {orig['filename']} tiene otra fecha")
    if len(leidos) != len(props):
        sys.exit(f"ERROR: {len(leidos)} archivos para {len(props)} propiedades")
    print(f"escritos {len(salida)} archivos en src/propiedades/ — verificados contra properties.json")


if __name__ == "__main__":
    main()
