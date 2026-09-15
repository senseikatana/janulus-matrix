/** Borra la frase; `phrase_texts` y `media` caen por FK (cascade / set null). */
export default defineEventHandler(async (event) => {
  const client = requireInsforge(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id es requerido' })
  }
  const { error } = await client.database.from('phrases').delete().eq('id', id)
  if (error) {
    throw createError({ statusCode: 502, statusMessage: 'No se pudo borrar la frase' })
  }
  return { ok: true }
})
