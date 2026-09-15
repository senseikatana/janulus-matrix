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
  `.env` local está gitignoreado; `.env.example` documenta los nombres
  (`NUXT_PUBLIC_INSFORGE_URL`, `NUXT_PUBLIC_INSFORGE_ANON_KEY`).

## Hyperdrive -> Postgres de InsForge (no compiten, se apilan)

- El Worker NO usa SQL crudo hoy; el acceso directo a Postgres va por Hyperdrive.
- Binding `HYPERDRIVE` en `wrangler.jsonc`, id verificado `754397406bd44797b5ea40772bf6a0bb`
  (recurso `jalunus-matrix` -> `*.us-east.database.insforge.app:5432`, DB `insforge`).
- `nodejs_compat` activado en `compatibility_flags` (requerido por drivers `pg`).
- Sin `localConnectionString`: en local se usa la DB remota.
- En código se consume vía `env.HYPERDRIVE.connectionString` (solo en server routes).
- No editar a mano `.output/server/wrangler.json`: se regenera en cada build.

## Deploy secundario: Netlify

- `netlify.toml`: `publish = "dist"` (el preset `netlify` de Nitro publica ahí,
  NUNCA en `.output/public`).
- `nuxt.config.ts` elige preset condicional: `process.env.NETLIFY ? 'netlify' : 'cloudflare_module'`.
  No hardcodear un preset: rompería el otro target. Netlify setea `NETLIFY=true` solo.

## Notas del dominio (janulus-matrix)

- Traducción gratis-primero en `shared/janulus/providers.ts` (cadena:
  dictionary -> google-official (opt-in con key) -> gtx -> mymemory -> local -> echo).
- `provider: 'echo'` = todos los proveedores fallaron (típico desde IPs de Workers:
  gtx bloquea datacenter, MyMemory rate-limitea). No es bug de código, es red de origen.
- `server/api/translate.post.ts` lee `config.translateApiKey`, pero esa key
  AÚN no está declarada en `runtimeConfig` de `nuxt.config.ts`: declararla antes
  de usar la API oficial de Google.
- Estado pendiente: CRUD de frases + `translation_cache` en InsForge
  (tablas `phrases`, `phrase_texts`, `translation_cache`), SDK vía HTTPS
  (portable Netlify/Workers; Hyperdrive solo si hace falta SQL crudo).
- Proyecto InsForge aún NO linkeado localmente (no existe `.insforge/`).
- Pre-deploy local: `npm run check:deploy` (`scripts/check-deploy.mjs`).
