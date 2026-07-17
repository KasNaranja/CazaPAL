# CazaPAL 🎮🇪🇸

**Encuentra copias en español de videojuegos en Vinted.** CazaPAL busca un
juego por título en Vinted, analiza con IA las fotos de portada y contraportada
de cada anuncio para decidir si la copia está en español, y te muestra **solo
las copias en castellano, de la más barata a la más cara**.

La IA de visión es **Google Gemini en su nivel gratuito** (0 €). Para uso
personal no tiene coste.

---

## ✨ Qué hace

- **Busca en Vinted** (`vinted.es`) por título, con filtro de consola.
- **Análisis progresivo con IA**: los resultados aparecen al instante y cada
  tarjeta actualiza su distintivo en vivo — verde **✓ En español**, rojo
  **✗ Otro idioma** o ámbar **? No concluyente**. Barra "Analizadas 12 de 40".
- **Solo en español** (activado por defecto): confirmadas primero, no
  concluyentes plegadas, otro idioma ocultas.
- **Orden por precio total** (artículo + envío), con orden secundario por
  precio de artículo.
- **Evidencia por veredicto**: toca el distintivo y ves la razón de la IA.
- **Modo demo**: sin clave configurada, arranca con la búsqueda de ejemplo
  "Pokémon Esmeralda" (12 anuncios) para probarlo sin nada.

---

## 🖥️ Tres formas de usarlo

### A) App de escritorio para Windows (.exe) — recomendado

No necesitas instalar Node ni tocar la terminal. El instalador se compila solo
en **GitHub Actions** y lo descargas ya hecho:

1. Sube este proyecto a un repositorio de GitHub (ver más abajo).
2. GitHub Actions compila el `.exe` en cada push a `main`. Descárgalo desde la
   pestaña **Actions → último run → Artifacts**, o crea una etiqueta `v1.0.0`
   para que aparezca en **Releases**.
3. Ejecuta `CazaPAL-Setup-x.y.z.exe`. La primera vez te pedirá tu clave gratuita
   de Gemini (se guarda solo en tu ordenador). Listo.

> Al ser una app sin firma de pago, Windows puede mostrar SmartScreen la primera
> vez → "Más información" → "Ejecutar de todas formas".

### B) Arrancarlo tú con Node (desarrollo)

```bash
npm install
cp .env.example .env.local      # pon aquí tu GEMINI_API_KEY y ENABLE_VINTED=true
npm run dev                      # http://localhost:3000
```

### C) Servidor de producción (web)

```bash
npm install && npm run build && npm start
```

---

## 🔑 Configuración

La app funciona con una **clave gratuita de Gemini**:
consíguela en <https://aistudio.google.com> → **Get API key** (no pide tarjeta).

En la **app de escritorio** la pegas en la pantalla de ajustes al abrirla. En
los modos B/C se pone en `.env.local`:

| Variable                 | Por defecto          | Para qué sirve                                            |
| ------------------------ | -------------------- | -------------------------------------------------------- |
| `GEMINI_API_KEY`         | _(vacío)_            | Clave de Gemini. Sin ella → modo demo.                   |
| `GEMINI_VISION_MODEL`    | `gemini-2.5-flash`   | Modelo multimodal (gratuito) usado para las fotos.       |
| `GEMINI_MIN_INTERVAL_MS` | `4500`               | Espaciado entre llamadas (respeta el límite del plan free). |
| `ENABLE_VINTED`          | `false`              | `true` para consultar el catálogo real de Vinted.        |
| `VINTED_HOST`            | `www.vinted.es`      | Dominio de Vinted.                                        |
| `DEMO_MODE`              | _(sin definir)_      | `true` fuerza el modo demo.                              |
| `CAZAPAL_DB_PATH`        | `./data/cache.json`  | Fichero de caché de veredictos.                          |

La clave **nunca** sale del servidor ni se incrusta en el `.exe`.

---

## 🏗️ Arquitectura

```
src/
  app/
    page.tsx                     Pantallas Búsqueda + Resultados (cliente)
    api/search/route.ts          POST: consulta Vinted, dedup/filtra, lanza análisis
    api/search/[id]/status/route.ts  GET: sondeo de veredictos (polling)
  lib/
    vinted.ts    ← Cliente de Vinted AISLADO (parchea solo aquí si cambia)
    vision.ts      Análisis con Gemini (REST, JSON estricto) + límite de ritmo
    analyzer.ts    Runner en segundo plano por lotes + guardas de coste
    db.ts          Caché en fichero JSON (sin módulos nativos → empaqueta limpio)
    demo.ts        Datos de ejemplo "Pokémon Esmeralda"
    filter.ts      Dedup + relevancia de título
    config.ts      Config + detección de modo demo
    format.ts      Precio, banderas, colores de veredicto (cliente)
    types.ts       Tipos compartidos
  components/      SearchBox, ConsoleChips, Results, ListingCard, LanguageBadge…
electron/
  main.js          Arranca el servidor Next y abre la ventana; pantalla de clave
  settings.html    Ajustes: pegar la clave de Gemini
  preload.js       Puente seguro renderer↔main
.github/workflows/
  build.yml        Compila el instalador .exe en Windows automáticamente
public/demo/       Carátulas SVG de ejemplo
```

### El módulo de Vinted, aislado a propósito

Vinted no tiene API pública. `src/lib/vinted.ts` habla con los mismos endpoints
JSON internos que usa la web (bootstrap de cookie → `catalog/items` → detalle de
fotos). **Cuando Vinted cambie algo, este es el único fichero a tocar.**

### Guardas de coste y ritmo

- Máx. 40 anuncios y 80 imágenes por búsqueda.
- Máx. 2 imágenes por anuncio (priorizando la contraportada).
- Caché por `vintedId` en fichero: no se re-analiza lo ya visto.
- Espaciado entre llamadas a Gemini para respetar el nivel gratuito.

### Regla clave

Un anuncio con **solo foto de portada** nunca se marca "en español": queda
**no concluyente**, y la evidencia explica por qué.

---

## 🚀 Subir a GitHub (para obtener el .exe)

```bash
# dentro de la carpeta del proyecto
git init
git add .
git commit -m "CazaPAL"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/cazapal.git
git push -u origin main
```

En cuanto haga push, ve a la pestaña **Actions** del repo: verás la compilación
en marcha y, al terminar, el instalador en **Artifacts**.

---

## ⌨️ Atajos de teclado

`/` enfoca la búsqueda · `s` activa/desactiva "Solo en español".

## 🧪 Verificación

```bash
npm run syntax-check   # sintaxis TS/TSX + imports internos (sin instalar nada)
npm run typecheck      # (tras npm install) chequeo de tipos completo
```

## ⚠️ Aviso

CazaPAL analiza fotos públicas de anuncios de Vinted con fines de ayuda a la
compra. Los veredictos son orientativos: confirma el idioma con el vendedor
antes de comprar. Respeta los términos de uso de Vinted.
