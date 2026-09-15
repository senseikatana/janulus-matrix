import type { H3Event } from 'h3'

function toCamel(name: string): string {
  return name
    .replace(/^NUXT_/, '')
    .toLowerCase()
    .replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

// Lee una env server-only con doble fuente:
// 1. `event.context.cloudflare.env` (secrets/vars del Worker — useRuntimeConfig
//    NO los ve en el preset cloudflare-module).
// 2. `useRuntimeConfig` (Node local, Netlify, resto de presets).
// Acepta varios nombres: OPENROUTER_API_KEY (secret de Cloudflare) y
// NUXT_OPENROUTER_API_KEY (mapeo automático de Nuxt en local).
export function getServerEnv(event: H3Event, ...names: string[]): string | undefined {
  const cfEnv = (event.context as Record<string, unknown>).cloudflare as
    | { env?: Record<string, unknown> }
    | undefined
  const config = useRuntimeConfig(event) as Record<string, unknown>
  for (const name of names) {
    const fromCf = cfEnv?.env?.[name]
    if (typeof fromCf === 'string' && fromCf) {
      return fromCf
    }
    for (const candidate of [name, toCamel(name)]) {
      const value = config[candidate]
      if (typeof value === 'string' && value) {
        return value
      }
    }
  }
  return undefined
}
