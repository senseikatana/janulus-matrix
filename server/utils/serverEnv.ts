import type { H3Event } from 'h3'

// Lee una env server-only con doble fuente:
// 1. `event.context.cloudflare.env` (secrets/vars del Worker — useRuntimeConfig
//    NO los ve en el preset cloudflare-module).
// 2. `useRuntimeConfig` (Node local, Netlify, resto de presets).
export function getServerEnv(event: H3Event, name: string): string | undefined {
  const cfEnv = (event.context as Record<string, unknown>).cloudflare as
    | { env?: Record<string, unknown> }
    | undefined
  const fromCf = cfEnv?.env?.[name]
  if (typeof fromCf === 'string' && fromCf) {
    return fromCf
  }
  const config = useRuntimeConfig(event) as Record<string, unknown>
  // NUXT_MYMEMORY_EMAIL -> myMemoryEmail (camelCase tras el prefijo).
  const camel = name
    .replace(/^NUXT_/, '')
    .toLowerCase()
    .replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
  const fromConfig = config[camel]
  return typeof fromConfig === 'string' && fromConfig ? fromConfig : undefined
}
