export type LOCALE = 'es' | 'pt' | 'en' | 'ca' | 'gl'

export const LOCALES: readonly LOCALE[] = ['pt', 'es', 'en', 'ca', 'gl'] as const

export const LOCALE_LABELS: Record<LOCALE, string> = {
  pt: 'Português',
  es: 'Español',
  en: 'English',
  ca: 'Català',
  gl: 'Galego'
}

export type EntryKind = 'word' | 'phrase'

export type TranslationProvider
  = 'dictionary'
    | 'google-official'
    | 'gtx'
    | 'mymemory'
    | 'local'
    | 'echo'

export interface PhraseEntry {
  id: string
  kind: EntryKind
  /** Texto en cada idioma. La pestaña activa es el origen. */
  text: Record<LOCALE, string>
  /** IPA / pronunciación fonética por idioma, opcional. */
  ipa: Partial<Record<LOCALE, string | null>>
  /** true cuando la IPA vino del diccionario verificado, false si es aproximada. */
  ipaVerified: Partial<Record<LOCALE, boolean>>
  done: boolean
  /** true mientras la traducción remota está pendiente */
  pending: boolean
  /** true cuando todos los proveedores fallaron y se guardó el original */
  failed: boolean
  /** true cuando la traducción vino de memoria colaborativa (calidad desconocida): conviene revisar. */
  needsReview: boolean
  /** Proveedor que resolvió la entrada (solo informativo). */
  provider?: TranslationProvider
  createdAt: string
}

export interface TranslateRequest {
  text: string
  source: LOCALE
  targets: LOCALE[]
}

export type TranslateResponse = {
  translations: Partial<Record<LOCALE, string>>
  /** true si vino del diccionario local (offline, instantáneo) */
  fromDictionary: boolean
  provider: TranslationProvider
}

export function detectKind(input: string): EntryKind {
  return input.trim().split(/\s+/).length > 1 ? 'phrase' : 'word'
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
