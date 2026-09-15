<script setup lang="ts">
import type { LOCALE } from '~~/shared/janulus'
import { LOCALE_LABELS } from '~~/shared/janulus'

useHead({ htmlAttrs: { lang: 'pt-BR' } })
useSeoMeta({
  title: 'Janulus Matrix — PT ↔ ES',
  description: 'Matriz ToDo de frases y vocabulario PT-ES-EN-CA-GL con traducción automática gratis, IPA y flashcards con flip.'
})

const { activeTab, entries, globalPending, lastError, load, addEntry, retryEntry, removeEntry, toggleDone } = useMatrix()
const { frontLang, backLang, flipped, toggleFlip, swapDirection, setDirection } = useDeck('pt', 'es')

const tabs: { value: LOCALE, label: string }[] = [
  { value: 'pt', label: 'Português' },
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'ca', label: 'Català' },
  { value: 'gl', label: 'Galego' }
]

onMounted(() => {
  load()
})

watch(activeTab, (tab) => {
  setDirection(tab, tab === 'es' ? 'pt' : 'es')
})

async function onSubmit(value: string): Promise<void> {
  await addEntry(value)
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 sm:px-6 flex flex-col gap-6 py-6">
    <div>
      <h1 class="text-2xl font-bold">
        Janulus Matrix
      </h1>
      <p class="text-muted mt-1">
        Escribí una palabra (<em>hoje, agora, eu</em>) o una frase larga en la pestaña activa y pulsá
        <kbd class="px-1 rounded bg-elevated border">Enter</kbd>. Se traduce sola sin romper la tabla,
        con IPA y su flashcard con flip.
      </p>
    </div>

    <!-- Hojas: PT primera, ES segunda -->
    <div
      role="tablist"
      aria-label="Hojas de idioma"
      class="flex flex-wrap gap-2"
    >
      <UButton
        v-for="tab in tabs"
        :key="tab.value"
        :label="tab.label"
        :variant="activeTab === tab.value ? 'solid' : 'subtle'"
        size="sm"
        role="tab"
        :aria-selected="activeTab === tab.value"
        @click="activeTab = tab.value"
      />
    </div>

    <ClientOnly>
      <MatrixInput
        :source-label="LOCALE_LABELS[activeTab]"
        :loading="globalPending"
        @submit="onSubmit"
      />
      <p
        v-if="lastError"
        class="text-sm text-warning"
      >
        {{ lastError }}
      </p>

      <UTabs
        :items="[{ label: 'Matriz', value: 'matrix' }, { label: `Flashcards (${entries.length})`, value: 'deck' }]"
        default-value="matrix"
      >
        <template #content="{ item }">
          <div
            v-if="item.value === 'matrix'"
            class="mt-4"
          >
            <MatrixTable
              :entries="entries"
              :source="activeTab"
              @remove="removeEntry"
              @toggle-done="toggleDone"
              @retry="retryEntry"
            />
          </div>
          <div
            v-else
            class="mt-4"
          >
            <FlashcardDeck
              :entries="entries"
              :front-lang="frontLang"
              :back-lang="backLang"
              :flipped-ids="flipped"
              @flip="toggleFlip"
              @swap="swapDirection"
            />
          </div>
        </template>
      </UTabs>

      <template #fallback>
        <p class="text-sm text-muted">
          Cargando tu matriz…
        </p>
      </template>
    </ClientOnly>
  </div>
</template>
