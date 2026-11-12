#!/usr/bin/env python3
"""Valida el catálogo (src/propiedades/*.json) antes de subir cambios.

    python3 scripts/validar_catalogo.py

Ejecuta con JavaScriptCore la misma validación que corre en cada build de
Netlify (src/_utils/validar.js): si aquí sale algún ERROR, el build fallará
y no se publicará nada. Sustituye a scripts/check_properties.py.
"""
import sys

import jsc

r = jsc.run('require("./src/_utils/validar").validateCatalog()')
for w in r["warnings"]:
    print(f"  AVISO  {w}")
for e in r["errors"]:
    print(f"  ERROR  {e}")
print(f"\n{r['count']} propiedades revisadas — {len(r['errors'])} errores, {len(r['warnings'])} avisos")
if not r["errors"]:
    print("Todo correcto: el build de Netlify aceptará el catálogo y generará solo las redirecciones.")
sys.exit(1 if r["errors"] else 0)
