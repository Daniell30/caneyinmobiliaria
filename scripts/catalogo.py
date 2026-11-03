"""Lectura del catálogo para los scripts: un archivo JSON por propiedad en
src/propiedades/. Gemelo de src/_utils/catalogo.js (lo que usan las
plantillas): mismo respaldo de slug y mismo orden, para que los scripts y el
sitio vean las propiedades exactamente igual.

    import catalogo
    props = catalogo.load_properties()
"""
import json, os, re, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "src", "propiedades")


def slugify(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"(^-|-$)", "", s)


def fallback_slug(p):
    """URL de respaldo para un archivo sin `slug`: la fórmula de siempre."""
    return f"{slugify(p.get('title') or '')}-{slugify(p.get('sector') or p.get('area') or '')}"


def read_files():
    """[(nombre de archivo, propiedad)] tal como están en disco."""
    out = []
    for name in sorted(os.listdir(DIR)):
        if not name.endswith(".json"):
            continue
        try:
            with open(os.path.join(DIR, name), encoding="utf-8") as fh:
                out.append((name, json.load(fh)))
        except json.JSONDecodeError as e:
            raise SystemExit(f"ERROR: src/propiedades/{name}: JSON inválido ({e})")
    return out


def _orden(p):
    o = p.get("orden")
    return o if isinstance(o, (int, float)) and not isinstance(o, bool) else 0


def ordenar(props):
    """Completa el slug que falte y devuelve las propiedades en el orden del
    sitio: `orden` ascendente, luego `datePosted` más reciente, luego slug."""
    for p in props:
        if not str(p.get("slug") or "").strip():
            p["slug"] = fallback_slug(p)
    props = sorted(props, key=lambda p: p["slug"])
    props.sort(key=lambda p: str(p.get("datePosted") or ""), reverse=True)
    props.sort(key=_orden)
    return props


def load_properties():
    return ordenar([p for _, p in read_files()])
