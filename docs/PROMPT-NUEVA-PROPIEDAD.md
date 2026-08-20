# Prompt para agregar una propiedad nueva

Copia esta plantilla, llena lo que tengas y pégala en Claude Code junto con
la carpeta de fotos. **No hace falta llenar todo**: lo que falte se omite, no
se inventa.

---

## Plantilla

```
Agrega esta propiedad al sitio.

Fotos: @"/Users/daniellombert/Downloads/NOMBRE DE LA CARPETA/"

Zona (Santo Domingo / Punta Cana / Juan Dolio / Solares / Otro): 
Sector (ej. Naco, Bella Vista, Cap Cana): 
Tipo (Apartamento / Casa / Villa / Penthouse / Solar / Proyecto Residencial): 
Operación (Venta / Alquiler): 
Precio: 
Dirección o ubicación: 
Metros cuadrados: 
Habitaciones: 
Baños: 
Parqueos: 
Nivel / piso: 
Amueblado (sí / no): 
Año de construcción: 
Condición (nueva / usada): 
Estado (Disponible / Reservado / Vendido): 

Descripción / características tal como las tengo:
[pega aquí el texto de WhatsApp, Instagram o la ficha del propietario,
tal cual, sin editar]
```

---

## Ejemplo real (el que se usó para El Millón)

```
Agrega esta propiedad al sitio.

Fotos: @"/Users/daniellombert/Downloads/EL MILLON ALQUILER (2)/"

Zona: Santo Domingo
Sector: El Millón
Tipo: Apartamento
Operación: Alquiler
Precio: US$950.00 mensuales

🏡 Apartamento Amueblado en Alquiler – Sector El Millón
Características del apartamento:
* 1 habitación
* 1 baño
* 90 m² de construcción
* Distribuido en dos niveles
* Terraza privada

Amenidades del residencial:
* Piscina
* Gimnasio
* Parqueo techado
* Planta eléctrica
```

---

## Qué hace Claude con eso (no hay que pedirlo)

1. Copia las fotos a `src/css/images-caney/<zona>/<nombre-slug>/`
2. Agrega el objeto en `src/_data/properties.json` con los campos correctos
3. Escribe la descripción **solo con los datos que diste** (no inventa
   metraje, precios, amenidades ni ubicaciones)
4. Ejecuta `check_properties.py`, `derive_listing_dates.py` y
   `generate_redirects.py`
5. Verifica que la página, la ficha técnica y los datos estructurados salgan
   bien antes de hacer commit
6. Te deja los commits listos y te dice el comando para subirlos

## Reglas que Claude sigue siempre

- **No inventa nada.** Si no diste el año de construcción, esa fila no
  aparece; no se rellena con suposiciones.
- Si la propiedad hace que un sector llegue a 2 inmuebles, se crea sola su
  página de zona (tabla comparativa, schema y enlace incluidos).
- La propiedad entra sola en el sitemap, en la página de su zona, en los
  filtros y en el filtro Venta/Alquiler.

## Si algo sale mal

```bash
python3 scripts/check_properties.py     # valida carpetas, fotos y campos
python3 scripts/check_links.py --base-url https://caneyinmobiliaria.com
```
