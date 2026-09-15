// Validación pre-deploy de Janulus Matrix (single-package Nuxt 4).
// Uso: node scripts/check-deploy.mjs [--skip-build]
// Falla (exit 1) ante cualquier problema. No imprime valores de secrets.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SKIP_BUILD = process.argv.includes('--skip-build')
const results = []
const ok = (name, detail = '') => results.push({ name, pass: true, detail })
const fail = (name, detail = '') => results.push({ name, pass: false, detail })
const run = (cmd, args = []) => {
  try {
    return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch {
    return null
  }
}

// 1. Entorno: Node >= 22 (Nitro netlify usa Set.prototype.difference).
{
  const major = Number(process.versions.node.split('.')[0])
  if (major >= 22) ok(`node ${process.versions.node} >= 22`)
  else fail(`node ${process.versions.node} < 22`, 'Netlify usa NODE_VERSION=22; alineá tu local.')
}

// 2. pnpm según packageManager.
{
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const expected = pkg.packageManager ?? ''
  const actual = run('pnpm', ['--version'])
  if (expected && actual && expected === `pnpm@${actual}`) ok(`pnpm ${actual} coincide con packageManager`)
  else fail('versión de pnpm', `packageManager=${expected || '?'}, instalado=${actual || '?'}`)
  if (pkg.scripts?.['build:core']) fail('script build:core obsoleto', 'quitar de package.json (ya no hay workspace)')
  else ok('sin script build:core')
  if (!pkg.scripts?.build) fail('falta script build', 'package.json necesita "build": "nuxt build"')
  else ok('script build presente')
}

// 3. Estructura single-package.
{
  const required = ['netlify.toml', 'nuxt.config.ts', 'shared/janulus/index.ts', 'shared/janulus/types.ts', 'shared/janulus/dictionary.ts', 'shared/janulus/phonetics.ts', 'shared/janulus/providers.ts', 'server/api/translate.post.ts']
  const missing = required.filter(f => !existsSync(join(ROOT, f)))
  if (missing.length === 0) ok('archivos requeridos presentes')
  else fail('archivos faltantes', missing.join(', '))
  // pnpm-workspace.yaml solo-settings (allowBuilds) está permitido: pnpm 12 lo exige.
  // Lo prohibido es un workspace real (campo packages o dir packages/).
  const wsFile = join(ROOT, 'pnpm-workspace.yaml')
  const wsContent = existsSync(wsFile) ? readFileSync(wsFile, 'utf8') : ''
  const problems = []
  if (existsSync(join(ROOT, 'packages'))) problems.push('packages/')
  if (/^\s*packages\s*:/m.test(wsContent) || /janulus-core/.test(wsContent)) problems.push('pnpm-workspace.yaml con workspace real')
  if (problems.length === 0) ok('sin workspace real (single-package)')
  else fail('restos del workspace', problems.join(', '))
}

// 4. Anti-leaks: lo mismo que el scanner de Netlify (valores, no nombres).
{
  const SKIP_DIRS = new Set(['node_modules', '.git', '.nuxt', '.output', '.netlify', 'dist'])
  // Generados: los hashes de integridad parecen tokens (falso positivo documentado).
  const SKIP_FILES = new Set(['pnpm-lock.yaml'])
  const TEXT_EXT = new Set(['.md', '.ts', '.vue', '.json', '.toml', '.yml', '.yaml', '.example', '.mjs'])
  const hits = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      const rel = relative(ROOT, full)
      if (SKIP_DIRS.has(entry) || SKIP_FILES.has(entry)) continue
      if (statSync(full).isDirectory()) {
        walk(full)
      } else if ([...TEXT_EXT].some(ext => entry.endsWith(ext))) {
        const content = readFileSync(full, 'utf8')
        content.split('\n').forEach((line, i) => {
          if (/[a-z0-9-]+\.(insforge\.app)/.test(line)) hits.push(`${rel}:${i + 1} (URL insforge)`)
          if (/(anon_[A-Za-z0-9]{16,}|eyJ[A-Za-z0-9_-]{20,})/.test(line)) hits.push(`${rel}:${i + 1} (posible key)`)
        })
      }
    }
  }
  walk(ROOT)
  if (hits.length === 0) ok('sin leaks de URLs/keys en el repo')
  else fail('posibles leaks', hits.slice(0, 10).join('; '))
}

// 5. Build + artefactos (igual que Netlify).
if (!SKIP_BUILD) {
  try {
    execFileSync('pnpm', ['install', '--frozen-lockfile'], { cwd: ROOT, stdio: 'pipe' })
    execFileSync('pnpm', ['build'], { cwd: ROOT, stdio: 'pipe' })
    ok('pnpm install + build')
  } catch (e) {
    const errTail = String(e.stderr || e.stdout || e.message).trim().split('\n').slice(-4).join(' | ')
    fail('pnpm install + build', errTail.slice(0, 300))
  }
  const pubAssets = existsSync(join(ROOT, '.output/public/_nuxt'))
  const nitroServer = existsSync(join(ROOT, '.output/server/index.mjs'))
  const netlifyFn = existsSync(join(ROOT, '.netlify/functions-internal/server/main.mjs'))
  if (pubAssets) ok('.output/public/_nuxt generado')
  else fail('.output/public/_nuxt ausente', 'el publish de Netlify quedaría vacío')
  if (nitroServer || netlifyFn) ok('server Nitro/function generado')
  else fail('server Nitro ausente', 'sin function no hay SSR ni /api/translate')
} else {
  ok('build salteado (--skip-build)')
}

// Resumen.
let failed = 0
for (const r of results) {
  if (!r.pass) failed++
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
}
console.log(failed === 0 ? '\ncheck-deploy: TODO OK' : `\ncheck-deploy: ${failed} FALLO(S)`)
process.exit(failed === 0 ? 0 : 1)
