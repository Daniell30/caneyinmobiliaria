# Cómo agregar una propiedad

El flujo es el mismo de siempre: **subir las fotos a una carpeta + agregar el
objeto en `src/_data/properties.json`**. Todo lo demás (página de detalle,
tarjeta en la página de la zona, sitemap, datos estructurados, página de
sector) se genera solo en el build de Netlify.

Cambió **una sola cosa** respecto a antes: dónde van las fotos y cómo se
nombra la carpeta.

---

## 1. Subir las fotos

Ruta correcta (todo en minúsculas y con guiones, sin espacios ni paréntesis):

```
src/css/images-caney/<zona>/<nombre-de-la-propiedad>/1.png
```

Ejemplo:

```
src/css/images-caney/santo-domingo/apartamento-naco-torre-sol/1.png
```

Zonas disponibles: `santo-domingo`, `punta-cana`, `juan-dolio`, `solares`, `otro`.

> ⚠️ **Antes** las fotos iban en `src/CSS/Images Caney/Santo Domingo/NOMBRE EN MAYÚSCULAS/`.
> Esa ruta ya no existe y **no se publica**: si subes fotos ahí, no aparecerán
> en el sitio. Usa siempre `src/css/images-caney/` en minúsculas.

Los nombres de archivo también en minúsculas (`1.png`, `2.png`, …), sin
espacios ni paréntesis.

## 2. Agregar la propiedad en `src/_data/properties.json`

Copia un bloque existente y cambia los valores. `folder` es la ruta **a partir
de** `images-caney/`:

```json
{
  "title": "Apartamento en Naco, Torre Sol",
  "filename": "ApartamentoNacoTorreSol",
  "area": "Santo Domingo",
  "sector": "Naco",
  "type": "Apartamento",
  "location": "Calle Fantino Falco, Naco, Distrito Nacional",
  "price": "US$285,000",
  "size": "160 m²",
  "bedrooms": "3",
  "bathrooms": "2.5 baños",
  "operation": "",
  "parking": "",
  "level": "",
  "yearBuilt": "",
  "condition": "",
  "furnished": "",
  "status": "",
  "updated": "",
  "faq": [],
  "folder": "santo-domingo/apartamento-naco-torre-sol",
  "images": ["1.png", "2.png", "3.png"],
  "description": "..."
}
```

- `filename` es el código de referencia interno: único, sin espacios.
- `area` decide en cuál de las cinco páginas de categoría aparece.
- Los campos opcionales pueden quedar vacíos. Si los llenas, aparecen solos en
  la ficha técnica y en los datos estructurados:
  - `status`: `Disponible`, `Reservado`, `Vendido` o `Alquilado` (vacío = Disponible)
  - `updated`: fecha `AAAA-MM-DD`; muestra «Actualizado: …» en la página
  - `parking`, `level`, `yearBuilt`, `condition`, `furnished`: texto libre corto
  - `faq`: `[{"q": "¿Incluye mantenimiento?", "a": "Sí, …"}]`

## 3. Verificar antes de subir

```bash
python3 scripts/check_properties.py
```

Revisa que la carpeta y cada foto existan, que los nombres cumplan la
convención y que no haya URLs duplicadas. Si sale `0 errores`, está listo.

## 4. Actualizar los dos archivos generados

```bash
python3 scripts/derive_listing_dates.py   # fecha de publicación de la propiedad
python3 scripts/generate_redirects.py     # redirección .html → URL sin extensión
```

Ninguno de los dos es obligatorio para que el sitio funcione, pero sin ellos
la propiedad nueva no muestra fecha de publicación y su URL con `.html` no
redirige a la versión limpia.

## 5. Subir

```bash
git add -A && git commit -m "Agregar propiedad: Apartamento en Naco" && git push
```

Netlify reconstruye el sitio solo. Después de que despliegue:

```bash
python3 scripts/check_links.py --base-url https://caneyinmobiliaria.com
```

---

## Lo que se genera solo (no hay que tocar nada)

- La página de detalle y su URL (`/apartamento-en-naco-torre-sol-naco`)
- La tarjeta en la página de la zona y en los filtros
- `sitemap.xml`
- Los datos estructurados (`RealEstateListing`, precio, dirección, habitaciones…)
- Las páginas de zona: si el sector llega a **2 propiedades**, se crea sola su
  página (ej. `/apartamentos-en-venta-naco`) con su tabla comparativa

## Para quitar una propiedad

Borra su objeto de `properties.json`. **No borres las fotos** si piensas
volver a publicarla — quedan como carpeta sin usar y el validador te lo avisa.
