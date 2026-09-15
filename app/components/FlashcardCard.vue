<script setup lang="ts">
import type { LOCALE, PhraseEntry } from '~~/shared/janulus'
import { LOCALE_LABELS } from '~~/shared/janulus'

const props = defineProps<{
  entry: PhraseEntry
  frontLang: LOCALE
  backLang: LOCALE
  flipped: boolean
}>()

const emit = defineEmits<{
  flip: [id: string]
}>()
</script>

<template>
  <button
    type="button"
    class="flip-card text-left w-full"
    :aria-label="`Tarjeta ${props.entry.text[props.frontLang]}`"
    @click="emit('flip', props.entry.id)"
  >
    <div
      class="flip-inner"
      :class="props.flipped ? 'is-flipped' : ''"
    >
      <div class="flip-face flip-front">
        <UBadge
          :label="LOCALE_LABELS[props.frontLang]"
          variant="subtle"
          size="sm"
        />
        <p class="mt-2 text-lg font-semibold leading-snug">
          {{ props.entry.text[props.frontLang] }}
        </p>
        <p class="mt-1 text-xs text-muted">
          {{ props.entry.kind === 'word' ? 'vocabulario — tocá para girar' : 'frase — tocá para girar' }}
        </p>
      </div>
      <div class="flip-face flip-back">
        <UBadge
          :label="LOCALE_LABELS[props.backLang]"
          variant="solid"
          size="sm"
        />
        <p class="mt-2 text-lg font-semibold leading-snug">
          {{ props.entry.text[props.backLang] }}
        </p>
        <p
          v-if="props.entry.ipa[props.backLang] ?? props.entry.ipa[props.frontLang]"
          class="mt-1 font-mono text-sm opacity-90"
        >
          {{ props.entry.ipa[props.backLang] ?? props.entry.ipa[props.frontLang] }}
        </p>
      </div>
    </div>
  </button>
</template>
