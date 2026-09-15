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

// 2. Gestor npm + scripts (migración pnpm -> npm).
{
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const actual = run('npm', ['--version'])
  if (actual) ok(`npm ${actual} disponible`)
  else fail('npm no disponible', 'instalar Node 22+ con npm')
  if (pkg.packageManager?.startsWith('pnpm')) fail('packageManager aún apunta a pnpm', 'quitar el campo o usar npm')
  else ok('sin packageManager pnpm')
  if (!existsSync(join(ROOT, 'package-lock.json'))) fail('falta package-lock.json', 'correr npm install y commitearlo')
  else ok('package-lock.json presente')
  if (!pkg.scripts?.build) fail('falta script build', 'package.json necesita "build": "nuxt build"')
  else ok('script build presente')
}

// 3. Estructura single-package.
{
  const required = ['netlify.toml', 'nuxt.config.ts', 'shared/janulus/index.ts', 'shared/janulus/types.ts', 'shared/janulus/dictionary.ts', 'shared/janulus/phonetics.ts', 'shared/janulus/providers.ts', 'server/api/translate.post.ts']
  const missing = required.filter(f => !existsSync(join(ROOT, f)))
  if (missing.length === 0) ok('archivos requeridos presentes')
  else fail('archivos faltantes', missing.join(', '))
  // Con npm no hay workspace: prohibidos dir packages y restos pnpm.
  const problems = []
  if (existsSync(join(ROOT, 'packages'))) problems.push('packages/')
  if (existsSync(join(ROOT, 'pnpm-workspace.yaml'))) problems.push('pnpm-workspace.yaml')
  if (existsSync(join(ROOT, 'pnpm-lock.yaml'))) problems.push('pnpm-lock.yaml')
  if (problems.length === 0) ok('sin restos pnpm/workspace (npm single-package)')
  else fail('restos pnpm/workspace', problems.join(', '))
}

// 4. Anti-leaks: lo mismo que el scanner de Netlify (valores, no nombres).
{
  const SKIP_DIRS = new Set(['node_modules', '.git', '.nuxt', '.output', '.netlify', 'dist'])
  // Generados: los hashes de integridad parecen tokens (falso positivo documentado).
  const SKIP_FILES = new Set(['package-lock.json'])
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
    execFileSync('npm', ['ci'], { cwd: ROOT, stdio: 'pipe' })
    execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'pipe' })
    ok('npm ci + build')
  } catch (e) {
    const errTail = String(e.stderr || e.stdout || e.message).trim().split('\n').slice(-4).join(' | ')
    fail('npm ci + build', errTail.slice(0, 300))
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
