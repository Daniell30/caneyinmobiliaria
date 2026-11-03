#!/usr/bin/env python3
"""Validate the catalog (src/propiedades/*.json) against the image folders on disk.

Run this BEFORE pushing a new listing — it catches the mistakes that would
otherwise only show up as 404 images on the live site:

    python3 scripts/check_properties.py

Checks per listing: required fields, that the image folder exists under
src/css/images-caney/, that every referenced image file exists, that folder
and file names follow the lowercase-hyphenated convention, that the fixed
URL `slug` is present, well formed and unique, that `filename` is unique,
that `orden` and `datePosted` hold valid values, and that optional fields
(status, updated, faq) hold valid values. Exits non-zero if anything is wrong.
"""
import os, re, sys

import catalogo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_ROOT = os.path.join(ROOT, "src/css/images-caney")
VALID_STATUS = {"", "Disponible", "Reservado", "Vendido", "Alquilado"}
BAD_NAME = re.compile(r"[ ()]|[A-Z]|%20")
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
DATE = re.compile(r"\d{4}-\d{2}-\d{2}")

def main():
    files = catalogo.read_files()
    errors, warnings, slugs, codes = [], [], {}, {}

    # Per file: the fields that keep the URL, the order and the date fixed.
    for fname, p in files:
        where = f"src/propiedades/{fname}"
        slug = p.get("slug")
        if not str(slug or "").strip():
            errors.append(f"{where}: falta 'slug' (la URL fija de la ficha)")
        elif not isinstance(slug, str) or not SLUG.fullmatch(slug):
            errors.append(f"{where}: 'slug' debe ir en minúsculas, con números y guiones "
                          f"— recibido '{slug}'")
        elif fname != f"{slug}.json":
            warnings.append(f"{where}: el archivo debería llamarse {slug}.json, como su slug")
        orden = p.get("orden")
        if orden is not None and (isinstance(orden, bool) or not isinstance(orden, int)):
            errors.append(f"{where}: 'orden' debe ser un número entero — recibido '{orden}'")
        posted = p.get("datePosted")
        if not isinstance(posted, str) or not DATE.fullmatch(posted):
            errors.append(f"{where}: 'datePosted' debe tener formato AAAA-MM-DD — recibido '{posted}'")
        code = str(p.get("filename") or "").strip()
        if code and code in codes:
            errors.append(f"{where}: 'filename' {code} repetido (también en {codes[code]})")
        codes[code] = where

    props = catalogo.ordenar([p for _, p in files])

    for i, p in enumerate(props):
        name = p.get("title") or f"(sin título, posición {i + 1})"

        for field in ("title", "filename", "area", "sector", "type", "folder"):
            if not str(p.get(field) or "").strip():
                errors.append(f"{name}: falta el campo obligatorio '{field}'")

        slug = p["slug"]
        if slug in slugs:
            errors.append(f"{name}: tiene el mismo URL que '{slugs[slug]}' (/{slug})")
        slugs[slug] = name

        folder = str(p.get("folder") or "").strip()
        if folder:
            if BAD_NAME.search(folder):
                errors.append(f"{name}: 'folder' debe ir en minúsculas y con guiones, sin espacios "
                              f"ni paréntesis — recibido '{folder}'")
            fpath = os.path.join(IMG_ROOT, folder)
            if not os.path.isdir(fpath):
                errors.append(f"{name}: la carpeta src/css/images-caney/{folder} no existe")
            else:
                imgs = p.get("images") or []
                if not imgs:
                    warnings.append(f"{name}: no tiene imágenes listadas")
                for img in imgs:
                    if not os.path.isfile(os.path.join(fpath, str(img))):
                        errors.append(f"{name}: la imagen {folder}/{img} no existe")
                    elif BAD_NAME.search(str(img)):
                        errors.append(f"{name}: el archivo '{img}' debe ir en minúsculas, "
                                      f"sin espacios ni paréntesis")

        status = str(p.get("status") or "").strip()
        if status and status not in VALID_STATUS:
            errors.append(f"{name}: 'status' debe ser uno de "
                          f"{sorted(VALID_STATUS - {''})} — recibido '{status}'")

        updated = str(p.get("updated") or "").strip()
        if updated and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", updated):
            errors.append(f"{name}: 'updated' debe tener formato AAAA-MM-DD — recibido '{updated}'")

        faq = p.get("faq")
        if faq and not isinstance(faq, list):
            errors.append(f"{name}: 'faq' debe ser una lista")
        elif isinstance(faq, list):
            for q in faq:
                if not isinstance(q, dict) or not str(q.get("q") or "").strip() \
                        or not str(q.get("a") or "").strip():
                    errors.append(f"{name}: cada entrada de 'faq' necesita 'q' y 'a' con texto")

    # image folders on disk that no listing points to
    used = {str(p.get("folder") or "").strip() for p in props}
    for area in sorted(os.listdir(IMG_ROOT)):
        apath = os.path.join(IMG_ROOT, area)
        if not os.path.isdir(apath) or area == "general":
            continue
        for sub in sorted(os.listdir(apath)):
            if os.path.isdir(os.path.join(apath, sub)) and f"{area}/{sub}" not in used:
                warnings.append(f"carpeta sin usar (ninguna propiedad la referencia): {area}/{sub}")

    for w in warnings:
        print(f"  AVISO  {w}")
    for e in errors:
        print(f"  ERROR  {e}")
    print(f"\n{len(props)} propiedades revisadas — {len(errors)} errores, {len(warnings)} avisos")
    if not errors:
        print("Todo correcto. Después de agregar propiedades, ejecuta también:")
        print("  python3 scripts/generate_redirects.py     # redirección .html de la nueva página")
    sys.exit(1 if errors else 0)

if __name__ == "__main__":
    main()
