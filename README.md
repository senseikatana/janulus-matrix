# Janulus Matrix

Matriz ToDo de frases y vocabulario **PT ↔ ES ↔ EN ↔ CA ↔ GL** con traducción automática gratuita, IPA/fonética y flashcards con flip 3D. Hecha para clases mutuas de idiomas por videollamada.

[![CI](https://github.com/senseikatana/janulus-matrix/actions/workflows/ci.yml/badge.svg)](https://github.com/senseikatana/janulus-matrix/actions/workflows/ci.yml)

- **Hojas por idioma:** PT primera, ES segunda (+ EN/CA/GL). La pestaña activa es el idioma origen.
- **Input estilo ToDo:** escribís palabra (`vocab`) o frase y pulsás **Enter** → alta optimista, la tabla nunca se rompe.
- **Traducción gratis-primero:** `shared/janulus` — diccionario offline → Google gtx → MyMemory → palabra-por-palabra, con guardián `isPlausibleTranslation()` y reintento por fila. **$0, sin keys, sin cuentas.**
- **IPA:** verificada de diccionario (`dic`) o aproximada por reglas pt/es (`aprox`).
- **Flashcards:** cada entrada es una card con ambos idiomas, flip CSS y dirección invertible.
- **Persistencia local:** `localStorage` SSR-safe (`janulus-matrix:v1`).

## Requisitos

Node 22+ y npm (viene con Node).

## Uso

```bash
npm install
cp .env.example .env   # opcional, solo si querés la API oficial de Google
npm run dev            # http://localhost:3000
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run preview` | Previsualizar el build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Chequeo de tipos |
| `npm run check:deploy` | Validación pre-deploy (igual que CI/Netlify) |

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

## Licencia

MIT © Sergio Jurado (senseikatana)
