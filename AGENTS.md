# AGENTS.md

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **janulus-matrix** (API base en `.insforge/project.json` local y `NUXT_PUBLIC_INSFORGE_URL`; nunca commitear URLs ni keys)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->

## Deploy principal: Cloudflare Workers (wrangler CLI)

Todo el deploy se maneja con wrangler. Skill de referencia: `wrangler`
(`~/.config/opencode/skills/wrangler/SKILL.md`) antes de adivinar comandos.

- **Build:** `npm run build` (preset Nitro `cloudflare_module` por default).
  Requiere Node >= 22 (`engines` en `package.json`, `NODE_VERSION=22` en Netlify).
- **Dev local:** `wrangler dev` (lee `.output/`). **Remoto:** `wrangler dev --remote`.
- **Deploy:** `npm run deploy` (= build + `wrangler deploy`).
- **Validar sin desplegar:** `npx wrangler deploy --dry-run` (muestra bindings efectivos).
- **GOTCHA — config redirigida:** wrangler usa `.output/server/wrangler.json`
  (generado por Nitro desde `wrangler.jsonc` con `nitro.cloudflare.deployConfig: true`).
  Después de tocar `wrangler.jsonc`, SIEMPRE rebuild antes de `dev --remote`/`deploy`,
  si no el binding nuevo no existe en el config efectivo.
- **Secrets/vars:** keys por `wrangler secret put`; nunca commitear valores.
  `.env` local está gitignoreado; `.env.example` documenta los nombres.
  Secrets del Worker: `NUXT_INSFORGE_API_KEY`, `NUXT_PUBLIC_INSFORGE_URL`,
  `OPENROUTER_API_KEY`, `NUXT_MYMEMORY_EMAIL`.
- **Dominio propio declarativo:** `routes` con `custom_domain: true` en
  `wrangler.jsonc` (`janulus-matrix.senseikatana.com`). `workers_dev: true` deja
  también el `*.workers.dev` activo. GOTCHA: el binding del custom domain no
  crea el registro DNS por sí solo; si el host no resuelve, falta el DNS record
  en la zona (`senseikatana.com`) — re-agregar el custom domain en el dashboard.
- **GOTCHA — borrar el Worker pierde los secrets.** Tras delete + redeploy hay
  que re-settear los 4 secrets; el dominio custom y el DNS se re-crean con el
  deploy declarativo.

## Hyperdrive -> Postgres de InsForge (no compiten, se apilan)

- El runtime de datos usa `@insforge/sdk` (HTTPS, server-only); Hyperdrive queda
  para SQL crudo futuro. `pg` ya está instalado.
- Binding `HYPERDRIVE` en `wrangler.jsonc`, id verificado `754397406bd44797b5ea40772bf6a0bb`
  (recurso `janulus-matrix-db` -> Postgres de InsForge en us-east:5432, DB `insforge`;
  ver host exacto con `wrangler hyperdrive list`, no commitearlo acá).
- `nodejs_compat` activado en `compatibility_flags` (requerido por drivers `pg`).
- String de conexión local SOLO en `.dev.vars`
  (`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`); nunca en
  `wrangler.jsonc`.
- GOTCHA — secrets en Workers: `useRuntimeConfig(event)` NO ve los secrets
  de Cloudflare en el preset `cloudflare-module`. Leerlos desde
  `event.context.cloudflare.env` (ver `server/utils/serverEnv.ts`,
  con fallback a runtimeConfig para Node/Netlify).
- No editar a mano `.output/server/wrangler.json`: se regenera en cada build.

## Deploy secundario: Netlify

- `netlify.toml`: `publish = "dist"` (el preset `netlify` de Nitro publica ahí,
  NUNCA en `.output/public`).
- `nuxt.config.ts` elige preset condicional: `process.env.NETLIFY ? 'netlify' : 'cloudflare_module'`.
  No hardcodear un preset: rompería el otro target. Netlify setea `NETLIFY=true` solo.

## Notas del dominio (janulus-matrix)

- Traducción en `shared/janulus/providers.ts` (cadena: dictionary ->
  google-official (opt-in) -> gtx -> mymemory (opt-in email) -> openrouter
  (fallback real desde Cloudflare) -> local -> echo).
- `provider: 'cache'` = hit en `translation_cache`; `openrouter` = gateway de
  InsForge (`openai/gpt-4o-mini`, secret `OPENROUTER_API_KEY`). gtx/MyMemory
  rate-limitean desde IPs de datacenter; no es bug de código.
- Persistencia: Prisma 7.10 es dueño del DDL (`prisma/schema.prisma`,
  `prisma migrate dev` contra InsForge). GOTCHA: la shadow DB de Prisma no tiene
  los schemas internos de InsForge (`system.*`), usar helpers propios
  (`public.set_updated_at`). NO actualizar a `prisma@8` (RC con otra CLI).
- Tablas: `phrases`, `phrase_texts`, `translation_cache`, `media`; RLS sin
  policies (anon/authenticated bloqueados; `project_admin` BYPASSRLS y Prisma pasan).
- Bucket público `janulus-media` para assets; persistir `url` + `key` en `media`.
- Proyecto InsForge linkeado (`.insforge/project.json`, gitignoreado).
- Pre-deploy local: `npm run check:deploy` (`scripts/check-deploy.mjs`).
- CI (`.github/workflows/ci.yml`) pinea npm 11: npm 10 rechaza `npm ci`
  por los optional peers de `@bomb.sh/tab` (cac/commander); npm 11 lo acepta.
  No sacar el pin sin re-verificar `npm@10 ci` en local.
