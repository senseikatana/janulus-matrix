import { PHRASE_SELECT, toEntry, type PhraseRow } from '~~/server/utils/phrases'

/** Lista de frases con sus textos por idioma (máx 500, más nuevas primero). */
export default defineEventHandler(async (event) => {
  const client = requireInsforge(event)
  const { data, error } = await client.database
    .from('phrases')
    .select(PHRASE_SELECT)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) {
    throw createError({ statusCode: 502, statusMessage: 'No se pudo leer phrases' })
  }
  return { phrases: (data as PhraseRow[]).map(toEntry) }
})
