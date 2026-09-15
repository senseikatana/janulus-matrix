import type { LOCALE, TranslationProvider } from './types'
import { LOCALE_LABELS } from './types'
import { DICTIONARY, lookupDictionary, normalizeKey } from './dictionary'

export interface ChainOptions {
  text: string
  source: LOCALE
  targets: LOCALE[]
  /** Opt-in: solo si hay key, la oficial va primera. Sin key, cadena 100% gratis. */
  googleApiKey?: string
  /** Opt-in: email válido para cuota MyMemory x10 (5k -> 50k chars/día). */
  myMemoryEmail?: string
  /** Opt-in: key de OpenRouter (vía gateway de InsForge). Fallback confiable
   *  desde IPs de datacenter, donde gtx/MyMemory están bloqueados. */
  openrouterApiKey?: string
  /** Opt-in: IP del usuario final para que MyMemory atribuya cuota por usuario. */
  clientIp?: string
  timeoutMs?: number
  fetchFn?: typeof fetch
}

export interface ChainResult {
  translations: Partial<Record<LOCALE, string>>
  provider: TranslationProvider
  fromDictionary: boolean
}

const DEFAULT_TIMEOUT = 8000

function withTimeout(ms: number): { signal: AbortSignal, done: () => void } {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  return { signal: ctrl.signal, done: () => clearTimeout(timer) }
}

/** Traduce palabra por palabra con el diccionario local, deja intacto lo desconocido. */
export function wordByWord(input: string, target: LOCALE): string {
  return input
    .split(/(\s+)/)
    .map((chunk) => {
      if (/^\s+$/.test(chunk) || chunk === '') {
        return chunk
      }
      const prefixMatch = chunk.match(/^([¿¡"'“‘([]*)(.*?)([?!.,;:)"”’\]]*)$/)
      if (!prefixMatch) {
        return chunk
      }
      const [, prefix, core, suffix] = prefixMatch
      const hit = DICTIONARY[normalizeKey(core ?? '')]
      if (hit && core) {
        const translated = hit.text[target] ?? core
        const isCapitalized = /^[A-ZÁÉÍÓÚÑ]/.test(core)
        const out = isCapitalized
          ? translated.charAt(0).toUpperCase() + translated.slice(1)
          : translated
        return `${prefix ?? ''}${out}${suffix ?? ''}`
      }
      return chunk
    })
    .join('')
}

/**
 * Guardián de calidad: rechaza respuestas vacías, avisos de cuota,
 * ecos idénticos y proporciones absurdas.
 * Límite conocido: la memoria colaborativa de MyMemory puede devolver
 * frases reales pero no relacionadas con match alto; esos casos no se
 * detectan aquí y se marcan con `needsReview` (ver TRUSTED_PROVIDERS).
 */
export function isPlausibleTranslation(candidate: string, sourceText: string, target: LOCALE, source: LOCALE): boolean {
  const out = candidate.trim()
  if (!out) {
    return false
  }
  if (/mymemory warning|you used all available|invalid email/i.test(out)) {
    return false
  }
  if (target !== source && out.length > 4 && out.toLowerCase() === sourceText.trim().toLowerCase()) {
    return false
  }
  const ratio = out.length / Math.max(sourceText.trim().length, 1)
  if (sourceText.trim().length > 12 && (ratio < 0.3 || ratio > 3)) {
    return false
  }
  return true
}

async function viaGoogleOfficial(
  text: string,
  source: LOCALE,
  target: LOCALE,
  key: string,
  fetchFn: typeof fetch,
  timeoutMs: number
): Promise<string | null> {
  const { signal, done } = withTimeout(timeoutMs)
  try {
    const res = await fetchFn('https://translation.googleapis.com/language/translate/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source, target, format: 'text', key }),
      signal
    })
    if (!res.ok) {
      return null
    }
    const json = await res.json() as { data?: { translations?: Array<{ translatedText?: string }> } }
    return json.data?.translations?.[0]?.translatedText?.trim() ?? null
  } catch {
    return null
  } finally {
    done()
  }
}

type GtxResponse = Array<Array<Array<string | null>> | null> | null

async function viaGtx(
  text: string,
  source: LOCALE,
  target: LOCALE,
  fetchFn: typeof fetch,
  timeoutMs: number
): Promise<string | null> {
  const { signal, done } = withTimeout(timeoutMs)
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetchFn(url, { signal })
    if (!res.ok) {
      return null
    }
    const json = await res.json() as GtxResponse
    const segments = json?.[0]
    if (!Array.isArray(segments)) {
      return null
    }
    const out = segments
      .map(seg => (Array.isArray(seg) ? seg[0] : null) ?? '')
      .join('')
      .trim()
    return out || null
  } catch {
    return null
  } finally {
    done()
  }
}

async function viaMyMemory(
  text: string,
  source: LOCALE,
  target: LOCALE,
  fetchFn: typeof fetch,
  timeoutMs: number,
  email?: string,
  clientIp?: string
): Promise<string | null> {
  const { signal, done } = withTimeout(timeoutMs)
  try {
    const params = new URLSearchParams({
      q: text,
      langpair: `${source}|${target}`
    })
    if (email) {
      params.set('de', email)
    }
    if (clientIp) {
      params.set('ip', clientIp)
    }
    const res = await fetchFn(`https://api.mymemory.translated.net/get?${params.toString()}`, { signal })
    if (!res.ok) {
      return null
    }
    const json = await res.json() as { responseData?: { translatedText?: string }, responseStatus?: number }
    if (json.responseStatus === 429 || json.responseStatus === 403) {
      return null
    }
    return json.responseData?.translatedText?.trim() ?? null
  } catch {
    return null
  } finally {
    done()
  }
}

/** Modelo barato y probado en el gateway de InsForge. */
const OPENROUTER_MODEL = 'openai/gpt-4o-mini'

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string } }>
}

/**
 * Traducción vía OpenRouter (gateway de InsForge). Último recurso confiable
 * desde IPs de datacenter, donde gtx y MyMemory rate-limitean.
 * Prompt cerrado: solo la traducción, sin comillas ni explicaciones.
 */
async function viaOpenRouter(
  text: string,
  source: LOCALE,
  target: LOCALE,
  key: string,
  fetchFn: typeof fetch,
  timeoutMs: number
): Promise<string | null> {
  const { signal, done } = withTimeout(timeoutMs)
  try {
    const res = await fetchFn('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: 0,
        max_tokens: 512,
        messages: [
          {
            role: 'system',
            content: `You are a translation engine. Translate the user text from ${LOCALE_LABELS[source]} to ${LOCALE_LABELS[target]}. Reply with only the translation, without quotes or explanations. Preserve tone and punctuation.`
          },
          { role: 'user', content: text }
        ]
      }),
      signal
    })
    if (!res.ok) {
      return null
    }
    const json = await res.json() as OpenRouterResponse
    const out = json.choices?.[0]?.message?.content?.trim() ?? null
    if (!out) {
      return null
    }
    return out.replace(/^["'«“]+|["'»”]+$/g, '').trim() || null
  } catch {
    return null
  } finally {
    done()
  }
}

async function resolveTarget(options: ChainOptions, target: LOCALE): Promise<{ value: string, provider: TranslationProvider }> {
  const { text, source, googleApiKey, myMemoryEmail, openrouterApiKey, clientIp, timeoutMs = DEFAULT_TIMEOUT, fetchFn = fetch } = options
  if (target === source) {
    return { value: text, provider: 'local' }
  }
  const local = wordByWord(text, target)

  if (googleApiKey) {
    const official = await viaGoogleOfficial(text, source, target, googleApiKey, fetchFn, timeoutMs)
    if (official && isPlausibleTranslation(official, text, target, source)) {
      return { value: official, provider: 'google-official' }
    }
  }
  const gtx = await viaGtx(text, source, target, fetchFn, timeoutMs)
  if (gtx && isPlausibleTranslation(gtx, text, target, source)) {
    return { value: gtx, provider: 'gtx' }
  }
  const mem = await viaMyMemory(text, source, target, fetchFn, timeoutMs, myMemoryEmail, clientIp)
  if (mem && isPlausibleTranslation(mem, text, target, source)) {
    return { value: mem, provider: 'mymemory' }
  }
  if (openrouterApiKey) {
    const ai = await viaOpenRouter(text, source, target, openrouterApiKey, fetchFn, timeoutMs)
    if (ai && isPlausibleTranslation(ai, text, target, source)) {
      return { value: ai, provider: 'openrouter' }
    }
  }
  if (local.trim() && local.trim() !== text.trim()) {
    return { value: local, provider: 'local' }
  }
  return { value: text, provider: 'echo' }
}

const RANK: Record<TranslationProvider, number> = {
  'google-official': 0,
  'gtx': 1,
  'openrouter': 2,
  'mymemory': 3,
  'dictionary': 0,
  'cache': 0,
  'local': 4,
  'echo': 5
}

/**
 * Proveedores de traducción neuronal/diccionario: degradan con
 * errores de traducción, nunca con frases aleatorias.
 * MyMemory (memoria colaborativa) queda fuera a propósito:
 * su TM puede devolver frases reales no relacionadas con match alto.
 */
export const TRUSTED_PROVIDERS: readonly TranslationProvider[] = [
  'dictionary',
  'google-official',
  'gtx',
  'openrouter',
  'cache',
  'local'
]

export function needsReviewFor(provider: TranslationProvider): boolean {
  return provider === 'mymemory'
}

/**
 * Cadena de traducción gratis-primero. Sin key: 100% gratis y sin cuentas.
 * Con `googleApiKey`: la oficial va primera. Nunca lanza.
 */
export async function translateWithChain(options: ChainOptions): Promise<ChainResult> {
  const { text, source, targets } = options
  const input = text.trim()

  const exact = lookupDictionary(input)
  if (exact) {
    const translations: Partial<Record<LOCALE, string>> = { [source]: input }
    for (const t of targets) {
      translations[t] = exact.text[t] ?? input
    }
    return { translations, provider: 'dictionary', fromDictionary: true }
  }

  const settled = await Promise.allSettled(targets.map(t => resolveTarget(options, t)))
  const translations: Partial<Record<LOCALE, string>> = { [source]: input }
  let best: TranslationProvider = 'echo'
  settled.forEach((r, i) => {
    const target = targets[i]
    if (!target) {
      return
    }
    if (r.status === 'fulfilled') {
      translations[target] = r.value.value
      if (RANK[r.value.provider] < RANK[best]) {
        best = r.value.provider
      }
    } else {
      translations[target] = input
    }
  })
  return { translations, provider: best, fromDictionary: false }
}
