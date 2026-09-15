import type { H3Event } from 'h3'
import { createAdminClient, type InsForgeClient } from '@insforge/sdk'

let cached: { apiKey: string, client: InsForgeClient } | null = null

/**
 * Cliente admin de InsForge (server-only). El apiKey nunca sale al browser:
 * el frontend pega a nuestras server routes, no a InsForge.
 * Devuelve null si falta configuración (la app degrada sin romper).
 */
export function insforgeAdmin(event: H3Event): InsForgeClient | null {
  const baseUrl = getServerEnv(event, 'NUXT_PUBLIC_INSFORGE_URL')
  const apiKey = getServerEnv(event, 'NUXT_INSFORGE_API_KEY')
  if (!baseUrl || !apiKey) {
    return null
  }
  if (!cached || cached.apiKey !== apiKey) {
    cached = { apiKey, client: createAdminClient({ baseUrl, apiKey }) }
  }
  return cached.client
}
