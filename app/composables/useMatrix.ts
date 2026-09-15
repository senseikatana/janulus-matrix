import type { LOCALE, PhraseEntry } from '~~/shared/janulus'
import { detectKind, newId, needsReviewFor, transcribe } from '~~/shared/janulus'
import { translateText } from './useTranslate'

const STORAGE_KEY = 'janulus-matrix:v1'

const ALL_TARGETS: readonly LOCALE[] = ['pt', 'es', 'en', 'ca', 'gl']

const ALL_LOCALES: readonly LOCALE[] = ['pt', 'es', 'en', 'ca', 'gl']

function emptyText(): Record<LOCALE, string> {
  return { es: '', pt: '', en: '', ca: '', gl: '' }
}

function readStorage(): PhraseEntry[] {
  if (typeof localStorage === 'undefined') {
    return []
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as PhraseEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStorage(entries: PhraseEntry[]): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // QuotaExceeded o modo incógnito: no rompemos la tabla.
  }
}

/** Completa IPA / flags en entradas viejas guardadas sin esos campos. */
function backfill(entry: PhraseEntry): boolean {
  let changed = false
  if (typeof entry.failed !== 'boolean') {
    entry.failed = false
    changed = true
  }
  if (typeof entry.needsReview !== 'boolean') {
    entry.needsReview = entry.provider === 'mymemory'
    changed = true
  }
  if (!entry.ipa || typeof entry.ipa !== 'object') {
    entry.ipa = {}
    changed = true
  }
  if (!entry.ipaVerified || typeof entry.ipaVerified !== 'object') {
    entry.ipaVerified = {}
    changed = true
  }
  for (const loc of ALL_LOCALES) {
    if (entry.text[loc] && !entry.ipa[loc]) {
      const t = transcribe(entry.text[loc] ?? '', loc)
      entry.ipa[loc] = t.ipa
      entry.ipaVerified[loc] = t.verified
      changed = true
    }
  }
  return changed
}

function applyTranslations(
  entry: PhraseEntry,
  translations: Partial<Record<LOCALE, string>>,
  provider: PhraseEntry['provider']
): void {
  for (const loc of ALL_LOCALES) {
    const v = translations[loc]
    if (v) {
      entry.text[loc] = v
      const t = transcribe(v, loc)
      entry.ipa[loc] = t.ipa
      entry.ipaVerified[loc] = t.verified
    }
  }
  entry.provider = provider
  entry.failed = provider === 'echo'
  entry.needsReview = provider ? needsReviewFor(provider) : false
}

// --- Persistencia en InsForge (best-effort: si falla, sigue localStorage) ---

interface PhrasesResponse {
  phrases: PhraseEntry[]
}

async function apiList(): Promise<PhraseEntry[] | null> {
  try {
    const res = await $fetch<PhrasesResponse>('/api/phrases')
    return res.phrases
  } catch {
    return null
  }
}

async function apiCreate(entry: PhraseEntry, source: LOCALE, text: string): Promise<void> {
  try {
    await $fetch('/api/phrases', {
      method: 'POST',
      body: { id: entry.id, kind: entry.kind, source, text }
    })
  } catch {
    // sin server: la entrada queda igual en localStorage
  }
}

function entryPatch(entry: PhraseEntry): Record<string, unknown> {
  const texts: Record<string, string> = {}
  const ipa: Record<string, string | null> = {}
  const ipaVerified: Record<string, boolean> = {}
  for (const loc of ALL_LOCALES) {
    const value = entry.text[loc]
    if (value) {
      texts[loc] = value
      ipa[loc] = entry.ipa[loc] ?? null
      ipaVerified[loc] = entry.ipaVerified[loc] ?? false
    }
  }
  return {
    texts,
    ipa,
    ipaVerified,
    failed: entry.failed,
    needsReview: entry.needsReview,
    provider: entry.provider ?? null
  }
}

async function apiPatch(entry: PhraseEntry, payload: Record<string, unknown>): Promise<void> {
  try {
    await $fetch(`/api/phrases/${entry.id}`, { method: 'PATCH', body: payload })
  } catch {
    // best-effort
  }
}

async function apiDelete(id: string): Promise<void> {
  try {
    await $fetch(`/api/phrases/${id}`, { method: 'DELETE' })
  } catch {
    // best-effort
  }
}

/**
 * Matriz ToDo de frases. La pestaña activa es el idioma origen.
 * Alta optimista con Enter: la fila aparece ya, la traducción completa después.
 * Persistencia: InsForge (tablas phrases/phrase_texts) con localStorage como
 * caché offline; si el server está vacío, sube lo local una única vez.
 */
export function useMatrix() {
  const activeTab = useState<LOCALE>('janulus-active-tab', () => 'pt')
  const entries = useState<PhraseEntry[]>('janulus-entries', () => [])
  const loaded = useState<boolean>('janulus-loaded', () => false)
  const globalPending = ref(false)
  const lastError = ref<string | null>(null)

  function persist(): void {
    writeStorage(entries.value)
  }

  function guessSource(entry: PhraseEntry): LOCALE {
    if (entry.text[activeTab.value]) {
      return activeTab.value
    }
    return ALL_LOCALES.find(loc => entry.text[loc]) ?? 'es'
  }

  async function load(): Promise<void> {
    if (loaded.value) {
      return
    }
    const stored = readStorage()
    let dirty = false
    for (const e of stored) {
      if (backfill(e)) {
        dirty = true
      }
    }
    // Pintado instantáneo con la caché local.
    entries.value = stored
    loaded.value = true
    if (dirty) {
      persist()
    }

    const remote = await apiList()
    if (remote === null) {
      return
    }
    if (remote.length === 0 && stored.length > 0) {
      // Migración única: sube lo que había solo en localStorage.
      for (const entry of stored) {
        const source = guessSource(entry)
        await apiCreate(entry, source, entry.text[source] ?? '')
        await apiPatch(entry, entryPatch(entry))
      }
      const after = await apiList()
      if (after) {
        entries.value = after
      }
    } else {
      entries.value = remote
    }
    persist()
  }

  async function resolveEntry(entry: PhraseEntry, source: LOCALE): Promise<void> {
    const input = entry.text[source]?.trim()
    if (!input) {
      return
    }
    const targets = ALL_TARGETS.filter(t => t !== source)
    try {
      const res = await translateText(input, source, [...targets])
      applyTranslations(entry, res.translations, res.provider)
      if (entry.failed) {
        lastError.value = 'Traducción no disponible, se guardó el original. Podés reintentar.'
      }
    } catch {
      entry.failed = true
      lastError.value = 'Traducción no disponible, se guardó el original. Podés reintentar.'
    } finally {
      entry.pending = false
      entries.value = [...entries.value]
      persist()
      await apiPatch(entry, entryPatch(entry))
    }
  }

  async function addEntry(rawInput: string): Promise<void> {
    const input = rawInput.trim()
    if (!input) {
      return
    }
    const source = activeTab.value
    const entry: PhraseEntry = {
      id: newId(),
      kind: detectKind(input),
      text: { ...emptyText(), [source]: input },
      ipa: {},
      ipaVerified: {},
      done: false,
      pending: true,
      failed: false,
      needsReview: false,
      createdAt: new Date().toISOString()
    }
    const t = transcribe(input, source)
    entry.ipa[source] = t.ipa
    entry.ipaVerified[source] = t.verified
    // Update optimista: la tabla nunca se vacía ni se reordena.
    entries.value = [entry, ...entries.value]
    persist()
    await apiCreate(entry, source, input)

    globalPending.value = true
    lastError.value = null
    try {
      await resolveEntry(entry, source)
    } finally {
      globalPending.value = false
    }
  }

  async function retryEntry(id: string): Promise<void> {
    const entry = entries.value.find(e => e.id === id)
    if (!entry || entry.pending) {
      return
    }
    entry.pending = true
    entry.failed = false
    entry.needsReview = false
    lastError.value = null
    entries.value = [...entries.value]
    await resolveEntry(entry, activeTab.value)
  }

  function removeEntry(id: string): void {
    entries.value = entries.value.filter(e => e.id !== id)
    persist()
    void apiDelete(id)
  }

  function toggleDone(id: string): void {
    const found = entries.value.find(e => e.id === id)
    if (!found) {
      return
    }
    found.done = !found.done
    entries.value = [...entries.value]
    persist()
    void apiPatch(found, { done: found.done })
  }

  const visibleEntries = computed(() => entries.value)

  return {
    activeTab,
    entries: visibleEntries,
    loaded,
    globalPending,
    lastError,
    load,
    addEntry,
    retryEntry,
    removeEntry,
    toggleDone
  }
}
