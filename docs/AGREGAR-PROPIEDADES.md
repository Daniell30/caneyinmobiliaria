# Cómo agregar una propiedad

El flujo: **subir las fotos a una carpeta + crear un archivo JSON para la
propiedad en `src/propiedades/`**. Todo lo demás (página de detalle, tarjeta
en la página de la zona, sitemap, datos estructurados, página de sector) se
genera solo en el build de Netlify.

> Desde noviembre de 2026 cada propiedad es **un archivo propio** en
> `src/propiedades/`. El antiguo `src/_data/properties.json`, con todas juntas,
> ya no existe: no lo vuelvas a crear.

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

## 2. Crear el archivo de la propiedad en `src/propiedades/`

Copia un archivo existente de `src/propiedades/`, renómbralo con el `slug` de
la propiedad nueva (`<slug>.json`) y cambia los valores. Los tres primeros
campos son los que controlan la URL, el orden y la fecha:

```json
{
  "slug": "apartamento-en-naco-torre-sol-naco",
  "orden": 0,
  "datePosted": "2026-11-03",
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

- `slug` es la URL de la ficha (`/apartamento-en-naco-torre-sol-naco`) y el
  nombre del archivo (`apartamento-en-naco-torre-sol-naco.json`). Se arma con
  el título y el sector, en minúsculas, sin acentos y con guiones, igual que
  las demás. **Queda fija**: si después corriges el título, la URL no cambia.
  Si alguna vez hay que cambiarla a propósito, cambia el `slug`, renombra el
  archivo y agrega `"slug-viejo": "slug-nuevo"` en `scripts/legacy-slugs.json`
  para que la URL anterior redirija.
- `orden: 0` hace que la propiedad salga **de primera** en la página de su
  zona y en /buscar/. El sitio ordena por `orden` (de menor a mayor) y, entre
  las que tienen el mismo `orden`, la de `datePosted` más reciente va arriba.
  Las propiedades publicadas antes de noviembre de 2026 tienen `orden` 1, 2,
  3… (su posición de siempre), así que las nuevas con `0` quedan encima. Para
  fijar una propiedad arriba de todas, usa un número negativo (`-1`).
- `datePosted` es la fecha de publicación (`AAAA-MM-DD`, la de hoy al
  agregarla). Se muestra como «Publicado: …» y va en los datos estructurados.
  No la cambies después: para eso está `updated`.
- `filename` es el código de referencia interno: único, sin espacios. El
  carrusel del inicio (`featured_slides.json`) usa este código.
- `folder` es la ruta de las fotos **a partir de** `images-caney/`.
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
convención, que `slug`, `orden` y `datePosted` estén bien escritos y que no
haya URLs ni códigos duplicados. Si sale `0 errores`, está listo.

## 4. Actualizar el archivo generado

```bash
python3 scripts/generate_redirects.py     # redirección .html → URL sin extensión
```

No es obligatorio para que el sitio funcione, pero sin él la URL con `.html`
de la propiedad nueva no redirige a la versión limpia. (Ya no hace falta
`derive_listing_dates.py`: la fecha va en `datePosted`.)

## 5. Subir

```bash
git add src/propiedades src/css/images-caney src/_redirects
git commit -m "Agregar propiedad: Apartamento en Naco" && git push
```

Netlify reconstruye el sitio solo. Después de que despliegue:

```bash
python3 scripts/check_links.py --base-url https://caneyinmobiliaria.com
```

---

## Lo que se genera solo (no hay que tocar nada)

- La página de detalle en la URL de su `slug` (`/apartamento-en-naco-torre-sol-naco`)
- La tarjeta en la página de la zona y en los filtros
- `sitemap.xml`
- Los datos estructurados (`RealEstateListing`, precio, dirección, habitaciones…)
- Las páginas de zona: si el sector llega a **2 propiedades**, se crea sola su
  página (ej. `/apartamentos-en-venta-naco`) con su tabla comparativa

## Para quitar una propiedad

Borra su archivo de `src/propiedades/`. **No borres las fotos** si piensas
volver a publicarla — quedan como carpeta sin usar y el validador te lo avisa.
