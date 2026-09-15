<script setup lang="ts">
import type { LOCALE, PhraseEntry } from '~~/shared/janulus'
import { LOCALE_LABELS } from '~~/shared/janulus'

const props = defineProps<{
  entries: PhraseEntry[]
  source: LOCALE
}>()

const emit = defineEmits<{
  remove: [id: string]
  toggleDone: [id: string]
  retry: [id: string]
}>()

const otherLocales = computed<LOCALE[]>(() =>
  (['pt', 'es', 'en', 'ca', 'gl'] as const).filter(l => l !== props.source)
)

function ipaBadge(entry: PhraseEntry, loc: LOCALE): string {
  if (!entry.ipa[loc]) {
    return ''
  }
  return entry.ipaVerified[loc] ? 'dic' : 'aprox'
}
</script>

<template>
  <div
    role="table"
    aria-label="Matriz de frases"
    class="flex flex-col gap-2"
  >
    <div
      role="row"
      class="hidden md:grid grid-cols-[90px_1fr_1fr_1fr_auto] gap-2 px-3 text-xs font-semibold uppercase text-muted"
    >
      <span role="columnheader">Tipo</span>
      <span role="columnheader">{{ LOCALE_LABELS[props.source] }} (origen)</span>
      <span role="columnheader">Traducciones</span>
      <span role="columnheader">IPA / fonética</span>
      <span
        role="columnheader"
        class="text-right"
      >Acciones</span>
    </div>

    <UCard
      v-for="entry in props.entries"
      :key="entry.id"
      role="row"
      :class="entry.done ? 'opacity-70' : ''"
      class="px-1"
    >
      <div class="grid md:grid-cols-[90px_1fr_1fr_1fr_auto] gap-2 items-start">
        <div class="flex items-center gap-1 flex-wrap">
          <UBadge
            :label="entry.kind === 'word' ? 'vocab' : 'frase'"
            variant="subtle"
            size="sm"
          />
          <UBadge
            v-if="entry.pending"
            label="traduciendo…"
            variant="outline"
            size="sm"
          />
          <UBadge
            v-if="!entry.pending && entry.failed"
            label="falló"
            color="error"
            variant="subtle"
            size="sm"
          />
          <UBadge
            v-if="!entry.pending && !entry.failed && entry.needsReview"
            label="revisar"
            color="warning"
            variant="subtle"
            size="sm"
          />
          <UBadge
            v-if="!entry.pending && !entry.failed && entry.provider"
            :label="entry.provider"
            variant="outline"
            size="sm"
          />
        </div>

        <div class="flex flex-col gap-1">
          <p
            class="font-medium leading-snug"
            :class="entry.done ? 'line-through' : ''"
          >
            {{ entry.text[props.source] }}
          </p>
          <p
            v-if="entry.ipa[props.source]"
            class="font-mono text-xs text-muted"
          >
            {{ entry.ipa[props.source] }}
            <span class="font-sans text-[10px] uppercase">· {{ ipaBadge(entry, props.source) }}</span>
          </p>
        </div>

        <div class="flex flex-col gap-1 text-sm">
          <p
            v-for="loc in otherLocales"
            :key="loc"
            class="leading-snug"
          >
            <span class="font-semibold text-muted">{{ LOCALE_LABELS[loc] }}:</span>
            {{ entry.text[loc] || '—' }}
          </p>
        </div>

        <div class="flex flex-col gap-1 text-sm font-mono">
          <p
            v-for="loc in otherLocales"
            :key="loc"
          >
            <span class="font-sans font-semibold text-muted">{{ loc }}:</span>
            {{ entry.ipa[loc] ?? '—' }}
            <span
              v-if="entry.ipa[loc]"
              class="font-sans text-[10px] uppercase text-muted"
            >· {{ ipaBadge(entry, loc) }}</span>
          </p>
        </div>

        <div class="flex md:flex-col gap-1 justify-end">
          <UButton
            v-if="!entry.pending && (entry.failed || entry.needsReview)"
            icon="i-lucide-refresh-cw"
            size="sm"
            variant="ghost"
            aria-label="Reintentar traducción"
            @click="emit('retry', entry.id)"
          />
          <UButton
            :icon="entry.done ? 'i-lucide-rotate-ccw' : 'i-lucide-check'"
            size="sm"
            variant="ghost"
            :aria-label="entry.done ? 'Marcar pendiente' : 'Marcar aprendida'"
            @click="emit('toggleDone', entry.id)"
          />
          <UButton
            icon="i-lucide-trash-2"
            size="sm"
            color="error"
            variant="ghost"
            aria-label="Eliminar"
            @click="emit('remove', entry.id)"
          />
        </div>
      </div>
    </UCard>

    <UCard
      v-if="props.entries.length === 0"
      class="text-center py-8"
    >
      <p class="text-muted">
        Todavía no hay frases. Escribí arriba <span class="font-semibold">hoy = hoje</span>,
        <span class="font-semibold">ahora = agora</span> o una frase larga y pulsá Enter.
      </p>
    </UCard>
  </div>
</template>
