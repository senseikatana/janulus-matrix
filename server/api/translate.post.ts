import type { LOCALE, TranslateRequest, TranslateResponse } from '~~/shared/janulus'
import { translateWithChain } from '~~/shared/janulus'

const SUPPORTED: readonly LOCALE[] = ['es', 'pt', 'en', 'ca', 'gl']

function isLocale(value: unknown): value is LOCALE {
  return typeof value === 'string' && (SUPPORTED as readonly string[]).includes(value)
}

/**
 * Proxy de traducción gratis-primero (ver `shared/janulus`).
 * Sin `NUXT_TRANSLATE_API_KEY`: cadena 100% gratuita sin cuentas.
 * Con key (opt-in): la API oficial de Google va primera.
 * La key nunca sale del server.
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

  const config = useRuntimeConfig(event)
  const googleApiKey = typeof config.translateApiKey === 'string' && config.translateApiKey
    ? config.translateApiKey
    : undefined
  const myMemoryEmail = typeof config.myMemoryEmail === 'string' && config.myMemoryEmail
    ? config.myMemoryEmail
    : undefined
  const clientIp = getRequestIP(event, { xForwardedFor: true })

  return await translateWithChain({ text, source, targets, googleApiKey, myMemoryEmail, clientIp: clientIp ?? undefined })
})
