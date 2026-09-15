<script setup lang="ts">
import type { LOCALE, PhraseEntry } from 'janulus-core'
import { LOCALE_LABELS } from 'janulus-core'

const props = defineProps<{
  entries: PhraseEntry[]
  frontLang: LOCALE
  backLang: LOCALE
  flippedIds: string[]
}>()

const emit = defineEmits<{
  flip: [id: string]
  swap: []
}>()
</script>

<template>
  <section
    aria-label="Mazo de flashcards"
    class="flex flex-col gap-3"
  >
    <div class="flex flex-wrap items-center gap-2">
      <UBadge
        :label="`${props.entries.length} cards`"
        variant="outline"
      />
      <span class="text-sm text-muted">
        Frente: <strong>{{ LOCALE_LABELS[props.frontLang] }}</strong>
        → reverso: <strong>{{ LOCALE_LABELS[props.backLang] }}</strong>
      </span>
      <UButton
        label="Invertir dirección"
        icon="i-lucide-arrow-left-right"
        size="sm"
        variant="subtle"
        @click="emit('swap')"
      />
    </div>

    <div
      v-if="props.entries.length > 0"
      class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
    >
      <FlashcardCard
        v-for="entry in props.entries"
        :key="entry.id"
        :entry="entry"
        :front-lang="props.frontLang"
        :back-lang="props.backLang"
        :flipped="props.flippedIds.includes(entry.id)"
        @flip="emit('flip', $event)"
      />
    </div>
    <UCard
      v-else
      class="text-center py-6"
    >
      <p class="text-muted text-sm">
        Agregá palabras o frases arriba y acá aparecen como cards con ambos idiomas.
      </p>
    </UCard>
  </section>
</template>
