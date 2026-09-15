import type { LOCALE, TranslateResponse } from '~~/shared/janulus'

let aborter: AbortController | null = null

/** Cliente tipado del proxy /api/translate. La API key (si existe) vive solo en el server. */
export async function translateText(
  text: string,
  source: LOCALE,
  targets: LOCALE[]
): Promise<TranslateResponse> {
  aborter?.abort()
  aborter = new AbortController()
  return await $fetch<TranslateResponse>('/api/translate', {
    method: 'POST',
    body: { text, source, targets },
    signal: aborter.signal
  })
}

export function useTranslate() {
  const pending = ref(false)
  const error = ref<string | null>(null)

  async function translate(
    text: string,
    source: LOCALE,
    targets: LOCALE[]
  ): Promise<TranslateResponse | null> {
    pending.value = true
    error.value = null
    try {
      return await translateText(text, source, targets)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return null
      }
      error.value = 'No se pudo traducir, se guardó el original.'
      return null
    } finally {
      pending.value = false
    }
  }

  return { pending, error, translate }
}
