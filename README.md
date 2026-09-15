# Janulus Matrix

Matriz ToDo de frases y vocabulario **PT ↔ ES ↔ EN ↔ CA ↔ GL** con traducción automática gratuita, IPA/fonética y flashcards con flip 3D. Hecha para clases mutuas de idiomas por videollamada.

[![CI](https://github.com/senseikatana/janulus-matrix/actions/workflows/ci.yml/badge.svg)](https://github.com/senseikatana/janulus-matrix/actions/workflows/ci.yml)

- **Hojas por idioma:** PT primera, ES segunda (+ EN/CA/GL). La pestaña activa es el idioma origen.
- **Input estilo ToDo:** escribís palabra (`vocab`) o frase y pulsás **Enter** → alta optimista, la tabla nunca se rompe.
- **Traducción gratis-primero:** `janulus-core` — diccionario offline → Google gtx → MyMemory → palabra-por-palabra, con guardián `isPlausibleTranslation()` y reintento por fila. **$0, sin keys, sin cuentas.**
- **IPA:** verificada de diccionario (`dic`) o aproximada por reglas pt/es (`aprox`).
- **Flashcards:** cada entrada es una card con ambos idiomas, flip CSS y dirección invertible.
- **Persistencia local:** `localStorage` SSR-safe (`janulus-matrix:v1`).

## Paquetes

| Paquete | NPM | Descripción |
|---|---|---|
| `packages/janulus-core` | `janulus-core` | Core agnóstico: tipos, diccionario, fonética, cadena de traducción. Cero dependencias. |

## Requisitos

Node 20+ y `pnpm@12.4.1`.

## Uso

```bash
pnpm install
cp .env.example .env   # opcional, solo si querés la API oficial de Google
pnpm dev               # http://localhost:3000
```

| Script | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm preview` | Previsualizar el build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Chequeo de tipos |

## Variables de entorno (opcionales)

| Variable | Efecto |
|---|---|
| `NUXT_TRANSLATE_API_KEY` | Opt-in: la API oficial de Google va primera en la cadena. Requiere proyecto con facturación (500K chars/mes gratis). Sin key, todo funciona gratis. |

## Probar la API

```bash
curl -X POST http://localhost:3000/api/translate \
  -H 'Content-Type: application/json' \
  -d '{"text":"hoy","source":"es","targets":["pt","en"]}'
# {"translations":{"es":"hoy","pt":"hoje","en":"today"},"fromDictionary":true,"provider":"dictionary"}
```

## Publicar `janulus-core` en NPM

```bash
pnpm --filter janulus-core build
pnpm --filter janulus-core publish --access public --provenance
```

## Licencia

MIT © Sergio Jurado (senseikatana)
