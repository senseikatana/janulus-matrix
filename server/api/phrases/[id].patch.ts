import { ALL_LOCALES, isLocale } from '~~/server/utils/phrases'

interface PatchBody {
  done?: boolean
  failed?: boolean
  needsReview?: boolean
  provider?: string | null
  texts?: Partial<Record<string, string>>
  ipa?: Partial<Record<string, string | null>>
  ipaVerified?: Partial<Record<string, boolean>>
}

/** Actualiza flags de la frase y hace upsert de textos/IPA por idioma. */
export default defineEventHandler(async (event) => {
  const client = requireInsforge(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id es requerido' })
  }
  const body = await readBody<PatchBody>(event)

  const phraseUpdate: Record<string, unknown> = {}
  if (typeof body?.done === 'boolean') {
    phraseUpdate.done = body.done
  }
  if (typeof body?.failed === 'boolean') {
    phraseUpdate.failed = body.failed
  }
  if (typeof body?.needsReview === 'boolean') {
    phraseUpdate.needs_review = body.needsReview
  }
  if (body?.provider !== undefined) {
    phraseUpdate.provider = body.provider
  }

  if (Object.keys(phraseUpdate).length > 0) {
    const { error } = await client.database.from('phrases').update(phraseUpdate).eq('id', id)
    if (error) {
      throw createError({ statusCode: 502, statusMessage: 'No se pudo actualizar la frase' })
    }
  }

  const rows = []
  for (const locale of ALL_LOCALES) {
    const text = body?.texts?.[locale]
    if (isLocale(locale) && typeof text === 'string' && text.trim()) {
      rows.push({
        phrase_id: id,
        locale,
        text,
        ipa: body?.ipa?.[locale] ?? null,
        ipa_verified: body?.ipaVerified?.[locale] ?? false
      })
    }
  }
  if (rows.length > 0) {
    const { error } = await client.database
      .from('phrase_texts')
      .upsert(rows, { onConflict: 'phrase_id,locale' })
    if (error) {
      throw createError({ statusCode: 502, statusMessage: 'No se pudieron guardar los textos' })
    }
  }

  return { ok: true }
})
