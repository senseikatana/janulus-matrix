import type { LOCALE, TranslateRequest, TranslateResponse, TranslationProvider } from '~~/shared/janulus'
import { translateWithChain } from '~~/shared/janulus'
import { cacheKeyFor, readTranslationCache, writeTranslationCache, type CacheWriteRow } from '~~/server/utils/translationCache'

const SUPPORTED: readonly LOCALE[] = ['es', 'pt', 'en', 'ca', 'gl']

function isLocale(value: unknown): value is LOCALE {
  return typeof value === 'string' && (SUPPORTED as readonly string[]).includes(value)
}

/**
 * Proxy de traducción gratis-primero (ver `shared/janulus`).
 * Caché en `translation_cache` (InsForge): un éxito queda servido para todos.
 * Providers opt-in por env: Google oficial, MyMemory con email y OpenRouter.
 * Ninguna key sale del server.
 */
export default defineEventHandler(async (event): Promise<TranslateResponse> => {
  const body = await readBody<TranslateRequest>(event)
  const text = (body?.text ?? '').trim()
  const source = body?.source
  const targets = Array.isArray(body?.targets) ? body.targets.filter(isLocale) : []

  if (!text) {
    throw createError({ statusCode: 400, message: 'text es requerido' })
  }
  if (!isLocale(source)) {
    throw createError({ statusCode: 400, message: 'source inválido' })
  }
  if (targets.length === 0) {
    throw createError({ statusCode: 400, message: 'targets inválido' })
  }

  const googleApiKey = getServerEnv(event, 'NUXT_TRANSLATE_API_KEY')
  const myMemoryEmail = getServerEnv(event, 'NUXT_MYMEMORY_EMAIL')
  const openrouterApiKey = getServerEnv(event, 'OPENROUTER_API_KEY', 'NUXT_OPENROUTER_API_KEY')
  const clientIp = getRequestIP(event, { xForwardedFor: true })

  const keys = new Map<LOCALE, string>()
  for (const target of targets) {
    keys.set(target, await cacheKeyFor(source, target, text))
  }
  const cached = await readTranslationCache(event, [...keys.values()])

  const translations: Partial<Record<LOCALE, string>> = {}
  const misses: LOCALE[] = []
  for (const target of targets) {
    const hit = cached.get(keys.get(target) ?? '')
    if (hit) {
      translations[target] = hit.outputText
    } else {
      misses.push(target)
    }
  }

  let provider: TranslationProvider = 'cache'
  let fromDictionary = false

  if (misses.length > 0) {
    const fresh = await translateWithChain({
      text,
      source,
      targets: misses,
      googleApiKey,
      myMemoryEmail,
      openrouterApiKey,
      clientIp: clientIp ?? undefined
    })
    Object.assign(translations, fresh.translations)
    provider = fresh.provider
    fromDictionary = fresh.fromDictionary

    const rows: CacheWriteRow[] = []
    for (const target of misses) {
      const value = fresh.translations[target]
      if (value && value.trim() && fresh.provider !== 'echo' && fresh.provider !== 'cache') {
        rows.push({
          cacheKey: keys.get(target) ?? '',
          source,
          target,
          inputText: text,
          outputText: value,
          provider: fresh.provider
        })
      }
    }
    await writeTranslationCache(event, rows)
  }

  return { translations, provider, fromDictionary }
})
