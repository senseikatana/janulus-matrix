import type { LOCALE } from './types'

export interface DictEntry {
  text: Record<LOCALE, string>
  ipa: Partial<Record<LOCALE, string | null>>
}

/** Normaliza para lookup insensible a mayúsculas, acentos extra y ¿? ¡! */
export function normalizeKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+$/g, '')
    .replace(/^[¿¡]+/g, '')
    .trim()
}

/**
 * Diccionario local gratuito y offline.
 * Cubre vocabulario base ES-PT-EN-CA-GL + la frase semilla de la matriz.
 */
export const DICTIONARY: Record<string, DictEntry> = {
  'hoy': {
    text: { es: 'hoy', pt: 'hoje', en: 'today', ca: 'avui', gl: 'hoxe' },
    ipa: { pt: '[ˈo.ʒi]', es: '[oi]' }
  },
  'hoje': {
    text: { es: 'hoy', pt: 'hoje', en: 'today', ca: 'avui', gl: 'hoxe' },
    ipa: { pt: '[ˈo.ʒi]', es: '[oi]' }
  },
  'ahora': {
    text: { es: 'ahora', pt: 'agora', en: 'now', ca: 'ara', gl: 'agora' },
    ipa: { pt: '[aˈɡɔ.ɾɐ]', es: '[aˈo.ɾa]' }
  },
  'agora': {
    text: { es: 'ahora', pt: 'agora', en: 'now', ca: 'ara', gl: 'agora' },
    ipa: { pt: '[aˈɡɔ.ɾɐ]', es: '[aˈo.ɾa]' }
  },
  'yo': {
    text: { es: 'yo', pt: 'eu', en: 'I', ca: 'jo', gl: 'eu' },
    ipa: { pt: '[ew]', es: '[ʝo]' }
  },
  'eu': {
    text: { es: 'yo', pt: 'eu', en: 'I', ca: 'jo', gl: 'eu' },
    ipa: { pt: '[ew]', es: '[ʝo]' }
  },
  'hola': {
    text: { es: 'hola', pt: 'olá', en: 'hello', ca: 'hola', gl: 'ola' },
    ipa: { pt: '[oˈla]', es: '[ˈo.la]' }
  },
  'olá': {
    text: { es: 'hola', pt: 'olá', en: 'hello', ca: 'hola', gl: 'ola' },
    ipa: { pt: '[oˈla]', es: '[ˈo.la]' }
  },
  'hermosa': {
    text: { es: 'hermosa', pt: 'linda', en: 'beautiful', ca: 'preciosa', gl: 'lindísima' },
    ipa: { pt: '[ˈlĩ.dɐ]', es: '[eɾˈmo.sa]' }
  },
  'linda': {
    text: { es: 'hermosa', pt: 'linda', en: 'beautiful', ca: 'preciosa', gl: 'lindísima' },
    ipa: { pt: '[ˈlĩ.dɐ]', es: '[eɾˈmo.sa]' }
  },
  'beautiful': {
    text: { es: 'hermosa', pt: 'linda', en: 'beautiful', ca: 'preciosa', gl: 'lindísima' },
    ipa: { pt: '[ˈlĩ.dɐ]', es: '[eɾˈmo.sa]' }
  },
  'empleos': {
    text: { es: 'empleos', pt: 'empregos', en: 'jobs', ca: 'feines', gl: 'empregos' },
    ipa: { pt: '[ẽˈpɾe.ɡuz]', es: '[emˈple.os]' }
  },
  'empregos': {
    text: { es: 'empleos', pt: 'empregos', en: 'jobs', ca: 'feines', gl: 'empregos' },
    ipa: { pt: '[ẽˈpɾe.ɡuz]', es: '[emˈple.os]' }
  },
  'no son buenos': {
    text: { es: 'no son buenos', pt: 'não são bons', en: 'they are not good', ca: 'no són bons', gl: 'non son bos' },
    ipa: { pt: '[nãu sãu bõs]', es: '[no son ˈbwe.nos]' }
  },
  'não são bons': {
    text: { es: 'no son buenos', pt: 'não são bons', en: 'they are not good', ca: 'no són bons', gl: 'non son bos' },
    ipa: { pt: '[nãu sãu bõs]', es: '[no son ˈbwe.nos]' }
  },
  'verdad': {
    text: { es: '¿verdad?', pt: 'né?', en: 'right?', ca: 'oi?', gl: 'verdade?' },
    ipa: { pt: '[nɛ]', es: '[beɾˈðað]' }
  },
  'né?': {
    text: { es: '¿verdad?', pt: 'né?', en: 'right?', ca: 'oi?', gl: 'verdade?' },
    ipa: { pt: '[nɛ]', es: '[beɾˈðað]' }
  },
  'en serio': {
    text: { es: '¿en serio?', pt: 'sério?', en: 'really?', ca: 'de debò?', gl: 'en serio?' },
    ipa: { pt: '[ˈsɛ.ɾju]', es: '[en ˈse.ɾjo]' }
  },
  'sério?': {
    text: { es: '¿en serio?', pt: 'sério?', en: 'really?', ca: 'de debò?', gl: 'en serio?' },
    ipa: { pt: '[ˈsɛ.ɾju]', es: '[en ˈse.ɾjo]' }
  },
  'gracias': {
    text: { es: 'gracias', pt: 'obrigado', en: 'thanks', ca: 'gràcies', gl: 'grazas' },
    ipa: { pt: '[o.bɾiˈɡa.du]', es: '[ˈɡɾa.θjas]' }
  },
  'obrigado': {
    text: { es: 'gracias', pt: 'obrigado', en: 'thanks', ca: 'gràcies', gl: 'grazas' },
    ipa: { pt: '[o.bɾiˈɡa.du]', es: '[ˈɡɾa.θjas]' }
  }
}

/** Frase semilla completa: la de los empleos. Sirve de ejemplo y de test. */
export const SEED_PHRASE_EXAMPLE: DictEntry = {
  text: {
    es: '¿En serio? Por lo que parece, aquí los empleos no son buenos, ¿verdad?',
    pt: 'Sério? Pelo jeito, por aqui os empregos não são bons, né?',
    en: 'Really? It seems jobs around here are not good, right?',
    ca: 'De debò? Pel que sembla, per aquí les feines no són bones, oi?',
    gl: 'En serio? Polo que parece, por aquí os empregos non son bos, verdade?'
  },
  ipa: {
    pt: '[ˈsɛ.ɾju ˈpe.lu ˈʒej.tu poɾ aˈki uz ẽˈpɾe.ɡuz nãu sãu bõs nɛ]',
    es: '[en ˈse.ɾjo poɾ lo ke paˈɾe.θe aˈki los emˈple.os no son ˈbwe.nos beɾˈðað]'
  }
}

export function lookupDictionary(input: string): DictEntry | null {
  const direct = DICTIONARY[normalizeKey(input)]
  if (direct) {
    return direct
  }
  const seedHit
    = normalizeKey(input) === normalizeKey(SEED_PHRASE_EXAMPLE.text.es)
      || normalizeKey(input) === normalizeKey(SEED_PHRASE_EXAMPLE.text.pt)
  if (seedHit) {
    return SEED_PHRASE_EXAMPLE
  }
  return null
}
