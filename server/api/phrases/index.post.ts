import { isKind, isLocale } from '~~/server/utils/phrases'

interface PostBody {
  id?: string
  kind?: string
  source?: string
  text?: string
}

/** Alta de frase: fila en `phrases` + texto del idioma origen. */
export default defineEventHandler(async (event) => {
  const client = requireInsforge(event)
  const body = await readBody<PostBody>(event)
  const text = (body?.text ?? '').trim()
  const source = body?.source

  if (!text) {
    throw createError({ statusCode: 400, statusMessage: 'text es requerido' })
  }
  if (!isLocale(source)) {
    throw createError({ statusCode: 400, statusMessage: 'source inválido' })
  }

  const id = body?.id?.trim() || crypto.randomUUID()
  const kind = isKind(body?.kind) ? body.kind : 'phrase'

  const phraseInsert = await client.database.from('phrases').insert([{
    id,
    kind,
    source_locale: source,
    done: false,
    failed: false,
    needs_review: false,
    provider: null
  }])
  if (phraseInsert.error) {
    throw createError({ statusCode: 502, statusMessage: 'No se pudo crear la frase' })
  }

  const textInsert = await client.database.from('phrase_texts').insert([{
    phrase_id: id,
    locale: source,
    text,
    ipa: null,
    ipa_verified: false
  }])
  if (textInsert.error) {
    await client.database.from('phrases').delete().eq('id', id)
    throw createError({ statusCode: 502, statusMessage: 'No se pudo guardar el texto' })
  }

  return { id }
})
