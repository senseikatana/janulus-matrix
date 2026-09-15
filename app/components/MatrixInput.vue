<script setup lang="ts">
const props = defineProps<{
  sourceLabel: string
  loading: boolean
}>()

const emit = defineEmits<{
  submit: [value: string]
}>()

const value = ref('')

function onEnter(): void {
  const v = value.value.trim()
  if (!v) {
    return
  }
  emit('submit', v)
  value.value = ''
}
</script>

<template>
  <div class="flex flex-col sm:flex-row gap-2">
    <UInput
      v-model="value"
      :placeholder="`Escribí palabra o frase en ${props.sourceLabel} y pulsá Enter…`"
      aria-label="Agregar frase o palabra"
      size="lg"
      class="flex-1"
      :loading="props.loading"
      @keyup.enter="onEnter"
    />
    <UButton
      label="Agregar"
      icon="i-lucide-plus"
      size="lg"
      :loading="props.loading"
      @click="onEnter"
    />
  </div>
</template>
