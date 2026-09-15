import type { LOCALE } from './types'
import { lookupDictionary } from './dictionary'

export interface Transcription {
  ipa: string | null
  /** true si vino del diccionario verificado, false si es aproximación por reglas. */
  verified: boolean
}

/** Aplica reemplazos ordenados sobre una palabra en minúsculas. */
function applyRules(word: string, rules: Array<[RegExp, string]>): string {
  let out = word
  for (const [re, rep] of rules) {
    out = out.replace(re, rep)
  }
  return out
}

/** Portugués brasileño aproximado (suficiente para leer en voz alta, no académico). */
const PT_RULES: Array<[RegExp, string]> = [
  [/ão/g, 'ɐ̃w̃'],
  [/nh/g, 'ɲ'],
  [/lh/g, 'ʎ'],
  [/ch/g, 'ʃ'],
  [/rr/g, 'ʁ'],
  [/^r/, 'ʁ'],
  [/ss/g, 's'],
  [/ç/g, 's'],
  [/c(?=[ei])/g, 's'],
  [/g(?=[ei])/g, 'ʒ'],
  [/qu/g, 'k'],
  [/gu(?=[ei])/g, 'g'],
  [/j/g, 'ʒ'],
  [/x/g, 'ʃ'],
  [/ã/g, 'ɐ̃'],
  [/õ/g, 'õ'],
  [/([aeiou])s([aeiou])/g, '$1z$2'],
  [/e(?=[^a-zãõáéíóúâêôàüçñ]*$)/, 'i'],
  [/o(?=[^a-zãõáéíóúâêôàüçñ]*$)/, 'u']
]

/** Español neutro con seseo (válido para Galicia/Latam en este contexto). */
const ES_RULES: Array<[RegExp, string]> = [
  [/ch/g, 'tʃ'],
  [/ll/g, 'ʝ'],
  [/rr/g, 'r'],
  [/(?<=[aeiou])r(?=[aeiou])/g, 'ɾ'],
  [/ñ/g, 'ɲ'],
  [/h/g, ''],
  [/qu/g, 'k'],
  [/v/g, 'b'],
  [/z/g, 's'],
  [/c(?=[ei])/g, 's'],
  [/j/g, 'x'],
  [/g(?=[ei])/g, 'x']
]

function approximate(text: string, locale: LOCALE): string | null {
  const rules = locale === 'pt' ? PT_RULES : locale === 'es' ? ES_RULES : null
  if (!rules) {
    return null
  }
  const out = text
    .split(/(\s+)/)
    .map((chunk) => {
      if (/^\s*$/.test(chunk)) {
        return chunk
      }
      return applyRules(chunk.toLowerCase(), rules)
    })
    .join('')
  return `[${out}]`
}

/**
 * Transcribe un texto a IPA. Primero diccionario verificado,
 * si no hay, aproximación por reglas (pt/es). Nunca lanza.
 */
export function transcribe(text: string, locale: LOCALE): Transcription {
  const input = text.trim()
  if (!input) {
    return { ipa: null, verified: false }
  }
  const hit = lookupDictionary(input)
  const dictIpa = hit?.ipa[locale] ?? null
  if (dictIpa) {
    return { ipa: dictIpa, verified: true }
  }
  return { ipa: approximate(input, locale), verified: false }
}
