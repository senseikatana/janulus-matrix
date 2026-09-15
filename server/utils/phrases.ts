import type { H3Event } from 'h3'
import type { EntryKind, LOCALE, PhraseEntry, TranslationProvider } from '~~/shared/janulus'

export interface PhraseTextRow {
  locale: string
  text: string
  ipa: string | null
  ipa_verified: boolean
}

export interface PhraseRow {
  id: string
  kind: string
  source_locale: string
  done: boolean
  failed: boolean
  needs_review: boolean
  provider: string | null
  created_at: string
  phrase_texts?: PhraseTextRow[]
}

export const PHRASE_SELECT = 'id, kind, source_locale, done, failed, needs_review, provider, created_at, phrase_texts(locale, text, ipa, ipa_verified)'

export const ALL_LOCALES: readonly LOCALE[] = ['es', 'pt', 'en', 'ca', 'gl']

export function isLocale(value: unknown): value is LOCALE {
  return typeof value === 'string' && (ALL_LOCALES as readonly string[]).includes(value)
}

export function isKind(value: unknown): value is EntryKind {
  return value === 'word' || value === 'phrase'
}

export function requireInsforge(event: H3Event) {
  const client = insforgeAdmin(event)
  if (!client) {
    throw createError({ statusCode: 503, statusMessage: 'InsForge no configurado' })
  }
  return client
}

export function toEntry(row: PhraseRow): PhraseEntry {
  const text: Record<LOCALE, string> = { es: '', pt: '', en: '', ca: '', gl: '' }
  const ipa: Partial<Record<LOCALE, string | null>> = {}
  const ipaVerified: Partial<Record<LOCALE, boolean>> = {}
  for (const t of row.phrase_texts ?? []) {
    if (!isLocale(t.locale)) {
      continue
    }
    text[t.locale] = t.text
    ipa[t.locale] = t.ipa
    ipaVerified[t.locale] = t.ipa_verified
  }
  return {
    id: row.id,
    kind: isKind(row.kind) ? row.kind : 'phrase',
    text,
    ipa,
    ipaVerified,
    done: row.done,
    pending: false,
    failed: row.failed,
    needsReview: row.needs_review,
    provider: (row.provider ?? undefined) as TranslationProvider | undefined,
    createdAt: row.created_at
  }
}
