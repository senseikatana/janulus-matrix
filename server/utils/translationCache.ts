import type { H3Event } from 'h3'
import type { LOCALE, TranslationProvider } from '~~/shared/janulus'

export interface CachedTranslation {
  cacheKey: string
  outputText: string
  provider: TranslationProvider
}

export interface CacheWriteRow {
  cacheKey: string
  source: LOCALE
  target: LOCALE
  inputText: string
  outputText: string
  provider: TranslationProvider
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** sha256 hex de source|target|texto normalizado. WebCrypto: Workers y Node. */
export async function cacheKeyFor(source: LOCALE, target: LOCALE, text: string): Promise<string> {
  const data = new TextEncoder().encode(`${source}|${target}|${normalize(text)}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

/** Lectura best-effort: si InsForge no está configurado o falla, sigue sin caché. */
export async function readTranslationCache(
  event: H3Event,
  keys: string[]
): Promise<Map<string, CachedTranslation>> {
  const out = new Map<string, CachedTranslation>()
  const client = insforgeAdmin(event)
  if (!client || keys.length === 0) {
    return out
  }
  try {
    const { data, error } = await client.database
      .from('translation_cache')
      .select('cache_key, output_text, provider')
      .in('cache_key', keys)
    if (error || !data) {
      return out
    }
    for (const row of data as Array<{ cache_key: string, output_text: string, provider: string }>) {
      out.set(row.cache_key, {
        cacheKey: row.cache_key,
        outputText: row.output_text,
        provider: row.provider as TranslationProvider
      })
    }
  } catch {
    // best-effort: un fallo de caché nunca rompe la traducción.
  }
  return out
}

/** Escritura best-effort (upsert por cache_key). Solo éxitos reales. */
export async function writeTranslationCache(event: H3Event, rows: CacheWriteRow[]): Promise<void> {
  const client = insforgeAdmin(event)
  if (!client || rows.length === 0) {
    return
  }
  try {
    await client.database.from('translation_cache').upsert(
      rows.map(row => ({
        cache_key: row.cacheKey,
        source: row.source,
        target: row.target,
        input_text: row.inputText,
        output_text: row.outputText,
        provider: row.provider
      })),
      { onConflict: 'cache_key' }
    )
  } catch {
    // best-effort: no rompe la respuesta si falla la escritura.
  }
}
